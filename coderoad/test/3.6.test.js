const assert = require('node:assert');
const {
  resetSchema,
  replay,
  scalar,
  assertObject,
  assertCompiled,
  expectCallError,
  closeAll,
} = require('./utils');

/**
 * 3.6 给「预约」补上可借判断
 * 判题：这个 ISBN 还有可借的书，调用必须被拒绝（RAISE_APPLICATION_ERROR）。
 */
describe('3.6 预约的可借判断', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00.sql');
    await replay('sql/3.6.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('应有 图书预约 存储过程且编译通过', async () => {
    await assertObject('图书预约', 'PROCEDURE');
    await assertCompiled('图书预约');
  });

  it('还有可借图书时必须拒绝预约', async () => {
    // 9787506336239 对应 1005050，基线里 1005050 的 是否借出 是「否」
    await expectCallError(
      `BEGIN 图书预约(201, '20051001', '9787506336239'); END;`,
      '',
      '这个 ISBN 还有可借的书，预约本该被拒绝 → 检查：过程里要先 SELECT COUNT(*) INTO 再 IF 判断'
    );
  });

  it('被拒绝时不应插入预约记录', async () => {
    const n = await scalar(
      `SELECT COUNT(*) FROM 预约 WHERE 预约流水号 = 201`
    );
    assert.strictEqual(
      Number(n), 0,
      `预约表里出现了流水号 201 的记录 → 检查：IF 判断要在 INSERT 之前，抛错后不该再插数据`
    );
  });
});
