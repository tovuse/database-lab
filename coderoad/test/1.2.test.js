const assert = require('node:assert');
const { query, scalar, closeAll } = require('./utils');

/**
 * 1.2 创建自己的用户
 * 判题直接查 dba_users —— 学生必须真的建出这个用户
 */
describe('1.2 创建你自己的数据库用户', () => {
  after(async () => {
    await closeAll();
  });

  it('应存在一个以 S 开头、后接 8 位数字的用户', async () => {
    const rows = await query(
      `SELECT username FROM dba_users
        WHERE REGEXP_LIKE(username, '^S[0-9]{8}$')
          AND username NOT IN ('SYSTEM','SYS','SYSAUX')`
    );
    assert.ok(
      rows.length >= 1,
      '没找到形如 S20231234 的用户 → 检查：用户名是不是「S + 你的 8 位学号」，有没有 CREATE USER 报错'
    );
  });

  it('该用户应拥有 CONNECT 角色', async () => {
    const n = await scalar(
      `SELECT COUNT(*) FROM dba_role_privs
        WHERE grantee LIKE 'S%'
          AND REGEXP_LIKE(grantee, '^S[0-9]{8}$')
          AND granted_role = 'CONNECT'`
    );
    assert.ok(n >= 1, '用户没有 CONNECT 角色 → 检查：是否执行了 GRANT CONNECT TO <用户名>');
  });

  it('该用户应拥有 RESOURCE 角色', async () => {
    const n = await scalar(
      `SELECT COUNT(*) FROM dba_role_privs
        WHERE grantee LIKE 'S%'
          AND REGEXP_LIKE(grantee, '^S[0-9]{8}$')
          AND granted_role = 'RESOURCE'`
    );
    assert.ok(n >= 1, '用户没有 RESOURCE 角色 → 检查：GRANT 语句里是否写了 RESOURCE');
  });

  it('该用户应处于可用（OPEN）状态', async () => {
    const status = await scalar(
      `SELECT MAX(account_status) FROM dba_users
        WHERE REGEXP_LIKE(username, '^S[0-9]{8}$')`
    );
    assert.strictEqual(
      status,
      'OPEN',
      `用户状态是 ${status} → 检查：是否密码不满足复杂度被锁，或需要 ALTER USER ... ACCOUNT UNLOCK`
    );
  });
});
