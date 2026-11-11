const assert = require('node:assert');
const {
  resetSchema,
  replay,
  assertQueryEquals,
  closeAll,
} = require('./utils');

describe('2.5 借阅未还的读者和图书', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('结果应与标准答案一致（按借书证号排序）', async () => {
    await assertQueryEquals(
      'sql/2.5.sql',
      `SELECT r.借书证号, r.姓名, t.图书编号, b.书名,
              TO_CHAR(l.借书日期, 'yyyy/mm/dd') AS 借书日期
         FROM 借阅 l
         JOIN 读者 r ON l.借书证号 = r.借书证号
         JOIN 图书 t ON l.图书编号 = t.图书编号
         JOIN 书目 b ON t.ISBN = b.ISBN
        WHERE l.归还日期 IS NULL
        ORDER BY r.借书证号`,
      {
        ordered: true,
        hint: '要连 4 张表（借阅→读者→图书→书目），条件是 归还日期 IS NULL，日期用 TO_CHAR 格式化',
      }
    );
  });
});
