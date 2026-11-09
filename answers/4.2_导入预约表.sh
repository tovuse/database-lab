#!/usr/bin/env bash
# 4.2 标准答案：删表 → 从转储文件导入
set -e

sqlplus -S -L COURSE/course@//localhost:1521/FREEPDB1 <<'SQL'
DROP TABLE 预约 CASCADE CONSTRAINTS;
EXIT;
SQL

impdp COURSE/course@//localhost:1521/FREEPDB1 \
      DIRECTORY=DUMPDIR \
      DUMPFILE=yuyue.dmp \
      LOGFILE=imp_yuyue.log \
      TABLES=预约
