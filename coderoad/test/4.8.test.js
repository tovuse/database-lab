const assert = require('node:assert');
const {
  closeAll,
  parsePumpCommand,
  runPump,
  dumpFileExists,
  readDumpLog,
  loadCourseBaseline,
  cleanDumpFiles,
} = require('./utils');

/**
 * 4.8 按用户（schema）方式导出整个库
 * 判题：SCHEMAS=COURSE、转储文件生成、日志成功、日志里 7 张表都在。
 */
describe('4.8: 全库方式导出', () => {
  let parsed;

  before(async () => {
    await loadCourseBaseline();
    parsed = parsePumpCommand('sql/4.8.sh', 'expdp');
    cleanDumpFiles(parsed.params.DUMPFILE.replace(/\.dmp$/, ''));
    cleanDumpFiles(parsed.params.LOGFILE.replace(/\.log$/, ''));
    runPump(parsed);
  });

  after(async () => {
    await closeAll();
  });

  it('应使用 SCHEMAS=COURSE（不是 TABLES）', async () => {
    assert.ok(
      (parsed.params.SCHEMAS || '').toUpperCase() === 'COURSE',
      `SCHEMAS 是「${parsed.params.SCHEMAS || '(空)'}」→ 检查：全库导出要写 SCHEMAS=COURSE`
    );
  });

  it('转储文件应生成', async () => {
    assert.ok(
      dumpFileExists(parsed.params.DUMPFILE),
      `DUMPDIR 里没有 ${parsed.params.DUMPFILE} → 检查：DUMPFILE 名字、DIRECTORY 是否写对`
    );
  });

  it('日志应显示成功', async () => {
    const log = readDumpLog(parsed.params.LOGFILE);
    assert.ok(
      /successfully completed/i.test(log),
      `日志没有 "successfully completed" → 看 /tmp/dump/${parsed.params.LOGFILE}`
    );
  });

  it('日志里应提到 7 张以上的表被导出', async () => {
    const log = readDumpLog(parsed.params.LOGFILE);
    const rows = (log.match(/exported "COURSE"/g) || []).length;
    assert.ok(
      rows >= 7,
      `日志里只看到 ${rows} 张表被导出，基线有 7 张 → 检查：SCHEMAS 是否真指向 COURSE`
    );
  });
});
