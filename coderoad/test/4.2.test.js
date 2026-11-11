const assert = require('node:assert');
const {
  closeAll,
  parsePumpCommandLoose,
} = require('./utils');

/**
 * 4.2 给 expdp 补上 DUMPFILE / LOGFILE
 * 只做参数检查：还缺 TABLES，跑起来会被 Data Pump 拒绝。
 */
describe('4.2 补导出文件名', () => {
  let parsed;

  before(async () => {
    parsed = parsePumpCommandLoose('sql/4.2.sh', 'expdp');
  });

  after(async () => {
    await closeAll();
  });

  it('应有 DUMPFILE 且以 .dmp 结尾', async () => {
    const f = parsed.params.DUMPFILE || '';
    assert.ok(
      /\.dmp$/i.test(f),
      `DUMPFILE 是「${f || '(空)'}」→ 检查：写 DUMPFILE=yuyue.dmp 这样的文件名，扩展名用 .dmp`
    );
  });

  it('应有 LOGFILE 且以 .log 结尾', async () => {
    const f = parsed.params.LOGFILE || '';
    assert.ok(
      /\.log$/i.test(f),
      `LOGFILE 是「${f || '(空)'}」→ 检查：写 LOGFILE=yuyue.log 这样的文件名，扩展名用 .log`
    );
  });

  it('两个文件名必须纯英文（ASCII）', async () => {
    const ascii = /^[\x20-\x7e]+$/;
    for (const k of ['DUMPFILE', 'LOGFILE']) {
      assert.ok(
        ascii.test(parsed.params[k] || ''),
        `${k}=${parsed.params[k]} 含中文或空格 → 检查：Data Pump 不认中文文件名，改用 yuyue.dmp / yuyue.log`
      );
    }
  });

  it('DIRECTORY=DUMPDIR 不应被删掉', async () => {
    assert.strictEqual(
      String(parsed.params.DIRECTORY || '').toUpperCase(), 'DUMPDIR',
      `DIRECTORY 是「${parsed.params.DIRECTORY || '(空)'}」→ 检查：上一关的 DIRECTORY=DUMPDIR 要保留`
    );
  });
});
