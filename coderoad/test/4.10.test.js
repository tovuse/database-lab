const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  closeAll,
  loadCourseBaseline,
  replayAsCourse,
  scalarAsCourse,
  WORKSPACE,
} = require('./utils');

/**
 * 4.10 删掉「预约」表的全部数据
 * 判题：重放基线 → 跑学生 4.10 → 断言表被清空，且文件里确实有 COMMIT。
 *
 * 为什么 COMMIT 要单独检查：判题器重放 SQL 时是自动提交的，
 * 光看库里有没有数据，分不出学生写没写 COMMIT。
 */
describe('4.10 删掉预约数据', () => {
  before(async () => {
    await loadCourseBaseline();
    await replayAsCourse('sql/4.10_删预约数据.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('预约表应被清空', async () => {
    const n = await scalarAsCourse(`SELECT COUNT(*) FROM 预约`);
    assert.strictEqual(
      Number(n), 0,
      `预约 还有 ${n} 行 → 检查：DELETE FROM 预约; 有没有写`
    );
  });

  it('别的表不应被误删', async () => {
    const n = await scalarAsCourse(`SELECT COUNT(*) FROM 书目`);
    assert.strictEqual(Number(n), 4, `书目 现在有 ${n} 行，基线应为 4 行 → 检查：只删 预约，别动别的表`);
  });

  it('文件里应有 COMMIT', async () => {
    const file = path.join(WORKSPACE, 'sql/4.10_删预约数据.sql');
    const text = fs.readFileSync(file, 'utf8');
    // 去掉注释行再找，避免把注释里提到的 COMMIT 当成提交语句
    const code = text
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    assert.ok(
      /(^|[^A-Za-z_])COMMIT\s*;/i.test(code),
      '文件里没看到 COMMIT; → 检查：DELETE 之后要写一条 COMMIT; 把删除真正提交'
    );
  });
});
