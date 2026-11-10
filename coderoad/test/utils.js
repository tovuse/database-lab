/**
 * CodeRoad 判题工具库
 *
 * 架构：
 *   COURSE  schema —— 学生自己玩的库（手动跑 sqlplus 时用）
 *   TESTER  schema —— 判题专用。每次测试前清空，然后把学生前几关的 .sql
 *                     按顺序重放进来，最后断言。
 *
 * 为什么在 TESTER 里重放而不是直接查 COURSE：
 *   - 幂等：学生每次保存都会重新跑，直接查 COURSE 会"表已存在"报错
 *   - 可回溯：重放前置关卡文件，学生改坏了前面的表，这一步就会失败（正是我们要的）
 *   - 不污染：测试的破坏性操作不碰学生的库
 */
const oracledb = require('oracledb');
const fs = require('node:fs');
const path = require('node:path');

const WORKSPACE = path.join(process.cwd(), '..');

const DB = {
  user: process.env.TESTER_USER || 'tester',
  password: process.env.TESTER_PASSWORD || 'tester',
  connectString: process.env.TESTER_CONN || 'localhost:1521/FREEPDB1',
};

oracledb.fetchAsString = [oracledb.DATE];

let _conn = null;
async function conn() {
  if (!_conn) _conn = await oracledb.getConnection(DB);
  return _conn;
}

async function closeAll() {
  if (_conn) {
    await _conn.close().catch(() => {});
    _conn = null;
  }
  if (typeof _courseConn !== 'undefined' && _courseConn) {
    await _courseConn.close().catch(() => {});
    _courseConn = null;
  }
}

async function exec(sql, binds = {}) {
  const c = await conn();
  return c.execute(sql, binds, { autoCommit: true });
}

async function query(sql, binds = {}) {
  const c = await conn();
  const r = await c.execute(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_ARRAY,
    fetchArraySize: 2000,
  });
  if (!r.rows) return [];
  return r.rows.map((row) =>
    row.map((v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number') return v;
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v).trim();
    })
  );
}

async function scalar(sql, binds = {}) {
  const rows = await query(sql, binds);
  return rows.length ? rows[0][0] : null;
}

// ---------------------------------------------------------------------
// SQL 切分与执行
// ---------------------------------------------------------------------

/**
 * 把 .sql 文本切成独立语句。
 * - `--` 行注释、`/* *\/` 块注释跳过
 * - PL/SQL 块（CREATE PROCEDURE/FUNCTION/TRIGGER/PACKAGE/TYPE、DECLARE、BEGIN）以 `/` 结束
 * - 其余以 `;` 结束
 */
function splitStatements(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let buf = [];
  let inBlock = false;
  let plsql = false;

  // 一条「有实质内容」的语句至少要含一个字母/数字/下划线/汉字或引号。
  // 编辑器自动补全可能留下单独一个 `)` 或 `;`，这类碎片发给 Oracle 会报 ORA-00900。
  const meaningful = (sql) => /[0-9A-Za-z_\u4e00-\u9fff'"]/.test(sql);

  const flush = () => {
    const sql = buf.join('\n').trim();
    if (sql && meaningful(sql)) out.push(sql);
    buf = [];
    plsql = false;
  };

  for (let raw of lines) {
    if (inBlock) {
      const end = raw.indexOf('*/');
      if (end === -1) continue;
      raw = raw.slice(end + 2);
      inBlock = false;
    }
    const bc = raw.indexOf('/*');
    if (bc !== -1 && raw.indexOf('*/', bc) === -1) {
      inBlock = true;
      raw = raw.slice(0, bc);
    }

    const t = raw.trim();
    if (!t || t.startsWith('--')) continue;

    if (!plsql) {
      const h = t.toUpperCase();
      if (
        /^CREATE\s+(OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION|TRIGGER|PACKAGE|TYPE)\b/.test(h) ||
        /^(DECLARE|BEGIN)\b/.test(h)
      ) {
        plsql = true;
      }
    }

    if (plsql) {
      if (/^\/\s*$/.test(t)) {
        flush();
        continue;
      }
      buf.push(raw);
      continue;
    }

    if (/;\s*$/.test(t)) {
      buf.push(raw.replace(/;\s*$/, ''));
      flush();
      continue;
    }
    buf.push(raw);
  }
  flush();
  return out;
}

/**
 * 重放一个 .sql 文件到 TESTER schema。
 * 最后一条 SELECT 的结果会被返回（用于 1.1 这类"查一下"的关卡）。
 * @param {string} relPath 相对工作区根的路径
 * @returns {Promise<{count:number, rows:Array}>}
 */
async function replay(relPath) {
  const file = path.join(WORKSPACE, relPath);
  if (!fs.existsSync(file)) {
    throw new Error(
      `没找到文件 ${relPath} → 检查：文件名是否拼错、是否保存过、是否放在项目根目录的 sql/ 文件夹里`
    );
  }
  const stmts = splitStatements(fs.readFileSync(file, 'utf8'));
  if (!stmts.length) {
    throw new Error(
      `${relPath} 里没有可执行的 SQL → 检查：是不是只写了注释、是不是忘了保存`
    );
  }
  let lastRows = [];
  for (const sql of stmts) {
    try {
      if (/^\s*(SELECT|WITH)\b/i.test(sql)) {
        const c = await conn();
        const r = await c.execute(sql, {}, {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
          fetchArraySize: 2000,
        });
        lastRows = (r.rows || []).map((row) =>
          row.map((v) => {
            if (v === null || v === undefined) return null;
            if (typeof v === 'number') return v;
            if (v instanceof Date) return v.toISOString().slice(0, 10);
            return String(v).trim();
          })
        );
      } else {
        await exec(sql);
      }
    } catch (e) {
      throw new Error(
        `${relPath} 执行失败：${e.message.split('\n')[0]}\n  → 出错语句：${sql
          .split('\n')
          .filter((l) => l.trim() && !l.trim().startsWith('--'))
          .join(' ')
          .slice(0, 140)}`
      );
    }
  }
  return { count: stmts.length, rows: lastRows };
}

/** 依次重放多个文件（前置关卡 + 本关） */
async function replayAll(files) {
  for (const f of files) await replay(f);
}

/** 清空 TESTER schema 所有对象 */
async function resetSchema() {
  const lists = [
    ['TRIGGER', `SELECT trigger_name FROM user_triggers`],
    ['VIEW', `SELECT view_name FROM user_views`],
    [
      'OBJECT',
      `SELECT object_name, object_type FROM user_objects
        WHERE object_type IN ('PROCEDURE','FUNCTION','PACKAGE','PACKAGE BODY','TYPE','TYPE BODY')`,
    ],
    ['SEQUENCE', `SELECT sequence_name FROM user_sequences`],
    ['TABLE', `SELECT table_name FROM user_tables`],
  ];

  for (const [kind, sql] of lists) {
    let rows = [];
    try {
      rows = await query(sql);
    } catch {
      continue;
    }
    for (const row of rows) {
      const name = row[0];
      const type = kind === 'OBJECT' ? row[1] : kind;
      const stmt = {
        TRIGGER: `DROP TRIGGER "${name}"`,
        VIEW: `DROP VIEW "${name}"`,
        SEQUENCE: `DROP SEQUENCE "${name}"`,
        TABLE: `DROP TABLE "${name}" CASCADE CONSTRAINTS PURGE`,
      }[type] || `DROP ${type} "${name}"`;
      await exec(stmt).catch(() => {});
    }
  }
}

// ---------------------------------------------------------------------
// 断言工具（message 统一「现象 → 检查点」）
// ---------------------------------------------------------------------

async function assertTable(name) {
  const n = await scalar(
    `SELECT COUNT(*) FROM user_tables WHERE table_name = :1`,
    [name.toUpperCase()]
  );
  if (n !== 1) {
    throw new Error(
      `没找到「${name}」表 → 检查：表名是否拼错、CREATE TABLE 执行时有没有报错`
    );
  }
}

async function assertColumn(table, column, dataType) {
  const sql = dataType
    ? `SELECT COUNT(*) FROM user_tab_columns
        WHERE table_name=:1 AND column_name=:2 AND data_type=:3`
    : `SELECT COUNT(*) FROM user_tab_columns
        WHERE table_name=:1 AND column_name=:2`;
  const binds = dataType
    ? [table.toUpperCase(), column.toUpperCase(), dataType.toUpperCase()]
    : [table.toUpperCase(), column.toUpperCase()];
  const n = await scalar(sql, binds);
  if (!n) {
    throw new Error(
      `「${table}」缺少列「${column}」${
        dataType ? ` 或类型不是 ${dataType}` : ''
      } → 检查：列名拼写、数据类型、是否保存后重新执行过建表语句`
    );
  }
}

/**
 * 断言表上有某种约束。
 * keyword 的含义按约束类型不同：
 *   P/U/R  —— 约束涉及的**列名**（查 user_cons_columns）
 *   C      —— CHECK 条件或约束名里的关键词（查 search_condition_vc / constraint_name）
 * 之所以分开，是因为主键/外键的 search_condition_vc 是 NULL，用它匹配永远查不到。
 */
async function assertConstraint(table, type, keyword) {
  const typeName =
    { P: '主键', R: '外键', C: 'CHECK 约束', U: '唯一约束' }[type] || type;
  const t = table.toUpperCase();
  let n;

  if (keyword && (type === 'P' || type === 'R' || type === 'U')) {
    // 按「约束涉及的列名」匹配
    n = await scalar(
      `SELECT COUNT(*)
         FROM user_constraints c
         JOIN user_cons_columns cc
           ON c.constraint_name = cc.constraint_name
          AND c.table_name = cc.table_name
        WHERE c.table_name = :1
          AND c.constraint_type = :2
          AND cc.column_name = :3`,
      [t, type, keyword.toUpperCase()]
    );
  } else if (keyword) {
    // CHECK：条件表达式或约束名含关键词
    n = await scalar(
      `SELECT COUNT(*) FROM user_constraints
        WHERE table_name = :1 AND constraint_type = :2
          AND (search_condition_vc LIKE :3 OR constraint_name LIKE :4)`,
      [t, type, `%${keyword}%`, `%${keyword}%`]
    );
  } else {
    n = await scalar(
      `SELECT COUNT(*) FROM user_constraints
        WHERE table_name = :1 AND constraint_type = :2`,
      [t, type]
    );
  }

  if (!n) {
    throw new Error(
      `「${table}」没有${typeName}${
        keyword ? `（涉及 ${keyword}）` : ''
      } → 检查：是否声明了 ${typeName}，列名有没有写错`
    );
  }
}

async function assertRowCount(table, expected) {
  const n = await scalar(`SELECT COUNT(*) FROM "${table}"`);
  if (n !== expected) {
    throw new Error(
      `「${table}」应有 ${expected} 行，实际 ${n} 行 → 检查：数据是否都插入了、有没有重复插入`
    );
  }
}

/**
 * 反向测试：某条 SQL 必须报指定错误（证明约束真的生效）
 * 自动回滚，不留脏数据
 */
async function expectError(sql, code, hint) {
  const c = await conn();
  let threw = false;
  let msg = '';
  try {
    await c.execute(sql, {}, { autoCommit: false });
  } catch (e) {
    threw = true;
    msg = e.message || String(e);
  } finally {
    await c.rollback().catch(() => {});
  }
  if (!threw) {
    throw new Error(
      `约束没生效：这条非法数据居然插入成功了 → 检查：${hint}`
    );
  }
  if (code && !msg.includes(code)) {
    throw new Error(
      `报错了但不是预期的错误：期望 ${code}，实际「${
        msg.split('\n')[0]
      }」 → 检查：${hint}`
    );
  }
}

/** 忽略顺序的结果集比对 */
function sameRows(a, b) {
  const norm = (rows) =>
    rows.map((r) => JSON.stringify(r.map((v) => (v === null ? null : String(v))))).sort();
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

/** 严格顺序的结果集比对 */
function sameRowsOrdered(a, b) {
  const norm = (rows) =>
    rows.map((r) => JSON.stringify(r.map((v) => (v === null ? null : String(v)))));
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

// ---------------------------------------------------------------------
// 查询题判题：执行学生写的 SELECT，与标准答案结果集比对
// ---------------------------------------------------------------------

/** 去掉 SQL 注释（行注释 + 块注释），保留字符串字面量里的 -- */
function stripComments(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inBlock = false;
  for (const raw of lines) {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf('*/');
      if (end === -1) continue;
      line = line.slice(end + 2);
      inBlock = false;
    }
    const bc = line.indexOf('/*');
    if (bc !== -1 && line.indexOf('*/', bc) === -1) {
      inBlock = true;
      line = line.slice(0, bc);
    }
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;
    out.push(line);
  }
  return out.join('\n').trim();
}

/**
 * 执行一段查询，返回二维数组。
 * 允许分号结尾；只执行（返回结果集的）最后一条语句。
 */
async function runQuery(sql) {
  const text = stripComments(sql).replace(/;\s*$/, '').trim();
  if (!text) {
    throw new Error(
      '文件里没有 SQL 语句 → 检查：是不是只写了注释、是不是忘了保存'
    );
  }
  const c = await conn();
  let r;
  try {
    r = await c.execute(text, {}, {
      outFormat: oracledb.OUT_FORMAT_ARRAY,
      fetchArraySize: 5000,
    });
  } catch (e) {
    const msg = (e.message || '').split('\n')[0];
    throw new Error(`你的 SQL 报错了：${msg} → 检查：语法、表名/列名拼写`);
  }
  if (!r.rows) {
    throw new Error(
      '语句没有返回结果集 → 检查：这是一道查询题，需要用 SELECT 语句'
    );
  }
  return r.rows.map((row) =>
    row.map((v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number') return roundIfFloat(v);
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v).trim();
    })
  );
}

/** 浮点统一保留 2 位，避免 33.8 vs 33.80 这种表示差异 */
function roundIfFloat(n) {
  return Number.isInteger(n) ? n : Math.round(n * 100) / 100;
}

/** 读学生文件并执行其中的查询 */
async function runQueryFile(relPath) {
  const file = path.join(WORKSPACE, relPath);
  if (!fs.existsSync(file)) {
    throw new Error(`没找到文件 ${relPath} → 检查：文件名是否拼错、是否保存过`);
  }
  return runQuery(fs.readFileSync(file, 'utf8'));
}

/** 结果集差异的简短说明，用于失败提示 */
function describeDiff(actual, expected) {
  const a = actual.length;
  const e = expected.length;
  if (a !== e) {
    return `行数不对：期望 ${e} 行，你的查询返回 ${a} 行`;
  }
  for (let i = 0; i < Math.min(a, e); i++) {
    const ar = actual[i].map((v) => String(v)).join(' | ');
    const er = expected[i].map((v) => String(v)).join(' | ');
    if (ar !== er) {
      return `第 ${i + 1} 行不一致\n       你的：${ar}\n       期望：${er}`;
    }
  }
  return '行数相同但内容不同（可能是排序问题，或重复行的数量不同）';
}

/**
 * 断言学生的查询与标准答案结果集一致。
 * @param {string} relPath  学生答题文件
 * @param {string} refSql   标准答案 SQL
 * @param {{ordered?: boolean, hint?: string}} opts
 */
async function assertQueryEquals(relPath, refSql, opts = {}) {
  const actual = await runQueryFile(relPath);
  const expected = await runQuery(refSql);
  const equal = opts.ordered
    ? sameRowsOrdered(actual, expected)
    : sameRows(actual, expected);
  if (!equal) {
    throw new Error(
      `结果集不匹配 → ${describeDiff(
        opts.ordered ? actual : sortRows(actual),
        opts.ordered ? expected : sortRows(expected)
      )}${opts.hint ? `\n  → 检查：${opts.hint}` : ''}`
    );
  }
}

/** 排序辅助（用于无序比对时的差异展示） */
function sortRows(rows) {
  return [...rows].sort((x, y) => {
    const a = x.map((v) => String(v)).join('|');
    const b = y.map((v) => String(v)).join('|');
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

// ---------------------------------------------------------------------
// PL/SQL 对象断言（Level 3 存储过程与触发器用）
// ---------------------------------------------------------------------

/** 断言存在指定类型的 PL/SQL 对象（PROCEDURE / FUNCTION / TRIGGER / SEQUENCE） */
async function assertObject(name, type) {
  const upper = name.toUpperCase();
  const sql = type === 'SEQUENCE'
    ? `SELECT COUNT(*) FROM user_sequences WHERE sequence_name = :1`
    : `SELECT COUNT(*) FROM user_objects WHERE object_name = :1 AND object_type = :2`;
  const binds = type === 'SEQUENCE' ? [upper] : [upper, type];
  const n = await scalar(sql, binds);
  if (!n) {
    const zh = { PROCEDURE: '存储过程', TRIGGER: '触发器', SEQUENCE: '序列', FUNCTION: '函数' }[type] || type;
    throw new Error(
      `没找到${zh}「${name}」 → 检查：名字是否拼错、CREATE 有没有报错（PL/SQL 块要用单独一行的 / 结束）`
    );
  }
}

/** 断言 PL/SQL 对象编译无错误 */
async function assertCompiled(name) {
  const n = await scalar(
    `SELECT COUNT(*) FROM user_errors WHERE name = :1`,
    [name.toUpperCase()]
  );
  if (n > 0) {
    const rows = await query(
      `SELECT line, position, text FROM user_errors WHERE name = :1 ORDER BY sequence`,
      [name.toUpperCase()]
    );
    const detail = rows
      .slice(0, 3)
      .map((r) => `第 ${r[0]} 行第 ${r[1]} 列：${String(r[2]).trim()}`)
      .join('\n       ');
    throw new Error(
      `「${name}」编译有错误：\n       ${detail}\n  → 检查：上面提示的那一行，常见是漏了分号、END 后面忘了 /`
    );
  }
}

/**
 * 在 TESTER schema 里直接调用一个存储过程。
 * 失败时把 Oracle 的错误信息原样带出来（学生写的过程报错要能看到）。
 */
async function callProcedure(callSql) {
  try {
    await exec(callSql);
  } catch (e) {
    const msg = (e.message || '').split('\n')[0];
    throw new Error(
      `调用失败：${msg} → 检查：参数个数和类型对不对、过程里的 SQL 能不能跑通`
    );
  }
}

// ---------------------------------------------------------------------
// 实验四：数据泵 / 闪回 / 权限 专用工具
// ---------------------------------------------------------------------

const { execFileSync } = require('node:child_process');

/** 判题器连库用的 DSN 与账号，和 utils 里保持一致 */
function dsnParts() {
  const cs = DB.connectString; // 形如 localhost:1521/FREEPDB1
  const m = /^([^:]+):(\d+)\/(.+)$/.exec(cs);
  return m ? { host: m[1], port: m[2], service: m[3] } : { host: 'localhost', port: '1521', service: 'FREEPDB1' };
}

/**
 * 运行 expdp / impdp 并返回日志文本。
 * 为什么必须在容器里跑：这两个是客户端程序，容器外没有。
 * COURSE 已被授予 DUMPDIR 的 READ/WRITE，无需 DBA。
 */
function runDataPump(kind, args) {
  const { host, port, service } = dsnParts();
  const conn = `COURSE/course@//${host}:${port}/${service}`;
  let out = '';
  try {
    out = execFileSync(kind, [conn, ...args], {
      encoding: 'utf8',
      timeout: 180000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    out = `${e.stdout || ''}${e.stderr || ''}`;
    const first = out.split(/\r?\n/).filter((l) => /ORA-|LRM-|UDI-/.test(l))[0];
    throw new Error(
      `${kind} 执行失败：${first || e.message}\n  → 检查：DIRECTORY 名字、DUMPFILE 名字、TABLES/SCHEMAS 参数是否拼对`
    );
  }
  return out;
}

/** 读 DUMPDIR 里的日志文件（expdp 写的是容器内的 /tmp/dump） */
function readDumpLog(logName) {
  const p = path.join('/tmp/dump', logName);
  if (!fs.existsSync(p)) {
    throw new Error(
      `没找到导出日志 ${logName} → 检查：LOGFILE 参数是否写对、DUMPDIR 是否指向 /tmp/dump`
    );
  }
  return fs.readFileSync(p, 'utf8');
}

/**
 * 清空 TESTER 里的实验四对象（用户/角色/PROFILE 建在库级别，不在 schema 里）。
 * 用 DBA 身份删，失败也继续——目的只是让重跑幂等。
 */
async function resetSecurityObjects(names = {}) {
  const { users = [], roles = [], profiles = [], views: vws = [] } = names;
  for (const v of vws) {
    await exec(`DROP VIEW "${v}"`).catch(() => {});
  }
  for (const u of users) {
    await exec(`DROP USER "${u}" CASCADE`).catch(() => {});
  }
  for (const r of roles) {
    await exec(`DROP ROLE "${r}"`).catch(() => {});
  }
  for (const p of profiles) {
    await exec(`DROP PROFILE "${p}" CASCADE`).catch(() => {});
  }
}

/** 断言某个数据库用户存在（dba_users，跨 schema） */
async function assertDbUser(name) {
  const n = await scalar(`SELECT COUNT(*) FROM dba_users WHERE username = :1`, [
    name.toUpperCase(),
  ]);
  if (!n) {
    throw new Error(
      `数据库里没有用户「${name}」 → 检查：CREATE USER 有没有执行成功（密码、profile 名是否有效）`
    );
  }
}

/** 断言某个用户被授予了指定角色 */
async function assertGrantedRole(user, role) {
  const n = await scalar(
    `SELECT COUNT(*) FROM dba_role_privs WHERE grantee = :1 AND granted_role = :2`,
    [user.toUpperCase(), role.toUpperCase()]
  );
  if (!n) {
    throw new Error(
      `用户「${user}」没有被授予角色「${role}」 → 检查：GRANT ${role} TO ${user}; 有没有执行`
    );
  }
}

/**
 * 断言某条语句必须报错，且错误信息包含指定文字。
 * 用于验证「预约时有可借图书必须拒绝」这类业务规则。
 */
async function expectCallError(sql, keyword, hint) {
  const c = await conn();
  let threw = false;
  let msg = '';
  try {
    await c.execute(sql, {}, { autoCommit: false });
  } catch (e) {
    threw = true;
    msg = e.message || String(e);
  } finally {
    await c.rollback().catch(() => {});
  }
  if (!threw) {
    throw new Error(`本该被拒绝，却执行成功了 → 检查：${hint}`);
  }
  if (keyword && !msg.includes(keyword)) {
    throw new Error(
      `报错了但提示语不对：期望包含「${keyword}」，实际「${
        msg.split('\n')[0]
      }」 → 检查：${hint}`
    );
  }
}

// ---------------------------------------------------------------------
// 实验四：以 COURSE 身份判题
// 前三章判题都在 TESTER schema 里重放（不污染学生库）；
// 但实验四的对象（用户、角色、PROFILE、DIRECTORY）是库级别的，
// 而且 expdp/impdp 只有 COURSE 能跑，所以这一章必须在 COURSE 侧操作。
// ---------------------------------------------------------------------

const COURSE_CREDS = {
  user: process.env.COURSE_USER || 'course',
  password: process.env.COURSE_PASSWORD || 'course',
  connectString: process.env.COURSE_CONN || 'localhost:1521/FREEPDB1',
};

let _courseConn = null;
async function courseConn() {
  if (!_courseConn) {
    _courseConn = await oracledb.getConnection(COURSE_CREDS);
  }
  return _courseConn;
}

async function execAsCourse(sql, binds = {}) {
  const c = await courseConn();
  return c.execute(sql, binds, { autoCommit: true });
}

async function scalarAsCourse(sql, binds = {}) {
  const rows = await queryAsCourse(sql, binds);
  return rows.length ? rows[0][0] : null;
}

async function queryAsCourse(sql, binds = {}) {
  const c = await courseConn();
  const r = await c.execute(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_ARRAY,
    fetchArraySize: 2000,
  });
  if (!r.rows) return [];
  return r.rows.map((row) =>
    row.map((v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number') return v;
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v).trim();
    })
  );
}

/** 以 COURSE 身份重放学生的 .sql 文件（实验四用） */
async function replayAsCourse(relPath) {
  const file = path.join(WORKSPACE, relPath);
  if (!fs.existsSync(file)) {
    throw new Error(
      `没找到文件 ${relPath} → 检查：文件名是否拼错、是否保存过、是否放在项目根目录的 sql/ 文件夹里`
    );
  }
  const stmts = splitStatements(fs.readFileSync(file, 'utf8'));
  if (!stmts.length) {
    throw new Error(`${relPath} 里没有可执行的 SQL → 检查：是不是只写了注释、是不是忘了保存`);
  }
  for (const sql of stmts) {
    try {
      await execAsCourse(sql);
    } catch (e) {
      throw new Error(
        `${relPath} 执行失败：${(e.message || '').split('\n')[0]}\n  → 出错语句：${sql
          .split('\n')
          .filter((l) => l.trim() && !l.trim().startsWith('--'))
          .join(' ')
          .slice(0, 160)}`
      );
    }
  }
  return stmts.length;
}

/** 以 COURSE 身份跑学生的查询文件，返回结果集 */
async function runQueryFileAsCourse(relPath) {
  const file = path.join(WORKSPACE, relPath);
  if (!fs.existsSync(file)) {
    throw new Error(`没找到文件 ${relPath} → 检查：文件名是否拼错、是否保存过`);
  }
  const text = stripComments(fs.readFileSync(file, 'utf8')).replace(/;\s*$/, '').trim();
  if (!text) {
    throw new Error('文件里没有 SQL 语句 → 检查：是不是只写了注释、是不是忘了保存');
  }
  const rows = await queryAsCourse(text);
  return rows;
}

/**
 * 把 COURSE 库重建成基线。
 * 不用 scripts/loadBaseline.sh：那脚本依赖 sqlplus，判题进程所在环境不一定有。
 * 这里用 oracledb 直接清对象 + 重放 answers/00_基线.sql，容器内外都能跑。
 */
async function loadCourseBaseline() {
  const lists = [
    ['TRIGGER', `SELECT trigger_name FROM user_triggers`],
    ['VIEW', `SELECT view_name FROM user_views`],
    ['SEQUENCE', `SELECT sequence_name FROM user_sequences`],
    ['TABLE', `SELECT table_name FROM user_tables`],
  ];
  for (const [type, sql] of lists) {
    let rows = [];
    try {
      rows = await queryAsCourse(sql);
    } catch {
      continue;
    }
    for (const row of rows) {
      const stmt = type === 'TABLE'
        ? `DROP TABLE "${row[0]}" CASCADE CONSTRAINTS PURGE`
        : `DROP ${type} "${row[0]}"`;
      await execAsCourse(stmt).catch(() => {});
    }
  }
  await replayAsCourse('answers/00_基线.sql');
}

/** 断言 COURSE 库里有这张表 */
async function assertCourseTable(name) {
  const n = await scalarAsCourse(
    `SELECT COUNT(*) FROM user_tables WHERE table_name = :1`,
    [name.toUpperCase()]
  );
  if (!n) {
    throw new Error(
      `COURSE 库里没有「${name}」表 → 检查：是否被 DROP 掉了、导入有没有成功`
    );
  }
}

/** 删掉 DUMPDIR 里的旧转储文件，保证判题看到的是本次产物 */
function cleanDumpFiles(prefix) {
  const dir = '/tmp/dump';
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith(prefix)) fs.unlinkSync(path.join(dir, f));
  }
}

/** 当前时间字符串（用于给转储文件打上唯一后缀，避开重名） */
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 执行学生的 shell 脚本（Data Pump 这类终端命令用） */
function runShellFile(relPath) {
  const file = path.join(WORKSPACE, relPath);
  if (!fs.existsSync(file)) {
    throw new Error(`没找到文件 ${relPath} → 检查：文件名是否拼错、是否保存过`);
  }
  try {
    return execFileSync('bash', [file], {
      cwd: WORKSPACE,
      encoding: 'utf8',
      timeout: 240000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`;
    const first = out.split(/\r?\n/).filter((l) => /ORA-|LRM-|UDI-|command not found/.test(l))[0];
    throw new Error(
      `${relPath} 执行失败：${first || e.message}\n  → 检查：命令本身语法对不对、参数（DIRECTORY/DUMPFILE/TABLES）有没有写全`
    );
  }
}

/** 用指定账号试着登录，返回 true/false（测权限用，不抛异常） */
async function tryLogin(user, password, sql = 'SELECT 1 FROM dual') {
  let c;
  try {
    c = await oracledb.getConnection({ user, password, connectString: DB.connectString });
    await c.execute(sql);
    return true;
  } catch {
    return false;
  } finally {
    if (c) await c.close().catch(() => {});
  }
}

/**
 * 把学生的 .sh/.sql 里的 expdp/impdp 命令拼成一条逻辑行，并切出参数。
 *
 * 这是「宽松版」：只做语法解析，不校验参数是否齐全。
 * 为什么需要宽松版：实验四被拆成了「先写骨架，再补文件名，最后补导什么」的几步，
 * 中间步骤的命令本来就是不完整的（没有 DUMPFILE/LOGFILE/TABLES），
 * 用严格版会在解析阶段就抛「缺少参数」，那一步永远判不了。
 *
 * 安全约束和严格版一致：只接受一条 expdp/impdp 命令 + KEY=VALUE 参数，
 * 出现管道、重定向、分号等 shell 特殊符号一律拒绝。
 *
 * @returns {{kind:string, params:Object, connection:string, raw:string}} params 键为大写
 */
function parsePumpCommandLoose(relPath, kind) {
  const file = path.join(WORKSPACE, relPath);
  if (!fs.existsSync(file)) {
    throw new Error(`没找到文件 ${relPath} → 检查：文件名是否拼错、是否保存过`);
  }

  // 先把行尾反斜杠的续行拼成逻辑行，再逐条找命令。
  const logical = [];
  let cur = '';
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = raw.replace(/\s+$/, '');
    if (cur) cur += ' ';
    cur += t.replace(/\s*\\$/, '');
    if (!/\s*\\$/.test(t)) {
      logical.push(cur);
      cur = '';
    }
  }
  if (cur) logical.push(cur);

  const line = logical
    .map((l) => l.trim())
    .find((l) => !l.startsWith('--') && !l.startsWith('#') && new RegExp(`^${kind}\\b`, 'i').test(l));

  if (!line) {
    throw new Error(
      `没找到 ${kind} 命令 → 检查：这一关要在文件里写一条 ${kind} 命令（不是 SQL），命令名要写全`
    );
  }
  if (/[|;&`$()<>]/.test(line)) {
    throw new Error(
      `命令里含有 shell 特殊符号（| ; & \` $ ( ) < >）→ 检查：只写一条 ${kind} 命令，不要加管道或重定向`
    );
  }

  const tokens = line.split(/\s+/).slice(1);
  const params = {};
  let connection = '';
  for (const t of tokens) {
    const m = /^([A-Za-z_]+)=(.*)$/.exec(t);
    if (!m) {
      // 连接串（COURSE/course@//host:port/service）允许出现，其余裸参数报警
      if (t.includes('/') || t.includes('@')) {
        if (!connection) connection = t;
        continue;
      }
      throw new Error(
        `看不懂这个参数：「${t}」→ 检查：参数要写成 名字=值 的形式，例如 DIRECTORY=DUMPDIR`
      );
    }
    params[m[1].toUpperCase()] = m[2];
  }

  return { kind, params, connection, raw: line };
}

/**
 * 从学生的 .sh/.sql 里解析出 expdp/impdp 的参数（完整版）。
 * 为什么解析而不是直接 bash 执行学生文件：
 *   判题进程不应该盲目执行学生写的任意 shell。
 *   这里只接受 expdp/impdp 一行命令 + KEY=VALUE 形式的参数，
 *   其余内容（管道、重定向、其他命令）一律拒绝。
 * @returns {{kind:string, params:Object}} params 键为大写
 */
function parsePumpCommand(relPath, kind) {
  const parsed = parsePumpCommandLoose(relPath, kind);
  const params = parsed.params;

  const need = ['DIRECTORY', 'DUMPFILE', 'LOGFILE'];
  for (const k of need) {
    if (!params[k]) {
      throw new Error(
        `缺少 ${k} 参数 → 检查：${kind} 命令里要写 ${need.join('、')}，缺一不可`
      );
    }
  }
  if (!params.TABLES && !params.SCHEMAS) {
    throw new Error(
      `缺少 TABLES 或 SCHEMAS 参数 → 检查：导出一张表用 TABLES=表名，导出整个用户用 SCHEMAS=COURSE`
    );
  }
  const ascii = /^[\x20-\x7e]+$/;
  for (const k of ['DUMPFILE', 'LOGFILE']) {
    if (!ascii.test(params[k])) {
      throw new Error(
        `${k}=${params[k]} 含非 ASCII 字符 → 检查：Data Pump 不认中文文件名，改用纯英文（如 yuyue.dmp）`
      );
    }
  }
  return { kind, params };
}

/** 用解析出来的参数真正跑一遍 expdp/impdp */
function runPump(parsed) {
  const { params } = parsed;
  const args = Object.keys(params).map((k) => `${k}=${params[k]}`);
  return runDataPump(parsed.kind.toLowerCase(), args);
}

/** DUMPDIR 里是否存在某个文件（判"导出真的产生了文件"） */
function dumpFileExists(name) {
  const p = path.join('/tmp/dump', name);
  return fs.existsSync(p) && fs.statSync(p).size > 0;
}

/** 以 COURSE 身份跑学生的多语句查询文件，返回每条 SELECT 的结果集数组 */
async function runMultiQueryFileAsCourse(relPath) {
  const file = path.join(WORKSPACE, relPath);
  if (!fs.existsSync(file)) {
    throw new Error(`没找到文件 ${relPath} → 检查：文件名是否拼错、是否保存过`);
  }
  const stmts = splitStatements(fs.readFileSync(file, 'utf8'));
  if (!stmts.length) {
    throw new Error('文件里没有 SQL 语句 → 检查：是不是只写了注释、是不是忘了保存');
  }
  const results = [];
  for (const sql of stmts) {
    try {
      const rows = await queryAsCourse(stripComments(sql).replace(/;\s*$/, ''));
      results.push({ sql, rows });
    } catch (e) {
      throw new Error(
        `这条语句报错了：${(e.message || '').split('\n')[0]}\n  → 语句：${stripComments(sql)
          .split('\n')
          .filter((l) => l.trim())
          .join(' ')
          .slice(0, 120)}`
      );
    }
  }
  return results;
}

module.exports = {
  WORKSPACE,
  DB,
  conn,
  closeAll,
  exec,
  query,
  scalar,
  splitStatements,
  replay,
  replayAll,
  resetSchema,
  assertTable,
  assertColumn,
  assertConstraint,
  assertRowCount,
  expectError,
  sameRows,
  sameRowsOrdered,
  stripComments,
  runQuery,
  runQueryFile,
  assertQueryEquals,
  assertObject,
  assertCompiled,
  callProcedure,
  expectCallError,
  runDataPump,
  parsePumpCommand,
  parsePumpCommandLoose,
  runPump,
  resetSecurityObjects,
  assertDbUser,
  assertGrantedRole,
  courseConn,
  execAsCourse,
  scalarAsCourse,
  queryAsCourse,
  replayAsCourse,
  runQueryFileAsCourse,
  runMultiQueryFileAsCourse,
  loadCourseBaseline,
  assertCourseTable,
  cleanDumpFiles,
  stamp,
  sleep,
  COURSE_CREDS,
  runShellFile,
  tryLogin,
  dumpFileExists,
  readDumpLog,
};
