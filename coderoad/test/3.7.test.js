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
 * 3.7 给「预约」补上 INSERT
 * 判题：
 *   ① 全部借出时，调用成功且插入预约记录
 *   ② 还有可借图书时，必须被拒绝（判断不能被 INSERT 顶掉）
 */
describe('3.7 预约的插入逻辑', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00.sql');
    await replay('sql/3.7.sql');
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
    await replay('answers/3.7_seed.sql');
    await callProcedure(`BEGIN 图书预约(200, '20051001', '9787508040110'); END;`);
    const n = await scalar(
      `SELECT COUNT(*) FROM 预约 WHERE 预约流水号 = 200`
    );
    assert.ok(
      n === 1,
      '该 ISBN 的图书都已借出，预约却没插入记录 → 检查：判断之后有没有 INSERT INTO 预约'
    );
  });

  it('还有可借图书时必须拒绝预约', async () => {
    await expectCallError(
      `BEGIN 图书预约(201, '20051001', '9787506336239'); END;`,
      '',
      '这个 ISBN 还有可借的书，预约本该被拒绝 → 检查：IF 判断是不是被删掉了'
    );
  });
});
