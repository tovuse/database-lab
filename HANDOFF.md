# 交接文档 · 2026-11-11

> 给下一个会话（或接手的人）看的进度说明。**先读这一页，不要从头翻对话。**

---

## ✅ 更新（2026-11-11 晚）：两个诉求都已真机验证通过

改名阻塞已解除，新 Codespace 真机构建 + 判题全部跑通。**实测证据如下。**

**验证环境**：新建 Codespace `jubilant-space-rotary-phone-wr56p765w6953gw9x`
（分支 `feat/image-prep-and-finer-steps`，2-core / 8GB，US West）

| 验证项 | 结果 | 证据 |
|---|---|---|
| `docker build` 真的跑了（不是复用旧容器） | ✅ | 新 Codespace 从零构建，文件树完整加载 |
| BuildKit `followPaths` header 错误 | ✅ 已消失 | 改名后构建一次通过 |
| Node 预装 | ✅ | `node -v` → `v20.20.2`，`npm -v` → `10.8.2` |
| git 预装 | ✅ | `git --version` → `2.43.7` |
| 判题依赖预装 | ✅ | `coderoad/node_modules` 已有 ansi-colors / ansi-regex / ansi-styles |
| initdb 脚本进镜像 | ✅ | `/container-entrypoint-initdb.d/10_db_setup.sh` 存在 |
| 基线数据进镜像 | ✅ | `/opt/course/baseline/00_baseline.sql` 存在 |
| Oracle 起来了 | ✅ | 判题的 `[环境] 应能连上课程库 FREEPDB1` 通过 |
| COURSE 用户可连库 | ✅ | `sqlplus COURSE/course@//localhost:1521/FREEPDB1` → `USER=COURSE` |
| **`CODEROAD_TUTORIAL_URL` 自动开课** | ✅ **首次验证成功** | 点「信任」后 CodeRoad 面板**直接显示第 1 关**，没有「Start New Tutorial」面板 |
| 78 步粒度生效 | ✅ | 面板显示「本关一共 **25 小步**」 |
| 自动打开作答文件 | ✅ | 自动打开 `sql/1.1.sql`（纯 ASCII 文件名） |
| **1.1 判题通关** | ✅ | 写入 `SELECT USER FROM dual;` 后 `3 passing / 0 failing` |
| 学生需要的手动操作 | 只剩 **1 下** | 点「信任文件夹并继续」（VS Code 安全机制，工作区配置关不掉） |

**用户原始诉求对照**：
- 诉求 1（关卡太大）→ 78 步，每步一个动作，实测面板确认 25 小步 ✅
- 诉求 2（启动要用户配机器）→ 学生零配置：Node/git/依赖/Oracle/基线全部预置，只剩一次信任点击 ✅

**剩余待办**：78 步的完整判题回归（本次只跑了 1.1），以及合并回 `main`。

---

## 一、当前状态一览（历史记录，改名前的状态）

| 项 | 值 |
|---|---|
| 仓库 | `D:/code/database-lab`（远端 `https://github.com/tovuse/database-lab.git`） |
| 分支 | `feat/image-prep-and-finer-steps` |
| HEAD | `72bc5e6 refactor(paths): 145 个中文文件名改为纯编号 ASCII` |
| 工作区 | **干净** |
| 课程步骤 | **78 步**（L1=25 / L2=15 / L3=13 / L4=25） |
| `main` 分支 | **仍是旧的 50 步版本，尚未合并** |

**一句话现状**：内容重构（50→78 步）+ 镜像预置 + 自动开课，三者均已在真机验证通过；只差 78 步全量回归和合并回 `main`。

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

### 修复 B 之后暴露的新错误（已解决）✅

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

**已解决**（commit `72bc5e6`）：145 个文件名全部改为纯编号 ASCII，210 处引用同步改写。详见第四部分。

---

## 四、✅ 已完成：145 个中文文件名改为纯编号 ASCII（commit `72bc5e6`）

### 用户已拍板的方案（已执行）

**Q: 145 个中文文件名怎么处理？**
**A: 改成纯编号 ASCII → `sql/1.1.sql`、`answers/1.1.sql`、`coderoad/test/1.1.test.js`。中文标题只保留在 `TUTORIAL.md` 和文件内容里。**

**Q: `answers/3.7` 和 `answers/3.8` 各有两份文件会重名怎么办？**
**A: 真答案用 `answers/3.7.sql`，判题辅助数据用 `answers/3.7_seed.sql`。**

冲突详情（已核实内容并按此映射）：
```
answers/3.7_把书全借出.sql      → 判题辅助（UPDATE 图书 SET 是否借出）  → 3.7_seed.sql
answers/3.7_预约插入.sql        → 真答案（CREATE PROCEDURE 图书预约）   → 3.7.sql
answers/3.8_还书改图书状态.sql    → 真答案（CREATE PROCEDURE 还书）      → 3.8.sql
answers/3.8_造一条未还记录.sql    → 判题辅助（UPDATE + INSERT 借阅）     → 3.8_seed.sql
```

### 实际改了什么

| 项 | 数量 |
|---|---|
| 改名文件 | **145**（`sql/` 78 + `answers/` 65 + 根 1 + `scripts/` 1） |
| 引用改写 | **210 处 / 107 个唯一路径 / 88 个文件** |
| `coderoad.yaml` `setup.files` | 78 处 |
| `coderoad/test/*.test.js` `replay(...)` | 全部 |
| `coderoad/test/utils.js` | 1 处（`loadCourseBaseline()` 里那个易漏的 `answers/00.sql`） |
| `TUTORIAL.md` / `README.md` / `scripts/*.sh` | 若干 |
| `Dockerfile` 的 COPY | → `COPY answers/00.sql /opt/course/baseline/00_baseline.sql` |
| `.dockerignore` | `!answers/00_*.sql` → `!answers/00.sql`（改名后原通配已失配） |

### 改名后的验证（全部通过）

1. ✅ `node scripts/build.js` → 4 关卡 / 78 步
2. ✅ 78 个 `setup.filter` 全部匹配对应测试的 `describe` 标题（0 不匹配）
3. ✅ 78 步每步 ≥3 条提示
4. ✅ 210 个 `sql/` `answers/` 路径引用 **0 缺失**（78 个 sql + 29 个 answers，与预期吻合）
5. ✅ `git ls-files` 非 ASCII 文件名 **0**
6. ✅ 模拟 dockerignore 后构建上下文 95 个文件，非 ASCII 文件名 **0**
7. ✅ 78 个测试文件 `node --check` 全部通过
8. ✅ 新 Codespace 真机构建通过 + 1.1 判题 3 passing / 0 failing

**改名脚本留档**：`D:/tmp/dblab-rename/rename.js`（不在仓库里；逻辑简单，可参考其注释）

### 剩下的验证（未做）

1. **78 步全量判题回归** —— 本次只实测了 1.1（3 passing / 0 failing）。其余 77 步未跑。
   建议做法：在 Codespace 里把 `answers/*.sql` 逐个喂给对应关卡，或用脚本批量跑
   `cd coderoad && ./node_modules/.bin/mocha --grep '^N\.M '`。
2. **合并回 `main`** —— `main` 仍是旧的 50 步版本。

---

## 五、⚠️ 必须知道的坑（都是实测踩出来的）

### 1. Codespaces 会复用旧容器，导致你以为在验证新代码

实测三次（创建 / Rebuild / Full Rebuild），日志全是：

```
$ docker start fdd816afe1c76cc...     ← 不是 build
```

**镜像从未重建。** 我在错的容器里验证了很久，得出过错误结论。

**对策：改 Dockerfile 或 `.dockerignore` 后，必须删除 Codespace 重新创建。** 这一点应该写进 README 给后续开发看。

**已验证有效的做法**：从 `https://github.com/codespaces` 点「New codespace」新建，
分支用 URL 参数 `&ref=feat%2Fimage-prep-and-finer-steps` 指定
（点下拉菜单里的分支项经常只关掉下拉框、不生效）。新建的 Codespace 是真正从零构建的。

### 2. 不要基于被截断的日志下结论

我第一次看到 `--build-arg _DEV_CONTAINERS_IMAGE_USER=node` 就断定是 devcontainer CLI 的 stage 冲突。实际上那段日志是拼接过的，里面 `dev_containers_auto_ded_stage_label` 这个拼写在 CLI 源码里根本搜不到。

subagent 用同版本 CLI（0.83.3）本地实测才推翻：**CLI 自己会生成那个 stage**，`_DEV_CONTAINERS_IMAGE_USER` 是按 Dockerfile 最后一条 `USER` 算的（我们是 `oracle`，不是 `node`）。Dockerfile 结构本来就是对的。

### 3. `package-lock.json` 指向国内镜像源（已修 + 已验证）✅

`coderoad/package-lock.json` 里 74 条 `resolved` 全部指向 `registry.npmmirror.com`。npm 11 实测：`npm ci` 直接信任锁文件里的 `resolved` URL，`--registry` 管不到它。Codespaces 构建机在境外，不可达时失败，报错是 `Exit handler never called!`（看起来像 npm 自己崩了）。

Dockerfile 里的修法：构建时先 `sed` 主机名为 `registry.npmjs.org` 再 `npm ci`（`integrity` 是内容哈希，改写主机安全）。

**已验证**：新 Codespace 构建时这一层顺利通过，`coderoad/node_modules` 里 mocha 等依赖齐全。

### 4. 浏览器自动化在 VS Code 网页版里很容易点错焦点

`Ctrl+Shift+P` 打开命令面板后输入文本，如果焦点在终端或编辑器里，文本会被敲进文件（我实际污染过一次 Dockerfile，已用 `git checkout` 恢复）。

**对策**：操作前先点页面空白区域让焦点离开终端；操作后用 `git status` 确认没污染文件。

### 5. Codespace 域名容易抄错

`cautious-tribble-4jv4574677xxcqw7` vs 真实 `cautious-tribble-4jv4574677xxcqgw7`（`cqgw7` 不是 `cgwq7`）。抄错会在 404 上耗很久。**从列表页点链接进，不要手抄。**

---

## 六、当前仓库里的关键文件

| 文件 | 作用 | 状态 |
|---|---|---|
| `Dockerfile` | 课程镜像：预装 Node 20 + git、判题依赖、建库初始化脚本、构建期自检 | ✅ **真机构建通过** |
| `.devcontainer/devcontainer.json` | 用 `build` 指向 Dockerfile；`remoteEnv` 设 `CODEROAD_TUTORIAL_URL` | ✅ **自动开课已验证** |
| `.devcontainer/initdb/10_db_setup.sh` | 建库时执行：TESTER 用户、COURSE 授权、DUMPDIR、基线数据 | ✅ 脚本进镜像，TESTER 可连 |
| `.dockerignore` | **必须纯 ASCII**（临界约束） | ✅ 已验证 |
| `scripts/postCreate.sh` | 从「5 步全量初始化」精简为「5 步校验 + 兜底」 | ✅ 依赖已拷好 |
| `coderoad.yaml` | 78 步的 setup.files + filter | ✅ 78 步 + filter 全匹配 |
| `TUTORIAL.md` | 78 步文案，每步 3 档 HINTS | ✅ 构建通过 |
| `tutorial.json` | 78 步、每步有 filter、无中文路径 | ✅ 已验证 |

---

## 七、建议的下一步顺序

1. **78 步全量判题回归**（唯一实质未完成项）
2. 回归全绿后合并回 `main`（`main` 还是 50 步旧版）
3. 更新 `README.md` 里已过时的说明（比如 `sql/1.3_图书分类.sql` 这类旧路径写法）
4. 可选：删掉旧 Codespace（`friendly space capybara` / `animated carnival` / `curly doodle` 等），
   避免后续有人误在里面验证

---

## 八、一句话给下一个会话

> 两个诉求都做完了，**真机验证通过**：新 Codespace 从零 `docker build` 成功，
> CodeRoad 点一次「信任」后自动进第 1 关（`CODEROAD_TUTORIAL_URL` 生效），
> 面板显示 25 小步，1.1 判题 3 passing / 0 failing。
> 145 个中文文件名已全改为纯编号 ASCII（commit `72bc5e6`），BuildKit 的
> `followPaths` / `excludePatterns` 两个 header 错误都消失了。
> **唯一剩的事**：78 步全量判题回归，然后把 `feat/image-prep-and-finer-steps` 合并回 `main`。
> 验证时务必**新建** Codespace，Rebuild 会复用旧容器、镜像根本不重建。
