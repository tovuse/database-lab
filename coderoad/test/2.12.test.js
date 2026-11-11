const assert = require('node:assert');
const { loadUpTo, replay, assertQueryEquals, closeAll } = require('./utils');

describe('2.12 检索书名以 Internet 开头的图书', () => {
  before(async () => {
    await loadUpTo('2.12');
    // 基线里没有 Internet 的书，答案会是 0 行，那样写 WHERE 1=0 也能过。
    // 这里补三条测试数据：两条以 Internet 开头、一条在中间，用来考 LIKE 的位置
    await replay('answers/2.12.sql');
  });
  after(async () => { await closeAll(); });

  it('应只查出以 Internet 开头的（不含中间含 Internet 的）', async () => {
    await assertQueryEquals(
      'sql/2.12.sql',
      `SELECT 书名, 作者 FROM 书目
        WHERE 书名 LIKE 'Internet%'
        ORDER BY 书名`,
      { ordered: true, hint: '「以 X 开头」用 LIKE \'X%\'，通配符 % 不加在前面。写成 \'%Internet%\' 会把中间含的也查出来' }
    );
  });
});
