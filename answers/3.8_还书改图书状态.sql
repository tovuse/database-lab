-- 3.8 标准答案：还书过程骨架（只改图书状态）
CREATE OR REPLACE PROCEDURE 还书 (
  p_借书证号   借阅.借书证号%TYPE,
  p_图书编号   借阅.图书编号%TYPE,
  p_罚款分类号 借阅.罚款分类号%TYPE
) IS
BEGIN
  UPDATE 图书 SET 是否借出 = '否' WHERE 图书编号 = p_图书编号;
END;
/
