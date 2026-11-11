const assert = require('node:assert');
const {
  resetSchema,
  replay,
  assertQueryEquals,
  runQueryFile,
  closeAll,
} = require('./utils');

describe('2.2 高等教育出版社的书目，按单价降序', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('列数应为 5（ISBN/书名/作者/出版单位/单价）', async () => {
    // 真的执行学生的查询、数它返回几列。
    // 早期这里写的是 assert.ok(true) 占位，空模板也能过，起不到判题作用。
    const rows = await runQueryFile('sql/2.2.sql');
    assert.ok(rows.length >= 1, '查询没有返回任何行 → 检查：WHERE 条件是否写对');
    assert.strictEqual(
      rows[0].length, 5,
      `查询返回 ${rows[0].length} 列，应为 5 列（ISBN/书名/作者/出版单位/单价）→ 检查：SELECT 后面选了哪些列`
    );
  });

  it('结果应与标准答案一致（按单价降序）', async () => {
    await assertQueryEquals(
      'sql/2.2.sql',
      `SELECT ISBN, 书名, 作者, 出版单位, 单价
         FROM 书目
        WHERE 出版单位 = '高等教育出版社'
        ORDER BY 单价 DESC`,
      {
        ordered: true,
        hint: '单表查询 书目，WHERE 出版单位 = 「高等教育出版社」，ORDER BY 单价 DESC',
      }
    );
  });
});
