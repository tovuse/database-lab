const assert = require('node:assert');
const {
  resetSchema,
  replay,
  scalar,
  assertObject,
  assertCompiled,
  callProcedure,
  closeAll,
} = require('./utils');

/**
 * 3.8 还书过程骨架：只改图书状态
 * 判题：造一条未还记录 → 调用还书 → 断言 图书.是否借出 变回「否」。
 * 归还日期是下一关才填的，这一步不检查。
 */
describe('3.8 还书过程改图书状态', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
    await replay('answers/3.8_造一条未还记录.sql');
    await replay('sql/3.8_还书改图书状态.sql');
    await callProcedure(`BEGIN 还书('20051001', '1005050', 1); END;`);
  });

  after(async () => {
    await closeAll();
  });

  it('应有 还书 存储过程且编译通过', async () => {
    await assertObject('还书', 'PROCEDURE');
    await assertCompiled('还书');
  });

  it('应有 3 个输入参数', async () => {
    const n = await scalar(`
      SELECT COUNT(*) FROM user_arguments
       WHERE object_name = '还书' AND in_out = 'IN' AND argument_name IS NOT NULL`);
    assert.ok(
      n === 3,
      `参数个数是 ${n}，要求 3 个（借书证号、图书编号、罚款分类号）`
    );
  });

  it('图书的是否借出应变成「否」', async () => {
    const s = await scalar(
      `SELECT 是否借出 FROM 图书 WHERE 图书编号 = '1005050'`
    );
    assert.strictEqual(
      String(s).trim(), '否',
      `图书状态是「${String(s).trim()}」，应为「否」→ 检查：过程里有没有 UPDATE 图书 SET 是否借出 = '否'`
    );
  });
});
