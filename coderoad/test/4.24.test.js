const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  scalarAsCourse,
  execAsCourse,
  tryLogin,
} = require('./utils');

/**
 * 4.24 手工解锁被锁的用户
 *
 * 判题：
 *   1. 判题器先把 用户_USER1 锁住（模拟"被 PROFILE 锁了"）
 *   2. 跑学生的 UNLOCK 语句
 *   3. 断言 account_status = OPEN，且真的能登录
 */
describe('4.24 手工解锁用户', () => {
  before(async () => {
    await resetSecurityObjects({ users: ['用户_USER1'], roles: [], profiles: [] });
    await loadCourseBaseline();

    // 造一个可解锁的用户；已存在就用现成的
    await execAsCourse(
      `BEGIN EXECUTE IMMEDIATE 'CREATE USER 用户_USER1 IDENTIFIED BY view2026'; END;`
    ).catch(() => {});
    await execAsCourse('GRANT CONNECT TO 用户_USER1').catch(() => {});

    // 判题器制造起点：账号被锁
    await execAsCourse('ALTER USER 用户_USER1 ACCOUNT LOCK');

    await replayAsCourse('sql/4.24_手工解锁.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('账号状态应为 OPEN', async () => {
    const s = await scalarAsCourse(
      `SELECT account_status FROM dba_users WHERE username = '用户_USER1'`
    );
    assert.strictEqual(
      String(s), 'OPEN',
      `账号状态是「${s}」，应为 OPEN → 检查：ALTER USER 用户_USER1 ACCOUNT UNLOCK;`
    );
  });

  it('解锁后应能真的登录', async () => {
    const ok = await tryLogin('用户_USER1', 'view2026');
    assert.ok(
      ok,
      '解锁了但登录失败 → 检查：密码是否被改过；或账号是因为密码过期被锁（那是 PASSWORD_LOCK_TIME 的另一种情况，要用 ALTER USER ... IDENTIFIED BY 重置密码）'
    );
  });
});
