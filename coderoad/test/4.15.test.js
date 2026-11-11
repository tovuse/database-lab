const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  runMultiQueryFileAsCourse,
  queryAsCourse,
} = require('./utils');

/**
 * 4.15 查对象权限（user_tab_privs，也接受 dba_tab_privs）
 *
 * 判据（与环境无关）：查的是对象权限字典，行数与该视图一致。
 * 不要求结果非空——COURSE 自己可能没有被别人授过对象权限，
 * 空结果在这道题上是正常的。
 */
describe('4.15: 查对象权限', () => {
  let results;
  let expected;
  let hit;
  let isDba;

  before(async () => {
    await loadCourseBaseline();
    results = await runMultiQueryFileAsCourse('sql/4.15.sql');
    hit = results.find((r) => /(user|dba)_tab_privs/i.test(r.sql));
    isDba = hit ? /\bdba_tab_privs\b/i.test(hit.sql) : false;
    expected = await queryAsCourse(
      isDba ? 'SELECT * FROM dba_tab_privs' : 'SELECT * FROM user_tab_privs'
    );
  });

  after(async () => {
    await closeAll();
  });

  it('应查对象权限字典（user_tab_privs）', async () => {
    assert.ok(
      hit,
      '没找到查 user_tab_privs 的语句 → 检查：对象权限（表/视图/过程上的 SELECT、EXECUTE…）在 user_tab_privs'
    );
  });

  it('查出来的行数应与该视图一致', async () => {
    assert.strictEqual(
      hit.rows.length,
      expected.length,
      `查出 ${hit.rows.length} 行，${isDba ? 'dba_tab_privs' : 'user_tab_privs'} 里实际有 ${
        expected.length
      } 行 → 检查：是不是查成了 user_role_privs / user_sys_privs`
    );
  });
});
