#!/usr/bin/env bash
# Codespaces 创建后初始化（精简版）
#
# 分工变了：能提前做的都做进镜像了。
#   镜像（Dockerfile + /container-entrypoint-initdb.d/10_db_setup.sh）负责——
#     - 装 Node 20（/opt/node）
#     - 预装判题依赖（/opt/coderoad-deps）
#     - 建 TESTER、给 COURSE 授权、建 DUMPDIR（首次建库时自动跑）
#     - 基线数据**不再预装**：L1 的 1.3~1.18 由学生自己建表插数据，
#       预装会让学生第一次 CREATE TABLE 撞 ORA-00955
#   这个脚本只剩三件事：
#     1. 确认数据库已就绪（Oracle 首次建库 2–3 分钟，postCreate 可能抢在它前面）
#     2. 确认镜像该做的那几项真的到位了，没到位就现场补（全部幂等）
#     3. 清理课程脚手架 + 检查"自动开课"所需的变量
#
# 设计要点（沿用上一版，都是实测踩出来的）：
#   - 不用 `set -e`：任何一个非关键步骤失败都不该让后面的步骤全部跳过。
#     （早期版本用 set -e，npm install 一失败脚本就退出，
#      清理脚手架那一步从未执行，工作区里一直留着 TUTORIAL.md）
#   - 关键步骤失败要显式报错并以非零码退出，报错要能看出是哪一步、怎么修。
#   - 基线数据不再由任何自动流程装载：L1（1.3~1.18）就是让学生自己建这 7 张表、
#     插这 27 行数据。预装会让学生的 CREATE TABLE 直接撞 ORA-00955。
#   - 现在也不再依赖 CodeRoad 的 level setup
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

echo "===== 1/5 等 Oracle 就绪 ====="
if bash scripts/waitForDb.sh; then
  ok "Oracle 已就绪"
else
  fail "Oracle 在等待窗口内没有起来" "看容器日志：docker logs <container>；或重建 codespace"
fi

echo ""
echo "===== 2/5 检查 Node.js ====="
if command -v node >/dev/null 2>&1; then
  ok "Node.js $(node -v)"
elif [ -x /opt/node/bin/node ]; then
  # 兜底：镜像里装了 Node 20，但 PATH 没带上（非登录 shell 的典型情况）
  echo "   Node 在 /opt/node/bin，补软链接……"
  sudo ln -sf /opt/node/bin/node /usr/local/bin/node 2>/dev/null || true
  sudo ln -sf /opt/node/bin/npm  /usr/local/bin/npm  2>/dev/null || true
  export PATH="/opt/node/bin:$PATH"
  if command -v node >/dev/null 2>&1; then
    ok "Node.js $(node -v)"
  else
    fail "Node.js 在 /opt/node/bin/node 但补 PATH 后仍不可用" "检查 /opt/node 是否完整；镜像应由仓库根的 Dockerfile 构建"
  fi
else
  fail "找不到 Node.js" "镜像应由仓库根的 Dockerfile 构建（它预装 /opt/node），检查 .devcontainer/devcontainer.json 的 build 段"
fi

echo ""
echo "===== 3/5 判题依赖 ====="
# 镜像里预装在 /opt/coderoad-deps；工作区是挂载卷，所以必须运行期拷进来。
# 已经是完整副本就跳过（停止再启动 codespace 时 node_modules 还在，不用重拷）。
if [ ! -f coderoad/package.json ]; then
  fail "coderoad/package.json 不存在" "工作区不完整，建议删除 codespace 重建"
elif [ -x coderoad/node_modules/.bin/mocha ] && [ -d coderoad/node_modules/oracledb ]; then
  ok "判题依赖已在工作区（mocha + oracledb）"
elif [ -d /opt/coderoad-deps/node_modules ]; then
  echo "  ⏳ 从镜像预装目录拷贝判题依赖……"
  rm -rf coderoad/node_modules
  # 用 cp -R 而不是 cp -a：镜像里的文件属主是 root，-a 会尝试保留属主，
  # 当前用户（oracle）没有 chown 权限，cp 会报 "failed to preserve ownership" 并返回非零。
  if cp -R /opt/coderoad-deps/node_modules coderoad/node_modules; then
    chmod +x coderoad/node_modules/.bin/* 2>/dev/null || true
    if [ -x coderoad/node_modules/.bin/mocha ]; then
      ok "判题依赖已就位，mocha 可执行"
    else
      fail "拷进来但 mocha 不可执行" "执行：chmod +x coderoad/node_modules/.bin/*"
    fi
  else
    fail "从镜像拷贝判题依赖失败" "执行：cp -a /opt/coderoad-deps/node_modules coderoad/node_modules"
  fi
elif command -v npm >/dev/null 2>&1; then
  # 最后兜底：镜像里没有预装依赖（例如本地调试用的别的镜像），现场装
  echo "  ⏳ 镜像里没有预装依赖，现场 npm install……"
  if ( cd coderoad && npm install --no-audit --no-fund >/tmp/npm.log 2>&1 ); then
    chmod +x coderoad/node_modules/.bin/* 2>/dev/null || true
    ok "判题依赖已安装"
  else
    fail "npm install 失败" "看 /tmp/npm.log；常见原因是网络或 registry 不可达"
    tail -5 /tmp/npm.log >&2
  fi
else
  fail "既没有预装依赖也没有 npm" "镜像应由仓库根的 Dockerfile 构建"
fi

echo ""
echo "===== 4/5 数据库对象与权限 ====="
# 镜像的 initdb 已经做过一遍；这里再跑一次同一个脚本 —— 它整体是幂等的。
# 主要覆盖两种情况：从旧镜像/预构建恢复时跳过了 initdb，或者有人手工改坏了权限。
if [ -x /opt/course/dbSetup.sh ]; then
  bash /opt/course/dbSetup.sh >/tmp/dbSetup.log 2>&1
  ok "建库初始化脚本已重跑（日志 /tmp/dbSetup.log）"
else
  fail "镜像里没有 /opt/course/dbSetup.sh" "镜像应由仓库根的 Dockerfile 构建"
fi

if sqlplus_ok 'tester/tester@//localhost:1521/FREEPDB1' 'SELECT 1 FROM dual;' '1'; then
  ok "TESTER 可以登录（判题用户就绪）"
else
  fail "TESTER 登录不了" "判题器无法工作；看 /tmp/dbSetup.log，或手工执行 sqlplus tester/tester@//localhost:1521/FREEPDB1"
fi

if sqlplus_ok 'COURSE/course@//localhost:1521/FREEPDB1' 'SELECT 1 FROM dual;' '1'; then
  ok "COURSE 可以登录（学生库就绪）"
else
  fail "COURSE 登录不了" "容器可能还没建好库；等 1 分钟后再执行 bash scripts/postCreate.sh"
fi

echo ""
echo "===== 5/5 收尾：COURSE 库状态 / 脚手架 / 自动开课变量 ====="
# 基线不再兜底装载（架构调整）：L1 的 1.3~1.18 由学生自己建那 7 张表、插那 27 行数据。
# 如果这里还去调 loadBaseline.sh，刚建好的库会被预装成 7 张表，
# 学生第一次 CREATE TABLE 就撞 ORA-00955，整条 L1 是断的。
#
# 所以这里只做"看一眼、报个数"，不做任何装载动作，也**不把非 0 张表当失败**：
#   - 全新库：0 张表 —— 正常，学生从 1.3 开始自己建
#   - 已有 N 张表：说明学生正在做/已经做过 L1（或 postCreate 在重启后又跑了一次），
#     也是正常状态，绝不能因为"不是 0"就报错或清库。
TABLE_CNT=$(sqlplus -S -L COURSE/course@//localhost:1521/FREEPDB1 2>/dev/null <<'SQL' | tr -d ' \t\r\n'
SET HEADING OFF
SET FEEDBACK OFF
SET PAGESIZE 0
SELECT COUNT(*) FROM user_tables;
EXIT;
SQL
)
case "${TABLE_CNT:-}" in
'' | *[!0-9]*)
  # 查不到表数通常是数据库还没完全就绪；第 1 步已经做过等待，这里只提示不报错。
  echo "  ⚠️  查不到 COURSE 库的表数（数据库可能还没就绪）"
  ;;
0)
  ok "COURSE 库为空（0 张表），符合预期：L1 由学生自己建表"
  ;;
*)
  ok "COURSE 库已有 ${TABLE_CNT} 张表（学生已开始/完成建表，保持不动）"
  ;;
esac

mkdir -p /tmp/dump
# 删掉讲义和配置，让工作区看起来像一个干净的新数据库项目
rm -f TUTORIAL.md coderoad.yaml tutorial.json
ok "课程脚手架已清理"

# 修执行位：这些脚本在 Windows 上提交进 git 时是 644（core.filemode=false），
# 而 coderoad.yaml 的 level setup 是直接 `./scripts/loadBaseline.sh` 调用的，
# 没有执行位就会报 Permission denied —— 在 Windows 上完全看不出来，只在 Codespace 里炸。
chmod +x scripts/*.sh 2>/dev/null || true
ok "scripts/*.sh 已补执行位"

# --- 自动开课自检 -------------------------------------------------------------
# CodeRoad 在扩展宿主进程里读 process.env.CODEROAD_TUTORIAL_URL。
# 镜像 ENV 和 devcontainer remoteEnv 各设了一份；这里验证"到底有没有传进来"，
# 学生看不到第 1 关时，这一段输出能直接指出是哪一层缺了。
echo ""
echo "  ── 自动开课自检 ──"
if [ -n "${CODEROAD_TUTORIAL_URL:-}" ]; then
  ok "CODEROAD_TUTORIAL_URL=${CODEROAD_TUTORIAL_URL}"
  if command -v curl >/dev/null 2>&1; then
    HTTP=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$CODEROAD_TUTORIAL_URL" 2>/dev/null)
    if [ "$HTTP" = "200" ]; then
      ok "tutorial.json 可访问（HTTP ${HTTP}）"
    else
      fail "tutorial.json 拉不到（HTTP ${HTTP:-超时}）" "检查 URL 是否指向 main 分支上真实存在的文件，以及仓库是否为公开仓库"
    fi
  fi
else
  fail "这个 shell 里没有 CODEROAD_TUTORIAL_URL" "镜像 ENV 和 remoteEnv 都该设它；如果这里为空但 CodeRoad 能自动显示第 1 关，说明扩展宿主那份生效了，可以忽略"
fi

echo ""
echo "======================================"
if [ "$FAILED" -gt 0 ]; then
  echo "⚠️  初始化完成，但有 $FAILED 项失败（见上面 ❌）" >&2
  echo "    学生遇到 Test Runner Failed 时，先跑：bash scripts/selfCheck.sh" >&2
  exit 1
fi
echo "✅ 环境就绪，直接开始做题"
echo "   CodeRoad 应已自动显示第 1 关；没有的话：F1 → Reload Window"
echo "======================================"
