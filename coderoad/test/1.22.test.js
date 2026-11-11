const assert = require('node:assert');
const { loadUpTo, assertConstraint, expectError, exec, scalar, closeAll } = require('./utils');

describe('1.22: 给「读者」的电话加 CHECK 约束（11 位数字）', () => {
  before(async () => {
    await loadUpTo('1.22');
  });
  after(async () => { await closeAll(); });

  it('读者表应有涉及 联系电话 的 CHECK 约束', async () => {
    await assertConstraint('读者', 'C', '联系电话');
  });

  it('10 位电话应被拒绝', async () => {
    await expectError(
      `INSERT INTO 读者 (借书证号, 姓名, 联系电话)
       VALUES ('99999991', '测试', '1234567890')`,
      'ORA-02290',
      '约束要能拦住不是 11 位的电话'
    );
  });

  it('11 位但不是数字应被拒绝', async () => {
    // 只写 LENGTH(...)=11 的学生会在这里失败：长度够了但不是数字
    await expectError(
      `INSERT INTO 读者 (借书证号, 姓名, 联系电话)
       VALUES ('99999992', '测试', 'abcdefghijk')`,
      'ORA-02290',
      '要求是「11 位数字」，用 REGEXP_LIKE(联系电话, \'^[0-9]{11}$\')'
    );
  });

  it('合法的 11 位电话应能插入', async () => {
    await exec(
      `INSERT INTO 读者 (借书证号, 姓名, 联系电话)
       VALUES ('99999993', '测试', '13900001111')`
    );
    const n = await scalar(
      `SELECT COUNT(*) FROM 读者 WHERE 借书证号 = '99999993'`
    );
    assert.strictEqual(
      Number(n), 1,
      '合法的 11 位电话被拒绝了 → 检查：正则是不是写得太严（例如要求必须以 1 开头）'
    );
  });
});
