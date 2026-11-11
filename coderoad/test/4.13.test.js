const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  runMultiQueryFileAsCourse,
  queryAsCourse,
} = require('./utils');

/**
 * 4.13 查角色（user_role_privs，也接受 dba_role_privs）
 *
 * 判据（与环境无关）：
 *   1. 学生确实写了查角色字典的语句
 *   2. 行数、角色名与该视图一致
 * 不硬比「至少有某个角色」：不同环境给 COURSE 授的角色不一样，硬写会误判。
 */
describe('4.13: 查角色权限', () => {
  let results;
  let expected;
  let hit;
  let isDba;

  before(async () => {
    await loadCourseBaseline();
    results = await runMultiQueryFileAsCourse('sql/4.13.sql');
    hit = results.find((r) => /(user|dba)_role_privs/i.test(r.sql));
    isDba = hit ? /\bdba_role_privs\b/i.test(hit.sql) : false;
    expected = await queryAsCourse(
      isDba ? 'SELECT * FROM dba_role_privs' : 'SELECT * FROM user_role_privs'
    );
  });

  after(async () => {
    await closeAll();
  });

  it('应查角色字典（user_role_privs）', async () => {
    assert.ok(
      hit,
      '没找到查 user_role_privs 的语句 → 检查：角色要在 user_role_privs 里查（SELECT * FROM user_role_privs;）'
    );
  });

  it('查出来的行数应与该视图一致', async () => {
    assert.strictEqual(
      hit.rows.length,
      expected.length,
      `查出 ${hit.rows.length} 行，${isDba ? 'dba_role_privs' : 'user_role_privs'} 里实际有 ${
        expected.length
      } 行 → 检查：是不是查成了别的视图（角色 user_role_privs / 系统权限 user_sys_privs / 对象权限 user_tab_privs）`
    );
  });

  it('结果里应能看到每个角色名', async () => {
    const flat = hit.rows.map((r) => r.map((v) => String(v || '')).join(' '));
    const missing = expected
      .map((r) => String(r[0] || '').trim())
      .filter((role) => role && !flat.some((s) => s.includes(role)));
    assert.deepStrictEqual(
      missing,
      [],
      `结果里缺这些角色：${missing.join('、')} → 检查：SELECT 的列里是不是漏了角色名（GRANTED_ROLE）`
    );
  });
});
