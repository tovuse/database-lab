-- 1.24 标准答案：是否借出 只能是 是/否
ALTER TABLE 图书 ADD CONSTRAINT ck_图书_借出
  CHECK (是否借出 IN ('是','否'));
