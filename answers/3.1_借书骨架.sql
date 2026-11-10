-- 3.1 标准答案：借书过程骨架
CREATE OR REPLACE PROCEDURE 借书 (
  p_借阅流水号 借阅.借阅流水号%TYPE,
  p_借书证号   借阅.借书证号%TYPE,
  p_图书编号   借阅.图书编号%TYPE
) IS
BEGIN
  NULL;  -- 骨架：这一步还不做任何事
END;
/
