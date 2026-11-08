SELECT t.图书编号, b.ISBN, b.书名, b.作者, b.出版单位, b.单价
  FROM 图书 t JOIN 书目 b ON t.ISBN = b.ISBN
 WHERE b.书名 = '红楼梦' AND t.是否借出 = '否'
 ORDER BY t.图书编号;
