CREATE TABLE 读者 (
  借书证号   CHAR(8)      NOT NULL,
  姓名       VARCHAR2(20) NOT NULL,
  单位       VARCHAR2(60),
  性别       CHAR(3),
  地址       VARCHAR2(80),
  联系电话   VARCHAR2(20),
  身份证编号 VARCHAR2(18),
  CONSTRAINT pk_读者      PRIMARY KEY (借书证号),
  CONSTRAINT ck_读者_性别 CHECK (性别 IN ('男','女'))
);
