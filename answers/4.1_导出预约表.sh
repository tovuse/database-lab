#!/usr/bin/env bash
# 4.1 标准答案：导出「预约」表
#
# Data Pump 是命令行程序，不是 SQL —— 在终端里执行，不是 sqlplus 里。
# DUMPFILE / LOGFILE 必须用纯 ASCII 文件名（中文会报 ORA-39155）。
set -e

expdp COURSE/course@//localhost:1521/FREEPDB1 \
      DIRECTORY=DUMPDIR \
      DUMPFILE=yuyue.dmp \
      LOGFILE=yuyue.log \
      TABLES=预约
