const assert = require('node:assert');
const {
  closeAll,
  parsePumpCommandLoose,
} = require('./utils');

/**
 * 4.1 写出 expdp 命令的骨架
 *
 * 只做语法检查，不真的跑 expdp：
 * 这一步的命令本来就缺 DUMPFILE / TABLES，跑起来必然报错，
 * 教学目标是「记住 expdp + 连接串 + DIRECTORY 这个开头」。
 */
describe('4.1: 写 expdp 命令骨架', () => {
  let parsed;

  before(async () => {
    parsed = parsePumpCommandLoose('sql/4.1.sh', 'expdp');
  });

  after(async () => {
    await closeAll();
  });

  it('应写出一条 expdp 命令', async () => {
    assert.strictEqual(
      String(parsed.kind).toLowerCase(), 'expdp',
      `解析到的命令是「${parsed.kind}」→ 检查：这一关要用 expdp（导出），不是 impdp`
    );
  });

  it('应带 COURSE 的连接串', async () => {
    assert.ok(
      /^COURSE\//i.test(parsed.connection || ''),
      `连接串是「${parsed.connection || '(空)'}」→ 检查：expdp 后面紧跟 COURSE/course@//localhost:1521/FREEPDB1（用户名/密码@主机:端口/服务名）`
    );
  });

  it('应写 DIRECTORY=DUMPDIR', async () => {
    assert.strictEqual(
      String(parsed.params.DIRECTORY || '').toUpperCase(), 'DUMPDIR',
      `DIRECTORY 是「${parsed.params.DIRECTORY || '(空)'}」→ 检查：目录对象名字是 DUMPDIR（不是 /tmp/dump 这种路径）`
    );
  });
});
