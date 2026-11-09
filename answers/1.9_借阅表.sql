CREATE TABLE 借阅 (
  借阅流水号 NUMBER(6)  NOT NULL,
  借书证号   CHAR(8)    NOT NULL,
  图书编号   CHAR(7)    NOT NULL,
  借书日期   DATE,
  归还日期   DATE,
  罚款分类号 NUMBER(1),
  备注       VARCHAR2(100),
  CONSTRAINT pk_借阅      PRIMARY KEY (借阅流水号),
  CONSTRAINT fk_借阅_读者 FOREIGN KEY (借书证号)   REFERENCES 读者(借书证号),
  CONSTRAINT fk_借阅_图书 FOREIGN KEY (图书编号)   REFERENCES 图书(图书编号),
  CONSTRAINT fk_借阅_罚款 FOREIGN KEY (罚款分类号) REFERENCES 罚款分类(罚款分类号),
  CONSTRAINT ck_借阅_日期 CHECK (归还日期 IS NULL OR 归还日期 >= 借书日期)
);
