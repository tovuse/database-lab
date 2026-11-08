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
