const assert = require('node:assert');
const {
  loadUpTo,
  scalar,
  assertObject,
  assertCompiled,
  closeAll,
} = require('./utils');

/**
 * 3.5 写出「预约」存储过程的骨架
 * 判题：过程存在、能编译、三个参数齐全。不检查过程做了什么。
 */
describe('3.5 写预约过程骨架', () => {
  before(async () => {
    await loadUpTo('3.5');
  });

  after(async () => {
    await closeAll();
  });

  it('应有 图书预约 存储过程', async () => {
    await assertObject('图书预约', 'PROCEDURE');
  });

  it('应能编译通过', async () => {
    await assertCompiled('图书预约');
  });

  it('应有 3 个输入参数', async () => {
    const n = await scalar(`
      SELECT COUNT(*) FROM user_arguments
       WHERE object_name = '图书预约' AND in_out = 'IN' AND argument_name IS NOT NULL`);
    assert.ok(
      n === 3,
      `参数个数是 ${n}，要求 3 个（预约流水号、借书证号、ISBN）→ 检查：过程名后面的括号里是不是写了三个参数`
    );
  });
});
