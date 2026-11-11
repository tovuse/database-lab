-- 1.6 标准答案：建 书目 表（含外键）
CREATE TABLE 书目 (
  ISBN       VARCHAR2(13) NOT NULL,
  书名       VARCHAR2(60) NOT NULL,
  作者       VARCHAR2(30),
  出版单位   VARCHAR2(50),
  单价       NUMBER(7,2),
  图书分类号 CHAR(3)      NOT NULL,
  CONSTRAINT pk_书目       PRIMARY KEY (ISBN),
  CONSTRAINT fk_书目_分类  FOREIGN KEY (图书分类号) REFERENCES 图书分类(图书分类号),
  CONSTRAINT ck_书目_单价  CHECK (单价 >= 0)
);
