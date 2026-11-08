#!/usr/bin/env bash
# Codespaces 创建后初始化：建判题用户、装依赖、清理课程脚手架
set -e
cd "${WORKSPACE_FOLDER:-$PWD}"

echo "===== 1/4 等待 Oracle ====="
bash scripts/waitForDb.sh

echo "===== 2/4 创建判题用户 TESTER ====="
sqlplus -S / as sysdba <<'SQL' || true
ALTER SESSION SET CONTAINER = FREEPDB1;

-- 判题专用 schema：测试把学生脚本重放这里，不动学生自己的库
CREATE USER tester IDENTIFIED BY tester;
GRANT CONNECT, RESOURCE, DBA TO tester;
GRANT UNLIMITED TABLESPACE TO tester;

-- 学生用户需要实验四的建用户/角色/概要文件权限
GRANT CREATE USER, DROP USER, ALTER USER TO COURSE;
GRANT CREATE ROLE, DROP ROLE, GRANT ANY ROLE TO COURSE;
GRANT CREATE PROFILE, DROP PROFILE, ALTER PROFILE TO COURSE;
GRANT SELECT ANY DICTIONARY TO COURSE;

-- expdp/impdp 需要的目录对象
CREATE OR REPLACE DIRECTORY dumpdir AS '/tmp/dump';
GRANT READ, WRITE ON DIRECTORY dumpdir TO COURSE;
GRANT READ, WRITE ON DIRECTORY dumpdir TO tester;

EXIT;
SQL

echo "===== 3/4 安装判题器依赖 ====="
if [ -f coderoad/package.json ]; then
  npm install --prefix coderoad --no-audit --no-fund
else
  echo "   （coderoad/package.json 尚未就位，跳过）"
fi

echo "===== 4/4 清理课程脚手架 ====="
# 删掉讲义和配置，让工作区看起来像一个干净的新数据库项目
rm -f TUTORIAL.md coderoad.yaml tutorial.json
mkdir -p /tmp/dump

echo ""
echo "✅ 环境就绪。CodeRoad 正在加载课程……"
echo "   如未自动打开：Ctrl+Shift+P → CodeRoad: Start"
