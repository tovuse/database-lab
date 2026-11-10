-- 4.19 标准答案：建 用户_oper 并授角色
CREATE USER 用户_oper IDENTIFIED BY oper2026;
GRANT 图书管理员 TO 用户_oper;

-- 建完后以 用户_oper 身份调用过程（判题器会自动做）：
--   BEGIN COURSE.借书(9001, '20081237', '2001231'); END;
