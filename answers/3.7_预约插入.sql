-- 3.7 标准答案：图书预约过程（判断 + 插入）
CREATE OR REPLACE PROCEDURE 图书预约 (
  p_预约流水号 预约.预约流水号%TYPE,
  p_借书证号   预约.借书证号%TYPE,
  p_ISBN       预约.ISBN%TYPE
) IS
  v_可借数 NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_可借数
    FROM 图书
   WHERE ISBN = p_ISBN AND 是否借出 = '否';

  IF v_可借数 > 0 THEN
    RAISE_APPLICATION_ERROR(-20001, '该书目有可借图书，请查找');
  END IF;

  INSERT INTO 预约 (预约流水号, 借书证号, ISBN, 预约时间)
  VALUES (p_预约流水号, p_借书证号, p_ISBN, SYSDATE);
END;
/
