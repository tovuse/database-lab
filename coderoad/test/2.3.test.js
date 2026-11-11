const assert = require('node:assert');
const {
  resetSchema,
  replay,
  assertQueryEquals,
  closeAll,
} = require('./utils');

describe('2.3 各出版社的最高单价、平均单价', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('结果应与标准答案一致（按平均单价降序）', async () => {
    await assertQueryEquals(
      'sql/2.3.sql',
      `SELECT 出版单位,
              MAX(单价)           AS 最高单价,
              ROUND(AVG(单价), 2) AS 平均单价
         FROM 书目
        GROUP BY 出版单位
        ORDER BY 平均单价 DESC`,
      {
        ordered: true,
        hint: 'GROUP BY 出版单位，用 MAX(单价) 和 ROUND(AVG(单价),2)，最后 ORDER BY 平均单价 DESC',
      }
    );
  });
});
