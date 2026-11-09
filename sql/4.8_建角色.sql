-- 4.8 标准答案：建角色「图书管理员」
-- 授予：CONNECT 角色 + 三个过程的 EXECUTE + 书目表的 SELECT
--
-- 为什么授 CONNECT（角色）而不是 CREATE SESSION（系统权限）：
--   给角色授系统权限需要 GRANT ANY PRIVILEGE，COURSE 没有这个权限；
--   授角色只需要 GRANT ANY ROLE（COURSE 有）。教学效果一样。

-- TODO 在下面写 CREATE ROLE 和几条 GRANT
