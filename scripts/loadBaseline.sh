#!/usr/bin/env bash
# 把基线数据装进学生自己的 COURSE 库（**默认不装**，需要显式开关）
#
# 做什么：
#   1. 清空 COURSE 库的所有对象（幂等，允许重复执行）
#   2. 重建 7 张表 + 装入指导书 3.1.4 的原始数据
#
# ⚠️ 为什么默认不装（这是 2026-11 架构调整的关键）：
#   课程 L1 的 1.3~1.18 让学生**自己**建这 7 张表、插这 27 行数据，
#   学生的 SQL 要真的落到自己的 COURSE 库里（判题也从 TESTER 搬到了 COURSE）。
#   如果这里默认预装，学生做 L1 时第一次 CREATE TABLE 就会撞
#   ORA-00955: name is already used by an existing object，整条路是断的。
#   正常情况下学生走完 L1，COURSE 库里已经有这 7 张表了，根本不需要本脚本。
#
# 什么时候需要它：
#   库里被清空 / 被改坏，想恢复到"指导书 3.1.4 的原始数据"时，显式打开开关：
#     COURSE_LOAD_BASELINE=1 bash scripts/loadBaseline.sh
#
# 为什么幂等很重要：
#   CodeRoad 每次继续课程都会重新跑 level setup，
#   脚本必须能重复执行而不报错。
set -uo pipefail
cd "$(dirname "$0")/.."

CONN="COURSE/course@//localhost:1521/FREEPDB1"

# --- 开关：默认跳过 ------------------------------------------------------------
# 只认 "1"（以及等价的非零写法不必支持，保持判断简单可预测）。
# 注意这里必须 exit 0：CodeRoad 的 level setup 直接调用本脚本，
# 非零退出会被记成 setup 失败，学生看到莫名其妙的报错。
if [ "${COURSE_LOAD_BASELINE:-0}" != "1" ]; then
  echo "跳过基线装载（L1 会让学生自己建表）"
  echo "   需要恢复 7 张表 + 27 行原始数据时：COURSE_LOAD_BASELINE=1 bash scripts/loadBaseline.sh"
  exit 0
fi

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
