SELECT r.借书证号, r.姓名, t.图书编号, b.书名,
       TO_CHAR(l.借书日期, 'yyyy/mm/dd') AS 借书日期
  FROM 借阅 l
  JOIN 读者 r ON l.借书证号 = r.借书证号
  JOIN 图书 t ON l.图书编号 = t.图书编号
  JOIN 书目 b ON t.ISBN = b.ISBN
 WHERE l.归还日期 IS NULL
 ORDER BY r.借书证号;
