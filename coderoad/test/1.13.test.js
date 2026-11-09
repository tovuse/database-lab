const assert = require('node:assert');
const {
  resetSchema, replay, exec, assertConstraint, expectError, closeAll,
} = require('./utils');

describe('1.13 完整性约束扩展', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
    await replay('sql/1.13_完整性扩展.sql');
  });
  after(async () => { await closeAll(); });

  it('读者表应有电话和身份证两条 CHECK', async () => {
    await assertConstraint('读者', 'C', '联系电话');
    await assertConstraint('读者', 'C', '身份证编号');
  });

  it('图书表应有是否借出的 CHECK', async () => {
    await assertConstraint('图书', 'C', '是否借出');
  });

  it('插入 10 位电话应被拒绝', async () => {
    await expectError(
      `INSERT INTO 读者 (借书证号, 姓名, 联系电话) VALUES ('99999998', '测试', '1234567890')`,
      'ORA-02290',
      '电话约束要能拦住非 11 位'
    );
  });

  it('插入 17 位身份证应被拒绝', async () => {
    await expectError(
      `INSERT INTO 读者 (借书证号, 姓名, 身份证编号) VALUES ('99999997', '测试', '12345678901234567')`,
      'ORA-02290',
      '身份证约束要能拦住非 18 位'
    );
  });

  it('借书日期为空应被拒绝', async () => {
    await expectError(
      `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
       VALUES (901, '20051001', '1005050', NULL)`,
      'ORA-01400',
      '借阅.借书日期 要改成 NOT NULL（ALTER TABLE 借阅 MODIFY (借书日期 NOT NULL)）'
    );
  });
});
