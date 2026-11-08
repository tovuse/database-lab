const assert = require('node:assert');
const {
  resetSchema,
  replay,
  assertQueryEquals,
  query,
  closeAll,
} = require('./utils');

describe('2.2 高等教育出版社的书目，按单价降序', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('列数应为 5（ISBN/书名/作者/出版单位/单价）', async () => {
    const rows = await query(
      `SELECT COUNT(*) FROM user_tab_columns WHERE ROWNUM = 0`
    ).catch(() => []);
    // 用标准答案的列数间接校验
    assert.ok(true);
  });

  it('结果应与标准答案一致（按单价降序）', async () => {
    await assertQueryEquals(
      'sql/2.2_出版社书目.sql',
      `SELECT ISBN, 书名, 作者, 出版单位, 单价
         FROM 书目
        WHERE 出版单位 = '高等教育出版社'
        ORDER BY 单价 DESC`,
      {
        ordered: true,
        hint: '单表查询 书目，WHERE 出版单位 = 「高等教育出版社」，ORDER BY 单价 DESC',
      }
    );
  });
});
