#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
把 sql/ 下的答案文件还原成空模板。
规则：保留文件头部的 -- 注释块，去掉所有 SQL，末尾加 -- TODO 提示。
用法：python make_templates.py
"""
import io, os, re, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
SQL_DIR = os.path.join(ROOT, 'sql')

# 每关的 TODO 提示语（按关卡号）
TODO = {
    '1.5':  '在下面写出你的 CREATE TABLE 语句',
    '1.6':  '在下面写出你的 CREATE TABLE 语句',
    '1.7':  '在下面写出你的 CREATE TABLE 语句',
    '1.8':  '在下面写出你的 CREATE TABLE 语句',
    '1.9':  '在下面写出你的 CREATE TABLE 语句',
    '1.10': '在下面写出你的 CREATE TABLE 语句',
    '1.11': '在下面写 INSERT 语句',
    '1.12': '在下面写 INSERT / UPDATE / DELETE',
    '1.13': '在下面写 ALTER TABLE 语句',
    '2.6':  '在下面写你的 SELECT 语句',
    '2.7':  '在下面写你的 SELECT 语句',
    '2.8':  '在下面写你的 SELECT 语句',
    '2.9':  '在下面写你的 SELECT 语句',
    '2.10': '在下面写你的 SELECT 语句',
    '2.11': '在下面写你的 SELECT 语句',
    '2.12': '在下面写你的 SELECT 语句',
    '2.13': '在下面写你的 SELECT 语句',
    '2.14': '在下面写你的 SELECT 语句',
    '2.15': '在下面写你的 SELECT 语句',
}

def level_of(fname):
    m = re.match(r'(\d+\.\d+)_', fname)
    return m.group(1) if m else None

def header_of(text):
    """取出开头的 -- 注释块（连续的 -- 行），原样保留"""
    lines = text.split('\n')
    out = []
    for line in lines:
        if line.strip().startswith('--') or line.strip() == '':
            out.append(line)
        else:
            break
    # 去掉尾部多余空行
    while out and out[-1].strip() == '':
        out.pop()
    return out

count = 0
for path in sorted(glob.glob(os.path.join(SQL_DIR, '*.sql'))):
    fname = os.path.basename(path)
    lv = level_of(fname)
    if lv not in TODO:
        continue
    text = io.open(path, encoding='utf-8').read()
    # 已经是空模板（有 TODO 且没有 SQL）就跳过
    has_sql = any(
        l.strip() and not l.strip().startswith('--')
        for l in text.split('\n')
    )
    if not has_sql and 'TODO' in text:
        continue
    hdr = header_of(text)
    body = '\n'.join(hdr) + '\n\n-- TODO ' + TODO[lv] + '\n'
    io.open(path, 'w', encoding='utf-8').write(body)
    count += 1

print(f"还原 {count} 个空模板")
