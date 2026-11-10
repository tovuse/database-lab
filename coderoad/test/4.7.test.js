const assert = require('node:assert');
const {
  closeAll,
  parsePumpCommandLoose,
} = require('./utils');

/**
 * 4.7 写按 schema 导出的 expdp 骨架
 * 只做参数检查：还缺 DUMPFILE / LOGFILE，不真的跑。
 */
describe('4.7 写全库导出骨架', () => {
  let parsed;

  before(async () => {
    parsed = parsePumpCommandLoose('sql/4.7_全库导出骨架.sh', 'expdp');
  });

  after(async () => {
    await closeAll();
  });

  it('应使用 SCHEMAS=COURSE（不是 TABLES）', async () => {
    assert.strictEqual(
      String(parsed.params.SCHEMAS || '').toUpperCase(), 'COURSE',
      `SCHEMAS 是「${parsed.params.SCHEMAS || '(空)'}」→ 检查：全库导出写 SCHEMAS=COURSE，值要大写`
    );
  });

  it('不应同时写 TABLES', async () => {
    assert.ok(
      !parsed.params.TABLES,
      `同时出现了 TABLES=${parsed.params.TABLES} → 检查：SCHEMAS 和 TABLES 互斥，全库导出只用 SCHEMAS`
    );
  });

  it('应保留 DIRECTORY=DUMPDIR', async () => {
    assert.strictEqual(
      String(parsed.params.DIRECTORY || '').toUpperCase(), 'DUMPDIR',
      `DIRECTORY 是「${parsed.params.DIRECTORY || '(空)'}」→ 检查：DIRECTORY=DUMPDIR 要保留`
    );
  });
});
