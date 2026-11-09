const assert = require('node:assert');
const {
  closeAll,
  loadCourseBaseline,
  execAsCourse,
  replayAsCourse,
  scalarAsCourse,
  sleep,
} = require('./utils');

/**
 * 4.5 删掉数据再闪回
 *
 * 这一关有两个坑，判题都要覆盖：
 *   坑 1：闪回目标必须晚于该表最后一次 DDL，否则 ORA-01466。
 *         判题器在这里先做 4.4 的 ENABLE ROW MOVEMENT，然后 sleep 12 秒，
 *         让学生写的 SYSTIMESTAMP - INTERVAL '5' SECOND 一定落在 DDL 之后。
 *   坑 2：只写 FLASHBACK 不写 DELETE 也能"成功"（表本来就有数据）。
 *         为此建一个 AFTER DELETE 触发器做见证：没删过，见证表就是空的。
 */
describe('4.5 删数据后闪回', () => {
  before(async () => {
    await loadCourseBaseline();
    // 前置：4.4 的产物（判题器自己开，不依赖学生上一关做对）
    await execAsCourse('ALTER TABLE 预约 ENABLE ROW MOVEMENT');

    // 见证：任何一次 DELETE 都记一笔
    await execAsCourse('DROP TABLE 闪回见证 PURGE').catch(() => {});
    await execAsCourse('CREATE TABLE 闪回见证 (n NUMBER)');
    await execAsCourse(`CREATE OR REPLACE TRIGGER trg_闪回见证
      AFTER DELETE ON 预约
      BEGIN INSERT INTO 闪回见证 (n) VALUES (1); END;`);

    // 等过 DDL 的敏感期（实测需要 ≥ 约 6 秒）
    await sleep(12000);

    await replayAsCourse('sql/4.5_闪回预约表.sql');
  });

  after(async () => {
    await execAsCourse('DROP TRIGGER trg_闪回见证').catch(() => {});
    await execAsCourse('DROP TABLE 闪回见证 PURGE').catch(() => {});
    await closeAll();
  });

  it('确实删除过数据（见证触发器有记录）', async () => {
    const n = await scalarAsCourse(`SELECT COUNT(*) FROM 闪回见证`);
    assert.ok(
      n >= 1,
      `没有观察到 DELETE 操作 → 检查：这一关要先把数据删掉再闪回，只写 FLASHBACK 是不算的`
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
});
