const assert = require('node:assert');
const { resetSchema, replay, assertQueryEquals, closeAll } = require('./utils');

describe('2.13 查询各图书的罚款总数', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00.sql');
  });
  after(async () => { await closeAll(); });

  it('结果应与标准答案一致', async () => {
    await assertQueryEquals(
      'sql/2.13.sql',
      `SELECT l.图书编号, SUM(f.罚金) AS 罚款总数
         FROM 借阅 l JOIN 罚款分类 f ON l.罚款分类号 = f.罚款分类号
        GROUP BY l.图书编号
        ORDER BY l.图书编号`,
      { ordered: true, hint: '借阅表里的罚款分类号是数字，罚金在罚款分类表里，要连起来再按图书分组求和' }
    );
  });
});
