const assert = require('node:assert');
const { scalar, closeAll } = require('./utils');

describe('1.1 环境自检', () => {
  after(async () => {
    await closeAll();
  });

  it('应能连上数据库并查到自己的用户名', async () => {
    // 这一关的意义是"证明你能连上、能查"，所以只要能返回非空用户名就算过
    const user = await scalar('SELECT USER FROM dual');
    assert.ok(
      user && user.length > 0,
      '没查到当前用户名 → 检查：是否真的执行了 SELECT USER FROM dual'
    );
  });

  it('应确认自己连的是课程库 FREEPDB1，而不是别的库', async () => {
    const svc = await scalar(
      `SELECT SYS_CONTEXT('USERENV','SERVICE_NAME') FROM dual`
    );
    assert.ok(
      String(svc).toLowerCase().includes('freepdb1'),
      `连到的是 ${svc}，不是课程库 → 检查：连接串结尾是否为 /FREEPDB1`
    );
  });
});
