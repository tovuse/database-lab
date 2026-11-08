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

  const flush = () => {
    const sql = buf.join('\n').trim();
    if (sql) out.push(sql);
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

async function assertConstraint(table, type, keyword) {
  let sql = `SELECT COUNT(*) FROM user_constraints
              WHERE table_name=:1 AND constraint_type=:2`;
  const binds = [table.toUpperCase(), type];
  if (keyword) {
    sql += ` AND (search_condition_vc LIKE :3 OR constraint_name LIKE :3)`;
    binds.push(`%${keyword}%`);
  }
  const n = await scalar(sql, binds);
  if (!n) {
    const typeName =
      { P: '主键', R: '外键', C: 'CHECK 约束', U: '唯一约束' }[type] || type;
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
};
