const assert = require('node:assert');
const {
  loadUpTo,
  assertQueryEquals,
  closeAll,
} = require('./utils');

/**
 * 2.1 查询「红楼梦」当前可借的图书
 * 判题：结果集比对（有序，因为题目要求按图书编号排序）
 */
describe('2.1: 查询红楼梦当前可借的图书', () => {
  before(async () => {
    await loadUpTo('2.1');
  });

  after(async () => {
    await closeAll();
  });

  it('结果应与标准答案一致（按图书编号排序）', async () => {
    await assertQueryEquals(
      'sql/2.1.sql',
      `SELECT t.图书编号, b.ISBN, b.书名, b.作者, b.出版单位, b.单价
         FROM 图书 t JOIN 书目 b ON t.ISBN = b.ISBN
        WHERE b.书名 = '红楼梦' AND t.是否借出 = '否'
        ORDER BY t.图书编号`,
      {
        ordered: true,
        hint: '要用 图书 JOIN 书目，并且同时满足两个条件：书名=红楼梦、是否借出=否',
      }
    );
  });
});
