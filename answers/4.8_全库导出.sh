#!/usr/bin/env bash
# 4.8 标准答案：按 schema 导出整个 COURSE 库
expdp COURSE/course@//localhost:1521/FREEPDB1 \
      DIRECTORY=DUMPDIR \
      DUMPFILE=course.dmp \
      LOGFILE=course.log \
      SCHEMAS=COURSE
