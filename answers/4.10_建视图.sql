-- 4.10 标准答案：建视图 VIEW_READER
-- 书目 + 分类名，两表连接
CREATE OR REPLACE VIEW VIEW_READER AS
SELECT b.ISBN,
       b.书名,
       c.类名
  FROM 书目 b
  JOIN 图书分类 c ON b.图书分类号 = c.图书分类号;
