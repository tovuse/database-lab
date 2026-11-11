const assert = require('node:assert');
const { loadUpTo, scalar, closeAll } = require('./utils');

describe('1.21 删：删掉分类 400', () => {
  before(async () => {
    // 前置链自动完成「增」（answers/1.19.sql）和「改」（answers/1.20.sql）
    await loadUpTo('1.21');
  });
  after(async () => { await closeAll(); });

  it('分类 400 应已被删除', async () => {
    const n = await scalar(
      `SELECT COUNT(*) FROM 图书分类 WHERE 图书分类号 = '400'`
    );
    assert.strictEqual(
      Number(n), 0,
      `分类 400 还在 → 检查：DELETE 是否写了 WHERE 图书分类号 = '400'，以及有没有执行`
    );
  });

  it('原有三个分类不应被误删（总数 3 行）', async () => {
    const n = await scalar(`SELECT COUNT(*) FROM 图书分类`);
    assert.strictEqual(
      Number(n), 3,
      `图书分类 现在有 ${n} 行，应为 3 行 → 检查：DELETE 有没有漏写 WHERE（漏写会删光整张表）`
    );
  });
});
