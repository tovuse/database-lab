-- 3.9 标准答案：还书过程（补归还日期 + 改图书状态）
CREATE OR REPLACE PROCEDURE 还书 (
  p_借书证号   借阅.借书证号%TYPE,
  p_图书编号   借阅.图书编号%TYPE,
  p_罚款分类号 借阅.罚款分类号%TYPE
) IS
BEGIN
  UPDATE 借阅
     SET 归还日期 = SYSDATE,
         罚款分类号 = p_罚款分类号
   WHERE 借书证号 = p_借书证号
     AND 图书编号 = p_图书编号
     AND 归还日期 IS NULL;

  UPDATE 图书 SET 是否借出 = '否' WHERE 图书编号 = p_图书编号;
END;
/
