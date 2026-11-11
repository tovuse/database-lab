const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  replayAsCourse,
  scalarAsCourse,
} = require('./utils');

/**
 * 4.4 删掉「预约」表
 * 判题：重放基线 → 跑学生这一关 → 断言 预约 不存在了，而且别的表没被误删。
 */
describe('4.4: 删掉预约表', () => {
  before(async () => {
    await loadCourseBaseline();
    await replayAsCourse('sql/4.4.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('预约 表应已被删除', async () => {
    const n = await scalarAsCourse(
      `SELECT COUNT(*) FROM user_tables WHERE table_name = '预约'`
    );
    assert.strictEqual(
      Number(n), 0,
      '预约 表还在 → 检查：DROP TABLE 预约 CASCADE CONSTRAINTS; 有没有写、有没有执行成功'
    );
  });

  it('别的表不应被误删', async () => {
    const n = await scalarAsCourse(
      `SELECT COUNT(*) FROM user_tables WHERE table_name = '书目'`
    );
    assert.strictEqual(
      Number(n), 1,
      '书目 表也不见了 → 检查：这一关只删 预约，不要 DROP USER 或 DROP 别的表'
    );
  });
});
