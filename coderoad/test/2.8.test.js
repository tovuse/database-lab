const assert = require('node:assert');
const { resetSchema, replay, assertQueryEquals, closeAll } = require('./utils');

describe('2.8 查询借阅两本及以上图书的读者', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
  });
  after(async () => { await closeAll(); });

  it('结果应与标准答案一致', async () => {
    await assertQueryEquals(
      'sql/2.8_借阅两本以上.sql',
      `SELECT r.借书证号, r.姓名, COUNT(*) AS 借阅次数
         FROM 读者 r JOIN 借阅 l ON r.借书证号 = l.借书证号
        GROUP BY r.借书证号, r.姓名
       HAVING COUNT(*) >= 2
        ORDER BY r.借书证号`,
      { ordered: true, hint: '分组后用 HAVING COUNT(*) >= 2 筛选，不能用 WHERE' }
    );
  });
});
