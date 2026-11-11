const assert = require('node:assert');
const { loadUpTo, query, scalar, closeAll } = require('./utils');

describe('1.20: 改：把分类 400 的类名改成「艺术设计」', () => {
  before(async () => {
    await loadUpTo('1.20');
  });
  after(async () => { await closeAll(); });

  it('分类 400 的类名应已改成 艺术设计', async () => {
    const v = await scalar(
      `SELECT 类名 FROM 图书分类 WHERE 图书分类号 = '400'`
    );
    assert.strictEqual(
      String(v).trim(), '艺术设计',
      `分类 400 的类名是「${v}」→ 检查：UPDATE 的 SET 子句、WHERE 是否写成 图书分类号 = '400'，以及有没有执行`
    );
  });

  it('其他分类的类名不应被修改', async () => {
    const rows = await query(
      `SELECT 图书分类号, 类名 FROM 图书分类 WHERE 图书分类号 <> '400' ORDER BY 图书分类号`
    );
    assert.deepStrictEqual(
      rows.map((r) => [String(r[0]).trim(), String(r[1]).trim()]),
      [['100', '文学'], ['200', '科技'], ['300', '哲学']],
      `其他分类变成了 ${JSON.stringify(rows)} → 检查：UPDATE 有没有漏写 WHERE（漏写会改整张表）`
    );
  });
});
