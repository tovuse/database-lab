const assert = require('node:assert');
const { resetSchema, replayAll, replay, assertRowCount, query, closeAll } = require('./utils');

describe('1.14 插入「书目」数据（4 行）', () => {
  before(async () => {
    await resetSchema();
    await replayAll([
      'answers/1.3.sql', 'answers/1.4.sql',
      'answers/1.6.sql',
      'answers/1.12.sql',
    ]);
    await replay('sql/1.14.sql');
  });
  after(async () => { await closeAll(); });

  const expected = [
    ['7040195836',    '数据库系统概论', '王珊',   '高等教育出版社', 39.00, '200'],
    ['9787508040110', '红楼梦',         '曹雪芹', '人民出版社',     20.00, '100'],
    ['9787506336239', '红楼梦',         '曹雪芹', '作家出版社',     34.30, '100'],
    ['9787010073750', '心学之路',       '张立文', '人民出版社',     33.80, '300'],
  ];

  it('「书目」应有 4 行', async () => {
    await assertRowCount('书目', 4);
  });

  it('每本 ISBN 对应的书名、作者、出版社、单价、分类号应正确', async () => {
    const rows = await query(
      `SELECT ISBN, 书名, 作者, 出版单位, 单价, 图书分类号 FROM 书目`
    );
    const map = new Map(rows.map((r) => [String(r[0]).trim(), r]));
    for (const [isbn, book, author, pub, price, cat] of expected) {
      const r = map.get(isbn);
      assert.ok(
        r,
        `没有 ISBN = ${isbn} 的书目（${book}）→ 检查：4 条 INSERT 是否都插入了、ISBN 有没有写错`
      );
      assert.deepStrictEqual(
        [String(r[1]).trim(), String(r[2]).trim(), String(r[3]).trim(),
         Number(r[4]), String(r[5]).trim()],
        [book, author, pub, price, cat],
        `「${book}」的字段是 ${JSON.stringify([r[1], r[2], r[3], r[4], r[5]])}，应为 ${JSON.stringify([book, author, pub, price, cat])} → 检查：书名/作者/出版单位/单价/图书分类号`
      );
    }
  });
});
