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
 * 3.3 给「借书」补上 UPDATE 和异常处理
 * 判题：调用一次 → 借阅多一条 + 图书变成「是」→ 再检查源码里确实有 EXCEPTION 段。
 */
describe('3.3: 借书改图书状态并加异常处理', () => {
  before(async () => {
    await loadUpTo('3.3');
    // 判题辅助：调一次过程，验证 INSERT + UPDATE 的副作用
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
      `没找到流水号 100 的借阅记录 → 检查：上一关的 INSERT 是不是被删掉了`
    );
  });

  it('这本书的是否借出应变成「是」', async () => {
    const s = await scalar(
      `SELECT 是否借出 FROM 图书 WHERE 图书编号 = '1005050'`
    );
    assert.strictEqual(
      String(s).trim(), '是',
      `图书状态是「${String(s).trim()}」，应为「是」→ 检查：INSERT 后面有没有 UPDATE 图书 SET 是否借出 = '是'`
    );
  });

  it('过程里应有 EXCEPTION 异常处理', async () => {
    const rows = await query(`
      SELECT text FROM user_source
       WHERE name = '借书' AND type = 'PROCEDURE' ORDER BY line`);
    const src = rows.map((r) => String(r[0])).join('\n');
    assert.ok(
      /EXCEPTION/i.test(src),
      `过程源码里没有 EXCEPTION 段 → 检查：在 END; 之前加 EXCEPTION WHEN OTHERS THEN RAISE_APPLICATION_ERROR(-20010, '借书失败：' || SQLERRM);`
    );
  });
});
