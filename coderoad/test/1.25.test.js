const assert = require('node:assert');
const { loadUpTo, expectError, exec, scalar, closeAll } = require('./utils');

describe('1.25 把「借阅」的借书日期改成 NOT NULL', () => {
  before(async () => {
    await loadUpTo('1.25');
  });
  after(async () => { await closeAll(); });

  it('借阅表的 借书日期 应为 NOT NULL', async () => {
    const v = await scalar(
      `SELECT nullable FROM user_tab_columns
        WHERE table_name = '借阅' AND column_name = '借书日期'`
    );
    assert.strictEqual(
      String(v).trim(), 'N',
      `借书日期 现在是 ${String(v).trim() === 'Y' ? '可空（NULL）' : v} → 检查：是否用了 ALTER TABLE 借阅 MODIFY (借书日期 NOT NULL)`
    );
  });

  it('插一条借书日期为 NULL 的借阅应被拒绝', async () => {
    await expectError(
      `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
       VALUES (901, '20051001', '1005050', NULL)`,
      'ORA-01400',
      '借阅.借书日期 要改成 NOT NULL（ALTER TABLE 借阅 MODIFY (借书日期 NOT NULL)）'
    );
  });

  it('带正常借书日期的借阅仍应能插入', async () => {
    await exec(
      `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
       VALUES (902, '20051001', '1005050', TO_DATE('2024/09/01','yyyy/mm/dd'))`
    );
    const n = await scalar(
      `SELECT COUNT(*) FROM 借阅 WHERE 借阅流水号 = 902`
    );
    assert.strictEqual(
      Number(n), 1,
      '正常的借阅记录被拒绝了 → 检查：MODIFY 是不是把列改成了别的属性'
    );
  });
});
