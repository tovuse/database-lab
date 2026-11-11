const assert = require('node:assert');
const { resetSchema, replayAll, replay, assertTable, assertColumn, assertConstraint, exec, scalar, closeAll } = require('./utils');

describe('1.11 建「预约」表', () => {
  before(async () => {
    await resetSchema();
    await replayAll([
      'answers/1.3.sql', 'answers/1.4.sql',
      'answers/1.5.sql', 'answers/1.6.sql',
      'answers/1.7.sql', 'answers/1.9.sql',
      'answers/1.10.sql',
    ]);
    await replay('sql/1.11.sql');
  });
  after(async () => { await closeAll(); });

  it('应有 预约 表和四个列', async () => {
    await assertTable('预约');
    for (const c of ['预约流水号', '借书证号', 'ISBN', '预约时间']) {
      await assertColumn('预约', c);
    }
  });

  it('应有主键和两个外键', async () => {
    await assertConstraint('预约', 'P', '预约流水号');
    await assertConstraint('预约', 'R', '借书证号');
    await assertConstraint('预约', 'R', 'ISBN');
  });

  it('不写预约时间时应自动填当天', async () => {
    // 判题器自己准备外键要用的读者和书目，不依赖学生前面的关卡
    await replay('answers/1.12.sql');
    await replay('answers/1.14.sql');
    await replay('answers/1.16.sql');
    await exec(
      `INSERT INTO 预约 (预约流水号, 借书证号, ISBN) VALUES (77, '20051001', '7040195836')`
    );
    const d = await scalar(
      `SELECT TO_CHAR(预约时间, 'yyyy-mm-dd') FROM 预约 WHERE 预约流水号 = 77`
    );
    const today = await scalar(`SELECT TO_CHAR(SYSDATE, 'yyyy-mm-dd') FROM dual`);
    assert.strictEqual(
      d, today,
      `预约时间是 ${d}，应为当天 ${today} → 检查：预约时间 DATE DEFAULT SYSDATE NOT NULL`
    );
  });
});
