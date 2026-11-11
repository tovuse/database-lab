const assert = require('node:assert');
const { loadUpTo, assertQueryEquals, closeAll } = require('./utils');

describe('2.11: 统计参与借书的人数', () => {
  before(async () => {
    await loadUpTo('2.11');
  });
  after(async () => { await closeAll(); });

  it('应返回去重后的读者数', async () => {
    await assertQueryEquals(
      'sql/2.11.sql',
      `SELECT COUNT(DISTINCT 借书证号) FROM 借阅`,
      { hint: '借阅表里同一个读者可能有多条记录，要 DISTINCT 去重再 COUNT' }
    );
  });
});
