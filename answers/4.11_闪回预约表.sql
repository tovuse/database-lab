-- 4.11 标准答案：闪回恢复预约表
--
-- 闪回目标必须晚于这张表最后一次 DDL（4.9 的 ENABLE ROW MOVEMENT），
-- 又必须早于 DELETE 的时刻，所以用「几秒前」而不是「几分钟前」。
FLASHBACK TABLE 预约 TO TIMESTAMP (SYSTIMESTAMP - INTERVAL '5' SECOND);
