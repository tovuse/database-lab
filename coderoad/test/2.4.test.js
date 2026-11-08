const assert = require('node:assert');
const {
  resetSchema,
  replay,
  assertQueryEquals,
  closeAll,
} = require('./utils');

describe('2.4 统计从未借过书的读者人数', () => {
  before(async () => {
    await resetSchema();
    await replay('answers/00_基线.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('应返回一个数字，且与标准答案一致', async () => {
    await assertQueryEquals(
      'sql/2.4_从未借书.sql',
      `SELECT COUNT(*) FROM 读者 r
        WHERE NOT EXISTS (SELECT 1 FROM 借阅 l WHERE l.借书证号 = r.借书证号)`,
      {
        hint: '用 COUNT(*) 统计读者，条件是「该借书证号在借阅表里不存在」——NOT EXISTS 或 NOT IN',
      }
    );
  });
});
