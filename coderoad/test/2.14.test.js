const assert = require('node:assert');
const { loadUpTo, assertQueryEquals, closeAll } = require('./utils');

describe('2.14: 查询借阅及罚款分类信息（左外连接）', () => {
  before(async () => {
    await loadUpTo('2.14');
  });
  after(async () => { await closeAll(); });

  it('没罚款的记录也要保留（罚款列为空）', async () => {
    await assertQueryEquals(
      'sql/2.14.sql',
      `SELECT l.借阅流水号, l.借书证号, l.图书编号, f.罚款名称, f.罚金
         FROM 借阅 l LEFT JOIN 罚款分类 f ON l.罚款分类号 = f.罚款分类号
        ORDER BY l.借阅流水号`,
      { ordered: true, hint: '必须用 LEFT JOIN：以借阅表为主，没罚款的记录也要留下，罚款列显示为空。用 INNER JOIN 会丢掉 4 行' }
    );
  });
});
