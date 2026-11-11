-- 3.13 标准答案：图书丢失过程
CREATE OR REPLACE PROCEDURE 图书丢失 (
  p_借书证号 借阅.借书证号%TYPE,
  p_图书编号 借阅.图书编号%TYPE
) IS
BEGIN
  UPDATE 借阅
     SET 罚款分类号 = 3,
         备注 = '丢失'
   WHERE 借书证号 = p_借书证号
     AND 图书编号 = p_图书编号
     AND 归还日期 IS NULL;
END;
/
