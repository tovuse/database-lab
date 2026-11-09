const assert = require('node:assert');
const {
  closeAll,
  parsePumpCommand,
  runPump,
  dumpFileExists,
  readDumpLog,
  loadCourseBaseline,
  execAsCourse,
  assertCourseTable,
  scalarAsCourse,
} = require('./utils');

/**
 * 4.2 删表 → impdp 导入回来
 *
 * 判题流程：
 *   1. 重建基线 → 先 expdp 出一份（复用 4.1 的产物规格）
 *   2. 判题器自己 DROP 掉 预约（模拟"表没了"）
 *   3. 跑学生文件里的 impdp
 *   4. 断言：表回来了、行数=1、主键也在
 *
 * 为什么判题器自己删表：
 *   学生要是忘了删表，impdp 会 skip（ORA-39151），看起来"成功"其实啥也没干。
 *   由判题器制造"表确实不存在"的起点，才能区分「真导入」和「空跑」。
 */
describe('4.2 删表后用 impdp 恢复', () => {
  let parsed;

  before(async () => {
    await loadCourseBaseline();

    // 先导出一份，作为导入的输入（学生 4.1 的产物可能被清掉了）
    const exp = parsePumpCommand('sql/4.1_导出预约表.sh', 'expdp');
    exp.params.DUMPFILE = 'yuyue_42.dmp';
    exp.params.LOGFILE = 'yuyue_42.log';
    runPump(exp);

    parsed = parsePumpCommand('sql/4.2_导入预约表.sh', 'impdp');
    parsed.params.DUMPFILE = 'yuyue_42.dmp';

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
      `TABLES 是「${parsed.params.TABLES || '(空)'}」，要求导入 预约 表`
    );
  });

  it('预约表应被恢复', async () => {
    await assertCourseTable('预约');
  });

  it('数据应恢复成 1 行', async () => {
    const n = await scalarAsCourse(`SELECT COUNT(*) FROM 预约`);
    assert.strictEqual(
      Number(n), 1,
      `导入后 预约 有 ${n} 行，应为 1 行 → 检查：DUMPFILE 是不是 4.1 导出的那个、TABLES 是否写对`
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
