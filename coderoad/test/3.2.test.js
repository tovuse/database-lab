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
 * 3.2 给「借书」补上 INSERT
 * 判题：loadUpTo 重放前置链 → 重放学生的过程 → 真的调一次 → 断言 借阅 表多了一条记录。
 * 只断言「插入」这一件事：图书状态是下一关才改的。
 */
describe('3.2: 补全借书的插入逻辑', () => {
  before(async () => {
    await loadUpTo('3.2');
    // 判题辅助：调一次过程，看它到底插没插
    await callProcedure(`BEGIN 借书(100, '20051001', '1005050'); END;`);
  });

  after(async () => {
    await closeAll();
  });

  it('应有 借书 存储过程且编译通过', async () => {
    await assertObject('借书', 'PROCEDURE');
    await assertCompiled('借书');
  });

  it('借阅表里应多出一条流水号 100 的记录', async () => {
    const n = await scalar(`SELECT COUNT(*) FROM 借阅 WHERE 借阅流水号 = 100`);
    assert.ok(
      n === 1,
      `没找到流水号 100 的借阅记录 → 检查：BEGIN 里是不是只写了 NULL;，INSERT INTO 借阅 有没有写`
    );
  });

  it('这条记录的借书证号和图书编号应正确', async () => {
    const row = await query(
      `SELECT 借书证号, 图书编号 FROM 借阅 WHERE 借阅流水号 = 100`
    );
    assert.deepStrictEqual(
      row[0],
      ['20051001', '1005050'],
      `记录内容不对：${JSON.stringify(row[0])} → 检查：VALUES 里参数的顺序是不是 (流水号, 借书证号, 图书编号, SYSDATE)`
    );
  });

  it('借书日期应为当天', async () => {
    const d = await scalar(
      `SELECT TO_CHAR(借书日期, 'yyyy-mm-dd') FROM 借阅 WHERE 借阅流水号 = 100`
    );
    const today = new Date().toISOString().slice(0, 10);
    assert.strictEqual(
      d, today,
      `借书日期是 ${d}，应为当天 ${today} → 检查：VALUES 最后一个值是不是 SYSDATE`
    );
  });
});
