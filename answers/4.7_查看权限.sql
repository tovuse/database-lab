-- 4.7 标准答案：查三类权限（数据字典）
SELECT granted_role AS 角色 FROM user_role_privs;

SELECT privilege AS 系统权限 FROM user_sys_privs;

SELECT owner, table_name, privilege AS 对象权限 FROM user_tab_privs;

-- 说明：上面三条都在 COURSE 会话里跑，查的是"我"的权限。
-- 如果要在管理视角看别人的权限，用 dba_role_privs / dba_sys_privs / dba_tab_privs。
