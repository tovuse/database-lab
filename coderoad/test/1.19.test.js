const assert = require('node:assert');
const { resetSchema, replay, query, scalar, closeAll } = require('./utils');

describe('1.19 增：向「图书分类」插入一行', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00.sql');
    await replay('sql/1.19.sql');
  });
  after(async () => { await closeAll(); });

  it('应新增一行：分类号 400、类名 艺术', async () => {
    const rows = await query(
      `SELECT 图书分类号, 类名 FROM 图书分类 WHERE 图书分类号 = '400'`
    );
    assert.strictEqual(
      rows.length, 1,
      rows.length === 0
        ? '没有插入分类 400 → 检查：INSERT 是否写了、是否保存；这一关只写 INSERT，如果顺手写了 DELETE，它会把刚插的行删掉'
        : `分类 400 有 ${rows.length} 行 → 检查：是不是插了重复记录`
    );
    assert.strictEqual(
      String(rows[0][1]).trim(), '艺术',
      `分类 400 的类名是「${rows[0][1]}」，应为「艺术」`
    );
  });

  it('原有三个分类不应受影响（总数 4 行）', async () => {
    const n = await scalar(`SELECT COUNT(*) FROM 图书分类`);
    assert.strictEqual(
      Number(n), 4,
      `图书分类 现在有 ${n} 行，应为 4 行 → 检查：是不是多插了、或者误删了原有数据`
    );
  });
});
