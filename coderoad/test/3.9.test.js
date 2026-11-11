const assert = require('node:assert');
const {
  resetSchema,
  replay,
  scalar,
  assertObject,
  assertCompiled,
  callProcedure,
  closeAll,
} = require('./utils');

/**
 * 3.9 还书过程补归还日期
 * 判题：造一条未还记录 → 调用还书 → 断言归还日期、罚款分类、图书状态。
 */
describe('3.9 还书补归还日期', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00.sql');
    await replay('answers/3.8_seed.sql');
    await replay('sql/3.9.sql');
    await callProcedure(`BEGIN 还书('20051001', '1005050', 1); END;`);
  });

  after(async () => {
    await closeAll();
  });

  it('应有 还书 存储过程且编译通过', async () => {
    await assertObject('还书', 'PROCEDURE');
    await assertCompiled('还书');
  });

  it('归还日期应被填上（当天）', async () => {
    const d = await scalar(`
      SELECT TO_CHAR(归还日期, 'yyyy-mm-dd') FROM 借阅
       WHERE 借书证号 = '20051001' AND 图书编号 = '1005050'`);
    const today = new Date().toISOString().slice(0, 10);
    assert.strictEqual(
      d, today,
      `归还日期是 ${d}，应为当天 ${today} → 检查：UPDATE 借阅 里有没有 SET 归还日期 = SYSDATE`
    );
  });

  it('罚款分类号应为传入的 1', async () => {
    const n = await scalar(`
      SELECT 罚款分类号 FROM 借阅
       WHERE 借书证号 = '20051001' AND 图书编号 = '1005050'`);
    assert.strictEqual(
      Number(n), 1,
      `罚款分类号是 ${n}，应为 1 → 检查：SET 里有没有用第三个参数给 罚款分类号 赋值`
    );
  });

  it('图书的是否借出应变成「否」', async () => {
    const s = await scalar(
      `SELECT 是否借出 FROM 图书 WHERE 图书编号 = '1005050'`
    );
    assert.strictEqual(
      String(s).trim(), '否',
      `图书状态是「${String(s).trim()}」，应为「否」→ 检查：过程里有没有 UPDATE 图书`
    );
  });
});
