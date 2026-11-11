const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  queryAsCourse,
  tryLogin,
} = require('./utils');

/**
 * 4.21 建 用户_USER1 并授 CONNECT
 * 判题：用户存在、拿到 CONNECT、能真的登录。
 * 这一步不检查视图权限（那是下一关）。
 */
describe('4.21 建 USER1 并授 CONNECT', () => {
  before(async () => {
    await resetSecurityObjects({ users: ['用户_USER1'], roles: [], profiles: [] });
    await loadCourseBaseline();
    await replayAsCourse('sql/4.21.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('用户 用户_USER1 应存在', async () => {
    const n = (await queryAsCourse(
      `SELECT username FROM dba_users WHERE username = '用户_USER1'`
    )).length;
    assert.ok(n === 1, '没找到用户 用户_USER1 → 检查：CREATE USER 用户_USER1 IDENTIFIED BY ...');
  });

  it('应授予 CONNECT 角色', async () => {
    const rows = await queryAsCourse(
      `SELECT granted_role FROM dba_role_privs WHERE grantee = '用户_USER1'`
    );
    const roles = rows.map((r) => String(r[0]).toUpperCase());
    assert.ok(
      roles.includes('CONNECT'),
      `角色是 [${roles.join(', ') || '无'}]，缺 CONNECT → 检查：GRANT CONNECT TO 用户_USER1;`
    );
  });

  it('用户应能真的登录', async () => {
    const ok = await tryLogin('用户_USER1', 'view2026');
    assert.ok(
      ok,
      '用户_USER1 登录不了 → 检查：密码是否和本题要求一致（view2026）、CONNECT 是否授了'
    );
  });
});
