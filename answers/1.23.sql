-- 1.23 标准答案：身份证编号 必须是 18 位
ALTER TABLE 读者 ADD CONSTRAINT ck_读者_身份证
  CHECK (LENGTH(身份证编号) = 18);
