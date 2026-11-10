const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  queryAsCourse,
} = require('./utils');

/**
 * 4.23 建 PROFILE（3 次失败锁定，10 天解锁）
 *
 * 判题：查 dba_profiles 的两个参数值。
 *
 * 为什么不真的连续失败登录 3 次：
 *   那会把学生刚建的用户锁住、要额外解锁，且每次判题都会污染审计记录。
 *   这一关的教学目标是"会用 PROFILE 配置安全策略"，断言参数值即可。
 *   讲义里如实说明了这个取舍。
 */
describe('4.23 建 PROFILE 限时锁定', () => {
  before(async () => {
    await resetSecurityObjects({ users: [], roles: [], profiles: ['限时锁定'] });
    await loadCourseBaseline();
    await replayAsCourse('sql/4.23_建PROFILE.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('PROFILE 限时锁定 应存在', async () => {
    const n = (await queryAsCourse(
      `SELECT profile FROM dba_profiles WHERE profile = '限时锁定'`
    )).length;
    assert.ok(n > 0, '没找到 PROFILE 限时锁定 → 检查：CREATE PROFILE 有没有执行成功');
  });

  it('FAILED_LOGIN_ATTEMPTS 应为 3', async () => {
    const rows = await queryAsCourse(`
      SELECT limit FROM dba_profiles
       WHERE profile = '限时锁定' AND resource_name = 'FAILED_LOGIN_ATTEMPTS'`);
    const v = rows.length ? String(rows[0][0]) : null;
    assert.strictEqual(
      v, '3',
      `FAILED_LOGIN_ATTEMPTS 是 ${v}，应为 3 → 检查：LIMIT FAILED_LOGIN_ATTEMPTS 3`
    );
  });

  it('PASSWORD_LOCK_TIME 应为 10', async () => {
    const rows = await queryAsCourse(`
      SELECT limit FROM dba_profiles
       WHERE profile = '限时锁定' AND resource_name = 'PASSWORD_LOCK_TIME'`);
    const v = rows.length ? String(rows[0][0]) : null;
    assert.strictEqual(
      v, '10',
      `PASSWORD_LOCK_TIME 是 ${v}，应为 10 → 检查：LIMIT PASSWORD_LOCK_TIME 10`
    );
  });
});
