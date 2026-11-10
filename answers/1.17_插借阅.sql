-- 1.17 标准答案：借阅 6 行
INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号)
VALUES (1, '20081237', '3007071', TO_DATE('2010/09/19','yyyy/mm/dd'), TO_DATE('2010/09/20','yyyy/mm/dd'), NULL);
INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号)
VALUES (2, '20071235', '1005063', TO_DATE('2010/10/20','yyyy/mm/dd'), TO_DATE('2011/02/20','yyyy/mm/dd'), 1);
INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号)
VALUES (3, '20071235', '2001232', TO_DATE('2011/09/01','yyyy/mm/dd'), NULL, NULL);
INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号)
VALUES (4, '20061234', '1005063', TO_DATE('2011/09/20','yyyy/mm/dd'), NULL, NULL);
INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号)
VALUES (5, '20051001', '3007071', TO_DATE('2011/09/10','yyyy/mm/dd'), NULL, NULL);
INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号)
VALUES (6, '20071235', '1005050', TO_DATE('2011/10/20','yyyy/mm/dd'), TO_DATE('2012/02/20','yyyy/mm/dd'), 1);
