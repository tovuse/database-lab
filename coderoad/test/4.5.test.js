const assert = require('node:assert');
const {
  closeAll,
  parsePumpCommandLoose,
} = require('./utils');

/**
 * 4.5 写出 impdp 命令的骨架
 * 只做语法检查：参数还没补全，不真的跑导入。
 */
describe('4.5 写 impdp 命令骨架', () => {
  let parsed;

  before(async () => {
    parsed = parsePumpCommandLoose('sql/4.5_导入骨架.sh', 'impdp');
  });

  after(async () => {
    await closeAll();
  });

  it('应写出一条 impdp 命令', async () => {
    assert.strictEqual(
      String(parsed.kind).toLowerCase(), 'impdp',
      `解析到的命令是「${parsed.kind}」→ 检查：导入用 impdp（带 i），导出才是 expdp`
    );
  });

  it('应带 COURSE 的连接串', async () => {
    assert.ok(
      /^COURSE\//i.test(parsed.connection || ''),
      `连接串是「${parsed.connection || '(空)'}」→ 检查：impdp 后面紧跟 COURSE/course@//localhost:1521/FREEPDB1`
    );
  });

  it('应写 DIRECTORY=DUMPDIR', async () => {
    assert.strictEqual(
      String(parsed.params.DIRECTORY || '').toUpperCase(), 'DUMPDIR',
      `DIRECTORY 是「${parsed.params.DIRECTORY || '(空)'}」→ 检查：读取转储文件用的目录对象还是 DUMPDIR`
    );
  });
});
