const assert = require('node:assert');
const {
  loadUpTo,
  query,
  scalar,
  assertObject,
  assertCompiled,
  callProcedure,
  closeAll,
} = require('./utils');

/**
 * 3.11 简化借书过程（2 参数，流水号走序列）
 * 判题：前置链（含 answers/3.10.sql 的序列）+ 学生的过程 → 连调两次 → 断言流水号自动生成且递增
 */
describe('3.11: 建简化借书存储过程', () => {
  before(async () => {
    await loadUpTo('3.11');
  });

  after(async () => {
    await closeAll();
  });

  it('应有 简化借书 存储过程且编译通过', async () => {
    await assertObject('简化借书', 'PROCEDURE');
    await assertCompiled('简化借书');
  });

  it('应有 2 个输入参数', async () => {
    const n = await scalar(`
      SELECT COUNT(*) FROM user_arguments
       WHERE object_name = '简化借书' AND in_out = 'IN' AND argument_name IS NOT NULL`);
    assert.ok(
      n === 2,
      `参数个数是 ${n}，要求 2 个（借书证号、图书编号）→ 检查：不用再传流水号，它由序列生成`
    );
  });

  it('调用两次应自动生成两条记录，流水号递增', async () => {
    await callProcedure(`BEGIN 简化借书('20051001', '1005050'); END;`);
    await callProcedure(`BEGIN 简化借书('20061234', '2001231'); END;`);

    const rows = await query(`
      SELECT 借阅流水号 FROM 借阅
       WHERE 借书证号 = '20051001' AND 图书编号 = '1005050'
          OR 借书证号 = '20061234' AND 图书编号 = '2001231'
       ORDER BY 借阅流水号`);
    assert.strictEqual(
      rows.length, 2,
      `插入 ${rows.length} 条记录，应为 2 条 → 检查：过程体是不是只有一条 INSERT`
    );
    const [a, b] = rows.map((r) => Number(r[0]));
    assert.strictEqual(
      b - a, 1,
      `两条记录的流水号是 ${a} 和 ${b}，差值 ${b - a}，应为 1 → 检查：INSERT 里用的是不是 序列_借阅.NEXTVAL`
    );
  });

  it('借书日期应为当天', async () => {
    const d = await scalar(`
      SELECT TO_CHAR(MAX(借书日期), 'yyyy-mm-dd') FROM 借阅
       WHERE 借书证号 = '20051001' AND 图书编号 = '1005050'`);
    const today = new Date().toISOString().slice(0, 10);
    assert.strictEqual(
      d, today,
      `借书日期是 ${d}，应为当天 ${today} → 检查：VALUES 里有没有 SYSDATE`
    );
  });
});
