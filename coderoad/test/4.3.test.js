const assert = require('node:assert');
const {
  closeAll,
  parsePumpCommand,
  runPump,
  dumpFileExists,
  readDumpLog,
  loadCourseBaseline,
  assertCourseTable,
  scalarAsCourse,
  cleanDumpFiles,
} = require('./utils');

/**
 * 4.3 用 expdp 导出「预约」表
 *
 * 判题流程：
 *   1. 重建 COURSE 基线（保证 预约 表在、有 1 行）
 *   2. 解析学生文件里的 expdp 参数（只取参数，不盲跑 shell）
 *   3. 用这些参数真的跑一次 expdp
 *   4. 断言：转储文件有内容、日志里写了 successfully completed、导的确实是 预约
 */
describe('4.3 用 expdp 导出预约表', () => {
  let parsed;

  before(async () => {
    await loadCourseBaseline();
    parsed = parsePumpCommand('sql/4.3.sh', 'expdp');
    // 清掉上一次的产物，确保看到的是学生这次导出来的文件
    cleanDumpFiles(parsed.params.DUMPFILE.replace(/\.dmp$/, ''));
    cleanDumpFiles(parsed.params.LOGFILE.replace(/\.log$/, ''));
    runPump(parsed);
  });

  after(async () => {
    await closeAll();
  });

  it('命令应指定 TABLES=预约', async () => {
    const tables = (parsed.params.TABLES || '').toUpperCase();
    assert.ok(
      tables.includes('预约'),
      `TABLES 是「${parsed.params.TABLES || '(空)'}」，要求导出 预约 表 → 检查：TABLES=预约 有没有写`
    );
  });

  it('转储文件应该真的生成了', async () => {
    assert.ok(
      dumpFileExists(parsed.params.DUMPFILE),
      `DUMPDIR 里没有 ${parsed.params.DUMPFILE} → 检查：DUMPFILE 名字、DIRECTORY 是否写对`
    );
  });

  it('导出日志应显示成功', async () => {
    const log = readDumpLog(parsed.params.LOGFILE);
    assert.ok(
      /successfully completed/i.test(log),
      `日志里没有 "successfully completed" → 打开 /tmp/dump/${parsed.params.LOGFILE} 看具体报错`
    );
  });

  it('预约表此时应还在（导出不删源表）', async () => {
    await assertCourseTable('预约');
    const n = await scalarAsCourse(`SELECT COUNT(*) FROM 预约`);
    assert.strictEqual(Number(n), 1, `预约 现在有 ${n} 行，基线应为 1 行`);
  });
});
