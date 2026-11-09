const assert = require('node:assert');
const {
  resetSchema, replayAll, replay, assertTable, assertColumn,
  assertConstraint, expectError, closeAll,
} = require('./utils');

describe('1.9 建借阅表', () => {
  before(async () => {
    await resetSchema();
    await replayAll([
      'answers/1.3_图书分类.sql', 'answers/1.4_图书分类主键.sql', 'answers/1.5_罚款分类.sql',
      'answers/1.6_书目表.sql', 'answers/1.7_图书表.sql',
      'answers/1.8_读者表.sql',
    ]);
    await replay('sql/1.9_借阅表.sql');
  });
  after(async () => { await closeAll(); });

  it('应有 借阅 表和七个列', async () => {
    await assertTable('借阅');
    for (const c of ['借阅流水号', '借书证号', '图书编号', '借书日期',
                     '归还日期', '罚款分类号', '备注']) {
      await assertColumn('借阅', c);
    }
  });

  it('应有 1 个主键和 3 个外键', async () => {
    await assertConstraint('借阅', 'P', '借阅流水号');
    for (const c of ['借书证号', '图书编号', '罚款分类号']) {
      await assertConstraint('借阅', 'R', c);
    }
  });

  it('归还日期早于借书日期应被 CHECK 拒绝', async () => {
    await replayAll([
      'answers/1.11_插分类和书.sql',
    ]);
    await expectError(
      `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期)
       VALUES (900, '20051001', '1005050',
               TO_DATE('2020/06/01','yyyy/mm/dd'), TO_DATE('2020/01/01','yyyy/mm/dd'))`,
      'ORA-02290',
      '要有 CHECK (归还日期 IS NULL OR 归还日期 >= 借书日期)'
    );
  });
});
