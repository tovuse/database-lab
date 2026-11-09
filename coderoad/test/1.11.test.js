const assert = require('node:assert');
const {
  resetSchema, replayAll, replay, assertRowCount, closeAll,
} = require('./utils');

describe('1.11 插入 7 张表的原始数据', () => {
  before(async () => {
    await resetSchema();
    await replayAll([
      'answers/1.3_图书分类.sql', 'answers/1.4_图书分类主键.sql',
      'answers/1.5_罚款分类.sql',
      'answers/1.6_书目表.sql', 'answers/1.7_图书表.sql',
      'answers/1.8_读者表.sql', 'answers/1.9_借阅表.sql',
      'answers/1.10_预约表.sql',
    ]);
    await replay('sql/1.11_插入数据.sql');
  });
  after(async () => { await closeAll(); });

  const expect = [
    ['图书分类', 3], ['罚款分类', 3], ['书目', 4], ['图书', 5],
    ['读者', 5], ['借阅', 6], ['预约', 1],
  ];
  for (const [t, n] of expect) {
    it(`「${t}」应有 ${n} 行`, async () => {
      await assertRowCount(t, n);
    });
  }
});
