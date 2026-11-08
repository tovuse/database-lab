#!/usr/bin/env bash
# 课程环境自检（学生侧）
#
# 用途：点 Run 出现 Test Runner Failed 时，先跑这个脚本，
#       它会逐项检查判题依赖是否齐全，并给出下一步该做什么。
#
# 用法：
#   bash scripts/selfCheck.sh
set -uo pipefail
cd "$(dirname "$0")/.."

PASS=0
FAIL=0

ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; echo "     → $2"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠️  $1"; echo "     → $2"; }

echo "======================================"
echo " 课程环境自检"
echo "======================================"
echo ""

echo "[1/5] Node.js 运行时"
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v 2>/dev/null)
  ok "Node.js 已安装：$NODE_VER"
else
  bad "没找到 node 命令" "本课程的判题器需要 Node.js 20。若容器由课程镜像创建，请把这段输出发给老师"
fi

echo ""
echo "[2/5] 判题依赖"
if [ -d coderoad/node_modules/mocha ]; then
  ok "coderoad/node_modules 存在"
else
  bad "coderoad/node_modules 缺失" "执行：cd coderoad && npm install --no-audit --no-fund"
fi

if [ -f coderoad/node_modules/.bin/mocha ]; then
  if [ -x coderoad/node_modules/.bin/mocha ]; then
    ok "mocha 可执行"
  else
    bad "mocha 没有可执行权限（从 Windows 提交的依赖会这样）" "执行：chmod +x coderoad/node_modules/.bin/mocha"
  fi
fi

echo ""
echo "[3/5] Oracle 数据库"
if command -v sqlplus >/dev/null 2>&1; then
  OUT=$(sqlplus -S -L COURSE/course@//localhost:1521/FREEPDB1 <<<'SELECT 1 FROM dual;' 2>&1)
  if echo "$OUT" | grep -q '^ *1 *$'; then
    ok "COURSE 用户可以连上 FREEPDB1"
  else
    warn "sqlplus 连不上数据库" "数据库可能还在启动，等 1–2 分钟再试；或执行 bash scripts/waitForDb.sh"
  fi

  TOUT=$(sqlplus -S -L tester/tester@//localhost:1521/FREEPDB1 <<<'SELECT 1 FROM dual;' 2>&1)
  if echo "$TOUT" | grep -q '^ *1 *$'; then
    ok "TESTER 判题用户可以连上"
  else
    bad "TESTER 判题用户连不上" "判题用户没建好，请联系老师重建容器"
  fi
else
  bad "没找到 sqlplus" "容器不是从课程镜像创建的，请联系老师"
fi

echo ""
echo "[4/5] 课程文件"
if [ -d sql ]; then
  N=$(ls sql/*.sql 2>/dev/null | wc -l)
  ok "sql/ 目录下有 $N 个答题模板"
else
  bad "sql/ 目录不存在" "工作区不完整，建议删除 codespace 重建"
fi

echo ""
echo "[5/5] 基线数据（Level 2 需要）"
if command -v sqlplus >/dev/null 2>&1; then
  CNT=$(sqlplus -S -L COURSE/course@//localhost:1521/FREEPDB1 <<<'SELECT COUNT(*) FROM user_tables;' 2>/dev/null | tr -d ' \n')
  if [ "${CNT:-0}" -ge 7 ] 2>/dev/null; then
    ok "COURSE 库里有 $CNT 张表，基线已就绪"
  else
    warn "COURSE 库里只有 ${CNT:-0} 张表" "如果正在做 Level 2，执行：bash scripts/loadBaseline.sh"
  fi
fi

echo ""
echo "======================================"
echo " 通过 $PASS 项，失败 $FAIL 项"
echo "======================================"
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "上面带 ❌ 的项需要处理，按提示的命令执行；"
  echo "处理完再跑一次本脚本，全绿之后回到 CodeRoad 点 Run。"
  exit 1
fi
echo ""
echo "环境正常，回到 CodeRoad 面板点 Run 即可。"
