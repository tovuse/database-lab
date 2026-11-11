const assert = require('node:assert');
const { resetSchema, replay, assertConstraint, expectError, exec, scalar, closeAll } = require('./utils');

describe('1.24 给「图书」的借出状态加 CHECK 约束（只能是「是」或「否」）', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00.sql');
    await replay('sql/1.24.sql');
  });
  after(async () => { await closeAll(); });

  it('图书表应有涉及 是否借出 的 CHECK 约束', async () => {
    await assertConstraint('图书', 'C', '是否借出');
  });

  it('是否借出 写成「中」应被拒绝', async () => {
    await expectError(
      `INSERT INTO 图书 (图书编号, ISBN, 是否借出)
       VALUES ('9999998', '7040195836', '中')`,
      'ORA-02290',
      `要有 CHECK (是否借出 IN ('是','否'))`
    );
  });

  it('「是」和「否」都应能插入', async () => {
    await exec(
      `INSERT INTO 图书 (图书编号, ISBN, 是否借出) VALUES ('9999996', '7040195836', '是')`
    );
    await exec(
      `INSERT INTO 图书 (图书编号, ISBN, 是否借出) VALUES ('9999997', '7040195836', '否')`
    );
    const n = await scalar(
      `SELECT COUNT(*) FROM 图书 WHERE 图书编号 IN ('9999996', '9999997')`
    );
    assert.strictEqual(
      Number(n), 2,
      `「是」「否」合法的值被拒绝了 ${n} 条 → 检查：IN 列表里是否只写了其中一个`
    );
  });
});
