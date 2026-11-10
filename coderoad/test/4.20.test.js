const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  replayAsCourse,
  queryAsCourse,
  scalarAsCourse,
} = require('./utils');

/**
 * 4.20 建视图 VIEW_READER
 * 判题：视图存在、三列齐、行数=4（基线 4 本书目）、能查出分类名
 */
describe('4.20 建视图 VIEW_READER', () => {
  before(async () => {
    await loadCourseBaseline();
    await replayAsCourse('sql/4.20_建视图.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('视图 VIEW_READER 应存在', async () => {
    const n = await scalarAsCourse(
      `SELECT COUNT(*) FROM user_views WHERE view_name = 'VIEW_READER'`
    );
    assert.ok(n === 1, '没找到视图 VIEW_READER → 检查：CREATE OR REPLACE VIEW 有没有执行成功');
  });

  it('应有 ISBN / 书名 / 类名 三列', async () => {
    const rows = await queryAsCourse(`
      SELECT column_name FROM user_tab_columns
       WHERE table_name = 'VIEW_READER' ORDER BY column_id`);
    const cols = rows.map((r) => String(r[0]).toUpperCase());
    for (const want of ['ISBN', '书名', '类名']) {
      assert.ok(
        cols.includes(want),
        `视图缺列 ${want}（当前：${cols.join(', ')}）→ 检查：SELECT 里要选出这三列`
      );
    }
  });

  it('应查出 4 行（基线 4 本书目）', async () => {
    const n = await scalarAsCourse(`SELECT COUNT(*) FROM VIEW_READER`);
    assert.strictEqual(
      Number(n), 4,
      `视图返回 ${n} 行，应为 4 行 → 检查：连表条件是不是 b.图书分类号 = c.图书分类号`
    );
  });

  it('类名应能查出「文学」这类真实值', async () => {
    const n = await scalarAsCourse(
      `SELECT COUNT(*) FROM VIEW_READER WHERE 类名 = '文学'`
    );
    assert.ok(
      Number(n) >= 1,
      `按 类名='文学' 查不到数据 → 检查：有没有真的连上 图书分类 表`
    );
  });
});
