const assert = require('node:assert');
const {
  resetSchema,
  replay,
  query,
  scalar,
  assertObject,
  assertCompiled,
  closeAll,
} = require('./utils');

/**
 * 3.2 调用「借书」存储过程
 * 判题：先建好标准答案的 借书 过程，再重放学生这一关的调用语句，断言数据真的变了
 */
describe('3.2 调用借书存储过程', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
    await replay('answers/3.1_借书过程.sql');   // 前置：标准答案的过程
    await replay('sql/3.2_调用借书.sql');       // 学生这一关：调用
  });

  after(async () => {
    await closeAll();
  });

  it('借阅表里应多出一条流水号 100 的记录', async () => {
    const n = await scalar(
      `SELECT COUNT(*) FROM 借阅 WHERE 借阅流水号 = 100`
    );
    assert.ok(
      n === 1,
      `没找到流水号 100 的借阅记录 → 检查：调用了 借书 吗？三个参数顺序对不对（流水号在前）`
    );
  });

  it('这条记录的借书证号和图书编号应正确', async () => {
    const row = await query(
      `SELECT 借书证号, 图书编号 FROM 借阅 WHERE 借阅流水号 = 100`
    );
    assert.deepStrictEqual(
      row[0],
      ['20051001', '1005050'],
      `记录内容不对：${JSON.stringify(row[0])} → 检查：参数顺序是 (流水号, 借书证号, 图书编号)`
    );
  });

  it('借书日期应为当天', async () => {
    const d = await scalar(
      `SELECT TO_CHAR(借书日期, 'yyyy-mm-dd') FROM 借阅 WHERE 借阅流水号 = 100`
    );
    const today = new Date().toISOString().slice(0, 10);
    assert.strictEqual(
      d, today,
      `借书日期是 ${d}，应为当天 ${today} → 检查：过程里用的是不是 SYSDATE`
    );
  });

  it('这本书的是否借出应变成「是」', async () => {
    const s = await scalar(
      `SELECT 是否借出 FROM 图书 WHERE 图书编号 = '1005050'`
    );
    assert.strictEqual(
      String(s).trim(), '是',
      `图书状态是「${String(s).trim()}」，应为「是」→ 检查：过程里有没有 UPDATE 图书`
    );
  });
});
