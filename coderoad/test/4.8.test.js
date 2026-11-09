const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  queryAsCourse,
} = require('./utils');

/**
 * 4.8 建角色「图书管理员」
 *
 * 判题：
 *   1. 角色存在
 *   2. 拿到了 CONNECT 角色（间接给会话权限）
 *   3. 对三个过程有 EXECUTE
 *   4. 对 书目 有 SELECT
 *
 * 前置：三个过程来自第 3 章，测试用 answers 里的标准版本补齐。
 */
describe('4.8 建图书管理员角色', () => {
  before(async () => {
    await resetSecurityObjects({ users: [], roles: ['图书管理员'], profiles: [] });
    await loadCourseBaseline();
    // 三个过程必须建在 COURSE schema 里：角色授的是 COURSE.借书 这类对象，
    // 建到 TESTER 里授权会找不到对象。
    for (const f of [
      'answers/3.1_借书过程.sql',
      'answers/3.3_图书预约过程.sql',
      'answers/3.4_还书过程.sql',
    ]) {
      await replayAsCourse(f);
    }
    // 上一关留下的旧角色先清掉，避免重复执行报 ORA-01921
    await replayAsCourse('sql/4.8_建角色.sql');
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

  it('角色应对 书目 有 SELECT', async () => {
    const rows = await queryAsCourse(`
      SELECT privilege FROM dba_tab_privs
       WHERE grantee = '图书管理员' AND table_name = '书目'`);
    const privs = rows.map((r) => String(r[0]).toUpperCase());
    assert.ok(
      privs.includes('SELECT'),
      `书目 上的权限是 [${privs.join(', ')}]，缺 SELECT → 检查：GRANT SELECT ON 书目 TO 图书管理员;`
    );
  });

  it('角色应对三个过程有 EXECUTE', async () => {
    const rows = await queryAsCourse(`
      SELECT table_name FROM dba_tab_privs
       WHERE grantee = '图书管理员' AND privilege = 'EXECUTE'`);
    const names = rows.map((r) => String(r[0]).toUpperCase());
    const want = ['借书', '还书', '图书预约'];
    const missing = want.filter((w) => !names.includes(w));
    assert.ok(
      missing.length === 0,
      `这些过程还没授 EXECUTE：${missing.join('、')}（当前有：${names.join('、') || '无'}）→ 检查：GRANT EXECUTE ON 过程名 TO 图书管理员;`
    );
  });
});
