#!/usr/bin/env bash
# 4.7 标准答案：按 schema 导出的 expdp 骨架
expdp COURSE/course@//localhost:1521/FREEPDB1 \
      DIRECTORY=DUMPDIR \
      SCHEMAS=COURSE
