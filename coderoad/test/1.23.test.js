const assert = require('node:assert');
const { loadUpTo, assertConstraint, expectError, exec, scalar, closeAll } = require('./utils');

describe('1.23: 给「读者」的身份证加 CHECK 约束（18 位）', () => {
  before(async () => {
    await loadUpTo('1.23');
  });
  after(async () => { await closeAll(); });

  it('读者表应有涉及 身份证编号 的 CHECK 约束', async () => {
    await assertConstraint('读者', 'C', '身份证编号');
  });

  it('17 位身份证应被拒绝', async () => {
    await expectError(
      `INSERT INTO 读者 (借书证号, 姓名, 身份证编号)
       VALUES ('99999994', '测试', '12345678901234567')`,
      'ORA-02290',
      '约束要能拦住不是 18 位的身份证编号'
    );
  });

  it('16 位身份证也应被拒绝', async () => {
    // 16 位、17 位都会被 LENGTH(...) = 18 拦住。
    // 不测「超过 18 位」：列本身就是 VARCHAR2(18)，那种情况会先报 ORA-12899，
    // 测不到 CHECK，反而会误导学生去改约束。
    await expectError(
      `INSERT INTO 读者 (借书证号, 姓名, 身份证编号)
       VALUES ('99999995', '测试', '1234567890123456')`,
      'ORA-02290',
      '约束要能拦住不是 18 位的身份证编号（LENGTH(身份证编号) = 18）'
    );
  });

  it('合法的 18 位身份证应能插入', async () => {
    await exec(
      `INSERT INTO 读者 (借书证号, 姓名, 身份证编号)
       VALUES ('99999996', '测试', '510703199001011237')`
    );
    const n = await scalar(
      `SELECT COUNT(*) FROM 读者 WHERE 借书证号 = '99999996'`
    );
    assert.strictEqual(
      Number(n), 1,
      '合法的 18 位身份证被拒绝了 → 检查：条件是不是写成了别的长度'
    );
  });
});
