#!/usr/bin/env bash
# 把指定的 .sql 文件应用到你自己（COURSE）的数据库里
#
# 为什么需要这个：
#   CodeRoad 判题时把 .sql 重放到一个临时的 TESTER schema 里，
#   这样反复保存也不会"表已存在"。
#   但你自己想用 sqlplus 看看表长什么样时，表得真的在你库里——
#   这个脚本就是干这个的。
#
# 用法：
#   ./scripts/apply.sh sql/1.3.sql
#   ./scripts/apply.sh sql/*.sql          # 按文件名顺序全跑一遍
set -euo pipefail

if [ $# -eq 0 ]; then
  echo "用法: ./scripts/apply.sh <sql文件> [更多文件...]"
  exit 1
fi

CONN="COURSE/course@//localhost:1521/FREEPDB1"

for f in "$@"; do
  if [ ! -f "$f" ]; then
    echo "❌ 找不到文件: $f" >&2
    exit 1
  fi
  echo "▶ 应用到 COURSE：$f"
  # 用 -S 静默、-L 登录失败即退出
  # WHENEVER SQLERROR EXIT FAILURE 很关键：默认 sqlplus 报 ORA 错误也返回 0
  if ! sqlplus -S -L "$CONN" <<SQL; then
WHENEVER SQLERROR EXIT FAILURE
@"$f"
EXIT
SQL
    echo "❌ $f 执行失败（上面有 Oracle 的错误信息）" >&2
    exit 1
  fi
done

echo "✅ 完成。现在可以 sqlplus 连上去查看结果了："
echo "   sqlplus -S $CONN"
