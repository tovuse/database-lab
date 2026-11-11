-- 1.22 标准答案：联系电话 必须是 11 位数字
ALTER TABLE 读者 ADD CONSTRAINT ck_读者_电话
  CHECK (REGEXP_LIKE(联系电话, '^[0-9]{11}$'));
