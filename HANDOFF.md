# 交接文档 · 2026-11-11

> 给下一个会话（或接手的人）看的进度说明。**先读这一页，不要从头翻对话。**

---

## 一、当前状态一览

| 项 | 值 |
|---|---|
| 仓库 | `D:/code/database-lab`（远端 `https://github.com/tovuse/database-lab.git`） |
| 分支 | `feat/image-prep-and-finer-steps` |
| HEAD | `4415f4d fix(image): .dockerignore 改为纯 ASCII，修复 BuildKit 构建失败` |
| 工作区 | **干净**（0 项改动） |
| 课程步骤 | **78 步**（L1=25 / L2=15 / L3=13 / L4=25） |
| `main` 分支 | **仍是旧的 50 步版本，尚未合并** |

**一句话现状**：内容重构（50→78 步）已完成并构建通过；镜像方案改到一半，卡在最后一个阻塞点（中文文件名）。

---

## 二、用户提出的两个原始诉求

### 诉求 1：关卡粒度太大，很难上手，要拆细

**状态：已完成。**

依据是实测 freeCodeCamp 的课程数据（166 关 bash 课、164 关 SQL 课，**每关只做一个动作**）。

拆分结果：

| 关卡 | 原 | 现 | 主要拆法 |
|---|---|---|---|
| L1 准备环境与建表 | 13 | **25** | 1.11（27 条 INSERT）按表拆成 7 步；1.12 增删改拆 3 步；1.13 四个约束各一步 |
| L2 数据查询 | 15 | 15 | 查询题本身粒度已合适，未动 |
| L3 存储过程与触发器 | 8 | **13** | 存储过程拆成「骨架 / 补逻辑 / 补异常」 |
| L4 数据库恢复与安全性 | 14 | **25** | expdp/impdp 拆「骨架 / 补参数」；权限查询按字典视图拆；建角色拆「建角色 / 授表权 / 授过程权」 |

一致性已验证：`TUTORIAL.md` 78 步 / `coderoad.yaml` 78 步 / `sql/` 78 模板 / `coderoad/test/` 78 测试，全部一一对应，每步都有 3 档 HINTS。

**注意**：`answers/` 只有 64 个文件，差的 16 个是 L2 查询题和 1.1/1.2 —— 那些步骤的期望结果内嵌在测试里，**本来就不需要答案文件，不是遗漏**。

### 诉求 2：启动时还要用户操作机器配置，准备工作没做好

**状态：根因已找到，修复方案已实现，但卡在最后一个阻塞点。**

用户的原话：「启动时，还需要使用者操作机器配置问题，这与预期相悖，也就是准备工作没做好，镜像没弄好」。

原来的痛点：学生打开 Codespace 后要手动点 6 下才能开始：
`CodeRoad: Start` → Start New Tutorial → 切到 URL 标签 → 粘贴 tutorial.json 地址 → Load → Start。

---

## 三、诉求 2 的根因与修复（重点，按发现顺序）

这一节记录了**三次错误判断**和**两次真实修复**，因为踩过的坑比结论更重要。

### 真实修复 A：`CODEROAD_TUTORIAL_URL` 设错了层级 ✅

读 CodeRoad 0.17.2 源码（`build/extension.js`）确认：

```js
var is = process.env.CODEROAD_TUTORIAL_URL || null   // 模块加载时读一次
...
if (!tutorial || !tutorial.id) {
  if (is) {
    const n = await (await fetch(is)).json()
    K({ type: "START_TUTORIAL_FROM_URL", payload: { tutorial: n } })
    return
  }
  K({ type: "START_NEW_TUTORIAL", ... })   // ← 才会显示"开始新教程"面板
}
```

**关键**：这个变量原来只设在 `containerEnv`（容器层），但读取它的是 **VS Code 扩展宿主进程**，那一路读的是 **`remoteEnv`**。这是 devcontainer 规范的分工。

修复（三层冗余）：
1. `Dockerfile` 的 `ENV` → 容器级
2. `devcontainer.json` 的 `remoteEnv` → 扩展宿主那一层
3. `postCreate.sh` 打印该变量 + `curl` 实测 HTTP 可达性

**必须诚实说明的结论**：`CODEROAD_TUTORIAL_URL` 这条路**至今没有被真正验证过**——因为镜像一直没能构建成功，扩展根本没加载。它是否真能自动进第 1 关，**仍是未验证假设**。

**另一个不可绕过的事实**：工作区信任（`security.workspace.trust.enabled`）是用户级设置，工作区配置覆盖不了。**「零动作自动开课」做不到**，最低限度是学生点一次「信任文件夹并继续」。而那一下不只是安全提示——不信任 = 扩展不加载 = CodeRoad 不激活。

### 真实修复 B：`.dockerignore` 必须纯 ASCII ✅

Codespaces 日志的确切错误：

```
ERROR: failed to build: failed to solve: Internal: rpc error: code = Internal
desc = header key "excludePatterns" contains value with non-printable ASCII characters
```

BuildKit 把 `.dockerignore` 内容作为 `excludePatterns` header 传给构建后端，header 值必须是 ASCII。原文件有 8 行中文注释 + `!answers/00_基线.sql`。

修复：全部注释改英文，中文文件名改用通配 `!answers/00_*.sql`。已验证 `grep -c '[^ -~]' .dockerignore` = 0。

### 修复 B 之后暴露的新错误（当前阻塞点）❌

修好 B 后，构建往前走了一步（`transferring dockerfile: 10.55kB` 成功），但立刻报新错：

```
ERROR: failed to build: failed to solve: Internal: rpc error: code = Internal
desc = header key "followPaths" contains value with non-printable ASCII characters
```

**根因**：`followPaths` header 会列出构建上下文中的所有文件路径。仓库 **249 个文件里有 145 个文件名含中文**：

| 目录 | 含中文文件名数量 |
|---|---|
| `sql/` | 78 |
| `answers/` | 65 |
| 仓库根 | 1（`CodeRoad课程云端实操测试报告.docx`） |
| `scripts/` | 1 |

即 `sql/1.11_预约表.sql`、`answers/00_基线.sql` 这类。**只要有一个，构建就失败。**

**这不是改配置能绕过的，必须改文件名。**

---

## 四、⏭️ 下一步要做的事（从这里开始）

### 用户已拍板的方案

**Q: 145 个中文文件名怎么处理？**
**A: 改成纯编号 ASCII → `sql/1.1.sql`、`answers/1.1.sql`、`coderoad/test/1.1.test.js`。中文标题只保留在 `TUTORIAL.md` 和文件内容里。**

**Q: `answers/3.7` 和 `answers/3.8` 各有两份文件会重名怎么办？**
**A: 真答案用 `answers/3.7.sql`，判题辅助数据用 `answers/3.7_seed.sql`。**

冲突详情（已核实内容）：
```
answers/3.7_把书全借出.sql      → 判题辅助（UPDATE 图书 SET 是否借出）  → 3.7_seed.sql
answers/3.7_预约插入.sql        → 真答案（CREATE PROCEDURE 图书预约）   → 3.7.sql
answers/3.8_还书改图书状态.sql    → 真答案（CREATE PROCEDURE 还书）      → 3.8.sql
answers/3.8_造一条未还记录.sql    → 判题辅助（UPDATE + INSERT 借阅）     → 3.8_seed.sql
```

### 改名必须同步修改的引用点（已统计）

| 位置 | 引用数量 | 说明 |
|---|---|---|
| `coderoad.yaml` 的 `setup.files` | **78 处** | 每步的 `- sql/N.M_xxx.sql` |
| `coderoad/test/*.test.js` 的 `replay(...)` | **111 处** | `replay('sql/...')` / `replay('answers/...')` |
| 测试里 `'answers/...'` 引用 | 29 个不同路径 | 含判题辅助数据 |
| 测试里 `'sql/...'` 引用 | 78 个不同路径 | |
| `TUTORIAL.md` 正文提到的路径 | 若干 | 如 `sql/1.1_环境自检.sql` |
| `Dockerfile` 第 92 行 | 1 处 | `COPY answers/00_基线.sql /opt/course/baseline/00_baseline.sql` |
| `scripts/loadBaseline.sh` 第 36 行 | 1 处 | `@answers/00_基线.sql` |
| `scripts/postCreate.sh` | 0 处 | 只调 `loadBaseline.sh`，无需改 |
| `.dockerignore` | 1 处 | `!answers/00_*.sql` 通配，改名后仍可用，但建议改成 `!answers/00.sql` 更明确 |
| `coderoad/test/utils.js` 第 799 行 | **1 处（易漏！）** | `replayAsCourse('answers/00_基线.sql')`，在 `loadCourseBaseline()` 里 |

**完整受影响文件清单（共 84 个，已用 grep 实测）：**

```
Dockerfile                                  ← COPY answers/00_基线.sql
README.md
TUTORIAL.md
coderoad.yaml                               ← 78 处 setup.files
coderoad/test/utils.js                      ← replayAsCourse('answers/00_基线.sql')
coderoad/test/1.1.test.js  … 4.25.test.js   ← 全部 78 个测试文件
scripts/00_装载基线数据.md                    ← 文件名本身就是中文
scripts/apply.sh
scripts/loadBaseline.sh                     ← @answers/00_基线.sql
```

**注意 `scripts/00_装载基线数据.md` 这个文件名也是中文**——虽然 `.dockerignore` 排除了 `scripts`，不影响 docker build，但为了彻底干净建议一并改名。

**改名后必须重新跑 `node scripts/build.js`**，并确认 `coderoad.yaml` 的 `filter`（如 `'^4\.8 '`）仍然匹配测试的 describe 名——filter 用的是**步骤编号**不是文件名，改名不影响，但建议回归验证。

### 改名脚本建议思路

```bash
# 1. git mv 逐对改名（保留历史）
#    规则：取文件名开头的编号 + 原扩展名
#    sql/1.11_预约表.sql         → sql/1.11.sql
#    answers/1.11_插入数据.sql    → answers/1.11.sql
#    coderoad/test/1.1.test.js  → 已经是 ASCII，不用改
#    CodeRoad课程...docx        → 这个不在构建上下文里（.dockerignore 已排除），
#                                  但为了彻底干净建议改名或删除

# 2. 用 sed/node 批量替换引用（注意先 git mv 再改内容，或反之，保持可回滚）
```

**⚠️ 三个特别注意**：

1. **`coderoad/test/*.test.js` 的文件名已经是 ASCII**（`1.1.test.js`），不用改。只有 `sql/` 和 `answers/` 里的文件要改。
2. **判题辅助数据的 `_seed` 后缀**要同步改测试里的引用。
3. **改名后 `answers/00_基线.sql` → `answers/00.sql`**，`Dockerfile` 的 `COPY`、`loadBaseline.sh`、测试里的 `replay('answers/00_基线.sql')` 全都要改。

### 改完后的验证清单

1. `node scripts/build.js` → 78 步
2. `git -c core.quotePath=false ls-files | node -e '...'` 检查非 ASCII 文件名为 **0**
3. 新建 Codespace（**必须新建，不能 Rebuild**），确认：
   - 日志里是 `docker buildx build` 而非 `docker start`
   - 出现 `#1 transferring dockerfile: ... done`
   - 出现 `deps ok` 和 `build self-check ok`（Dockerfile 里的自检）
   - 容器里 `node -v` = v20.20.2、`ps -ef | grep -c oracle` > 0、`/container-entrypoint-initdb.d/10_db_setup.sh` 存在
   - `docker logs` 里有 `CONTAINER: running /container-entrypoint-initdb.d/10_db_setup.sh`
   - **CodeRoad 面板直接显示第 1 关**（仍需点一次信任）—— 这是 `CODEROAD_TUTORIAL_URL` 的首次真实验证
4. 78 步判题回归（本机无 Oracle，需在 Codespace 里跑）

---

## 五、⚠️ 必须知道的坑（都是实测踩出来的）

### 1. Codespaces 会复用旧容器，导致你以为在验证新代码

实测三次（创建 / Rebuild / Full Rebuild），日志全是：

```
$ docker start fdd816afe1c76cc...     ← 不是 build
```

**镜像从未重建。** 我在错的容器里验证了很久，得出过错误结论。

**对策：改 Dockerfile 或 `.dockerignore` 后，必须删除 Codespace 重新创建。** 这一点应该写进 README 给后续开发看。

### 2. 不要基于被截断的日志下结论

我第一次看到 `--build-arg _DEV_CONTAINERS_IMAGE_USER=node` 就断定是 devcontainer CLI 的 stage 冲突。实际上那段日志是拼接过的，里面 `dev_containers_auto_ded_stage_label` 这个拼写在 CLI 源码里根本搜不到。

subagent 用同版本 CLI（0.83.3）本地实测才推翻：**CLI 自己会生成那个 stage**，`_DEV_CONTAINERS_IMAGE_USER` 是按 Dockerfile 最后一条 `USER` 算的（我们是 `oracle`，不是 `node`）。Dockerfile 结构本来就是对的。

### 3. `package-lock.json` 指向国内镜像源（已修，但不是这次的根因）

`coderoad/package-lock.json` 里 74 条 `resolved` 全部指向 `registry.npmmirror.com`。npm 11 实测：`npm ci` 直接信任锁文件里的 `resolved` URL，`--registry` 管不到它。Codespaces 构建机在境外，不可达时失败，报错是 `Exit handler never called!`（看起来像 npm 自己崩了）。

已在 Dockerfile 里修：构建时先 `sed` 主机名为 `registry.npmjs.org` 再 `npm ci`（`integrity` 是内容哈希，改写主机安全）。

**但注意**：这个修复**也还没被真实验证过**——因为构建先卡在中文文件名上了。它排在当前阻塞点之后。

### 4. 浏览器自动化在 VS Code 网页版里很容易点错焦点

`Ctrl+Shift+P` 打开命令面板后输入文本，如果焦点在终端或编辑器里，文本会被敲进文件（我实际污染过一次 Dockerfile，已用 `git checkout` 恢复）。

**对策**：操作前先点页面空白区域让焦点离开终端；操作后用 `git status` 确认没污染文件。

### 5. Codespace 域名容易抄错

`cautious-tribble-4jv4574677xxcqw7` vs 真实 `cautious-tribble-4jv4574677xxcqgw7`（`cqgw7` 不是 `cgwq7`）。抄错会在 404 上耗很久。**从列表页点链接进，不要手抄。**

---

## 六、当前仓库里的关键文件

| 文件 | 作用 | 状态 |
|---|---|---|
| `Dockerfile` | 课程镜像：预装 Node 20 + git、判题依赖、建库初始化脚本、构建期自检 | 已写，未验证 |
| `.devcontainer/devcontainer.json` | 用 `build` 指向 Dockerfile；`remoteEnv` 设 `CODEROAD_TUTORIAL_URL` | 已改，未验证 |
| `.devcontainer/initdb/10_db_setup.sh` | 建库时执行：TESTER 用户、COURSE 授权、DUMPDIR、基线数据 | 已写，未验证 |
| `.dockerignore` | **必须纯 ASCII**（已修，临界约束） | ✅ 已验证 |
| `scripts/postCreate.sh` | 从「5 步全量初始化」精简为「5 步校验 + 兜底」 | 已改，未验证 |
| `coderoad.yaml` | 78 步的 setup.files + filter；setup/continue/reset 改成 `{ [ -d node_modules/mocha ] || npm install; }` | ✅ 构建通过 |
| `TUTORIAL.md` | 78 步文案，每步 3 档 HINTS | ✅ 构建通过 |
| `TUTORIAL.md` 对应产物 `tutorial.json` | 分支上的版本已确认 78 步、每步有 filter | ✅ 已验证 |

---

## 七、建议的下一步顺序

1. **先改名**（本节第四部分的方案），这是当前唯一阻塞点
2. `node scripts/build.js` 验证 78 步
3. 检查非 ASCII 文件名为 0
4. 提交推送
5. **删掉所有旧 Codespace，新建一个**
6. 按第四部分的验证清单逐项确认
7. 全绿后再考虑合并回 `main`

如果改名后还报 `followPaths` 或其它 header 错误，说明还有非 ASCII 路径残留（比如 `.dockerignore` 里的 `!answers/00_基线.sql` 忘了改，或者 `scripts/` 里那个中文文件名）。

---

## 八、一句话给下一个会话

> 内容已经拆好（78 步，构建通过，在 `feat/image-prep-and-finer-steps` 分支上）。
> 镜像方案卡在最后一步：**仓库有 145 个中文文件名，BuildKit 的 `followPaths` header 不接受非 ASCII**。
> 用户已定方案：全部改成纯编号 ASCII（`sql/1.1.sql` 这种），冲突的判题辅助数据加 `_seed` 后缀。
> 改完记得同步更新 `coderoad.yaml`（78 处）、`coderoad/test/*.test.js`（111 处 replay）、`TUTORIAL.md`、`Dockerfile` 的 COPY、`loadBaseline.sh`。
> 验证时必须**删掉旧 Codespace 新建**，因为 Rebuild 会复用旧容器、镜像根本不重建。
