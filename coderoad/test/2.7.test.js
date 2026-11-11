const assert = require('node:assert');
const { resetSchema, replay, assertQueryEquals, closeAll } = require('./utils');

describe('2.7 查询 20061234 借阅未还的图书', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00.sql');
  });
  after(async () => { await closeAll(); });

  it('结果应与标准答案一致', async () => {
    await assertQueryEquals(
      'sql/2.7.sql',
      `SELECT t.图书编号, b.书名
         FROM 借阅 l
         JOIN 图书 t ON l.图书编号 = t.图书编号
         JOIN 书目 b ON t.ISBN = b.ISBN
        WHERE l.借书证号 = '20061234' AND l.归还日期 IS NULL`,
      { hint: '三个条件：借书证号=20061234、归还日期 IS NULL，还要连图书和书目拿书名' }
    );
  });
});
