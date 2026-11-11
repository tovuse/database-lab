const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { loadUpTo, scalar, closeAll, WORKSPACE } = require('./utils');

/**
 * 1.1 环境自检
 * 这一关要先证明"你能连上"，再证明"你写对了查询"。
 * 所以：① 连接探活（查 DB 服务名）  ② 重放学生文件，断言它真的查出了用户名
 */
describe('1.1 环境自检', () => {
  after(async () => {
    await closeAll();
  });

  it('[环境] 应能连上课程库 FREEPDB1', async () => {
    // 这条测的是「判题器能不能连上库」，不是学生答对没有。
    // 单独标 [环境]，让失败原因一眼可辨：环境挂了 vs 答案错了。
    const svc = await scalar(
      `SELECT SYS_CONTEXT('USERENV','SERVICE_NAME') FROM dual`
    );
    assert.ok(
      String(svc).toLowerCase().includes('freepdb1'),
      `连到的是 ${svc}，不是课程库 → 检查：连接串结尾是否为 /FREEPDB1`
    );
  });

  it('文件里应有一条查询用户名的 SQL', async () => {
    const file = path.join(WORKSPACE, 'sql/1.1.sql');
    const text = fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');

    assert.ok(
      /SELECT\s+USER\s+FROM\s+dual/i.test(text),
      '文件里没有 SELECT USER FROM dual → 检查：是不是只留了注释没写语句、或者忘了保存'
    );
  });

  it('执行后应真的返回一个用户名', async () => {
    // 1.1 是课程第一步，前置链为空：loadUpTo('1.1') 只执行 sql/1.1.sql
    const { rows } = await loadUpTo('1.1');
    assert.ok(
      rows.length >= 1 && rows[0][0],
      `查询没有返回用户名 → 检查：是不是 SELECT 了别的列，或者忘了写 dual`
    );
  });
});
