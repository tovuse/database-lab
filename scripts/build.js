#!/usr/bin/env node
/**
 * 把 TUTORIAL.md + coderoad.yaml 编译成 tutorial.json
 *
 * 为什么自己写而不用 @coderoad/cli：
 *   - 官方 CLI 依赖 2019 年的 esm 包，在 Node 18+ 直接崩（exit 1）
 *   - 本课程不用 git 提交链（判题靠重放学生的 .sql），不需要 CLI 的提交匹配逻辑
 *   - 只有 100 行，完全可控，出错信息也更清楚
 *
 * 用法：node scripts/build.js
 *
 * TUTORIAL.md 约定：
 *   # 课程标题                        ← 一级标题，只出现一次
 *   > 课程简介                        ← 紧跟标题的引用块
 *   ## 1. 关卡标题                    ← 二级标题，编号即 level id
 *   > 关卡摘要（可选）
 *   正文……
 *   ### 1.1 步骤标题                  ← 三级标题，编号即 step id
 *   正文……
 *   #### HINTS                        ← 提示区
 *   - 提示一
 *   - 提示二
 *   #### SUBTASKS                     ← 子任务区（可选）
 *   - 检查点一
 */
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');

function parseMarkdown(md) {
  const lines = md.split(/\r?\n/);

  let title = '';
  let description = '';
  const levels = [];

  let cur = null; // 当前 level
  let step = null; // 当前 step
  let mode = 'level-content'; // level-content | step-content | hints | subtasks
  let buf = [];

  const flushBuf = () => {
    const text = buf.join('\n').trim();
    buf = [];
    return text;
  };

  for (const line of lines) {
    // 一级标题：课程名
    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) {
      title = h1[1].trim();
      mode = 'summary';
      continue;
    }

    // 二级标题：关卡  ## 1. 标题
    const h2 = line.match(/^##\s+(\d+)\.?\s*(.*)$/);
    if (h2) {
      if (cur) {
        if (step) {
          step.content = flushBuf();
          cur.steps.push(step);
          step = null;
        } else {
          cur.content = flushBuf();
        }
        levels.push(cur);
      }
      cur = { id: h2[1], title: h2[2].trim(), summary: '', content: '', steps: [] };
      mode = 'level-summary';
      continue;
    }

    // 三级标题：步骤  ### 1.1 标题
    const h3 = line.match(/^###\s+(\d+\.\d+)\s*(.*)$/);
    if (h3) {
      if (step) {
        step.content = flushBuf();
        cur.steps.push(step);
      } else if (cur) {
        cur.content = flushBuf();
      }
      step = {
        id: h3[1],
        title: h3[2].trim(),
        content: '',
        hints: [],
        subtasks: [],
      };
      mode = 'step-content';
      continue;
    }

    // HINTS / SUBTASKS
    if (/^####\s+HINTS\s*$/i.test(line)) {
      if (step) {
        step.content = flushBuf();
        mode = 'hints';
      }
      continue;
    }
    if (/^####\s+SUBTASKS\s*$/i.test(line)) {
      if (step) step.content = flushBuf();
      mode = 'subtasks';
      continue;
    }

    // 引用块作为 summary（只在标题后立即出现时生效）
    if (mode === 'summary' && /^>\s*(.*)$/.test(line)) {
      description = line.replace(/^>\s*/, '').trim();
      continue;
    }
    if (mode === 'level-summary' && /^>\s*(.*)$/.test(line)) {
      cur.summary = line.replace(/^>\s*/, '').trim();
      mode = 'level-content';
      continue;
    }

    // 提示 / 子任务的列表项
    if (mode === 'hints' || mode === 'subtasks') {
      const li = line.match(/^[-*]\s+(.*)$/);
      if (li) {
        const target = mode === 'hints' ? step.hints : step.subtasks;
        target.push(li[1].trim());
      } else if (line.trim()) {
        // 多行提示：续接到上一条
        const target = mode === 'hints' ? step.hints : step.subtasks;
        if (target.length) target[target.length - 1] += ' ' + line.trim();
        else target.push(line.trim());
      }
      continue;
    }

    if (mode === 'summary') {
      if (!line.trim()) continue;
      description += (description ? '\n' : '') + line.trim();
      continue;
    }

    if (step) {
      buf.push(line);
    } else if (cur) {
      buf.push(line);
    }
  }

  // 收尾
  if (cur) {
    if (step) {
      step.content = flushBuf();
      cur.steps.push(step);
    } else {
      cur.content = flushBuf();
    }
    levels.push(cur);
  }

  return { title, description, levels };
}

function main() {
  const mdPath = path.join(ROOT, 'TUTORIAL.md');
  const yamlPath = path.join(ROOT, 'coderoad.yaml');
  const outPath = path.join(ROOT, 'tutorial.json');

  if (!fs.existsSync(mdPath)) {
    console.error('❌ 找不到 TUTORIAL.md');
    process.exit(1);
  }
  if (!fs.existsSync(yamlPath)) {
    console.error('❌ 找不到 coderoad.yaml');
    process.exit(1);
  }

  const md = fs.readFileSync(mdPath, 'utf8');
  const cfg = yaml.load(fs.readFileSync(yamlPath, 'utf8'));

  const parsed = parseMarkdown(md);

  // 校验：markdown 的关卡/步骤 必须和 yaml 的 levels/steps 一一对上
  const errors = [];
  const yamlLevels = cfg.levels || [];

  if (parsed.levels.length !== yamlLevels.length) {
    errors.push(
      `关卡数量不一致：TUTORIAL.md 有 ${parsed.levels.length} 个，coderoad.yaml 有 ${yamlLevels.length} 个`
    );
  }

  parsed.levels.forEach((mdLevel, li) => {
    const cfgLevel = yamlLevels[li];
    if (!cfgLevel) {
      errors.push(`coderoad.yaml 缺少关卡 ${mdLevel.id}`);
      return;
    }
    if (String(cfgLevel.id) !== String(mdLevel.id)) {
      errors.push(
        `第 ${li + 1} 个关卡 id 不匹配：md 是 "${mdLevel.id}"，yaml 是 "${cfgLevel.id}"`
      );
    }
    if (mdLevel.steps.length !== (cfgLevel.steps || []).length) {
      errors.push(
        `关卡 ${mdLevel.id} 的步骤数不一致：md 有 ${mdLevel.steps.length} 个，yaml 有 ${
          (cfgLevel.steps || []).length
        } 个`
      );
    }
    mdLevel.steps.forEach((mdStep, si) => {
      const cfgStep = (cfgLevel.steps || [])[si];
      if (!cfgStep) return;
      if (String(cfgStep.id) !== String(mdStep.id)) {
        errors.push(
          `关卡 ${mdLevel.id} 第 ${si + 1} 步 id 不匹配：md 是 "${mdStep.id}"，yaml 是 "${cfgStep.id}"`
        );
      }
    });
  });

  if (errors.length) {
    console.error('❌ 构建失败：\n');
    errors.forEach((e) => console.error('   • ' + e));
    process.exit(1);
  }

  // 合并：yaml 的 config 和每步的 setup/solution，markdown 的文案
  const tutorial = {
    id: cfg.id,
    version: String(cfg.version),
    summary: {
      title: parsed.title,
      description: parsed.description || parsed.title,
    },
    config: cfg.config,
    levels: parsed.levels.map((mdLevel, li) => {
      const cfgLevel = yamlLevels[li];
      return {
        id: String(mdLevel.id),
        title: mdLevel.title,
        summary: mdLevel.summary || mdLevel.title,
        content: mdLevel.content || '',
        ...(cfgLevel.setup ? { setup: cfgLevel.setup } : {}),
        steps: mdLevel.steps.map((mdStep, si) => {
          const cfgStep = (cfgLevel.steps || [])[si] || {};
          return {
            id: String(mdStep.id),
            content: mdStep.content || '',
            setup: cfgStep.setup || {},
            ...(cfgStep.solution ? { solution: cfgStep.solution } : {}),
            ...(mdStep.hints.length ? { hints: mdStep.hints } : {}),
            ...(mdStep.subtasks.length ? { subtasks: mdStep.subtasks } : {}),
          };
        }),
      };
    }),
  };

  fs.writeFileSync(outPath, JSON.stringify(tutorial, null, 2), 'utf8');

  const nLevels = tutorial.levels.length;
  const nSteps = tutorial.levels.reduce((a, l) => a + l.steps.length, 0);
  console.log(`✅ tutorial.json 已生成`);
  console.log(`   课程：${tutorial.summary.title}`);
  console.log(`   关卡：${nLevels} 个，步骤：${nSteps} 个`);

  // 提醒没写 hints 的步骤（违反"三档提示"规范）
  const noHints = [];
  tutorial.levels.forEach((l) =>
    l.steps.forEach((s) => {
      if (!s.hints || s.hints.length < 3) noHints.push(`${s.id}`);
    })
  );
  if (noHints.length) {
    console.log(`   ⚠️  提示不足 3 档的步骤：${noHints.join(', ')}`);
  }
}

main();
