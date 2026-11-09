-- 4.8 标准答案：建角色「图书管理员」
-- 授予：CONNECT 角色 + 三个过程的 EXECUTE + 书目表的 SELECT
--
-- 为什么授 CONNECT（角色）而不是 CREATE SESSION（系统权限）：
--   给角色授系统权限需要 GRANT ANY PRIVILEGE，COURSE 没有这个权限；
--   授角色只需要 GRANT ANY ROLE（COURSE 有）。教学效果一样。
CREATE ROLE 图书管理员;

GRANT CONNECT TO 图书管理员;
GRANT SELECT ON 书目 TO 图书管理员;
GRANT EXECUTE ON 借书 TO 图书管理员;
GRANT EXECUTE ON 还书 TO 图书管理员;
GRANT EXECUTE ON 图书预约 TO 图书管理员;
