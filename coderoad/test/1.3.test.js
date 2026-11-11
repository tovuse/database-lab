const assert = require('node:assert');
const {
  loadUpTo,
  assertTable,
  assertColumn,
  closeAll,
} = require('./utils');

/**
 * 1.3 建「图书分类」表
 * 判题：清空 TESTER → 重放学生的 1.3 → 断言表和三列
 */
describe('1.3: 建「图书分类」表', () => {
  before(async () => {
    await loadUpTo('1.3');
  });

  after(async () => {
    await closeAll();
  });

  it('应有 图书分类 表', async () => {
    await assertTable('图书分类');
  });

  it('应有 图书分类号 列（CHAR）', async () => {
    await assertColumn('图书分类', '图书分类号', 'CHAR');
  });

  it('应有 类名 列（VARCHAR2）', async () => {
    await assertColumn('图书分类', '类名', 'VARCHAR2');
  });
});
