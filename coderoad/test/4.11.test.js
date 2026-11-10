const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  closeAll,
  loadCourseBaseline,
  execAsCourse,
  replayAsCourse,
  scalarAsCourse,
  sleep,
  WORKSPACE,
} = require('./utils');

/**
 * 4.11 把「预约」表闪回恢复
 *
 * 这一关有一个坑要专门覆盖：
 *   闪回目标必须晚于该表最后一次 DDL，否则报 ORA-01466。
 *   判题器先做 4.9 的 ENABLE ROW MOVEMENT（DDL），再 sleep 12 秒，
 *   保证学生写的 SYSTIMESTAMP - INTERVAL '5' SECOND 落在 DDL 之后。
 *
 * 起点由判题器自己制造（DELETE + COMMIT），不依赖学生 4.10 写对：
 * 4.10 有自己的测试，这一步只考「会不会闪回」。
 */
describe('4.11 闪回恢复预约表', () => {
  let beforeCount;
  let afterDelete;

  before(async () => {
    await loadCourseBaseline();
    // 前置：4.9 的产物（判题器自己开，不依赖学生上一关做对）
    await execAsCourse('ALTER TABLE 预约 ENABLE ROW MOVEMENT');

    // 等过 DDL 的敏感期（实测需要 ≥ 约 6 秒）
    await sleep(12000);

    // 起点：表里有 1 行 → 删掉并提交 → 变成 0 行
    beforeCount = Number(await scalarAsCourse(`SELECT COUNT(*) FROM 预约`));
    await execAsCourse('DELETE FROM 预约');
    await execAsCourse('COMMIT');
    afterDelete = Number(await scalarAsCourse(`SELECT COUNT(*) FROM 预约`));

    // 本关：学生的 FLASHBACK
    await replayAsCourse('sql/4.11_闪回预约表.sql');
  });

  after(async () => {
    await closeAll();
  });

  it('起点应确实被清空（判题前置条件）', async () => {
    assert.ok(
      beforeCount >= 1,
      `删除前 预约 有 ${beforeCount} 行，基线应为 1 行 → 检查：基线是否装载成功`
    );
    assert.strictEqual(
      afterDelete, 0,
      `判题器删除后 预约 还有 ${afterDelete} 行，起点不对 → 这是判题环境问题，不是你的写法问题`
    );
  });

  it('数据应被闪回恢复成 1 行', async () => {
    const n = await scalarAsCourse(`SELECT COUNT(*) FROM 预约`);
    assert.strictEqual(
      Number(n), 1,
      `闪回后 预约 有 ${n} 行，应为 1 行 → 检查：FLASHBACK TABLE 预约 TO TIMESTAMP (...)；若报 ORA-01466 说明目标时间早于建表/ALTER 的时刻`
    );
  });

  it('闪回的是基线那一条（不是空表）', async () => {
    const id = await scalarAsCourse(
      `SELECT 预约流水号 FROM 预约 WHERE ROWNUM = 1`
    );
    assert.strictEqual(
      Number(id), 1,
      `闪回出来的记录 预约流水号 是 ${id}，应为基线里的 1`
    );
  });

  it('文件里应真的写了 FLASHBACK TABLE', async () => {
    const file = path.join(WORKSPACE, 'sql/4.11_闪回预约表.sql');
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(
      /FLASHBACK\s+TABLE\s+预约/i.test(text),
      '文件里没看到 FLASHBACK TABLE 预约 → 检查：这一关要用闪回恢复，不是重新 INSERT 数据'
    );
  });
});
