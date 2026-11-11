const assert = require('node:assert');
const {
  resetSchema,
  replay,
  query,
  conn,
  assertConstraint,
  closeAll,
} = require('./utils');

/**
 * 1.4 给「图书分类」加主键
 * 判题：清空 → 重放 1.3（前置）→ 重放 1.4（本关）→ 断言
 */
describe('1.4 给「图书分类」加主键', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/1.3.sql'); // 前置关卡的标准答案，保证起始状态正确
    await replay('sql/1.4.sql'); // 学生这一关写的
  });

  after(async () => {
    await closeAll();
  });

  it('图书分类 应有主键', async () => {
    await assertConstraint('图书分类', 'P');
  });

  it('主键应建在 图书分类号 上', async () => {
    const rows = await query(`
      SELECT cc.column_name
        FROM user_constraints c
        JOIN user_cons_columns cc
          ON c.constraint_name = cc.constraint_name
       WHERE c.table_name = '图书分类' AND c.constraint_type = 'P'`);
    const cols = rows.map((r) => r[0]);
    assert.ok(
      cols.includes('图书分类号'),
      `主键建在了 ${JSON.stringify(cols)} 上 → 检查：PRIMARY KEY 括号里应为 图书分类号`
    );
  });

  it('插入重复主键应被拒绝（主键确实生效）', async () => {
    const c = await conn();
    try {
      await c.execute(
        `INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('999', '测试A')`,
        {},
        { autoCommit: false }
      );

      let threw = false;
      let msg = '';
      try {
        await c.execute(
          `INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('999', '测试B')`,
          {},
          { autoCommit: false }
        );
      } catch (e) {
        threw = true;
        msg = e.message || '';
      }

      if (!threw) {
        throw new Error(
          '主键没生效：重复的「图书分类号」居然插入成功了 → 检查：是否真的建了 PRIMARY KEY'
        );
      }
      if (!msg.includes('ORA-00001')) {
        throw new Error(
          `报错了但不是主键冲突（期望 ORA-00001），实际「${
            msg.split('\n')[0]
          }」 → 检查：主键是否建在 图书分类号 上`
        );
      }
    } finally {
      await c.rollback().catch(() => {});
    }
  });
});
