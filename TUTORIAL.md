# 数据库原理及应用 · 实验课

> 在浏览器里操作 Oracle 数据库，写完 SQL 保存就自动判题。

## 1. 准备环境与第一张表

> 先确认能连上数据库、建出自己的用户，然后把第一张表建起来。

### 1.1 查出自己的用户名

数据库里的每一件事都以「你是谁」为前提。Oracle 用 `USER` 这个伪列告诉你当前登录的用户名。

先在终端里连上课程库：

```bash
sqlplus -S COURSE/course@//localhost:1521/FREEPDB1
```

然后在 `sql/1.1_环境自检.sql` 里写出查询语句，保存即可判题。

`dual` 是 Oracle 内置的单行单列表，专门用来测试表达式。

#### HINTS

- 用 `SELECT` 语句，从 `dual` 表里查 `USER`
- 语法是 `SELECT 列名 FROM 表名;`，这里的「列名」就是 `USER`，「表名」就是 `dual`
- 完整写法：`SELECT USER FROM dual;`

### 1.2 创建你自己的数据库用户

真实项目里不会所有人都用 `SYSTEM` 干活。每个应用有自己的 schema 用户，权限被限制在自己的一亩三分地。

在 `sql/1.2_建用户.sql` 里：

1. 用 `CREATE USER` 建一个用户，用户名是 `S` + 你的 8 位学号
2. 用 `GRANT` 给它 `CONNECT` 和 `RESOURCE` 两个角色

#### HINTS

- 建用户用 `CREATE USER 用户名 IDENTIFIED BY 密码;`
- 授权用 `GRANT 角色名 TO 用户名;`，两个角色可以写在一句里用逗号分开
- 完整写法（把 S20231234 换成你自己的学号）：
  ```sql
  CREATE USER S20231234 IDENTIFIED BY "Course#2024";
  GRANT CONNECT, RESOURCE TO S20231234;
  ```

### 1.3 建「图书分类」表

建表是 DDL（数据定义语言）。`CREATE TABLE` 一次定义一个关系：列名、类型、是否允许为空。

Oracle 常用类型：

| 类型 | 用途 |
|---|---|
| `CHAR(n)` | 定长字符串，不够会用空格补齐 |
| `VARCHAR2(n)` | 变长字符串 |
| `NUMBER(p,s)` | 数字，p 位有效数字，s 位小数 |
| `DATE` | 日期时间 |

图书分类只有两个属性。在 `sql/1.3_图书分类.sql` 里建这张表：

- `图书分类号` — `CHAR(3)`，不能为空
- `类名` — `VARCHAR2(30)`，不能为空

> ⚠️ 本库字符集是 `AL32UTF8`，一个汉字占 **3 字节**。`CHAR(1)` 存不下一个汉字，
> 会报 `ORA-01401`。所以后面存「是/否」要用 `CHAR(3)` 或 `VARCHAR2(3)`。

#### HINTS

- 用 `CREATE TABLE 表名 ( 列名 类型 NOT NULL, 列名 类型 NOT NULL );`
- 括号里逗号分隔，最后一行不要逗号；整条语句以分号结束
- 完整写法：
  ```sql
  CREATE TABLE 图书分类 (
    图书分类号 CHAR(3)      NOT NULL,
    类名       VARCHAR2(30) NOT NULL
  );
  ```

### 1.4 给「图书分类」加主键

主键（`PRIMARY KEY`）保证这一列的值唯一且不能为空。分类号天然唯一，所以它做主键。

在 `sql/1.4_图书分类主键.sql` 里，用 `ALTER TABLE` 给已建好的表追加主键约束。

#### HINTS

- 用 `ALTER TABLE 表名 ADD CONSTRAINT 约束名 PRIMARY KEY (列名);`
- 约束名自己起，建议 `pk_图书分类` 这种一眼能看懂的名字；括号里是**列名**不是类型
- 完整写法：
  ```sql
  ALTER TABLE 图书分类
    ADD CONSTRAINT pk_图书分类 PRIMARY KEY (图书分类号);
  ```

### 1.5 建「罚款分类」表

罚款分类要加一条 `CHECK` 约束：罚金必须大于 0。`CHECK` 写在括号里，条件不满足时插入会被拒绝。

- `罚款分类号` `NUMBER(1)`，主键
- `罚款名称` `VARCHAR2(20)`，不能为空
- `罚金` `NUMBER(6,2)`，不能为空，且 `CHECK (罚金 > 0)`

#### HINTS

- 表级约束写在列定义后面，用逗号隔开：`CONSTRAINT 约束名 CHECK (条件)`
- 骨架：`CREATE TABLE 罚款分类 (罚款分类号 NUMBER(1) NOT NULL, 罚款名称 VARCHAR2(20) NOT NULL, 罚金 NUMBER(6,2) NOT NULL, CONSTRAINT pk_罚款分类 PRIMARY KEY (罚款分类号), CONSTRAINT ck_罚款金额 CHECK (罚金 > 0));`
- 完整写法：
  ```sql
  CREATE TABLE 罚款分类 (
    罚款分类号 NUMBER(1)    NOT NULL,
    罚款名称   VARCHAR2(20) NOT NULL,
    罚金       NUMBER(6,2)  NOT NULL,
    CONSTRAINT pk_罚款分类 PRIMARY KEY (罚款分类号),
    CONSTRAINT ck_罚款金额 CHECK (罚金 > 0)
  );
  ```

### 1.6 建「书目」表（含外键）

`书目` 要指向 `图书分类`，这就是**外键**：`图书分类号` 的值必须在 `图书分类` 表里存在。

- `ISBN` `VARCHAR2(13)`，主键
- `书名` `VARCHAR2(60)`，不能为空
- `作者` `VARCHAR2(30)`、`出版单位` `VARCHAR2(50)`
- `单价` `NUMBER(7,2)`，`CHECK (单价 >= 0)`
- `图书分类号` `CHAR(3)`，不能为空，外键指向 `图书分类(图书分类号)`

> ⚠️ 前置条件：`图书分类` 必须已经有主键，否则外键建不起来（报 `ORA-02270`）。

#### HINTS

- 外键写法：`CONSTRAINT 约束名 FOREIGN KEY (本表列) REFERENCES 另一张表(它的列)`
- 骨架：`... CONSTRAINT fk_书目_分类 FOREIGN KEY (图书分类号) REFERENCES 图书分类(图书分类号)`
- 完整写法：
  ```sql
  CREATE TABLE 书目 (
    ISBN       VARCHAR2(13) NOT NULL,
    书名       VARCHAR2(60) NOT NULL,
    作者       VARCHAR2(30),
    出版单位   VARCHAR2(50),
    单价       NUMBER(7,2),
    图书分类号 CHAR(3)      NOT NULL,
    CONSTRAINT pk_书目      PRIMARY KEY (ISBN),
    CONSTRAINT fk_书目_分类 FOREIGN KEY (图书分类号) REFERENCES 图书分类(图书分类号),
    CONSTRAINT ck_书目_单价 CHECK (单价 >= 0)
  );
  ```

### 1.7 建「图书」表

`图书` 指向 `书目`。另外 `是否借出` 要有**默认值** `'否'`——插入时不写这一列，自动填这个值。

#### HINTS

- 默认值写法：`是否借出 CHAR(3) DEFAULT '否' NOT NULL`
- 注意 `CHAR(3)` 不是 `CHAR(1)`：一个汉字占 3 字节
- 完整写法：
  ```sql
  CREATE TABLE 图书 (
    图书编号 CHAR(7)      NOT NULL,
    ISBN     VARCHAR2(13) NOT NULL,
    是否借出 CHAR(3)      DEFAULT '否' NOT NULL,
    备注     VARCHAR2(100),
    CONSTRAINT pk_图书      PRIMARY KEY (图书编号),
    CONSTRAINT fk_图书_书目 FOREIGN KEY (ISBN) REFERENCES 书目(ISBN)
  );
  ```

### 1.8 建「读者」表

性别只能是「男」或「女」，用 `IN` 写。

#### HINTS

- `CONSTRAINT ck_读者_性别 CHECK (性别 IN ('男', '女'))`
- 性别用 `CHAR(3)`，因为一个汉字占 3 字节
- 完整写法：
  ```sql
  CREATE TABLE 读者 (
    借书证号   CHAR(8)      NOT NULL,
    姓名       VARCHAR2(20) NOT NULL,
    单位       VARCHAR2(60),
    性别       CHAR(3),
    地址       VARCHAR2(80),
    联系电话   VARCHAR2(20),
    身份证编号 VARCHAR2(18),
    CONSTRAINT pk_读者      PRIMARY KEY (借书证号),
    CONSTRAINT ck_读者_性别 CHECK (性别 IN ('男','女'))
  );
  ```

### 1.9 建「借阅」表（三个外键）

`借阅` 是核心表，同时指向 `读者`、`图书`、`罚款分类`。再加一条 CHECK 保证归还日期不早于借书日期。

#### HINTS

- 三个外键要分别写，名字别重复
- CHECK：`归还日期 IS NULL OR 归还日期 >= 借书日期`（没还的时候归还日期是空的，要放行）
- 完整写法：
  ```sql
  CREATE TABLE 借阅 (
    借阅流水号 NUMBER(6) NOT NULL,
    借书证号   CHAR(8)   NOT NULL,
    图书编号   CHAR(7)   NOT NULL,
    借书日期   DATE,
    归还日期   DATE,
    罚款分类号 NUMBER(1),
    备注       VARCHAR2(100),
    CONSTRAINT pk_借阅      PRIMARY KEY (借阅流水号),
    CONSTRAINT fk_借阅_读者 FOREIGN KEY (借书证号)   REFERENCES 读者(借书证号),
    CONSTRAINT fk_借阅_图书 FOREIGN KEY (图书编号)   REFERENCES 图书(图书编号),
    CONSTRAINT fk_借阅_罚款 FOREIGN KEY (罚款分类号) REFERENCES 罚款分类(罚款分类号),
    CONSTRAINT ck_借阅_日期 CHECK (归还日期 IS NULL OR 归还日期 >= 借书日期)
  );
  ```

### 1.10 建「预约」表

#### HINTS

- 预约时间要有默认值：`预约时间 DATE DEFAULT SYSDATE NOT NULL`
- 两个外键分别指向 `读者` 和 `书目`
- 完整写法：
  ```sql
  CREATE TABLE 预约 (
    预约流水号 NUMBER(6)    NOT NULL,
    借书证号   CHAR(8)      NOT NULL,
    ISBN       VARCHAR2(13) NOT NULL,
    预约时间   DATE         DEFAULT SYSDATE NOT NULL,
    CONSTRAINT pk_预约      PRIMARY KEY (预约流水号),
    CONSTRAINT fk_预约_读者 FOREIGN KEY (借书证号) REFERENCES 读者(借书证号),
    CONSTRAINT fk_预约_书目 FOREIGN KEY (ISBN)     REFERENCES 书目(ISBN)
  );
  ```

### 1.11 给 7 张表插入原始数据

指导书 3.1.4 第 7 步的表格数据。**插入顺序很重要**：先插被引用的表，再插引用它们的表。

顺序：`图书分类` → `罚款分类` → `书目` → `图书` → `读者` → `借阅` → `预约`

> ⚠️ 日期不能直接写字符串，要用 `TO_DATE('2010/09/19','yyyy/mm/dd')`。

#### HINTS

- 单行插入：`INSERT INTO 表名 (列1, 列2) VALUES (值1, 值2);`
- 7 张表的完整数据见仓库里的 `answers/00_基线.sql`，一共 27 条 INSERT，可以对照着抄
- 完整写法（节选，完整版对照 `answers/00_基线.sql`）：
  ```sql
  INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('100', '文学');
  INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('200', '科技');
  INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('300', '哲学');

  INSERT INTO 书目 (ISBN, 书名, 作者, 出版单位, 单价, 图书分类号)
  VALUES ('7040195836', '数据库系统概论', '王珊', '高等教育出版社', 39.00, '200');
  -- ……其余 26 条见 answers/00_基线.sql

  INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期)
  VALUES (1, '20081237', '3007071',
          TO_DATE('2010/09/19','yyyy/mm/dd'), TO_DATE('2010/09/20','yyyy/mm/dd'));
  ```

### 1.12 数据的增、删、改

`INSERT` 加数据、`UPDATE` 改数据、`DELETE` 删数据。三个动作都要真的影响数据。

- 插入分类 `'400'`，类名 `'艺术'`
- 把它改成 `'艺术设计'`
- 再删掉

#### HINTS

- `UPDATE 表名 SET 列 = 新值 WHERE 条件;`、`DELETE FROM 表名 WHERE 条件;`
- **删改一定要带 WHERE**，否则会动整张表
- 完整写法：
  ```sql
  INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('400', '艺术');
  UPDATE 图书分类 SET 类名 = '艺术设计' WHERE 图书分类号 = '400';
  DELETE FROM 图书分类 WHERE 图书分类号 = '400';
  ```

### 1.13 完整性约束扩展

指导书 3.1.5 要求给已有表补约束。用 `ALTER TABLE ... ADD CONSTRAINT`。

- 联系电话必须是 11 位数字
- 身份证编号必须是 18 位
- 是否借出只能是 `'是'` 或 `'否'`
- 借书日期不能为空（这个用 `MODIFY`，不是 CHECK）

#### HINTS

- 位数用 `LENGTH()`；11 位数字用 `REGEXP_LIKE(联系电话, '^[0-9]{11}$')` 更严格
- 改非空用 `ALTER TABLE 表名 MODIFY (列名 NOT NULL);`，不是加约束
- 完整写法：
  ```sql
  ALTER TABLE 读者 ADD CONSTRAINT ck_读者_电话
    CHECK (REGEXP_LIKE(联系电话, '^[0-9]{11}$'));
  ALTER TABLE 读者 ADD CONSTRAINT ck_读者_身份证
    CHECK (LENGTH(身份证编号) = 18);
  ALTER TABLE 图书 ADD CONSTRAINT ck_图书_借出
    CHECK (是否借出 IN ('是','否'));
  ALTER TABLE 借阅 MODIFY (借书日期 NOT NULL);
  ```


## 2. 数据查询

> 考试里 15 道查询题，我们一题一关。判题只看**结果集**，不看你怎么写——
> `JOIN`、子查询、`IN` 还是 `EXISTS`，只要结果对就算过。

从这一关开始，「答案」是一个 `SELECT` 语句。判题会把你写的 SQL 跑一遍，
再和标准答案的结果集逐行比对。

> 💡 结果集的**列顺序**要和题目要求一致；**行顺序**只有题目说「按 X 排序」时才校验。

### 2.1 查询「红楼梦」当前可借的图书

要同时满足两个条件：书名是「红楼梦」，且这本书没有借出去。

需要显示的列（按这个顺序）：`图书编号`、`ISBN`、`书名`、`作者`、`出版单位`、`单价`。
最后按 `图书编号` 排序。

「图书」表里有 `图书编号` 和 `是否借出`，「书目」表里有书名和价格，
所以要把两张表连起来——连接条件是 `图书.ISBN = 书目.ISBN`。

#### HINTS

- 用 `JOIN`（或 `,` 隐式连接）把 `图书` 和 `书目` 连起来，连接条件是两边的 `ISBN` 相等
- 骨架：`SELECT 列... FROM 图书 t JOIN 书目 b ON t.ISBN = b.ISBN WHERE 条件1 AND 条件2 ORDER BY t.图书编号`
- 完整写法：
  ```sql
  SELECT t.图书编号, b.ISBN, b.书名, b.作者, b.出版单位, b.单价
    FROM 图书 t JOIN 书目 b ON t.ISBN = b.ISBN
   WHERE b.书名 = '红楼梦' AND t.是否借出 = '否'
   ORDER BY t.图书编号;
  ```

### 2.2 高等教育出版社的书目，按单价降序

单表题。从 `书目` 里筛出 `出版单位 = '高等教育出版社'` 的行，按 `单价` 从高到低排。

需要显示的列：`ISBN`、`书名`、`作者`、`出版单位`、`单价`。

#### HINTS

- 只要一张表 `书目`，用 `WHERE 出版单位 = '高等教育出版社'`
- `ORDER BY 单价 DESC`，`DESC` 是降序（不写默认是 `ASC` 升序）
- 完整写法：
  ```sql
  SELECT ISBN, 书名, 作者, 出版单位, 单价
    FROM 书目
   WHERE 出版单位 = '高等教育出版社'
   ORDER BY 单价 DESC;
  ```

### 2.3 各出版社的最高单价、平均单价

分组统计题。按 `出版单位` 分组，每组算 `MAX(单价)` 和 `AVG(单价)`。

需要显示的列：`出版单位`、`最高单价`、`平均单价`。
平均单价保留 2 位小数，最后按平均单价降序。

> ⚠️ 用了聚合函数又选了普通列，就必须 `GROUP BY` 那个普通列。
> 这里 `出版单位` 是普通列，所以 `GROUP BY 出版单位`。

#### HINTS

- 聚合函数：`MAX(单价)`、`AVG(单价)`；保留小数用 `ROUND(值, 2)`
- 骨架：`SELECT 出版单位, MAX(单价), ROUND(AVG(单价),2) FROM 书目 GROUP BY 出版单位 ORDER BY ...`
- 完整写法：
  ```sql
  SELECT 出版单位,
         MAX(单价)           AS 最高单价,
         ROUND(AVG(单价), 2) AS 平均单价
    FROM 书目
   GROUP BY 出版单位
   ORDER BY 平均单价 DESC;
  ```

### 2.4 统计从未借过书的读者人数

只要一个数字：`读者` 表里，那些借书证号**从没出现在** `借阅` 表里的人有多少。

这题只返回一行一列（人数）。写法不唯一——`NOT EXISTS`、`NOT IN`、`LEFT JOIN ... IS NULL` 都对。

#### HINTS

- 用 `COUNT(*)` 数行，条件是「这个借书证号在借阅表里不存在」
- 骨架：`SELECT COUNT(*) FROM 读者 r WHERE NOT EXISTS (SELECT 1 FROM 借阅 l WHERE l.借书证号 = r.借书证号)`
- 完整写法（也接受 `NOT IN` 的等价写法）：
  ```sql
  SELECT COUNT(*)
    FROM 读者 r
   WHERE NOT EXISTS (SELECT 1 FROM 借阅 l WHERE l.借书证号 = r.借书证号);
  ```

### 2.5 借阅未还的读者和图书

四个表要连成一串：`借阅` → `读者`（拿姓名）、`借阅` → `图书`（拿图书编号）→ `书目`（拿书名）。

条件：`归还日期 IS NULL`（还没还）。

需要显示的列：`借书证号`、`姓名`、`图书编号`、`书名`、`借书日期`，
日期用 `TO_CHAR(借书日期, 'yyyy/mm/dd')` 格式化，最后按 `借书证号` 排序。

> ⚠️ `NULL` 不能用 `= NULL` 判断，必须用 `IS NULL`。这是 SQL 三值逻辑的经典坑。

#### HINTS

- 用 `IS NULL` 不是 `= NULL`；日期格式化用 `TO_CHAR(列, 'yyyy/mm/dd')`
- 骨架：`FROM 借阅 l JOIN 读者 r ON l.借书证号=r.借书证号 JOIN 图书 t ON l.图书编号=t.图书编号 JOIN 书目 b ON t.ISBN=b.ISBN WHERE l.归还日期 IS NULL`
- 完整写法：
  ```sql
  SELECT r.借书证号, r.姓名, t.图书编号, b.书名,
         TO_CHAR(l.借书日期, 'yyyy/mm/dd') AS 借书日期
    FROM 借阅 l
    JOIN 读者 r ON l.借书证号 = r.借书证号
    JOIN 图书 t ON l.图书编号 = t.图书编号
    JOIN 书目 b ON t.ISBN = b.ISBN
   WHERE l.归还日期 IS NULL
   ORDER BY r.借书证号;
  ```

### 2.6 统计「红楼梦」各版的藏书数量

按 ISBN 分组，数一数每个版本各有几册。注意用 `LEFT JOIN`：万一某个版本一本都没藏，也要显示成 0。

- 列：`ISBN`、`书名`、`册数`
- 按 `ISBN` 排序

#### HINTS

- 从 `书目` 出发 `LEFT JOIN 图书`，再 `COUNT(t.图书编号)`
- 骨架：`SELECT b.ISBN, b.书名, COUNT(t.图书编号) FROM 书目 b LEFT JOIN 图书 t ON b.ISBN=t.ISBN WHERE b.书名='红楼梦' GROUP BY b.ISBN, b.书名 ORDER BY b.ISBN`
- 完整写法：
  ```sql
  SELECT b.ISBN, b.书名, COUNT(t.图书编号) AS 册数
    FROM 书目 b LEFT JOIN 图书 t ON b.ISBN = t.ISBN
   WHERE b.书名 = '红楼梦'
   GROUP BY b.ISBN, b.书名
   ORDER BY b.ISBN;
  ```

### 2.7 查询借书证号 20061234 借阅未还的图书

比 2.5 窄一层：只看一个读者的。但拿书名还是要连 `图书` 和 `书目`。

#### HINTS

- 两个条件：`l.借书证号 = '20061234'`、`l.归还日期 IS NULL`
- 列只要 `图书编号` 和 `书名`，但仍需连表才拿得到书名
- 完整写法：
  ```sql
  SELECT t.图书编号, b.书名
    FROM 借阅 l
    JOIN 图书 t ON l.图书编号 = t.图书编号
    JOIN 书目 b ON t.ISBN = b.ISBN
   WHERE l.借书证号 = '20061234' AND l.归还日期 IS NULL;
  ```

### 2.8 查询借阅了两本及以上图书的读者

分组之后要按「组」筛选，不能用 `WHERE`——那是对行筛选。要用 `HAVING`。

#### HINTS

- `GROUP BY r.借书证号, r.姓名` 之后 `HAVING COUNT(*) >= 2`
- 写成 `WHERE COUNT(*) >= 2` 会报 ORA-00934（组函数不允许出现在 WHERE 里）
- 完整写法：
  ```sql
  SELECT r.借书证号, r.姓名, COUNT(*) AS 借阅次数
    FROM 读者 r JOIN 借阅 l ON r.借书证号 = l.借书证号
   GROUP BY r.借书证号, r.姓名
  HAVING COUNT(*) >= 2
   ORDER BY r.借书证号;
  ```

### 2.9 查询「王菲」的单位、所借书名和借阅日期

从 `读者` 出发一路连到 `书目`，四张表。

#### HINTS

- `读者 → 借阅 → 图书 → 书目`，四个 JOIN
- 筛选条件放在 `WHERE r.姓名 = '王菲'`，日期用 `TO_CHAR` 格式化
- 完整写法：
  ```sql
  SELECT r.单位, b.书名, TO_CHAR(l.借书日期, 'yyyy/mm/dd') AS 借书日期
    FROM 读者 r
    JOIN 借阅 l ON r.借书证号 = l.借书证号
    JOIN 图书 t ON l.图书编号 = t.图书编号
    JOIN 书目 b ON t.ISBN = b.ISBN
   WHERE r.姓名 = '王菲'
   ORDER BY l.借书日期;
  ```

### 2.10 查询每类图书的册数和平均单价

三张表：`图书分类 → 书目 → 图书`。注意「每类有多少册」要数 `图书`，如果某类一本书都没有，要用 `LEFT JOIN` 才不会整个消失。

#### HINTS

- `图书分类 JOIN 书目`（分类必有书目，内连接可以）、`LEFT JOIN 图书`（可能没藏）
- 平均单价从 `书目.单价` 算，不是从图书
- 完整写法：
  ```sql
  SELECT c.图书分类号, c.类名,
         COUNT(t.图书编号) AS 册数,
         ROUND(AVG(b.单价), 2) AS 平均单价
    FROM 图书分类 c
    JOIN 书目 b ON c.图书分类号 = b.图书分类号
    LEFT JOIN 图书 t ON b.ISBN = t.ISBN
   GROUP BY c.图书分类号, c.类名
   ORDER BY c.图书分类号;
  ```

### 2.11 统计参与借书的人数

「人数」不是「借阅次数」。同一个读者借了 3 次，只能算 1 个人。

#### HINTS

- 用 `COUNT(DISTINCT 借书证号)`
- 直接 `COUNT(*)` 数的是借阅条数，会多
- 完整写法：
  ```sql
  SELECT COUNT(DISTINCT 借书证号) FROM 借阅;
  ```

### 2.12 检索书名以「Internet」开头的图书

`LIKE` 里 `%` 代表任意多个字符。**放在结尾表示「以…开头」，放在两边表示「包含」**。

#### HINTS

- 以 Internet 开头：`LIKE 'Internet%'`
- 写成 `LIKE '%Internet%'` 会把「深入理解 Internet」这种中间含的也查出来
- 完整写法：
  ```sql
  SELECT 书名, 作者 FROM 书目
   WHERE 书名 LIKE 'Internet%'
   ORDER BY 书名;
  ```

### 2.13 查询各图书的罚款总数

借阅表里只有 `罚款分类号`（1/2/3），真正的金额在 `罚款分类.罚金` 里。连起来按图书求和。

#### HINTS

- `借阅 JOIN 罚款分类 ON l.罚款分类号 = f.罚款分类号`，然后 `GROUP BY l.图书编号`
- 用 `SUM(f.罚金)` 不是 `COUNT`
- 完整写法：
  ```sql
  SELECT l.图书编号, SUM(f.罚金) AS 罚款总数
    FROM 借阅 l JOIN 罚款分类 f ON l.罚款分类号 = f.罚款分类号
   GROUP BY l.图书编号
   ORDER BY l.图书编号;
  ```

### 2.14 查询借阅及罚款分类信息（左外连接）

要列出**全部**借阅记录。没罚款的记录也要在，罚款两列留空。

这就是 `LEFT JOIN` 和 `INNER JOIN` 的区别：`LEFT JOIN` 保留左表全部行。

#### HINTS

- `借阅 l LEFT JOIN 罚款分类 f ON l.罚款分类号 = f.罚款分类号`
- 用普通 `JOIN` 会只剩有罚款的 2 行（基线里 6 条借阅只有 2 条有罚款）
- 完整写法：
  ```sql
  SELECT l.借阅流水号, l.借书证号, l.图书编号, f.罚款名称, f.罚金
    FROM 借阅 l LEFT JOIN 罚款分类 f ON l.罚款分类号 = f.罚款分类号
   ORDER BY l.借阅流水号;
  ```

### 2.15 查询借阅了所有「文学」类书目的读者

「全部」型问题，用**双重 NOT EXISTS**：不存在一本文学类的书，这个读者没借过。

#### HINTS

- 外层：遍历读者；中层：遍历文学类书目；内层：看这个读者借没借过这本书
- 两个 `NOT EXISTS` 套起来，就是「没有一本漏借」
- 完整写法：
  ```sql
  SELECT r.姓名, r.单位
    FROM 读者 r
   WHERE NOT EXISTS (
           SELECT 1 FROM 书目 b
            WHERE b.图书分类号 = '100'
              AND NOT EXISTS (
                  SELECT 1 FROM 借阅 l
                    JOIN 图书 t ON l.图书编号 = t.图书编号
                   WHERE l.借书证号 = r.借书证号 AND t.ISBN = b.ISBN))
   ORDER BY r.姓名;
  ```


## 3. 存储过程与触发器

> 前面两章写的 SQL 都是一次性执行的。这一章开始写「存进数据库、以后随时调用」的程序。

Oracle 的存储过程用 PL/SQL 写。和普通 SQL 最大的区别：**PL/SQL 块用单独一行的 `/` 结束，不是分号**。
块内部每条语句才用分号。

### 3.1 建「借书」存储过程

存储过程是一段编译好、存在数据库里的 PL/SQL 代码，调用时只要写名字。

建一个叫 `借书` 的过程，三个输入参数：`借阅流水号`、`借书证号`、`图书编号`。
它要做两件事：往 `借阅` 表插一行（借书日期取 `SYSDATE`），再把 `图书` 表里这本书的
`是否借出` 改成 `'是'`。

参数类型建议用 `表名.列名%TYPE`，比如 `借阅.借书证号%TYPE`——这样列的类型变了，过程自动跟着变。

#### HINTS

- 语法：`CREATE OR REPLACE PROCEDURE 过程名 (参数1 类型, 参数2 类型, ...) IS BEGIN ... END; /`
- 骨架：`CREATE OR REPLACE PROCEDURE 借书 (p_流水号 借阅.借阅流水号%TYPE, p_证号 借阅.借书证号%TYPE, p_编号 借阅.图书编号%TYPE) IS BEGIN INSERT INTO 借阅 (...) VALUES (...); UPDATE 图书 SET 是否借出='是' WHERE 图书编号=p_编号; END; /`
- 完整写法：
  ```sql
  CREATE OR REPLACE PROCEDURE 借书 (
    p_借阅流水号 借阅.借阅流水号%TYPE,
    p_借书证号   借阅.借书证号%TYPE,
    p_图书编号   借阅.图书编号%TYPE
  ) IS
  BEGIN
    INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
    VALUES (p_借阅流水号, p_借书证号, p_图书编号, SYSDATE);

    UPDATE 图书 SET 是否借出 = '是' WHERE 图书编号 = p_图书编号;
  END;
  /
  ```

### 3.2 调用「借书」存储过程

过程建好了要调用才会执行。用 `BEGIN 过程名(参数...); END; /`。

借出这本书：流水号 `100`，借书证号 `20051001`，图书编号 `1005050`。

#### HINTS

- 调用也是 PL/SQL 块，所以同样要用单独的 `/` 结束
- 骨架：`BEGIN 借书(100, '20051001', '1005050'); END; /`
- 完整写法：
  ```sql
  BEGIN
    借书(100, '20051001', '1005050');
  END;
  /
  ```

### 3.3 建「预约」存储过程

预约的业务规则：**只有当这个 ISBN 的书全部借出去了，才允许预约**；还有可借的就要拒绝。

建一个叫 `图书预约` 的过程（注意：**不能叫 `预约`，会和同名表冲突报 ORA-00955**），
三个参数：预约流水号、借书证号、ISBN。

先数一下这个 ISBN 还有几本没借出，大于 0 就用 `RAISE_APPLICATION_ERROR` 抛错，
等于 0 才插预约记录。

#### HINTS

- 用 `SELECT COUNT(*) INTO 变量 FROM 图书 WHERE ISBN=p_ISBN AND 是否借出='否'` 统计可借数
- 拒绝用 `IF 可借数 > 0 THEN RAISE_APPLICATION_ERROR(-20001, '该书目有可借图书，请查找'); END IF;`
- 完整写法：
  ```sql
  CREATE OR REPLACE PROCEDURE 图书预约 (
    p_预约流水号 预约.预约流水号%TYPE,
    p_借书证号   预约.借书证号%TYPE,
    p_ISBN       预约.ISBN%TYPE
  ) IS
    v_可借数 NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_可借数
      FROM 图书
     WHERE ISBN = p_ISBN AND 是否借出 = '否';

    IF v_可借数 > 0 THEN
      RAISE_APPLICATION_ERROR(-20001, '该书目有可借图书，请查找');
    END IF;

    INSERT INTO 预约 (预约流水号, 借书证号, ISBN, 预约时间)
    VALUES (p_预约流水号, p_借书证号, p_ISBN, SYSDATE);
  END;
  /
  ```

### 3.4 建「还书」存储过程

还书是借书的逆操作：补上归还日期、记下罚款分类、把图书改回可借。

建一个叫 `还书` 的过程，三个参数：借书证号、图书编号、罚款分类号。
一条 `UPDATE` 可以同时改 `归还日期` 和 `罚款分类号` 两个字段。

#### HINTS

- `UPDATE 借阅 SET 归还日期=SYSDATE, 罚款分类号=p_罚款 WHERE ... AND 归还日期 IS NULL`
- 别忘了 `WHERE` 里加 `归还日期 IS NULL`，只改还没还的那条
- 完整写法：
  ```sql
  CREATE OR REPLACE PROCEDURE 还书 (
    p_借书证号   借阅.借书证号%TYPE,
    p_图书编号   借阅.图书编号%TYPE,
    p_罚款分类号 借阅.罚款分类号%TYPE
  ) IS
  BEGIN
    UPDATE 借阅
       SET 归还日期 = SYSDATE,
           罚款分类号 = p_罚款分类号
     WHERE 借书证号 = p_借书证号
       AND 图书编号 = p_图书编号
       AND 归还日期 IS NULL;

    UPDATE 图书 SET 是否借出 = '否' WHERE 图书编号 = p_图书编号;
  END;
  /
  ```

### 3.5 建序列，让流水号自动递增

现在借书要手写流水号，容易撞号。Oracle 用**序列**（SEQUENCE）生成自增数字。

建一个叫 `序列_借阅` 的序列，从 100 开始，每次加 1。用的时候写 `序列_借阅.NEXTVAL`。

#### HINTS

- 语法：`CREATE SEQUENCE 序列名 START WITH 起始值 INCREMENT BY 步长;`
- 注意是 `CREATE SEQUENCE`，不需要 `OR REPLACE`，也没有 `BEGIN/END`
- 完整写法：
  ```sql
  CREATE SEQUENCE 序列_借阅 START WITH 100 INCREMENT BY 1;
  ```

### 3.6 建「简化借书」存储过程（2 个参数）

有了序列，流水号就不用传了。建一个叫 `简化借书` 的过程，只要两个参数：
借书证号、图书编号。主体**只有一条 INSERT**，流水号用 `序列_借阅.NEXTVAL`。

这里先不要改 `图书.是否借出`——那是下一关触发器的活。

#### HINTS

- `VALUES (序列_借阅.NEXTVAL, p_借书证号, p_图书编号, SYSDATE)`
- 只有一条 INSERT，所以不需要 `UPDATE 图书`
- 完整写法：
  ```sql
  CREATE OR REPLACE PROCEDURE 简化借书 (
    p_借书证号 借阅.借书证号%TYPE,
    p_图书编号 借阅.图书编号%TYPE
  ) IS
  BEGIN
    INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期)
    VALUES (序列_借阅.NEXTVAL, p_借书证号, p_图书编号, SYSDATE);
  END;
  /
  ```

### 3.7 建触发器：借阅表一插入就自动标记图书

触发器是「表上发生某种操作时自动执行」的代码。它比存储过程更省事——**不用调用，插入就触发**。

建一个行级触发器 `触发器_借书`，挂在 `借阅` 表上：每当插入一行，就把对应图书标成已借出。

关键概念：`:NEW.列名` —— 在行级 INSERT 触发器里，它代表刚插入那一行的值。

#### HINTS

- 语法：`CREATE OR REPLACE TRIGGER 名 AFTER INSERT ON 表 FOR EACH ROW BEGIN ... END; /`
- `FOR EACH ROW` 不能少，否则只对整个表执行一次，拿不到 `:NEW`
- 完整写法：
  ```sql
  CREATE OR REPLACE TRIGGER 触发器_借书
  AFTER INSERT ON 借阅
  FOR EACH ROW
  BEGIN
    UPDATE 图书 SET 是否借出 = '是' WHERE 图书编号 = :NEW.图书编号;
  END;
  /
  ```

### 3.8 建「图书丢失」存储过程

书丢了：这条借阅记录要记成罚款分类 3（丢失）、备注写「丢失」；书本身仍然是「已借出」状态。

建一个叫 `图书丢失` 的过程，两个参数：借书证号、图书编号。一条 UPDATE 就能同时改两个字段。

#### HINTS

- `UPDATE 借阅 SET 罚款分类号=3, 备注='丢失' WHERE ... AND 归还日期 IS NULL`
- 不要再改 `图书.是否借出`，它本来就该是 '是'
- 完整写法：
  ```sql
  CREATE OR REPLACE PROCEDURE 图书丢失 (
    p_借书证号 借阅.借书证号%TYPE,
    p_图书编号 借阅.图书编号%TYPE
  ) IS
  BEGIN
    UPDATE 借阅
       SET 罚款分类号 = 3,
           备注 = '丢失'
     WHERE 借书证号 = p_借书证号
       AND 图书编号 = p_图书编号
       AND 归还日期 IS NULL;
  END;
  /
  ```
