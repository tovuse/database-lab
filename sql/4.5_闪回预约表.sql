-- 4.5 标准答案：删掉数据再闪回
--
-- 关键：先记下删除前的时间戳，再删，再把表闪回到那个时刻。
-- 为什么不直接写 SYSTIMESTAMP - INTERVAL '5' MINUTE：
--   闪回目标必须晚于这张表最后一次 DDL（这里是 4.4 的 ENABLE ROW MOVEMENT），
--   否则报 ORA-01466。用「记时间戳」的写法，目标永远落在 DDL 之后、删除之前。

-- TODO 在下面写：先 DELETE 并 COMMIT，再 FLASHBACK 到几秒前
