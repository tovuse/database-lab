const assert = require('node:assert');
const { resetSchema, replayAll, replay, assertRowCount, query, closeAll } = require('./utils');

describe('1.13 插入「罚款分类」数据（3 行）', () => {
  before(async () => {
    await resetSchema();
    await replayAll([
      'answers/1.5_罚款分类.sql',
    ]);
    await replay('sql/1.13_插罚款分类.sql');
  });
  after(async () => { await closeAll(); });

  it('「罚款分类」应有 3 行', async () => {
    await assertRowCount('罚款分类', 3);
  });

  it('罚款名称和罚金应和指导书一致', async () => {
    const rows = await query(
      `SELECT 罚款分类号, 罚款名称, 罚金 FROM 罚款分类 ORDER BY 罚款分类号`
    );
    const expected = [[1, '延期', 10], [2, '损坏', 20], [3, '丢失', 50]];
    assert.strictEqual(rows.length, expected.length,
      `查到 ${rows.length} 行，应为 ${expected.length} 行 → 检查：是否漏插或重复插入`);
    for (let i = 0; i < expected.length; i++) {
      const got = [Number(rows[i][0]), String(rows[i][1]).trim(), Number(rows[i][2])];
      assert.deepStrictEqual(
        got, expected[i],
        `第 ${i + 1} 行是 ${JSON.stringify(got)}，应为 ${JSON.stringify(expected[i])} → 检查：分类号、罚款名称、罚金（10/20/50）`
      );
    }
  });
});
