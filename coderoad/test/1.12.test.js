const assert = require('node:assert');
const {
  resetSchema, replayAll, replay, query, scalar, closeAll,
} = require('./utils');

describe('1.12 数据的增删改', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
    await replay('sql/1.12_增删改.sql');
  });
  after(async () => { await closeAll(); });

  it('分类 400 应已被删除（增删改三步都执行了）', async () => {
    const n = await scalar(
      `SELECT COUNT(*) FROM 图书分类 WHERE 图书分类号 = '400'`
    );
    assert.ok(
      n === 0,
      '分类 400 还在 → 检查：INSERT 之后有没有 UPDATE 再 DELETE'
    );
  });

  it('原有三个分类不应被误删', async () => {
    const n = await scalar(`SELECT COUNT(*) FROM 图书分类`);
    assert.strictEqual(
      Number(n), 3,
      `图书分类 现在有 ${n} 行，应为 3 → 检查：DELETE 有没有加 WHERE 图书分类号='400'`
    );
  });
});
