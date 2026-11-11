-- 1.4 标准答案：给「图书分类」加主键
ALTER TABLE 图书分类
  ADD CONSTRAINT pk_图书分类 PRIMARY KEY (图书分类号);
