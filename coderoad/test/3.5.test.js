const assert = require('node:assert');
const {
  resetSchema,
  replay,
  scalar,
  exec,
  assertObject,
  closeAll,
} = require('./utils');

/**
 * 3.5 建序列让流水号自动递增
 * 判题：重放学生的序列定义 → 连续取三次 NEXTVAL → 断言从 100 开始、每次 +1
 */
describe('3.5 建序列', () => {
  before(async () => {
    await resetSchema();
    await replay('sql/3.5_序列.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('应有 序列_借阅 序列', async () => {
    await assertObject('序列_借阅', 'SEQUENCE');
  });

  it('起始值应为 100', async () => {
    const s = await scalar(
      `SELECT last_number FROM user_sequences WHERE sequence_name = '序列_借阅'`
    );
    assert.strictEqual(
      Number(s), 100,
      `序列下一个值是 ${s}，应为 100 → 检查：START WITH 100`
    );
  });

  it('每次应递增 1', async () => {
    const r = await exec(`SELECT 序列_借阅.NEXTVAL FROM dual`);
    const a = Number(r.rows[0][0]);
    const r2 = await exec(`SELECT 序列_借阅.NEXTVAL FROM dual`);
    const b = Number(r2.rows[0][0]);
    assert.strictEqual(
      b - a, 1,
      `连续取两次是 ${a} 和 ${b}，差值 ${b - a}，应为 1 → 检查：INCREMENT BY 1`
    );
  });
});
