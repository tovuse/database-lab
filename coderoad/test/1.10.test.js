const assert = require('node:assert');
const {
  resetSchema, replayAll, replay, assertTable, assertColumn,
  assertConstraint, scalar, closeAll,
} = require('./utils');

describe('1.10 建预约表', () => {
  before(async () => {
    await resetSchema();
    await replayAll([
      'answers/1.3_图书分类.sql', 'answers/1.4_图书分类主键.sql', 'answers/1.5_罚款分类.sql',
      'answers/1.6_书目表.sql', 'answers/1.7_图书表.sql',
      'answers/1.8_读者表.sql', 'answers/1.9_借阅表.sql',
    ]);
    await replay('sql/1.10_预约表.sql');
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
    await replay('answers/1.11_插分类和书.sql');
    await require('./utils').exec(
      `INSERT INTO 预约 (预约流水号, 借书证号, ISBN) VALUES (77, '20051001', '7040195836')`
    );
    const d = await scalar(
      `SELECT TO_CHAR(预约时间, 'yyyy-mm-dd') FROM 预约 WHERE 预约流水号 = 77`
    );
    const today = new Date().toISOString().slice(0, 10);
    assert.strictEqual(
      d, today,
      `预约时间是 ${d}，应为当天 → 检查：预约时间 DATE DEFAULT SYSDATE NOT NULL`
    );
  });
});
