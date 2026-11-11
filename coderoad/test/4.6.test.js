const assert = require('node:assert');
const {
  closeAll,
  parsePumpCommand,
  runPump,
  readDumpLog,
  loadCourseBaseline,
  execAsCourse,
  assertCourseTable,
  scalarAsCourse,
  cleanDumpFiles,
} = require('./utils');

/**
 * 4.6 用 impdp 把「预约」表导回来
 *
 * 判题流程：
 *   1. 重建基线，用学生 impdp 里写的 DUMPFILE 名字导出一份（导入的输入）
 *   2. 判题器自己 DROP 掉 预约（不管学生 4.4 有没有做对，起点一定是「表不存在」）
 *   3. 跑学生文件里的 impdp
 *   4. 断言：表回来了、行数=1、主键也在
 *
 * 为什么判题器自己删表：
 *   学生要是忘了删表，impdp 会 skip（ORA-39151），看起来"成功"其实啥也没干。
 *   由判题器制造"表确实不存在"的起点，才能区分「真导入」和「空跑」。
 *
 * 为什么用学生的 DUMPFILE 名字导出：
 *   这样 DUMPFILE 写错（拼错、用了别的文件名）会直接暴露，
 *   而不是被判题器偷偷纠正过去。
 */
describe('4.6: 用 impdp 导入预约表', () => {
  let parsed;

  before(async () => {
    await loadCourseBaseline();

    // 先读学生的 impdp，拿到他写的 DUMPFILE / LOGFILE 名字
    parsed = parsePumpCommand('sql/4.6.sh', 'impdp');

    // 清旧产物必须在导出之前做。
    // 为什么顺序重要：学生的 DUMPFILE 和 LOGFILE 常常同前缀（yuyue.dmp / yuyue.log），
    // 清理是按前缀删文件的，如果导出完再清日志前缀，会把刚导出的 dump 一起删掉。
    cleanDumpFiles(parsed.params.LOGFILE.replace(/\.log$/, ''));
    cleanDumpFiles(parsed.params.DUMPFILE.replace(/\.dmp$/, ''));

    // 用同一个 DUMPFILE 名字导出一份，作为导入的输入
    const exp = parsePumpCommand('answers/4.3.sh', 'expdp');
    exp.params.DUMPFILE = parsed.params.DUMPFILE;
    exp.params.LOGFILE = 'exp_46.log';
    cleanDumpFiles('exp_46');
    runPump(exp);

    // 判题器制造起点：表确实不存在
    await execAsCourse('DROP TABLE 预约 CASCADE CONSTRAINTS PURGE');

    runPump(parsed);
  });

  after(async () => {
    await closeAll();
  });

  it('导入前应指定 TABLES=预约', async () => {
    assert.ok(
      (parsed.params.TABLES || '').toUpperCase().includes('预约'),
      `TABLES 是「${parsed.params.TABLES || '(空)'}」，要求导入 预约 表 → 检查：TABLES=预约 有没有写`
    );
  });

  it('预约表应被恢复', async () => {
    await assertCourseTable('预约');
  });

  it('数据应恢复成 1 行', async () => {
    const n = await scalarAsCourse(`SELECT COUNT(*) FROM 预约`);
    assert.strictEqual(
      Number(n), 1,
      `导入后 预约 有 ${n} 行，应为 1 行 → 检查：DUMPFILE 是不是 4.3 导出的那个、TABLES 是否写对`
    );
  });

  it('导入日志应显示成功', async () => {
    const log = readDumpLog(parsed.params.LOGFILE);
    assert.ok(
      /successfully completed/i.test(log),
      `日志没有 "successfully completed" → 看 /tmp/dump/${parsed.params.LOGFILE}；若出现 ORA-39151 说明表已存在、实际被跳过了`
    );
  });

  it('原主键应随表一起恢复', async () => {
    const n = await scalarAsCourse(`
      SELECT COUNT(*) FROM user_constraints
       WHERE table_name = '预约' AND constraint_type = 'P'`);
    assert.ok(n >= 1, `恢复的 预约 表没有主键 → 检查：导出时是否带了约束（默认就带）`);
  });
});
