-- 3.9 给「还书」补上借阅表的归还日期和罚款分类号
-- 在 3.8 的基础上，于 UPDATE 图书 之前加一条 UPDATE 借阅：
-- SET 归还日期 = SYSDATE、罚款分类号 = 第三个参数；
-- WHERE 三个条件：借书证号、图书编号、归还日期 IS NULL。

-- TODO 在下面写完整的过程：UPDATE 借阅 + UPDATE 图书
