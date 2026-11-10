const assert = require('node:assert');
const { resetSchema, replayAll, replay, assertRowCount, query, closeAll } = require('./utils');

describe('1.17 插入「借阅」数据（6 行）', () => {
  before(async () => {
    await resetSchema();
    await replayAll([
      'answers/1.3_图书分类.sql', 'answers/1.4_图书分类主键.sql',
      'answers/1.5_罚款分类.sql', 'answers/1.6_书目表.sql',
      'answers/1.7_图书表.sql', 'answers/1.9_读者表.sql',
      'answers/1.10_借阅表.sql',
      'answers/1.12_插图书分类.sql', 'answers/1.13_插罚款分类.sql',
      'answers/1.14_插书目.sql', 'answers/1.15_插图书.sql',
      'answers/1.16_插读者.sql',
    ]);
    await replay('sql/1.17_插借阅.sql');
  });
  after(async () => { await closeAll(); });

  const expected = [
    [1, '20081237', '3007071', '2010-09-19', '2010-09-20', null],
    [2, '20071235', '1005063', '2010-10-20', '2011-02-20', 1],
    [3, '20071235', '2001232', '2011-09-01', null,         null],
    [4, '20061234', '1005063', '2011-09-20', null,         null],
    [5, '20051001', '3007071', '2011-09-10', null,         null],
    [6, '20071235', '1005050', '2011-10-20', '2012-02-20', 1],
  ];

  it('「借阅」应有 6 行', async () => {
    await assertRowCount('借阅', 6);
  });

  it('每条借阅的读者、图书、日期、罚款分类应正确', async () => {
    const rows = await query(`
      SELECT 借阅流水号, 借书证号, 图书编号,
             TO_CHAR(借书日期, 'yyyy-mm-dd'),
             TO_CHAR(归还日期, 'yyyy-mm-dd'),
             罚款分类号
        FROM 借阅`);
    const map = new Map(rows.map((r) => [Number(r[0]), r]));
    for (const [no, reader, book, borrow, back, fine] of expected) {
      const r = map.get(no);
      assert.ok(
        r,
        `没有 借阅流水号 = ${no} 的记录 → 检查：6 条 INSERT 是否都插入了、流水号有没有写错`
      );
      const norm = (v) => (v === null ? null : typeof v === 'number' ? v : String(v).trim());
      assert.deepStrictEqual(
        [norm(r[1]), norm(r[2]), norm(r[3]), norm(r[4]), norm(r[5])],
        [reader, book, borrow, back, fine],
        `流水号 ${no} 是 ${JSON.stringify([r[1], r[2], r[3], r[4], r[5]])}，应为 ${JSON.stringify([reader, book, borrow, back, fine])} → 检查：借书证号/图书编号/借书日期/归还日期/罚款分类号（没还、没罚款写 NULL）`
      );
    }
  });
});
