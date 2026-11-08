# 数据库原理及应用 · 实验课

在浏览器里操作真实的 Oracle 数据库，写完 SQL 保存就自动判题。

## 一、开始上课

点下面的链接，浏览器里会直接打开一个 VS Code：

```
https://codespaces.new/yourorg/database-lab
```

- 第一次打开需要等 **3–5 分钟**（要启动 Oracle 数据库）
- 等右侧出现 CodeRoad 面板、显示第 1 关，就可以开始了
- 如果右侧没自动打开：`Ctrl+Shift+P` → 输入 `CodeRoad: Start`

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
| 右侧一直没有 CodeRoad 面板 | `Ctrl+Shift+P` → `CodeRoad: Start` |
| 终端里 sqlplus 连不上 | 数据库还在启动，等 2 分钟；或 `bash scripts/waitForDb.sh` |
| 判题一直红，但我 SQL 是对的 | 检查是否保存了文件（`Ctrl+S`），以及文件是不是在 `sql/` 目录下 |
| 想把某一关从头再来 | 改坏的文件用 `git checkout sql/文件名` 恢复成空模板 |
| 整个环境乱了 | 删除 codespace 重新建一个（进度会丢） |
