-- 4.11 把「预约」表闪回恢复
-- 目标：一条 FLASHBACK TABLE ... TO TIMESTAMP (...)。
-- 时间用「5 秒前」这个量级：必须晚于 4.9 的 DDL，又早于 4.10 的删除。
-- 写成「5 分钟前」会落在 DDL 之前，报 ORA-01466。

-- TODO 在下面写 FLASHBACK TABLE 语句
