-- 4.15 标准答案：查当前用户的对象权限
SELECT owner, table_name, privilege AS 对象权限 FROM user_tab_privs;

-- 说明：这条在 COURSE 会话里跑，查的是"我"的权限。
-- 如果要在管理视角看别人的权限，用 dba_tab_privs。
