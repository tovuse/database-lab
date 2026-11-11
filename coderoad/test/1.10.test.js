const assert = require('node:assert');
const {
  loadUpTo, replayAll, assertTable, assertColumn,
  assertConstraint, expectError, closeAll,
} = require('./utils');

describe('1.10 建「借阅」表（三个外键）', () => {
  before(async () => {
    await loadUpTo('1.10');

    // 判题器自己准备上级数据，让下面两条负向测试只可能撞到「借阅」自己的约束：
    //   图书编号 1005050 存在、读者 20051001 存在、分类 1 存在，而 9999999 不存在
    await replayAll([
      'answers/1.12.sql', 'answers/1.13.sql',
      'answers/1.14.sql', 'answers/1.15.sql',
      'answers/1.16.sql',
    ]);
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

  it('插入不存在的图书编号应被外键拒绝', async () => {
    await expectError(
      `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
       VALUES (900, '20051001', '9999999', TO_DATE('2020/06/01','yyyy/mm/dd'))`,
      'ORA-02291',
      '图书编号 要有 FOREIGN KEY REFERENCES 图书(图书编号)'
    );
  });

  it('插入不存在的借书证号应被外键拒绝', async () => {
    await expectError(
      `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
       VALUES (902, '99999999', '1005050', TO_DATE('2020/06/01','yyyy/mm/dd'))`,
      'ORA-02291',
      '借书证号 要有 FOREIGN KEY REFERENCES 读者(借书证号)'
    );
  });

  it('归还日期早于借书日期应被 CHECK 拒绝', async () => {
    await expectError(
      `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期)
       VALUES (901, '20051001', '1005050',
               TO_DATE('2020/06/01','yyyy/mm/dd'), TO_DATE('2020/01/01','yyyy/mm/dd'))`,
      'ORA-02290',
      '要有 CHECK (归还日期 IS NULL OR 归还日期 >= 借书日期)'
    );
  });
});
