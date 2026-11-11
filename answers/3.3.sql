-- 3.3 标准答案：借书过程（插入 + 改图书状态 + 异常处理）
CREATE OR REPLACE PROCEDURE 借书 (
  p_借阅流水号 借阅.借阅流水号%TYPE,
  p_借书证号   借阅.借书证号%TYPE,
  p_图书编号   借阅.图书编号%TYPE
) IS
BEGIN
  INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
  VALUES (p_借阅流水号, p_借书证号, p_图书编号, SYSDATE);

  UPDATE 图书 SET 是否借出 = '是' WHERE 图书编号 = p_图书编号;
EXCEPTION
  WHEN OTHERS THEN
    RAISE_APPLICATION_ERROR(-20010, '借书失败：' || SQLERRM);
END;
/
