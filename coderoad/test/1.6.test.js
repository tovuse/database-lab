const assert = require('node:assert');
const { loadUpTo, exec, assertTable, assertColumn, assertConstraint, expectError, closeAll } = require('./utils');

describe('1.6 建「书目」表（含外键）', () => {
  before(async () => {
    await loadUpTo('1.6');
  });
  after(async () => { await closeAll(); });

  it('应有 书目 表和六个列', async () => {
    await assertTable('书目');
    for (const c of ['ISBN', '书名', '作者', '出版单位', '单价', '图书分类号']) {
      await assertColumn('书目', c);
    }
  });

  it('ISBN 应是主键，图书分类号 应有外键', async () => {
    await assertConstraint('书目', 'P', 'ISBN');
    await assertConstraint('书目', 'R', '图书分类号');
  });

  it('插入不存在的图书分类号应被外键拒绝', async () => {
    await expectError(
      `INSERT INTO 书目 (ISBN, 书名, 单价, 图书分类号)
       VALUES ('9999999999999', '测试书', 10, '999')`,
      'ORA-02291',
      '图书分类号 要有 FOREIGN KEY REFERENCES 图书分类(图书分类号)'
    );
  });

  it('单价为负数应被 CHECK 拒绝', async () => {
    // 先补一条合法的分类，否则负数单价会先被外键拦住（ORA-02291），
    // 测不到 CHECK 是不是真的有
    await exec(
      `INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('100', '文学')`
    );
    await expectError(
      `INSERT INTO 书目 (ISBN, 书名, 单价, 图书分类号)
       VALUES ('9999999999998', '测试书', -1, '100')`,
      'ORA-02290',
      '要有 CHECK (单价 >= 0)'
    );
  });
});
