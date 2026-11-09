const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  runMultiQueryFileAsCourse,
} = require('./utils');

/**
 * 4.7 用数据字典查三类权限
 *
 * 三小问对应三条 SELECT，判「每条都查到了东西、且查的是正确的那张字典视图」：
 *   1. 角色            → user_role_privs（或 dba_role_privs）
 *   2. 系统权限        → user_sys_privs（或 dba_sys_privs）
 *   3. 对象权限        → user_tab_privs（或 dba_tab_privs）
 *
 * 判据是「结果集非空 + 列数>=2 或能看出类型」，不硬比行数：
 * 不同环境给 COURSE 的角色/权限会略有差异，硬比会误判。
 */
describe('4.7 查角色的系统权限与对象权限', () => {
  let results;

  before(async () => {
    await loadCourseBaseline();
    results = await runMultiQueryFileAsCourse('sql/4.7_查看权限.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('应该写出至少 3 条查询', async () => {
    assert.ok(
      results.length >= 3,
      `只有 ${results.length} 条查询，本关要查角色、系统权限、对象权限三类`
    );
  });

  it('应查出角色', async () => {
    const hit = results.find((r) => /user_role_privs|dba_role_privs/i.test(r.sql));
    assert.ok(
      hit,
      '没找到查 user_role_privs 的语句 → 检查：角色要从 user_role_privs 查（SELECT * FROM user_role_privs;）'
    );
    assert.ok(
      hit.rows.length >= 1,
      'user_role_privs 查出 0 行 → 检查：COURSE 至少应有 DB_DEVELOPER_ROLE 这类角色'
    );
    // 角色名必须真的出现在结果里（不是随便查了个空表）
    const names = hit.rows.map((row) => row.map((v) => String(v || '')).join(' '));
    assert.ok(
      names.some((s) => /ROLE|图书管理员/i.test(s)),
      `查出来的内容看不出角色名 → 实际返回：${names.slice(0, 3).join(' / ') || '(空)'}`
    );
  });

  it('应查出系统权限', async () => {
    const hit = results.find((r) =>
      /user_sys_privs|dba_sys_privs/i.test(r.sql)
    );
    assert.ok(
      hit,
      '没找到查 user_sys_privs 的语句 → 检查：系统权限要从 user_sys_privs 查'
    );
    assert.ok(
      hit.rows.length >= 1,
      'user_sys_privs 查出 0 行 → 检查：COURSE 应该至少有 CREATE USER 等系统权限'
    );
  });

  it('应查出对象权限', async () => {
    const hit = results.find((r) => /user_tab_privs|dba_tab_privs/i.test(r.sql));
    assert.ok(
      hit,
      '没找到查 user_tab_privs 的语句 → 检查：对象权限（表/视图上的 SELECT、INSERT…）要从 user_tab_privs 查'
    );
  });
});
