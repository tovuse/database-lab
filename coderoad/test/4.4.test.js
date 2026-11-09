const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  replayAsCourse,
  scalarAsCourse,
} = require('./utils');

/**
 * 4.4 让「预约」表支持闪回
 * 判题：重放基线 → 跑学生 4.4 → 断言 user_tables.row_movement = 'ENABLED'
 */
describe('4.4 开启行移动', () => {
  before(async () => {
    await loadCourseBaseline();
    await replayAsCourse('sql/4.4_开启行移动.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('预约 表的 row_movement 应为 ENABLED', async () => {
    const v = await scalarAsCourse(
      `SELECT row_movement FROM user_tables WHERE table_name = '预约'`
    );
    assert.strictEqual(
      String(v).toUpperCase(), 'ENABLED',
      `row_movement 是「${v}」，应为 ENABLED → 检查：是否写了 ALTER TABLE 预约 ENABLE ROW MOVEMENT;`
    );
  });

  it('表本身应该还在（ENABLE 不是重建表）', async () => {
    const n = await scalarAsCourse(`SELECT COUNT(*) FROM 预约`);
    assert.strictEqual(Number(n), 1, `预约 现在有 ${n} 行，基线应为 1 行`);
  });
});
