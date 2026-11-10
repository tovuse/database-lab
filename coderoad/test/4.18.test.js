const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  queryAsCourse,
} = require('./utils');

/**
 * 4.18 给角色授三个过程的 EXECUTE
 *
 * 前置：三个过程来自第 3 章，测试用 answers 里的标准版本补齐。
 * 角色授的是 COURSE.借书 这类对象，过程必须建在 COURSE schema 里。
 */
describe('4.18 授过程执行权限', () => {
  before(async () => {
    await resetSecurityObjects({ users: [], roles: ['图书管理员'], profiles: [] });
    await loadCourseBaseline();
    for (const f of [
      'answers/3.3_借书改图书状态.sql',
      'answers/3.7_预约插入.sql',
      'answers/3.9_还书补归还日期.sql',
    ]) {
      await replayAsCourse(f);
    }
    await replayAsCourse('answers/4.16_建角色.sql');  // 前置：角色
    await replayAsCourse('answers/4.17_授书目查询.sql');
    await replayAsCourse('sql/4.18_授过程执行.sql');  // 本关
  });

  after(async () => {
    await closeAll();
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
