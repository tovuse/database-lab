-- 1.5 标准答案：建 罚款分类 表
CREATE TABLE 罚款分类 (
  罚款分类号 NUMBER(1)     NOT NULL,
  罚款名称   VARCHAR2(20)  NOT NULL,
  罚金       NUMBER(6,2)   NOT NULL,
  CONSTRAINT pk_罚款分类 PRIMARY KEY (罚款分类号),
  CONSTRAINT ck_罚款金额 CHECK (罚金 > 0)
);
