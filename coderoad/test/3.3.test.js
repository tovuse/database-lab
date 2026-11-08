const assert = require('node:assert');
const {
  resetSchema,
  replay,
  scalar,
  assertObject,
  assertCompiled,
  callProcedure,
  expectCallError,
  closeAll,
} = require('./utils');

/**
 * 3.3 建「预约」存储过程
 * 判题：
 *   ① 过程存在且编译通过
 *   ② 该 ISBN 全部借出时，调用成功且插入预约记录
 *   ③ 该书目还有可借图书时，必须被拒绝（这是本题的核心逻辑）
 */
describe('3.3 建预约存储过程', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
    await replay('sql/3.3_预约过程.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('应有 图书预约 存储过程且编译通过', async () => {
    await assertObject('图书预约', 'PROCEDURE');
    await assertCompiled('图书预约');
  });

  it('全部借出时应能预约成功', async () => {
    // 先把这个 ISBN 对应的图书全部标成已借出，制造「无书可借」的局面
    await replay('answers/3.3_把书全借出.sql');
    await callProcedure(`BEGIN 图书预约(200, '20051001', '9787508040110'); END;`);
    const n = await scalar(
      `SELECT COUNT(*) FROM 预约 WHERE 预约流水号 = 200`
    );
    assert.ok(
      n === 1,
      '该 ISBN 的图书都已借出，预约却没插入记录 → 检查：过程里有没有 INSERT INTO 预约'
    );
  });

  it('还有可借图书时必须拒绝预约', async () => {
    // 9787506336239 对应两本书：1005050 可借、另一本不存在；基线里 1005050 是「否」
    await expectCallError(
      `BEGIN 图书预约(201, '20051001', '9787506336239'); END;`,
      '',
      '这个 ISBN 还有可借的书，预约本该被拒绝。过程里要先查 COUNT(*) 再决定'
    );
  });
});
