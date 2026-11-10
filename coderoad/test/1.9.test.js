const assert = require('node:assert');
const { resetSchema, replay, assertTable, assertColumn, assertConstraint, expectError, closeAll } = require('./utils');

describe('1.9 建「读者」表', () => {
  before(async () => {
    await resetSchema();
    await replay('sql/1.9_读者表.sql');
  });
  after(async () => { await closeAll(); });

  it('应有 读者 表和七个列', async () => {
    await assertTable('读者');
    for (const c of ['借书证号', '姓名', '单位', '性别', '地址', '联系电话', '身份证编号']) {
      await assertColumn('读者', c);
    }
  });

  it('借书证号 应是主键', async () => {
    await assertConstraint('读者', 'P', '借书证号');
  });

  it('性别写「中」应被 CHECK 拒绝', async () => {
    await expectError(
      `INSERT INTO 读者 (借书证号, 姓名, 性别) VALUES ('99999999', '测试', '中')`,
      'ORA-02290',
      `要有 CHECK (性别 IN ('男', '女'))`
    );
  });
});
