-- 4.9 标准答案：建 用户_oper 并授角色，然后用它借书
-- 注意：跨 schema 调用过程必须带 COURSE. 前缀
CREATE USER 用户_oper IDENTIFIED BY oper2026;
GRANT 图书管理员 TO 用户_oper;

-- 下面两条需要以 用户_oper 身份登录执行（讲义里说明）：
--   sqlplus 用户_oper/oper2026@//localhost:1521/FREEPDB1
--   BEGIN COURSE.借书(9001, '20081237', '2001231'); END;
--   /
