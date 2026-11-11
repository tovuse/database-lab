#!/usr/bin/env bash
# 4.3 标准答案：导出「预约」表
set -e

expdp COURSE/course@//localhost:1521/FREEPDB1 \
      DIRECTORY=DUMPDIR \
      DUMPFILE=yuyue.dmp \
      LOGFILE=yuyue.log \
      TABLES=预约
