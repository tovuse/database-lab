#!/usr/bin/env bash
# 4.1 标准答案：expdp 命令骨架
#
# Data Pump 是命令行程序，不是 SQL —— 在终端里执行，不是 sqlplus 里。
# DIRECTORY 不是 Linux 路径，而是数据库里的「目录对象」名字。
expdp COURSE/course@//localhost:1521/FREEPDB1 \
      DIRECTORY=DUMPDIR
