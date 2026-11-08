SELECT 出版单位, MAX(单价) AS 最高单价, ROUND(AVG(单价), 2) AS 平均单价
  FROM 书目
 GROUP BY 出版单位
 ORDER BY 平均单价 DESC;
