const assert = require('node:assert');
const { resetSchema, replayAll, replay, assertRowCount, query, closeAll } = require('./utils');

describe('1.18 插入「预约」数据（1 行）', () => {
  before(async () => {
    await resetSchema();
    await replayAll([
      'answers/1.3_图书分类.sql', 'answers/1.4_图书分类主键.sql',
      'answers/1.6_书目表.sql', 'answers/1.9_读者表.sql',
      'answers/1.11_预约表.sql',
      'answers/1.12_插图书分类.sql', 'answers/1.14_插书目.sql',
      'answers/1.16_插读者.sql',
    ]);
    await replay('sql/1.18_插预约.sql');
  });
  after(async () => { await closeAll(); });

  it('「预约」应有 1 行', async () => {
    await assertRowCount('预约', 1);
  });

  it('预约的读者、ISBN、预约时间应正确', async () => {
    const rows = await query(`
      SELECT 预约流水号, 借书证号, ISBN, TO_CHAR(预约时间, 'yyyy-mm-dd')
        FROM 预约`);
    assert.strictEqual(rows.length, 1,
      `查到 ${rows.length} 条预约，应为 1 条 → 检查：是不是重复插入了`);
    assert.deepStrictEqual(
      rows.map((r) => [Number(r[0]), String(r[1]).trim(), String(r[2]).trim(), String(r[3]).trim()]),
      [[1, '20081237', '9787508040110', '2011-09-11']],
      `实际是 ${JSON.stringify(rows)} → 检查：预约流水号 1、借书证号 20081237、ISBN 9787508040110、预约时间 2011/09/11`
    );
  });
});
