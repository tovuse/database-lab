const assert = require('node:assert');
const { loadUpTo, assertQueryEquals, closeAll } = require('./utils');

describe('2.9: 查询王菲的单位、所借书名和借阅日期', () => {
  before(async () => {
    await loadUpTo('2.9');
  });
  after(async () => { await closeAll(); });

  it('结果应与标准答案一致', async () => {
    await assertQueryEquals(
      'sql/2.9.sql',
      `SELECT r.单位, b.书名, TO_CHAR(l.借书日期, 'yyyy/mm/dd') AS 借书日期
         FROM 读者 r
         JOIN 借阅 l ON r.借书证号 = l.借书证号
         JOIN 图书 t ON l.图书编号 = t.图书编号
         JOIN 书目 b ON t.ISBN = b.ISBN
        WHERE r.姓名 = '王菲'
        ORDER BY l.借书日期`,
      { ordered: true, hint: '从读者出发四表连到书目，日期用 TO_CHAR 格式化' }
    );
  });
});
