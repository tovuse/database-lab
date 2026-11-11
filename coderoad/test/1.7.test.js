const assert = require('node:assert');
const {
  loadUpTo, query, assertTable, assertColumn,
  assertConstraint, closeAll,
} = require('./utils');

describe('1.7 建「图书」表', () => {
  before(async () => {
    await loadUpTo('1.7');
  });
  after(async () => { await closeAll(); });

  it('应有 图书 表和四个列', async () => {
    await assertTable('图书');
    for (const c of ['图书编号', 'ISBN', '是否借出', '备注']) {
      await assertColumn('图书', c);
    }
  });

  it('图书编号 应为 CHAR，ISBN 应为 VARCHAR2', async () => {
    await assertColumn('图书', '图书编号', 'CHAR');
    await assertColumn('图书', 'ISBN', 'VARCHAR2');
  });

  it('图书编号 是主键，ISBN 有外键指向书目', async () => {
    await assertConstraint('图书', 'P', '图书编号');
    await assertConstraint('图书', 'R', 'ISBN');
  });

  it('是否借出 的宽度应放得下一个汉字（不是 CHAR(1)）', async () => {
    // 不卡死 CHAR，CHAR(3) 和 VARCHAR2(3) 都算对；
    // 但 CHAR(1) 在 AL32UTF8 下只有 3 字节，下一关插「否」会报 ORA-01401
    const rows = await query(`
      SELECT data_type, char_length FROM user_tab_columns
       WHERE table_name = '图书' AND column_name = '是否借出'`);
    assert.ok(rows.length, '找不到 是否借出 列 → 检查：列名有没有写错');
    const [type, len] = rows[0];
    assert.ok(
      Number(len) >= 3,
      `是否借出 是 ${type}(${len})，装不下一个汉字 → 检查：AL32UTF8 下一个汉字占 3 字节，要用 CHAR(3)`
    );
  });
});
