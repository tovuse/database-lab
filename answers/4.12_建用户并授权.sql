-- 4.12 标准答案：建用户 <姓名拼音>
-- 注意：23ai 默认密码区分大小写且有复杂度要求，这里用 zw2026oracle
CREATE USER zhangwei IDENTIFIED BY zw2026oracle;
GRANT CONNECT, RESOURCE TO zhangwei;
