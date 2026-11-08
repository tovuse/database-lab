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
