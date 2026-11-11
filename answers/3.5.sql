-- 3.5 标准答案：图书预约过程骨架
-- 注意过程名用 图书预约 而不是 预约 —— Oracle 同 schema 下不允许
-- 存储过程和表重名（会报 ORA-00955）
CREATE OR REPLACE PROCEDURE 图书预约 (
  p_预约流水号 预约.预约流水号%TYPE,
  p_借书证号   预约.借书证号%TYPE,
  p_ISBN       预约.ISBN%TYPE
) IS
BEGIN
  NULL;  -- 骨架：这一步还不做任何事
END;
/
