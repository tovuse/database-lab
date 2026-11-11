const assert = require('node:assert');
const { loadUpTo, assertQueryEquals, closeAll } = require('./utils');

describe('2.15: 查询借阅了所有文学类书目的读者', () => {
  before(async () => {
    await loadUpTo('2.15');
  });
  after(async () => { await closeAll(); });

  it('结果应与标准答案一致', async () => {
    await assertQueryEquals(
      'sql/2.15.sql',
      `SELECT r.姓名, r.单位
         FROM 读者 r
        WHERE NOT EXISTS (
                SELECT 1 FROM 书目 b
                 WHERE b.图书分类号 = '100'
                   AND NOT EXISTS (
                       SELECT 1 FROM 借阅 l
                         JOIN 图书 t ON l.图书编号 = t.图书编号
                        WHERE l.借书证号 = r.借书证号 AND t.ISBN = b.ISBN))
        ORDER BY r.姓名`,
      { ordered: true, hint: '「借阅了全部」用双重 NOT EXISTS：不存在一本文学类的书、这个读者没借过' }
    );
  });
});
