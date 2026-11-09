const assert = require('node:assert');
const {
  resetSchema, replayAll, replay, assertTable, assertColumn,
  assertConstraint, query, closeAll,
} = require('./utils');

describe('1.7 建图书表', () => {
  before(async () => {
    await resetSchema();
    await replayAll([
      'answers/1.3_图书分类.sql', 'answers/1.4_图书分类主键.sql', 'answers/1.5_罚款分类.sql',
      'answers/1.6_书目表.sql',
    ]);
    await replay('sql/1.7_图书表.sql');
  });
  after(async () => { await closeAll(); });

  it('应有 图书 表和四个列', async () => {
    await assertTable('图书');
    for (const c of ['图书编号', 'ISBN', '是否借出', '备注']) {
      await assertColumn('图书', c);
    }
  });

  it('图书编号 是主键，ISBN 有外键指向书目', async () => {
    await assertConstraint('图书', 'P', '图书编号');
    await assertConstraint('图书', 'R', 'ISBN');
  });

  it('不写是否借出时默认应为「否」', async () => {
    await replay(`answers/1.7_插一本测试书.sql`);
    const v = await query(
      `SELECT 是否借出 FROM 图书 WHERE 图书编号 = '9999999'`
    );
    assert.strictEqual(
      String(v[0][0]).trim(), '否',
      `默认值是「${v[0][0]}」，应为「否」→ 检查：是否借出 CHAR(3) DEFAULT '否'`
    );
  });
});
