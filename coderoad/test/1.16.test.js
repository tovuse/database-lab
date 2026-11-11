const assert = require('node:assert');
const { resetSchema, replayAll, replay, assertRowCount, query, closeAll } = require('./utils');

describe('1.16 插入「读者」数据（5 行）', () => {
  before(async () => {
    await resetSchema();
    await replayAll([
      'answers/1.9.sql',
    ]);
    await replay('sql/1.16.sql');
  });
  after(async () => { await closeAll(); });

  const expected = [
    ['20051001', '王菲',   '四川绵阳西科大计算机学院', '女', '13981112345', '510703199001011237'],
    ['20062001', '张江',   '四川绵阳中心医院',         '男', '13890123456', '510703199002022341'],
    ['20061234', '郭敬明', '四川江油305',              '男', '13678123457', '510781199003033455'],
    ['20071235', '李晓明', '四川成都工商银行',         '男', '13908123458', '510104199004044564'],
    ['20081237', '赵鑫',   '四川广元广元中学',         '女', '13508123459', '510802199005055674'],
  ];

  it('「读者」应有 5 行', async () => {
    await assertRowCount('读者', 5);
  });

  it('每位读者的姓名、单位、性别、电话、身份证应正确', async () => {
    const rows = await query(
      `SELECT 借书证号, 姓名, 单位, 性别, 联系电话, 身份证编号 FROM 读者`
    );
    const map = new Map(rows.map((r) => [String(r[0]).trim(), r]));
    for (const [no, name, unit, sex, phone, id] of expected) {
      const r = map.get(no);
      assert.ok(
        r,
        `没有 借书证号 = ${no} 的读者（${name}）→ 检查：5 条 INSERT 是否都插入了、证号有没有写错`
      );
      assert.deepStrictEqual(
        [String(r[1]).trim(), String(r[2]).trim(), String(r[3]).trim(),
         String(r[4]).trim(), String(r[5]).trim()],
        [name, unit, sex, phone, id],
        `读者 ${name} 的字段是 ${JSON.stringify([r[1], r[2], r[3], r[4], r[5]])}，应为 ${JSON.stringify([name, unit, sex, phone, id])} → 检查：姓名/单位/性别/联系电话/身份证编号`
      );
    }
  });
});
