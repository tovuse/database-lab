#!/usr/bin/env bash
# 建库初始化：判题用户 TESTER、课程授权、DUMPDIR、基线数据
#
# 谁来跑、什么时候跑：
#   1. 镜像首次建库时，gvenzl/oracle-free 的 entrypoint 在"建好 PDB 和 APP_USER(COURSE)"之后
#      自动执行 /container-entrypoint-initdb.d/10_db_setup.sh —— 这是主要路径，学生永远看不到它跑。
#   2. scripts/postCreate.sh 会再跑一次 /opt/course/dbSetup.sh 做幂等兜底
#      （例如 codespace 从预构建镜像恢复、初始化阶段被跳过的情况）。
#   所以本脚本必须可以重复执行任意次。
#
# ⚠️ 生命线约束：initdb 阶段脚本返回非零码会让整个容器停止启动。
#    - 不用 set -e：任何一条 SQL 失败都只记录下来，继续往下走。
#    - 不写 exit 1：脚本永远以 0 退出。
#    - sqlplus 报 ORA 错误也返回 0（这正是我们想要的：不因单条失败而中断建库），
#      真正的结果靠"装完再数一遍表"来验证。
#
# ⚠️ 两种调用方式都要安全：
#    gvenzl 的 entrypoint 对 .sh 的处理是"有执行位就 `"${f}"` 跑，没有就 `. "${f}"` source 进来"。
#    被 source 时有两个坑：① 我们设的 shell 选项会污染 entrypoint；
#    ② entrypoint 自己是 `set -Eeuo pipefail`，`-e` 会继承进来，
#    我们中间任何一条失败的命令都会把整个容器启动带下去。
#    所以被 source 时，在子进程里重跑自己，然后无论结果如何都 `return 0`。

# 被 source 进来就转到子进程执行（BASH_SOURCE != $0 说明是 source 的）
if [ "${BASH_SOURCE[0]:-$0}" != "$0" ]; then
  bash "${BASH_SOURCE[0]}" "$@"
  return 0
fi

set -uo pipefail

PDB="${COURSE_PDB:-FREEPDB1}"
BASELINE_SQL="${COURSE_BASELINE_SQL:-/opt/course/baseline/00_baseline.sql}"

echo ""
echo "======================================================================"
echo " 课程建库初始化：TESTER 用户 / 授权 / DUMPDIR / 基线数据"
echo "   目标 PDB：${PDB}"
echo "   基线文件：${BASELINE_SQL}"
echo "======================================================================"

# --- 等数据库能真正接受连接 ---------------------------------------------------
# initdb 阶段数据库已经 OPEN，但 listener 刚起、PDB 刚 open，偶尔会抢跑。
# 这里最多等 60 秒，超时不报错（后面的 SQL 会自然失败并被记下来）。
wait_ready() {
  local i
  for i in $(seq 1 30); do
    if echo "SELECT 1 FROM dual;" | sqlplus -S -L / as sysdba >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "  ⚠️  60 秒内没能用 / as sysdba 连上，继续尝试执行（错误会被记录）"
  return 0
}
wait_ready

# --- 步骤 1：TESTER 用户 -----------------------------------------------------
# 幂等：先查 dba_users，存在就跳过，避免 ORA-01920 刷屏。
# 注意 sqlplus 的输出带 tab 和前导空白，先 tr 掉空白再比。
echo "▶ 1/4 检查并创建判题用户 TESTER"
TESTER_EXISTS=$(
  sqlplus -S -L / as sysdba 2>/dev/null <<SQL | tr -d ' \t\r\n'
WHENEVER SQLERROR CONTINUE
SET HEADING OFF
SET FEEDBACK OFF
SET PAGESIZE 0
ALTER SESSION SET CONTAINER = ${PDB};
SELECT COUNT(*) FROM dba_users WHERE username = 'TESTER';
EXIT;
SQL
)
if [ "${TESTER_EXISTS:-0}" = "0" ]; then
  sqlplus -S -L / as sysdba >/dev/null 2>&1 <<SQL
WHENEVER SQLERROR CONTINUE
ALTER SESSION SET CONTAINER = ${PDB};
CREATE USER tester IDENTIFIED BY tester;
GRANT CONNECT, RESOURCE, DBA TO tester;
GRANT UNLIMITED TABLESPACE TO tester;
EXIT;
SQL
  echo "  ✅ TESTER 已创建（CONNECT/RESOURCE/DBA + UNLIMITED TABLESPACE）"
else
  echo "  ✅ TESTER 已存在，跳过创建"
fi

# --- 步骤 2：COURSE 的系统权限与 DUMPDIR -------------------------------------
# COURSE 由镜像的 APP_USER=COURSE 机制建好，正常在 initdb 之前就存在。
# 万一不存在（有人在 devcontainer 里改了 APP_USER），这一整段会报 ORA-01917，被下面记成警告，
# 不会影响容器启动；postCreate 里还会重试一次。
#
# 注意：DROP ROLE / DROP PROFILE 不是可授权的权限名，必须逐个 GRANT 分开写，
#       写在一起会报 ORA-00990（这个坑实测踩过）。
echo "▶ 2/4 给 COURSE 授权 + 建 DUMPDIR"
sqlplus -S -L / as sysdba >/dev/null 2>&1 <<SQL
WHENEVER SQLERROR CONTINUE
ALTER SESSION SET CONTAINER = ${PDB};
GRANT CREATE USER TO COURSE;
GRANT ALTER USER TO COURSE;
GRANT DROP USER TO COURSE;
GRANT CREATE ROLE TO COURSE;
GRANT GRANT ANY ROLE TO COURSE;
GRANT CREATE PROFILE TO COURSE;
GRANT ALTER PROFILE TO COURSE;
GRANT SELECT ANY DICTIONARY TO COURSE;
CREATE OR REPLACE DIRECTORY dumpdir AS '/tmp/dump';
GRANT READ, WRITE ON DIRECTORY dumpdir TO COURSE;
GRANT READ, WRITE ON DIRECTORY dumpdir TO TESTER;
EXIT;
SQL
echo "  ✅ 授权语句已执行（逐条容错）"

# --- 步骤 3：验证 -------------------------------------------------------------
# 这三项是判题能否工作的最低前提。失败只报错、不中断。
echo "▶ 3/4 验证"
check_conn() {
  local conn="$1" label="$2"
  if sqlplus -S -L "$conn" 2>/dev/null <<<'SELECT 1 FROM dual;' | tr -d ' \t\r\n' | grep -q '1'; then
    echo "  ✅ ${label} 可以登录"
    return 0
  fi
  echo "  ⚠️  ${label} 登录失败（conn=${conn}）"
  return 0
}
check_conn "tester/tester@//localhost:1521/${PDB}" "TESTER"
check_conn "COURSE/course@//localhost:1521/${PDB}" "COURSE"

DIR_OK=$(
  sqlplus -S -L / as sysdba 2>/dev/null <<SQL | tr -d ' \t\r\n' | grep -c 'DUMPDIR'
WHENEVER SQLERROR CONTINUE
SET HEADING OFF
SET FEEDBACK OFF
SET PAGESIZE 0
ALTER SESSION SET CONTAINER = ${PDB};
SELECT directory_name FROM dba_directories WHERE directory_name = 'DUMPDIR';
EXIT;
SQL
)
if [ "${DIR_OK:-0}" -ge 1 ] 2>/dev/null; then
  echo "  ✅ DUMPDIR -> /tmp/dump 已注册"
else
  echo "  ⚠️  DUMPDIR 没建出来（实验四的 expdp/impdp 会失败）"
fi

# --- 步骤 4：基线数据 ---------------------------------------------------------
# 把 7 张表 + 27 行原始数据装进 COURSE schema，学生打开就能 SELECT 看到东西。
#
# 判题完全不依赖这一步（判题器在 TESTER 里自己重放基线），
# 所以这里失败也不影响判题，只影响学生用 sqlplus 探索时的观感。
# 只在 COURSE 库"完全空"时才装：
#   - 0 张表 = 全新库，装基线（首次建库的正常路径）
#   - >=7 张表 = 已装过，跳过
#   - 1–6 张表 = 学生已经自己建过表了（比如做完了 Level 1）。这时硬塞基线会撞 ORA-00955，
#     还可能在已有表里插重复数据。交给 scripts/loadBaseline.sh（先清空再重建）处理。
echo "▶ 4/4 装载基线数据（仅在 COURSE 库为空时）"
BASELINE_DONE=0
if [ -f "${BASELINE_SQL}" ]; then
  TABLE_CNT=$(
    sqlplus -S -L COURSE/course@//localhost:1521/${PDB} 2>/dev/null <<'SQL' | tr -d ' \t\r\n'
WHENEVER SQLERROR CONTINUE
SET HEADING OFF
SET FEEDBACK OFF
SET PAGESIZE 0
SELECT COUNT(*) FROM user_tables;
EXIT;
SQL
  )
  case "${TABLE_CNT:-0}" in
  '' | *[!0-9]*)
    echo "  ⚠️  查不到 COURSE 库的表数（连不上？），跳过基线装载"
    ;;
  0)
    # 注意：用了 WHENEVER SQLERROR CONTINUE，所以 sqlplus 的退出码永远是 0，
    # 不能靠它判断成败。装完再数一遍表才算数。
    sqlplus -S -L COURSE/course@//localhost:1521/${PDB} >/dev/null 2>&1 <<SQL
WHENEVER SQLERROR CONTINUE
@${BASELINE_SQL}
COMMIT;
EXIT;
SQL
    AFTER_CNT=$(
      sqlplus -S -L COURSE/course@//localhost:1521/${PDB} 2>/dev/null <<'SQL' | tr -d ' \t\r\n'
WHENEVER SQLERROR CONTINUE
SET HEADING OFF
SET FEEDBACK OFF
SET PAGESIZE 0
SELECT COUNT(*) FROM user_tables;
EXIT;
SQL
    )
    if [ "${AFTER_CNT:-0}" -ge 7 ] 2>/dev/null; then
      echo "  ✅ 基线数据已装载（${AFTER_CNT} 张表）"
      BASELINE_DONE=1
    else
      echo "  ⚠️  基线装载后只有 ${AFTER_CNT:-0} 张表（期望 7 张）"
      echo "     学生可稍后手动执行：bash scripts/loadBaseline.sh"
    fi
    ;;
  *)
    if [ "${TABLE_CNT}" -ge 7 ] 2>/dev/null; then
      echo "  ✅ COURSE 库已有 ${TABLE_CNT} 张表，基线已就绪，跳过"
      BASELINE_DONE=1
    else
      echo "  ⚠️  COURSE 库已有 ${TABLE_CNT} 张表（不是干净的库），跳过基线装载"
      echo "     需要基线时执行：bash scripts/loadBaseline.sh（会先清空 COURSE 库）"
    fi
    ;;
  esac
else
  echo "  ⚠️  找不到 ${BASELINE_SQL}，跳过基线装载"
fi

# --- 收尾 ---------------------------------------------------------------------
if [ "${BASELINE_DONE:-0}" = "1" ]; then
  echo "✅ 课程初始化完成"
else
  echo "⚠️  课程初始化完成，但基线未装载（判题不受影响，只是库里看不到表）"
fi
echo "======================================================================"
echo ""
# 显式成功：initdb 阶段返回非零会让容器停止启动，绝不能落到这里还返回非零
echo "done."
exit 0