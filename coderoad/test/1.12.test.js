const assert = require('node:assert');
const { loadUpTo, assertRowCount, query, closeAll } = require('./utils');

describe('1.12 插入「图书分类」数据（3 行）', () => {
  before(async () => {
    await loadUpTo('1.12');
  });
  after(async () => { await closeAll(); });

  it('「图书分类」应有 3 行', async () => {
    await assertRowCount('图书分类', 3);
  });

  it('三个分类号与类名应和指导书一致', async () => {
    const rows = await query(
      `SELECT 图书分类号, 类名 FROM 图书分类 ORDER BY 图书分类号`
    );
    const expected = [['100', '文学'], ['200', '科技'], ['300', '哲学']];
    assert.strictEqual(
      rows.length, expected.length,
      `查到 ${rows.length} 行，应为 ${expected.length} 行 → 检查：是否漏插或重复插入`
    );
    for (let i = 0; i < expected.length; i++) {
      const got = [String(rows[i][0]).trim(), String(rows[i][1]).trim()];
      assert.deepStrictEqual(
        got, expected[i],
        `第 ${i + 1} 行是 ${JSON.stringify(got)}，应为 ${JSON.stringify(expected[i])} → 检查：分类号和类名是否一一对应`
      );
    }
  });
});
