#!/usr/bin/env bash
# 建库初始化：判题用户 TESTER、课程授权、DUMPDIR
#
# 注意：本脚本**不再预装基线数据**（7 张表 + 27 行）。
#   课程 L1 的 1.3~1.18 让学生自己建这 7 张表、插这 27 行数据；
#   如果建库时就把表装进 COURSE，学生第一次 CREATE TABLE 就会撞
#   ORA-00955: name is already used by an existing object —— 这条路是断的。
#   基线文件仍然保留在镜像里（/opt/course/baseline/00_baseline.sql），
#   只在显式设置 COURSE_LOAD_BASELINE=1 时由 scripts/loadBaseline.sh 装载。
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
#      真正的结果靠第 3 步的 check_conn / DUMPDIR 查询来验证。
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

echo ""
echo "======================================================================"
echo " 课程建库初始化：TESTER 用户 / 授权 / DUMPDIR"
echo "   目标 PDB：${PDB}"
echo "   基线数据：不自动装载（由 scripts/loadBaseline.sh 按需装）"
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
echo "▶ 1/3 检查并创建判题用户 TESTER"
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
# 下面两条（DROP ANY ROLE / DROP PROFILE）是**为判题服务的，不是给学生用的**：
#   判题（实验四）会以 COURSE 身份建全局角色和 PROFILE，跑完要清理掉再重跑，
#   否则第二次判题会撞 ORA-01921（角色已存在）/ ORA-02379（PROFILE 已存在）。
#   为什么只补这两条、而不是给 ALTER SYSTEM 或 DBA：
#     - 判题真正需要的只有"删掉自己刚建的全局对象"这一件事；
#     - DROP ANY ROLE 只影响角色、DROP PROFILE 只影响 PROFILE，
#       碰不到数据字典里的核心对象，爆炸半径最小；
#     - ALTER SYSTEM 能改实例参数、能杀会话，一旦学生的 SQL 被误用或注入，
#       后果不可控，远超判题所需。
#   学生手动跑 sqlplus 时同样拥有这些权限，但课程内容里没有任何一步要求他们用；
#   这里是"够用即可"，不是"全给 DBA"。
#
# 注意：权限名必须按 Oracle 的系统权限写，写错会报 ORA-00990 之类的"无效权限"错误。
#       本段用了 WHENEVER SQLERROR CONTINUE，报错会被静默吞掉、权限根本没授上，
#       所以两条各占一行，方便 grep 和排查。
#         - 角色    → DROP ANY ROLE（没有 DROP ROLE 这个权限，必须带 ANY）
#         - PROFILE → DROP PROFILE（这个系统权限本身就不带 ANY）
echo "▶ 2/3 给 COURSE 授权 + 建 DUMPDIR"
sqlplus -S -L / as sysdba >/dev/null 2>&1 <<SQL
WHENEVER SQLERROR CONTINUE
ALTER SESSION SET CONTAINER = ${PDB};
GRANT CREATE USER TO COURSE;
GRANT ALTER USER TO COURSE;
GRANT DROP USER TO COURSE;
GRANT CREATE ROLE TO COURSE;
GRANT GRANT ANY ROLE TO COURSE;
GRANT DROP ANY ROLE TO COURSE;
GRANT CREATE PROFILE TO COURSE;
GRANT ALTER PROFILE TO COURSE;
GRANT DROP PROFILE TO COURSE;
GRANT SELECT ANY DICTIONARY TO COURSE;
CREATE OR REPLACE DIRECTORY dumpdir AS '/tmp/dump';
GRANT READ, WRITE ON DIRECTORY dumpdir TO COURSE;
GRANT READ, WRITE ON DIRECTORY dumpdir TO TESTER;
EXIT;
SQL
echo "  ✅ 授权语句已执行（逐条容错）"

# --- 步骤 3：验证 -------------------------------------------------------------
# 这三项是判题能否工作的最低前提。失败只报错、不中断。
echo "▶ 3/3 验证"
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

# --- 收尾 ---------------------------------------------------------------------
echo "✅ 课程初始化完成（TESTER / 授权 / DUMPDIR 就绪，基线数据未装载）"
echo "   COURSE 库保持为空：L1 的 1.3~1.18 由学生自己建表插数据。"
echo "   需要 7 张表 + 27 行原始数据时（例如进入 Level 2）："
echo "     COURSE_LOAD_BASELINE=1 bash scripts/loadBaseline.sh"
echo "======================================================================"
echo ""
# 显式成功：initdb 阶段返回非零会让容器停止启动，绝不能落到这里还返回非零
echo "done."
exit 0