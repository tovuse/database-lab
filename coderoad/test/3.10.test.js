const assert = require('node:assert');
const {
  resetSchema,
  replay,
  scalar,
  assertObject,
  closeAll,
} = require('./utils');

/**
 * 3.10 建序列让流水号自动递增
 * 判题：重放学生的序列定义 → 连续取两次 NEXTVAL → 断言从 100 开始、每次 +1
 *
 * 取 NEXTVAL 用 scalar（内部是数组格式），不要用 exec：
 * exec 默认返回对象格式，rows[0][0] 取不到值。
 */
describe('3.10 建序列', () => {
  before(async () => {
    await resetSchema();
    await replay('sql/3.10_序列.sql');
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
    const a = Number(await scalar(`SELECT 序列_借阅.NEXTVAL FROM dual`));
    const b = Number(await scalar(`SELECT 序列_借阅.NEXTVAL FROM dual`));
    assert.strictEqual(
      b - a, 1,
      `连续取两次是 ${a} 和 ${b}，差值 ${b - a}，应为 1 → 检查：INCREMENT BY 1`
    );
  });
});
