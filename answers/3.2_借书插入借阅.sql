-- 3.2 标准答案：借书过程 + 插入借阅记录
CREATE OR REPLACE PROCEDURE 借书 (
  p_借阅流水号 借阅.借阅流水号%TYPE,
  p_借书证号   借阅.借书证号%TYPE,
  p_图书编号   借阅.图书编号%TYPE
) IS
BEGIN
  INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
  VALUES (p_借阅流水号, p_借书证号, p_图书编号, SYSDATE);
END;
/
