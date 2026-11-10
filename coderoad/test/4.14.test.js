const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  runMultiQueryFileAsCourse,
  queryAsCourse,
} = require('./utils');

/**
 * 4.14 查系统权限（user_sys_privs，也接受 dba_sys_privs）
 *
 * 判据（与环境无关）：查的是系统权限字典，行数与该视图一致。
 * COURSE 的系统权限来自 initdb 的 GRANT（CREATE USER / ALTER USER / …），
 * 不同环境条数不同，所以不硬比具体权限名。
 */
describe('4.14 查系统权限', () => {
  let results;
  let expected;
  let hit;
  let isDba;

  before(async () => {
    await loadCourseBaseline();
    results = await runMultiQueryFileAsCourse('sql/4.14_查系统权限.sql');
    hit = results.find((r) => /(user|dba)_sys_privs/i.test(r.sql));
    isDba = hit ? /\bdba_sys_privs\b/i.test(hit.sql) : false;
    expected = await queryAsCourse(
      isDba ? 'SELECT * FROM dba_sys_privs' : 'SELECT * FROM user_sys_privs'
    );
  });

  after(async () => {
    await closeAll();
  });

  it('应查系统权限字典（user_sys_privs）', async () => {
    assert.ok(
      hit,
      '没找到查 user_sys_privs 的语句 → 检查：系统权限（CREATE USER 这类）在 user_sys_privs，别和角色（user_role_privs）搞混'
    );
  });

  it('查出来的行数应与该视图一致', async () => {
    assert.strictEqual(
      hit.rows.length,
      expected.length,
      `查出 ${hit.rows.length} 行，${isDba ? 'dba_sys_privs' : 'user_sys_privs'} 里实际有 ${
        expected.length
      } 行 → 检查：是不是查成了 user_role_privs`
    );
  });

  it('结果里应能看到权限名', async () => {
    const flat = hit.rows.map((r) => r.map((v) => String(v || '')).join(' '));
    const missing = expected
      .map((r) => String(r[0] || '').trim())
      .filter((priv) => priv && !flat.some((s) => s.includes(priv)));
    assert.deepStrictEqual(
      missing,
      [],
      `结果里缺这些权限：${missing.join('、')} → 检查：SELECT 的列里是不是漏了权限名（PRIVILEGE）`
    );
  });
});
