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
 * 3.8 图书丢失过程
 * 判题：造一条未还记录 → 调用图书丢失 → 断言罚款分类=3、备注='丢失'
 */
describe('3.8 建图书丢失存储过程', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
    await replay('answers/3.4_造一条未还记录.sql');
    await replay('sql/3.8_丢失过程.sql');
    await callProcedure(`BEGIN 图书丢失('20051001', '1005050'); END;`);
  });

  after(async () => {
    await closeAll();
  });

  it('应有 图书丢失 存储过程且编译通过', async () => {
    await assertObject('图书丢失', 'PROCEDURE');
    await assertCompiled('图书丢失');
  });

  it('罚款分类号应改为 3', async () => {
    const n = await scalar(`
      SELECT 罚款分类号 FROM 借阅
       WHERE 借书证号 = '20051001' AND 图书编号 = '1005050' AND 归还日期 IS NULL`);
    assert.strictEqual(
      Number(n), 3,
      `罚款分类号是 ${n}，应为 3（丢失）→ 检查：UPDATE 里有没有 SET 罚款分类号 = 3`
    );
  });

  it('备注应改为「丢失」', async () => {
    const r = await scalar(`
      SELECT 备注 FROM 借阅
       WHERE 借书证号 = '20051001' AND 图书编号 = '1005050' AND 归还日期 IS NULL`);
    assert.strictEqual(
      String(r).trim(), '丢失',
      `备注是「${r}」，应为「丢失」→ 检查：UPDATE 里有没有 SET 备注 = '丢失'`
    );
  });

  it('图书状态应保持「是」', async () => {
    const s = await scalar(
      `SELECT 是否借出 FROM 图书 WHERE 图书编号 = '1005050'`
    );
    assert.strictEqual(
      String(s).trim(), '是',
      `图书状态是「${String(s).trim()}」，丢失的书应该仍是「是」→ 检查：不要把它改成「否」`
    );
  });
});
