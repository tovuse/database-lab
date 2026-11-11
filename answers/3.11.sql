-- 3.11 标准答案：简化借书过程（流水号走序列）
CREATE OR REPLACE PROCEDURE 简化借书 (
  p_借书证号 借阅.借书证号%TYPE,
  p_图书编号 借阅.图书编号%TYPE
) IS
BEGIN
  INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
  VALUES (序列_借阅.NEXTVAL, p_借书证号, p_图书编号, SYSDATE);
END;
/
