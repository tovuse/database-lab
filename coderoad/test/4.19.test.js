const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  queryAsCourse,
  scalarAsCourse,
  tryLogin,
  DB,
} = require('./utils');

/**
 * 4.19 建 用户_oper 授角色，以它身份借书
 *
 * 判题：
 *   1. 用户 用户_OPER 存在
 *   2. 被授予 图书管理员 角色
 *   3. 判题器自己用 用户_oper/oper2026 连库，调 COURSE.借书，断言借阅表多一行
 *
 * 第 3 点是这一关的重点：证明"角色授到过程上"是真的能用，
 * 不是只在字典里躺着一行。
 */
describe('4.19 用户 oper 借书', () => {
  before(async () => {
    await resetSecurityObjects({
      users: ['用户_OPER'],
      roles: ['图书管理员'],
      profiles: [],
    });
    await loadCourseBaseline();
    // 过程必须建在 COURSE schema（用户_oper 调的是 COURSE.借书）
    for (const f of [
      'answers/3.3.sql',
      'answers/3.7.sql',
      'answers/3.9.sql',
      'answers/4.16.sql',
      'answers/4.17.sql',
      'answers/4.18.sql',
    ]) {
      await replayAsCourse(f);
    }
    await replayAsCourse('sql/4.19.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('用户 用户_OPER 应存在', async () => {
    const n = (await queryAsCourse(
      `SELECT username FROM dba_users WHERE username = '用户_OPER'`
    )).length;
    assert.ok(n === 1, '没找到用户 用户_OPER → 检查：CREATE USER 用户_oper ... 有没有执行');
  });

  it('应被授予 图书管理员 角色', async () => {
    const rows = await queryAsCourse(
      `SELECT granted_role FROM dba_role_privs WHERE grantee = '用户_OPER'`
    );
    const roles = rows.map((r) => String(r[0]).toUpperCase());
    assert.ok(
      roles.includes('图书管理员'.toUpperCase()),
      `用户拿到的角色是 [${roles.join(', ')}] → 检查：GRANT 图书管理员 TO 用户_oper;`
    );
  });

  it('用 用户_oper 登录并调用 COURSE.借书 应成功', async () => {
    const canLogin = await tryLogin('用户_oper', 'oper2026');
    assert.ok(
      canLogin,
      '用户_oper 登录不了 → 检查：密码是否改过、角色里有没有 CONNECT'
    );

    const before = Number(await scalarAsCourse(`SELECT COUNT(*) FROM 借阅`));

    // 以 用户_oper 身份调过程（必须带 COURSE. 前缀）
    const oracledb = require('oracledb');
    let c;
    try {
      c = await oracledb.getConnection({
        user: '用户_oper',
        password: 'oper2026',
        connectString: DB.connectString,
      });
      await c.execute(`BEGIN COURSE.借书(9001, '20081237', '2001231'); END;`);
      await c.commit();
    } catch (e) {
      throw new Error(
        `以 用户_oper 调用借书失败：${(e.message || '').split('\n')[0]}\n  → 检查：过程名要写 COURSE.借书；角色有没有拿到这个过程的 EXECUTE`
      );
    } finally {
      if (c) await c.close().catch(() => {});
    }

    const after = Number(await scalarAsCourse(`SELECT COUNT(*) FROM 借阅`));
    assert.strictEqual(
      after, before + 1,
      `借阅表行数 ${{ before, after }}，调用后没增加 → 检查：过程是否真的执行了（参数顺序对不对）`
    );
  });
});
