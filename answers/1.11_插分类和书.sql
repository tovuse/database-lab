-- 1.9 判题辅助：只插 CREATE TABLE 外键需要的少量数据
INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('200', '科技');
INSERT INTO 罚款分类 (罚款分类号, 罚款名称, 罚金) VALUES (1, '延期', 10);
INSERT INTO 书目 (ISBN, 书名, 单价, 图书分类号) VALUES ('7040195836', '数据库系统概论', 39, '200');
INSERT INTO 图书 (图书编号, ISBN) VALUES ('1005050', '7040195836');
INSERT INTO 读者 (借书证号, 姓名) VALUES ('20051001', '王菲');
