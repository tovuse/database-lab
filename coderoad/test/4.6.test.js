const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  scalarAsCourse,
  queryAsCourse,
} = require('./utils');

/**
 * 4.6 建用户并授 CONNECT/RESOURCE
 *
 * 用户名取「姓名拼音」：讲义里固定用 zhangwei，
 * 判题不锁死拼音——只要求「不是 COURSE、不是 TESTER 的新建用户」，
 * 并且它确实拿到了 CONNECT 和 RESOURCE 两个角色。
 */
describe('4.6 建用户并授予 CONNECT/RESOURCE', () => {
  let newUser;

  before(async () => {
    await resetSecurityObjects({ users: ['ZHANGWEI'], roles: [], profiles: [] });
    await loadCourseBaseline();
    await replayAsCourse('sql/4.6_建用户并授权.sql');

    // 找出学生新建的那个用户（讲义要求叫 zhangwei）
    const rows = await queryAsCourse(
      `SELECT username FROM dba_users WHERE username = 'ZHANGWEI'`
    );
    newUser = rows.length ? rows[0][0] : null;
  });

  after(async () => {
    await closeAll();
  });

  it('应创建用户 ZHANGWEI', async () => {
    assert.ok(
      newUser,
      `没找到用户 ZHANGWEI → 检查：CREATE USER zhangwei IDENTIFIED BY ...; 有没有执行成功`
    );
  });

  it('应授予 CONNECT 角色', async () => {
    const rows = await queryAsCourse(
      `SELECT granted_role FROM dba_role_privs WHERE grantee = 'ZHANGWEI'`
    );
    const roles = rows.map((r) => String(r[0]).toUpperCase());
    assert.ok(
      roles.includes('CONNECT'),
      `角色是 [${roles.join(', ')}]，缺 CONNECT → 检查：GRANT CONNECT TO zhangwei;`
    );
  });

  it('应授予 RESOURCE 角色', async () => {
    const rows = await queryAsCourse(
      `SELECT granted_role FROM dba_role_privs WHERE grantee = 'ZHANGWEI'`
    );
    const roles = rows.map((r) => String(r[0]).toUpperCase());
    assert.ok(
      roles.includes('RESOURCE'),
      `角色是 [${roles.join(', ')}]，缺 RESOURCE → 检查：GRANT RESOURCE TO zhangwei;（可以和 CONNECT 写在一起）`
    );
  });

  it('用户状态应为 OPEN（不是锁定/过期）', async () => {
    const s = await scalarAsCourse(
      `SELECT account_status FROM dba_users WHERE username = 'ZHANGWEI'`
    );
    assert.strictEqual(
      String(s), 'OPEN',
      `账号状态是「${s}」，应为 OPEN → 检查：建用户时有没有指定了奇怪的 PROFILE`
    );
  });
});
