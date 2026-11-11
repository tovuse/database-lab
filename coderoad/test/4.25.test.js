const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  queryAsCourse,
  scalarAsCourse,
  execAsCourse,
} = require('./utils');

/**
 * 4.25 撤销权限并删除用户
 *
 * 判题：
 *   1. 判题器先造好 用户_USER1 + 视图 + 授权（模拟 4.22 的成果）
 *   2. 跑学生的 REVOKE + DROP USER
 *   3. 断言：用户不存在了，该用户的授权记录也级联消失
 */
describe('4.25: 撤销权限并删除用户', () => {
  before(async () => {
    await resetSecurityObjects({
      users: ['用户_USER1'],
      roles: [],
      profiles: [],
      views: ['VIEW_READER'],
    });
    await loadCourseBaseline();
    await replayAsCourse('answers/4.20.sql');

    // 造起点：用户 + 授权
    await execAsCourse(
      `BEGIN EXECUTE IMMEDIATE 'CREATE USER 用户_USER1 IDENTIFIED BY view2026'; END;`
    );
    await execAsCourse('GRANT CONNECT TO 用户_USER1');
    await execAsCourse('GRANT SELECT ON VIEW_READER TO 用户_USER1');

    await replayAsCourse('sql/4.25.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('用户 用户_USER1 应已被删除', async () => {
    const n = await scalarAsCourse(
      `SELECT COUNT(*) FROM dba_users WHERE username = '用户_USER1'`
    );
    assert.strictEqual(
      Number(n), 0,
      '用户 用户_USER1 还在 → 检查：DROP USER 用户_USER1;（如果有对象要先 CASCADE）'
    );
  });

  it('该用户的权限记录应级联消失', async () => {
    const n = await scalarAsCourse(`
      SELECT COUNT(*) FROM dba_tab_privs WHERE grantee = '用户_USER1'`);
    assert.strictEqual(
      Number(n), 0,
      `还有 ${n} 条对象权限残留 → 检查：DROP USER 之后权限应自动消失；如果没消失说明用户没真删掉`
    );
  });

  it('视图 VIEW_READER 本身不该被删（只撤授权）', async () => {
    const n = await scalarAsCourse(
      `SELECT COUNT(*) FROM user_views WHERE view_name = 'VIEW_READER'`
    );
    assert.strictEqual(
      Number(n), 1,
      'VIEW_READER 不见了 → 检查：REVOKE 只撤授权，不该 DROP VIEW'
    );
  });
});
