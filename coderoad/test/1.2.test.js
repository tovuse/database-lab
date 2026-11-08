const assert = require('node:assert');
const {
  replay,
  query,
  scalar,
  dropTestUsers,
  closeAll,
} = require('./utils');

/**
 * 1.2 创建你自己的数据库用户
 *
 * 判题方式：把学生写的 CREATE USER / GRANT 语句在 TESTER schema 里执行
 * （TESTER 有 DBA 角色，有权建用户），然后查数据字典验证。
 *
 * 为什么不清空 dba_users：
 *   本关的产物就是"全局存在这个用户"，清不掉也不该清（学生要能用自己的账号登录）。
 *   但重放前会先删掉同名用户，保证反复保存不报 ORA-01920。
 */
describe('1.2 创建你自己的数据库用户', () => {
  before(async () => {
    // 先删掉可能残留的同名用户，保证 CREATE USER 不冲突（幂等）
    await query(`
      SELECT username FROM dba_users
       WHERE REGEXP_LIKE(username, '^S[0-9]{8}$')
         AND username NOT IN ('SYSTEM','SYS','SYSAUX')`).then(async (rows) => {
      for (const [u] of rows) {
        await require('./utils').exec(`DROP USER "${u}" CASCADE`).catch(() => {});
      }
    });

    // 重放学生写的语句（CREATE USER + GRANT）
    await replay('sql/1.2_建用户.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('应存在一个以 S 开头、后接 8 位数字的用户', async () => {
    const rows = await query(`
      SELECT username FROM dba_users
       WHERE REGEXP_LIKE(username, '^S[0-9]{8}$')
         AND username NOT IN ('SYSTEM','SYS','SYSAUX')`);
    assert.ok(
      rows.length >= 1,
      '没找到形如 S20231234 的用户 → 检查：用户名是不是「S + 你的 8 位学号」，CREATE USER 有没有报错'
    );
  });

  it('该用户应拥有 CONNECT 角色', async () => {
    const n = await scalar(`
      SELECT COUNT(*) FROM dba_role_privs
       WHERE REGEXP_LIKE(grantee, '^S[0-9]{8}$') AND granted_role = 'CONNECT'`);
    assert.ok(
      n >= 1,
      '用户没有 CONNECT 角色 → 检查：是否执行了 GRANT CONNECT TO <用户名>'
    );
  });

  it('该用户应拥有 RESOURCE 角色', async () => {
    const n = await scalar(`
      SELECT COUNT(*) FROM dba_role_privs
       WHERE REGEXP_LIKE(grantee, '^S[0-9]{8}$') AND granted_role = 'RESOURCE'`);
    assert.ok(
      n >= 1,
      '用户没有 RESOURCE 角色 → 检查：GRANT 语句里是否写了 RESOURCE'
    );
  });

  it('该用户应处于可用（OPEN）状态', async () => {
    const status = await scalar(`
      SELECT MAX(account_status) FROM dba_users
       WHERE REGEXP_LIKE(username, '^S[0-9]{8}$')`);
    assert.strictEqual(
      status,
      'OPEN',
      `用户状态是 ${status} → 检查：密码是否满足复杂度要求，或需 ALTER USER ... ACCOUNT UNLOCK`
    );
  });
});
