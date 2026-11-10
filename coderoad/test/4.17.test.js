const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  queryAsCourse,
} = require('./utils');

/**
 * 4.17 给角色授「书目」的 SELECT
 * 判题：角色对 书目 有 SELECT。
 */
describe('4.17 授书目查询权限', () => {
  before(async () => {
    await resetSecurityObjects({ users: [], roles: ['图书管理员'], profiles: [] });
    await loadCourseBaseline();
    await replayAsCourse('answers/4.16_建角色.sql');  // 前置：角色
    await replayAsCourse('sql/4.17_授书目查询.sql');  // 本关
  });

  after(async () => {
    await closeAll();
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
});
