#!/usr/bin/env bash
# Codespaces 创建后初始化：建判题用户、装依赖、装载基线、清理课程脚手架
#
# 设计要点（都是实测踩出来的）：
#   - 不用 `set -e`：任何一个非关键步骤失败都不该让后面的步骤全部跳过。
#     （早期版本用 set -e，npm install 一失败脚本就退出，
#      清理脚手架那一步从未执行，工作区里一直留着 TUTORIAL.md）
#   - npm install 与 Oracle 启动**并行**：Oracle 首次启动要 2–3 分钟，
#     这段时间足够把判题依赖装完，串行做等于白等。
#   - 关键步骤失败要显式报错并以非零码退出，报错要能看出是哪一步、怎么修。
#   - 基线数据在这里装，不依赖 CodeRoad 的 level setup
#     （通过 Continue 弹窗进入下一关时，level setup 不一定触发）。
set -uo pipefail
cd "${WORKSPACE_FOLDER:-$PWD}"

FAILED=0
fail() { echo "  ❌ $1" >&2; echo "     → $2" >&2; FAILED=$((FAILED+1)); }
ok()   { echo "  ✅ $1"; }

# sqlplus 的输出带 tab 和空白，用宽松匹配判断是否拿到了期望值
sqlplus_ok() {
  local conn="$1" probe="$2"
  sqlplus -S -L "$conn" 2>/dev/null <<<"$probe" | tr -d ' \t\r\n' | grep -qi "${3:-OK}"
}

echo "===== 1/5 并行启动：装依赖 + 等 Oracle ====="

# --- 后台：装判题依赖（这一步不需要数据库）---
NPM_PID=""
if [ -f coderoad/package.json ] && command -v npm >/dev/null 2>&1; then
  echo "  ⏳ 后台安装判题依赖……"
  ( npm install --prefix coderoad --no-audit --no-fund >/tmp/npm.log 2>&1
    echo $? > /tmp/npm.rc ) &
  NPM_PID=$!
elif ! command -v npm >/dev/null 2>&1; then
  echo "  ⚠️  npm 不可用，依赖安装暂缓（先解决 Node）"
fi

# --- 前台：等 Oracle 起来 ---
if bash scripts/waitForDb.sh; then
  ok "Oracle 已就绪"
else
  fail "Oracle 在等待窗口内没有起来" "看容器日志：docker logs <container>；或重建 codespace"
fi

echo ""
echo "===== 2/5 检查 Node.js ====="
if command -v node >/dev/null 2>&1; then
  ok "Node.js $(node -v)"
else
  # 兜底：devcontainer feature 没生效时，现场装一份
  echo "   devcontainer 的 Node feature 似乎没生效，尝试现场安装……"
  if curl -sSL https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-x64.tar.gz \
       | sudo tar -xz -C /usr/local --strip-components=1 2>/dev/null; then
    sudo ln -sf /usr/local/bin/node /usr/bin/node 2>/dev/null || true
    sudo ln -sf /usr/local/bin/npm  /usr/bin/npm  2>/dev/null || true
    if command -v node >/dev/null 2>&1; then
      ok "Node.js 已补装：$(node -v)"
      # Node 是刚刚才装好的，之前的后台 npm 跑不起来，这里补一次
      if [ -z "$NPM_PID" ] && [ -f coderoad/package.json ]; then
        ( npm install --prefix coderoad --no-audit --no-fund >/tmp/npm.log 2>&1
          echo $? > /tmp/npm.rc ) &
        NPM_PID=$!
      fi
    else
      fail "Node.js 补装后仍然找不到" "检查 .devcontainer/devcontainer.json 的 features 段"
    fi
  else
    fail "Node.js 既没预装也装不上" "检查 .devcontainer/devcontainer.json 的 features 段，或网络是否可达 nodejs.org"
  fi
fi

echo ""
echo "===== 3/5 创建判题用户 TESTER ====="
# 幂等：TESTER 已存在时跳过 CREATE USER，避免 ORA-01920 刷屏
EXISTS=$(sqlplus -S -L / as sysdba 2>/dev/null <<'SQL' | tr -d ' \t\r\n'
SET HEADING OFF FEEDBACK OFF PAGESIZE 0
ALTER SESSION SET CONTAINER = FREEPDB1;
SELECT COUNT(*) FROM dba_users WHERE username = 'TESTER';
EXIT;
SQL
)
if [ "${EXISTS:-0}" = "0" ]; then
  sqlplus -S / as sysdba >/dev/null 2>&1 <<'SQL' && ok "TESTER 用户已创建" || fail "TESTER 创建失败" "手工执行第 3 步的 SQL 看报错"
ALTER SESSION SET CONTAINER = FREEPDB1;
CREATE USER tester IDENTIFIED BY tester;
GRANT CONNECT, RESOURCE, DBA TO tester;
GRANT UNLIMITED TABLESPACE TO tester;
EXIT;
SQL
else
  ok "TESTER 用户已存在，跳过创建"
fi

# 授权每次都执行（幂等）。注意 DROP ROLE / DROP PROFILE 不是可授权的权限名，
# 必须逐个授权，写在一起会报 ORA-00990。
sqlplus -S / as sysdba >/dev/null 2>&1 <<'SQL'
ALTER SESSION SET CONTAINER = FREEPDB1;
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
GRANT READ, WRITE ON DIRECTORY dumpdir TO tester;
EXIT;
SQL
ok "COURSE / TESTER 授权就绪"

if sqlplus_ok 'tester/tester@//localhost:1521/FREEPDB1' 'SELECT 1 FROM dual;' '1'; then
  ok "TESTER 可以登录"
else
  fail "TESTER 登录不了" "判题器无法工作；手工执行：sqlplus tester/tester@//localhost:1521/FREEPDB1"
fi

echo ""
echo "===== 4/5 收尾判题依赖 ====="
if [ ! -f coderoad/package.json ]; then
  fail "coderoad/package.json 不存在" "工作区不完整，建议删除 codespace 重建"
elif ! command -v npm >/dev/null 2>&1; then
  fail "npm 不可用，装不了依赖" "先解决第 2 步的 Node 问题"
elif [ -n "$NPM_PID" ]; then
  # 等后台安装结束（如果还没结束）
  wait "$NPM_PID" 2>/dev/null
  RC=$(cat /tmp/npm.rc 2>/dev/null || echo 1)
  if [ "$RC" = "0" ]; then
    chmod +x coderoad/node_modules/.bin/* 2>/dev/null || true
    if [ -x coderoad/node_modules/.bin/mocha ]; then
      ok "判题依赖已安装，mocha 可执行"
    else
      fail "mocha 装好了但没有可执行权限" "执行：chmod +x coderoad/node_modules/.bin/*"
    fi
  else
    fail "npm install 失败" "看 /tmp/npm.log；常见原因是网络或 registry 不可达"
    tail -5 /tmp/npm.log >&2
  fi
else
  fail "判题依赖没有装上" "手工执行：cd coderoad && npm install"
fi

echo ""
echo "===== 5/5 装载基线数据 + 清理课程脚手架 ====="
# 基线在 postCreate 装好，不依赖 CodeRoad 的 level setup。
# loadBaseline.sh 是幂等的（先清空再重建），重复执行安全。
if bash scripts/loadBaseline.sh >/tmp/baseline.log 2>&1; then
  ok "COURSE 库的 7 张基线表已就绪"
else
  fail "基线装载失败" "手工执行 bash scripts/loadBaseline.sh，或看 /tmp/baseline.log"
  tail -5 /tmp/baseline.log >&2
fi

mkdir -p /tmp/dump
# 删掉讲义和配置，让工作区看起来像一个干净的新数据库项目
rm -f TUTORIAL.md coderoad.yaml tutorial.json
ok "课程脚手架已清理"

echo ""
echo "======================================"
if [ "$FAILED" -gt 0 ]; then
  echo "⚠️  初始化完成，但有 $FAILED 项失败（见上面 ❌）" >&2
  echo "    学生遇到 Test Runner Failed 时，先跑：bash scripts/selfCheck.sh" >&2
  exit 1
fi
echo "✅ 环境就绪，直接开始做题"
echo "   如果右侧没有 CodeRoad 面板：F1 → Reload Window"
echo "======================================"
