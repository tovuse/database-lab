#!/usr/bin/env bash
# 清空 COURSE schema 里的所有对象，回到"干净的库"
#
# 什么时候用：
#   - 想从头重做某一关
#   - 前面的表建错了，想推倒重来
#   - 上一门实验的残留对象干扰当前实验
#
# ⚠️ 这会删掉你 COURSE 库里所有表/视图/过程，不可恢复。
set -euo pipefail

CONN="COURSE/course@//localhost:1521/FREEPDB1"

echo "⚠️  即将清空 COURSE 库里的所有对象（表/视图/过程/序列/触发器）。"
read -p "确认继续？输入 yes：" ans
if [ "$ans" != "yes" ]; then
  echo "已取消。"
  exit 0
fi

sqlplus -S -L "$CONN" <<'SQL'
WHENEVER SQLERROR CONTINUE
SET HEADING OFF
SET FEEDBACK OFF
SET PAGESIZE 0
SET LINESIZE 1000
SET VERIFY OFF

-- 生成删除语句（先子对象后表，顺序无所谓，CASCADE CONSTRAINTS 兜底）
SPOOL /tmp/_drop.sql
SELECT 'DROP TRIGGER "' || trigger_name || '";'
  FROM user_triggers;
SELECT 'DROP VIEW "' || view_name || '";'
  FROM user_views;
SELECT 'DROP ' || object_type || ' "' || object_name || '";'
  FROM user_objects
 WHERE object_type IN ('PROCEDURE','FUNCTION','PACKAGE','PACKAGE BODY','TYPE','TYPE BODY');
SELECT 'DROP SEQUENCE "' || sequence_name || '";'
  FROM user_sequences;
SELECT 'DROP TABLE "' || table_name || '" CASCADE CONSTRAINTS PURGE;'
  FROM user_tables;
SPOOL OFF

@/tmp/_drop.sql

PROMPT 已清空。
EXIT;
SQL

echo "✅ COURSE 库已清空"
echo "   验证：sqlplus -S $CONN"
echo "   然后执行：SELECT table_name FROM user_tables;   -- 应为 0 行"
