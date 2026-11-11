-- 1.7 标准答案：建 图书 表（只建结构，不发 INSERT）
CREATE TABLE 图书 (
  图书编号 CHAR(7)      NOT NULL,
  ISBN     VARCHAR2(13) NOT NULL,
  是否借出 CHAR(3)      DEFAULT '否' NOT NULL,
  备注     VARCHAR2(100),
  CONSTRAINT pk_图书      PRIMARY KEY (图书编号),
  CONSTRAINT fk_图书_书目 FOREIGN KEY (ISBN) REFERENCES 书目(ISBN)
);
