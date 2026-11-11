const assert = require('node:assert');
const { loadUpTo, replay, exec, scalar, closeAll } = require('./utils');

describe('1.8 插入一本测试图书（验证默认值）', () => {
  before(async () => {
    // 前置表结构用学生上一关自己写的 sql/1.7.sql 建：
    // loadUpTo('1.7') 会重放 1.3~1.6 的标准答案，最后执行「学生文件」sql/1.7.sql，
    // 这样「默认值」验的是学生建的表，不是判题器抄的标准答案。
    // 注意不能写成 loadUpTo('1.8')：那样最后执行的是 sql/1.8.sql，而链里的
    // answers/1.7.sql 会先把 图书 建成标准答案，学生 1.7 漏了 DEFAULT 也照样能过。
    await loadUpTo('1.7');

    // 判题器自己准备外键需要的上级数据（图书分类 200 + 书目 7040195836），
    // 学生只需要写 INSERT INTO 图书 这一条
    await exec(`INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('200', '科技')`);
    await exec(
      `INSERT INTO 书目 (ISBN, 书名, 单价, 图书分类号)
       VALUES ('7040195836', '数据库系统概论', 39, '200')`
    );

    // 单独包一层：这一步最常见的失败是 1.7 漏了 DEFAULT '否'，报 ORA-01400，
    // 原生错误信息不会告诉学生该回去改上一关，所以在这里补一句
    try {
      await replay('sql/1.8.sql');
    } catch (e) {
      const msg = e.message || String(e);
      throw new Error(
        msg.includes('ORA-01400')
          ? `${msg}\n  → 检查：是否借出 这一列不允许为空，但你这一关故意没写它。\n     说明 1.7 建表时漏了 DEFAULT '否'，回上一关改成 是否借出 CHAR(3) DEFAULT '否' NOT NULL`
          : msg
      );
    }
  });
  after(async () => { await closeAll(); });

  it('应有一条 图书编号 = 9999999 的记录', async () => {
    const n = await scalar(
      `SELECT COUNT(*) FROM 图书 WHERE 图书编号 = '9999999'`
    );
    assert.strictEqual(
      Number(n), 1,
      `找到 ${n} 条 图书编号=9999999 的记录 → 检查：INSERT 里的图书编号是不是 9999999、语句有没有报错`
    );
  });

  it('这条记录的 ISBN 应是 7040195836', async () => {
    const v = await scalar(
      `SELECT ISBN FROM 图书 WHERE 图书编号 = '9999999'`
    );
    assert.strictEqual(
      String(v).trim(), '7040195836',
      `ISBN 是 ${v}，应为 7040195836 → 检查：INSERT 的第二个值`
    );
  });

  it('这条记录的 是否借出 应是「否」', async () => {
    const v = await scalar(
      `SELECT 是否借出 FROM 图书 WHERE 图书编号 = '9999999'`
    );
    assert.strictEqual(
      String(v).trim(), '否',
      `「是否借出」是 ${v} → 检查：INSERT 里不要写 是否借出 这一列（写了就绕过 DEFAULT 了）；如果确实没写，回 1.7 看建表时该列有没有 DEFAULT '否'`
    );
  });

  it('表的 DEFAULT 应真的生效（不写该列也能插入）', async () => {
    // 换一个编号由判题器自己插，专门验证「省略该列时自动填 否」。
    // 如果学生上一关漏了 DEFAULT，这条 INSERT 会报 ORA-01400（不能为空）。
    let msg = '';
    try {
      await exec(
        `INSERT INTO 图书 (图书编号, ISBN) VALUES ('9999998', '7040195836')`
      );
    } catch (e) {
      msg = (e.message || '').split('\n')[0];
    }
    assert.ok(
      !msg,
      `不写 是否借出 就插不进去（${msg}）→ 检查：1.7 建表时该列要有 DEFAULT '否'，并且不能写成 CHAR(1)`
    );
    const v = await scalar(
      `SELECT 是否借出 FROM 图书 WHERE 图书编号 = '9999998'`
    );
    assert.strictEqual(
      String(v).trim(), '否',
      `省略该列插入后「是否借出」是 ${v}，应为「否」→ 检查：DEFAULT '否' 有没有写在 是否借出 这一列上`
    );
  });
});
