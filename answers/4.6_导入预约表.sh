#!/usr/bin/env bash
# 4.6 标准答案：从转储文件导入预约表
set -e

impdp COURSE/course@//localhost:1521/FREEPDB1 \
      DIRECTORY=DUMPDIR \
      DUMPFILE=yuyue.dmp \
      LOGFILE=imp_yuyue.log \
      TABLES=预约
