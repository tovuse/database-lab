#!/usr/bin/env bash
# 4.2 标准答案：expdp 补上 DUMPFILE / LOGFILE
#
# DUMPFILE / LOGFILE 必须用纯 ASCII 文件名（中文会报 ORA-39155）。
expdp COURSE/course@//localhost:1521/FREEPDB1 \
      DIRECTORY=DUMPDIR \
      DUMPFILE=yuyue.dmp \
      LOGFILE=yuyue.log
