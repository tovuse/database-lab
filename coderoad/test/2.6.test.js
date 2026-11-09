const assert = require('node:assert');
const { resetSchema, replay, assertQueryEquals, closeAll } = require('./utils');

describe('2.6 统计红楼梦各版的藏书数量', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
  });
  after(async () => { await closeAll(); });

  it('结果应与标准答案一致（按 ISBN 排序）', async () => {
    await assertQueryEquals(
      'sql/2.6_红楼梦藏书量.sql',
      `SELECT b.ISBN, b.书名, COUNT(t.图书编号) AS 册数
         FROM 书目 b LEFT JOIN 图书 t ON b.ISBN = t.ISBN
        WHERE b.书名 = '红楼梦'
        GROUP BY b.ISBN, b.书名
        ORDER BY b.ISBN`,
      { ordered: true, hint: '按 ISBN 分组数册数，要用 LEFT JOIN 才不会漏掉没有藏书的版本' }
    );
  });
});
