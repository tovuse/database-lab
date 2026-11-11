-- 3.12 建触发器：借阅表一插入，自动把图书标记为「已借出」
-- 目标：行级触发器 触发器_借书，AFTER INSERT ON 借阅 FOR EACH ROW，
-- 用 :NEW.图书编号 定位，把 图书.是否借出 改成 '是'。
-- :NEW.列名 代表刚插进去那一行的值。

-- TODO 在下面写 CREATE OR REPLACE TRIGGER
