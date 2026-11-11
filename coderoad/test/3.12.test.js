const assert = require('node:assert');
const {
  loadUpTo,
  scalar,
  exec,
  assertObject,
  assertCompiled,
  closeAll,
} = require('./utils');

/**
 * 3.12 借阅 INSERT 触发器
 * 判题：关键在「不通过过程、直接 INSERT」，看图书状态会不会自动变。
 */
describe('3.12 建借阅触发器', () => {
  before(async () => {
    await loadUpTo('3.12');
  });

  after(async () => {
    await closeAll();
  });

  it('应有 触发器_借书 触发器且编译通过', async () => {
    await assertObject('触发器_借书', 'TRIGGER');
    await assertCompiled('触发器_借书');
  });

  it('直接 INSERT 借阅，图书状态应自动变成「是」', async () => {
    // 1005050 在基线里是「否」，直接插一条借阅记录，不碰图书表
    await exec(`
      INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
      VALUES (500, '20051001', '1005050', SYSDATE)`);

    const s = await scalar(
      `SELECT 是否借出 FROM 图书 WHERE 图书编号 = '1005050'`
    );
    assert.strictEqual(
      String(s).trim(), '是',
      `图书状态还是「${String(s).trim()}」→ 检查：触发器是不是 AFTER INSERT ON 借阅 FOR EACH ROW，里面用 :NEW.图书编号 定位`
    );
  });

  it('触发器不应影响别的书', async () => {
    const s = await scalar(
      `SELECT 是否借出 FROM 图书 WHERE 图书编号 = '2001231'`
    );
    assert.strictEqual(
      String(s).trim(), '否',
      '另一本书也被改成「是」了 → 检查：UPDATE 的 WHERE 条件是不是只针对 :NEW.图书编号'
    );
  });
});
