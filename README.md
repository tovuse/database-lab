# 数据库原理及应用 · 实验课

在浏览器里操作真实的 Oracle 数据库，写完 SQL 保存就自动判题。

## 一、开始上课

点下面的链接，浏览器里会直接打开一个 VS Code：

```
https://codespaces.new/tovuse/database-lab
```

- 第一次打开需要等 **3–5 分钟**（要启动 Oracle 数据库）
- 等右侧出现 CodeRoad 面板、显示第 1 关，就可以开始了

### 打开后如果不对，按这三步排查

**① 弹出「是否信任此文件夹中的文件的作者？」→ 点「信任文件夹并继续」**

不点信任，VS Code 处于受限模式，扩展不会加载，CodeRoad 面板永远出不来。

**② 右侧没有 CodeRoad 面板 → 按 `F1`，输入 `Reload Window`，回车**

扩展装好了但没激活是常见情况，重载一次窗口就出来了。

**③ 点了 Run 显示 `Test Runner Failed` → 说明环境初始化没跑完**

在终端里执行一次自检，能看到缺什么：

```bash
cd /workspaces/database-lab && bash scripts/selfCheck.sh
```

如果提示缺 Node.js 或 mocha 不可执行，按文档 §六 的说明处理，或直接把输出发给老师。

## 二、怎么用

每一关都在 `sql/` 下有一个对应的文件，例如第 1.3 关就是 `sql/1.3_图书分类.sql`。

1. 读右侧 CodeRoad 面板里的题目
2. 在左边的 `.sql` 文件里写 SQL
3. **`Ctrl+S` 保存** → 右侧自动判题
4. 变绿就自动跳到下一关

写错了右侧会显示红色的错误提示，通常会告诉你「哪里不对 + 该检查什么」。
卡住了就点「提示」按钮，提示是分三档给的：先给方向，再给语法，最后给完整答案。

## 三、连数据库（想自己看结果时用）

判题是自动的，但你可能想自己 `SELECT` 看看表长什么样。开一个终端：

```bash
sqlplus -S COURSE/course@//localhost:1521/FREEPDB1
```

几个常用命令：

```sql
SELECT table_name FROM user_tables;      -- 我建了哪些表
DESC 图书分类;                            -- 看表结构
SELECT * FROM 图书分类;                   -- 看数据
exit                                     -- 退出
```

> 「判题」和「你自己的库」是分开的：判题会把你写的 SQL 重放到一个临时库来检查，
> 所以你反复保存不会报「表已存在」。想让自己库里也有这些表，见下面 `apply.sh`。

## 四、几个有用的脚本

```bash
./scripts/apply.sh sql/1.3_图书分类.sql   # 把自己写的 SQL 真正应用到自己库里
./scripts/reset.sh                        # 清空自己库里的所有对象，重头再来
node scripts/build.js                     # 改了 TUTORIAL.md 后重新编译课程
```

## 五、⚠️ 学完请删除 codespace

**不是停止，是删除。** 因为停止的 codespace 仍然占用存储额度：

1. 打开 https://github.com/codespaces
2. 找到这个 codespace，点右边的 `⋯` → `Delete`

GitHub 免费账号每月有 120 core-hours + 15GB 存储。这门课的镜像是 2.8GB，
建库后磁盘占用约 6–8GB，**留两个 codespace 就可能把存储额度吃满**。

## 六、出问题了

| 现象 | 处理 |
|---|---|
| 弹出「是否信任此文件夹」 | 点「信任文件夹并继续」，否则扩展不会加载 |
| 右侧一直没有 CodeRoad 面板 | `F1` → `Reload Window`；仍不行再试 `CodeRoad: Start` |
| 点 Run 显示 `Test Runner Failed` | 环境初始化没跑完，跑 `bash scripts/selfCheck.sh` 看缺什么 |
| 终端里 sqlplus 连不上 | 数据库还在启动，等 2 分钟；或 `bash scripts/waitForDb.sh` |
| 进入 Level 2 后报表不存在 | 基线没装载，执行 `bash scripts/loadBaseline.sh` |
| 判题一直红，但我 SQL 是对的 | 检查是否保存了文件（`Ctrl+S`），以及文件是不是在 `sql/` 目录下 |
| 想把某一关从头再来 | 改坏的文件用 `git checkout sql/文件名` 恢复成空模板 |
| 整个环境乱了 | 删除 codespace 重新建一个（进度会丢） |
| 讲义显示成旧版本 | CodeRoad 把课程缓存在工作区状态里。清缓存：命令面板 → `Developer: Reload Window`；仍不行就删除该 codespace 重建 |

## 七、给课程维护者：几个必须知道的坑

### 0. 三个 P0（不修，学生第 1 关就会卡死）

实测于 2026-11-08 的 Codespaces 环境，详见 `CodeRoad课程云端实操测试报告.docx`。

**P0-1 镜像里没有 Node.js。** `gvenzl/oracle-free:23-slim` 是纯 Oracle 镜像，
不含 Node，`postCreate.sh` 里的 `npm install` 必然失败，判题器起不来。
必须在 `devcontainer.json` 里加 feature：

```jsonc
"features": {
  "ghcr.io/devcontainers/features/node:1": { "version": "20" }
}
```

**P0-2 `coderoad/node_modules` 不能入库。** 里面 734 个文件是从 Windows 提交的，
`.bin/mocha` 权限是 644，Linux 下执行报 `Permission denied`。应从版本库移除，
交给 `postCreate` 现场 `npm install`。

**P0-3 `postCreate.sh` 的 `set -e` 会掩盖失败。** 第 3 步 npm install 一失败脚本就退出，
第 4 步「清理课程脚手架」永远不执行，工作区里留着 `TUTORIAL.md` / `coderoad.yaml`。
应逐步判断返回值，对非关键步骤不要一刀切。

**P1 Level 2 的 setup 未必触发。** 通过 Continue 弹窗进入下一关时，`coderoad.yaml`
里配置的 level `setup` 命令不会执行，基线表为空，5 道查询题全部无法作答。
不要依赖它，改由 `postCreate` 装载基线。

### 1. `codeally.json` 必须放在**根目录**

扩展的激活事件是 `workspaceContains:/codeally.json` —— 这是**根目录**语义。
放在 `.freeCodeCamp/codeally.json` 不会触发激活，必须放仓库根目录。

Codespaces 里靠 `CODEROAD_TUTORIAL_URL` 自动开课，这个文件是给本地调试用的。

### 2. Windows 本地调试 vs Codespaces 的差异

| 项 | Codespaces (Linux) | Windows 本地 |
|---|---|---|
| 测试命令 | `./node_modules/.bin/mocha` | `node ./node_modules/mocha/bin/mocha.js` |
| `repo.uri` | GitHub URL | 必须能 `git ls-remote` 通过（用本地 bare 仓库） |
| 工作区信任 | 默认信任 | 需关 `security.workspace.trust.enabled` 或信任该目录 |

用 `node scripts/build.js --local` 生成本地可测版本（自动改这两项）。

### 3. 改完讲义要清 CodeRoad 缓存

CodeRoad 把 `tutorial.json` 存在 workspaceState（`coderoad:currentTutorial`）里。
重新 build 后如果界面还是旧内容，是走了"继续上次课程"路径。
解决：命令面板 `Developer: Reload Window`，或直接删 `state.vscdb` 里那个 key。

### 4. `coderoad-cli` 在 Node 18+ 上跑不起来

`@coderoad/cli@0.9.3` 依赖 2019 年的 `esm` 包，在 Node 24 上直接崩（exit 1）。
本仓库用 `scripts/build.js` 替代，它做三件事：
- 解析 `TUTORIAL.md`（`## 1.` / `### 1.1` / `#### HINTS` / `#### SUBTASKS`）
- 校验 markdown 与 `coderoad.yaml` 的关卡/步骤 id 一一对齐
- 警告提示不足 3 档的步骤（违反"三档提示"规范）

