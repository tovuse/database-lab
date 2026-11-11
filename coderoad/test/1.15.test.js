const assert = require('node:assert');
const { loadUpTo, assertRowCount, query, closeAll } = require('./utils');

describe('1.15: 插入「图书」数据（5 行）', () => {
  before(async () => {
    await loadUpTo('1.15');
  });
  after(async () => { await closeAll(); });

  const expected = [
    ['2001231', '7040195836',    '否'],
    ['2001232', '7040195836',    '是'],
    ['1005050', '9787506336239', '否'],
    ['1005063', '9787508040110', '是'],
    ['3007071', '9787010073750', '是'],
  ];

  it('「图书」应有 5 行', async () => {
    await assertRowCount('图书', 5);
  });

  it('每本图书的 ISBN 和是否借出应正确', async () => {
    const rows = await query(`SELECT 图书编号, ISBN, 是否借出 FROM 图书`);
    const map = new Map(rows.map((r) => [String(r[0]).trim(), r]));
    for (const [no, isbn, lent] of expected) {
      const r = map.get(no);
      assert.ok(
        r,
        `没有 图书编号 = ${no} 的图书 → 检查：5 条 INSERT 是否都插入了、编号有没有写错`
      );
      assert.deepStrictEqual(
        [String(r[1]).trim(), String(r[2]).trim()],
        [isbn, lent],
        `图书 ${no} 是 ${JSON.stringify([r[1], r[2]])}，应为 ${JSON.stringify([isbn, lent])} → 检查：ISBN 和是否借出（是/否）`
      );
    }
  });
});
