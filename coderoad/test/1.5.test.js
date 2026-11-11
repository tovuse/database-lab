const assert = require('node:assert');
const { loadUpTo, assertTable, assertColumn, assertConstraint, expectError, closeAll } = require('./utils');

describe('1.5: 建「罚款分类」表', () => {
  before(async () => {
    await loadUpTo('1.5');
  });
  after(async () => { await closeAll(); });

  it('应有 罚款分类 表和三个列', async () => {
    await assertTable('罚款分类');
    await assertColumn('罚款分类', '罚款分类号', 'NUMBER');
    await assertColumn('罚款分类', '罚款名称', 'VARCHAR2');
    await assertColumn('罚款分类', '罚金', 'NUMBER');
  });

  it('罚款分类号 应是主键', async () => {
    await assertConstraint('罚款分类', 'P', '罚款分类号');
  });

  it('插入罚金为 0 应被 CHECK 拒绝', async () => {
    await expectError(
      `INSERT INTO 罚款分类 (罚款分类号, 罚款名称, 罚金) VALUES (9, '测试', 0)`,
      'ORA-02290',
      '要有 CONSTRAINT ... CHECK (罚金 > 0)'
    );
  });
});
