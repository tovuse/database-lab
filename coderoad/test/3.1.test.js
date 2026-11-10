const assert = require('node:assert');
const {
  resetSchema,
  replay,
  scalar,
  assertObject,
  assertCompiled,
  closeAll,
} = require('./utils');

/**
 * 3.1 写出「借书」存储过程的骨架
 * 判题：重放基线 → 重放学生的 3.1 → 断言过程存在、能编译、三个参数齐全。
 * 这一步故意不检查过程做了什么：骨架阶段它就是个空壳。
 */
describe('3.1 写借书过程骨架', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
    await replay('sql/3.1_借书骨架.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('应有 借书 存储过程', async () => {
    await assertObject('借书', 'PROCEDURE');
  });

  it('应能编译通过', async () => {
    await assertCompiled('借书');
  });

  it('应有 3 个输入参数', async () => {
    const n = await scalar(`
      SELECT COUNT(*) FROM user_arguments
       WHERE object_name = '借书' AND in_out = 'IN' AND argument_name IS NOT NULL`);
    assert.ok(
      n === 3,
      `参数个数是 ${n}，要求 3 个（借阅流水号、借书证号、图书编号）→ 检查：过程名后面的括号里是不是写了三个参数`
    );
  });
});
