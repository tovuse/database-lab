const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  queryAsCourse,
} = require('./utils');

/**
 * 4.16 建角色「图书管理员」并授 CONNECT
 * 判题：角色存在、拿到了 CONNECT。
 */
describe('4.16 建图书管理员角色', () => {
  before(async () => {
    await resetSecurityObjects({ users: [], roles: ['图书管理员'], profiles: [] });
    await loadCourseBaseline();
    await replayAsCourse('sql/4.16.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('角色「图书管理员」应存在', async () => {
    const n = (await queryAsCourse(
      `SELECT role FROM dba_roles WHERE role = '图书管理员'`
    )).length;
    assert.ok(
      n === 1,
      `没找到角色「图书管理员」→ 检查：CREATE ROLE 图书管理员; 有没有执行`
    );
  });

  it('角色应被授予 CONNECT', async () => {
    const rows = await queryAsCourse(
      `SELECT granted_role FROM dba_role_privs WHERE grantee = '图书管理员'`
    );
    const roles = rows.map((r) => String(r[0]).toUpperCase());
    assert.ok(
      roles.includes('CONNECT'),
      `角色拿到的角色是 [${roles.join(', ')}]，缺 CONNECT → 检查：GRANT CONNECT TO 图书管理员;`
    );
  });
});
