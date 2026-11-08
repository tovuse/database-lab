SELECT ISBN, 书名, 作者, 出版单位, 单价
  FROM 书目
 WHERE 出版单位 = '高等教育出版社'
 ORDER BY 单价 DESC;
