#!/usr/bin/env bash
# 把基线数据装进学生自己的 COURSE 库（Level 2 开始时自动调用）
#
# 做什么：
#   1. 清空 COURSE 库的所有对象（幂等，允许重复执行）
#   2. 重建 7 张表 + 装入指导书 3.1.4 的原始数据
#
# 为什么幂等很重要：
#   CodeRoad 每次继续课程都会重新跑 level setup，
#   脚本必须能重复执行而不报错。
set -uo pipefail
cd "$(dirname "$0")/.."

CONN="COURSE/course@//localhost:1521/FREEPDB1"

echo "▶ 清理 COURSE 库的旧对象……"
sqlplus -S -L "$CONN" <<'SQL' >/dev/null 2>&1
WHENEVER SQLERROR CONTINUE
SET HEADING OFF
SET FEEDBACK OFF
SET PAGESIZE 0
SET LINESIZE 1000
SPOOL /tmp/_clean.sql
SELECT 'DROP TRIGGER "' || trigger_name || '";' FROM user_triggers;
SELECT 'DROP VIEW "' || view_name || '";' FROM user_views;
SELECT 'DROP SEQUENCE "' || sequence_name || '";' FROM user_sequences;
SELECT 'DROP TABLE "' || table_name || '" CASCADE CONSTRAINTS PURGE;' FROM user_tables;
SPOOL OFF
@/tmp/_clean.sql
EXIT;
SQL

echo "▶ 装入 7 张表 + 指导书原始数据……"
if ! sqlplus -S -L "$CONN" <<SQL; then
WHENEVER SQLERROR EXIT FAILURE
@answers/00.sql
EXIT
SQL
  echo "❌ 基线数据装载失败（上面有 Oracle 报错）" >&2
  exit 1
fi

echo "✅ 基线数据已就绪：7 张表，共 27 行数据"
echo "   自己验证：sqlplus -S $CONN"
echo "             SELECT table_name FROM user_tables;"
