const assert = require('node:assert');
const { resetSchema, replay, assertQueryEquals, closeAll } = require('./utils');

describe('2.10 查询每类图书的册数和平均单价', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
  });
  after(async () => { await closeAll(); });

  it('结果应与标准答案一致（按分类号排序）', async () => {
    await assertQueryEquals(
      'sql/2.10_每类册数均价.sql',
      `SELECT c.图书分类号, c.类名,
              COUNT(t.图书编号) AS 册数,
              ROUND(AVG(b.单价), 2) AS 平均单价
         FROM 图书分类 c
         JOIN 书目 b ON c.图书分类号 = b.图书分类号
         LEFT JOIN 图书 t ON b.ISBN = t.ISBN
        GROUP BY c.图书分类号, c.类名
        ORDER BY c.图书分类号`,
      { ordered: true, hint: '三表连接，注意 LEFT JOIN 图书（有的书目可能一本都没藏），平均单价保留两位' }
    );
  });
});
