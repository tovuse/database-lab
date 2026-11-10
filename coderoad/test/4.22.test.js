const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  resetSecurityObjects,
  replayAsCourse,
  queryAsCourse,
  tryLogin,
  DB,
} = require('./utils');

/**
 * 4.22 只授视图查询权限
 *
 * 判题（正反两面都要）：
 *   正面：能登录、能 SELECT VIEW_READER、能查出 4 行
 *   反面：不能 SELECT 基表 书目（ORA-00942 或 ORA-01031）
 *        —— 这是"视图做权限隔离"的教学重点
 */
describe('4.22 只授视图查询权限', () => {
  before(async () => {
    await resetSecurityObjects({
      users: ['用户_USER1'],
      roles: [],
      profiles: [],
      views: ['VIEW_READER'],
    });
    await loadCourseBaseline();
    await replayAsCourse('answers/4.20_建视图.sql');      // 前置：视图
    await replayAsCourse('answers/4.21_建用户并连库.sql'); // 前置：用户 + CONNECT
    await replayAsCourse('sql/4.22_授视图查询.sql');       // 本关
  });

  after(async () => {
    await closeAll();
  });

  it('应只有 VIEW_READER 上的 SELECT（不该有基表权限）', async () => {
    const rows = await queryAsCourse(`
      SELECT table_name, privilege FROM dba_tab_privs
       WHERE grantee = '用户_USER1' AND owner = 'COURSE'`);
    const tables = rows.map((r) => String(r[0]).toUpperCase());
    assert.ok(
      tables.includes('VIEW_READER'),
      `没查到 VIEW_READER 的授权（当前：${tables.join('、') || '无'}）→ 检查：GRANT SELECT ON VIEW_READER TO 用户_USER1;`
    );
    const baseTables = tables.filter((t) => ['书目', '图书', '读者', '借阅'].includes(t));
    assert.ok(
      baseTables.length === 0,
      `不该给基表授权，但发现了：${baseTables.join('、')} → 检查：这一关只授视图，不要给表`
    );
  });

  it('能登录并查视图', async () => {
    const oracledb = require('oracledb');
    let c;
    try {
      c = await oracledb.getConnection({
        user: '用户_USER1',
        password: 'view2026',
        connectString: DB.connectString,
      });
      const r = await c.execute('SELECT COUNT(*) FROM COURSE.VIEW_READER');
      assert.strictEqual(
        Number(r.rows[0][0]), 4,
        `视图查出 ${r.rows[0][0]} 行，应为 4 行`
      );
    } catch (e) {
      throw new Error(
        `以 用户_USER1 查视图失败：${(e.message || '').split('\n')[0]}\n  → 检查：登录密码、GRANT SELECT ON VIEW_READER`
      );
    } finally {
      if (c) await c.close().catch(() => {});
    }
  });

  it('不能直接查基表 书目（视图隔离生效）', async () => {
    const oracledb = require('oracledb');
    let c;
    let denied = false;
    try {
      c = await oracledb.getConnection({
        user: '用户_USER1',
        password: 'view2026',
        connectString: DB.connectString,
      });
      await c.execute('SELECT COUNT(*) FROM COURSE.书目');
    } catch (e) {
      const msg = (e.message || '').toUpperCase();
      denied = msg.includes('ORA-00942') || msg.includes('ORA-01031');
    } finally {
      if (c) await c.close().catch(() => {});
    }
    assert.ok(
      denied,
      '用户_USER1 居然能直接查基表 书目 → 检查：是不是不小心把表的 SELECT 也授出去了'
    );
  });
});
