# 数据库原理及应用 · 实验课

> 在浏览器里操作 Oracle 数据库，写完 SQL 保存就自动判题。

## 1. 准备环境与建表

> 先确认能连上数据库、建出自己的用户，然后把 7 张表一张张建起来，按依赖顺序装入指导书的数据，最后练增删改、补完整性约束。

本关一共 25 小步，每一步只做**一个动作**：建一张表、插一张表的数据、加一条约束。
写完保存就判题，通过后再往下走——不要一次把整张表的数据都塞进同一个文件。

### 1.1 查出自己的用户名

数据库里的每一件事都以「你是谁」为前提。Oracle 用 `USER` 这个伪列告诉你当前登录的用户名。

先在终端里连上课程库：

```bash
sqlplus -S COURSE/course@//localhost:1521/FREEPDB1
```

然后在 `sql/1.1.sql` 里写出查询语句，保存即可判题。

`dual` 是 Oracle 内置的单行单列表，专门用来测试表达式。

#### HINTS

- 用 `SELECT` 语句，从 `dual` 表里查 `USER`
- 语法是 `SELECT 列名 FROM 表名;`，这里的「列名」就是 `USER`，「表名」就是 `dual`
- 完整写法：`SELECT USER FROM dual;`

### 1.2 创建你自己的数据库用户

真实项目里不会所有人都用 `SYSTEM` 干活。每个应用有自己的 schema 用户，权限被限制在自己的一亩三分地。

在 `sql/1.2.sql` 里：

1. 用 `CREATE USER` 建一个用户，用户名是 `S` + 你的 8 位学号
2. 用 `GRANT` 给它 `CONNECT` 和 `RESOURCE` 两个角色

#### HINTS

- 建用户用 `CREATE USER 用户名 IDENTIFIED BY 密码;`
- 授权用 `GRANT 角色名 TO 用户名;`，两个角色可以写在一句里用逗号分开
- 完整写法（把 S20231234 换成你自己的学号）：`CREATE USER S20231234 IDENTIFIED BY "Course#2024";` 换行再写 `GRANT CONNECT, RESOURCE TO S20231234;`

### 1.3 建「图书分类」表

建表是 DDL（数据定义语言）。`CREATE TABLE` 一次定义一个关系：列名、类型、是否允许为空。

Oracle 常用类型：

| 类型 | 用途 |
|---|---|
| `CHAR(n)` | 定长字符串，不够会用空格补齐 |
| `VARCHAR2(n)` | 变长字符串 |
| `NUMBER(p,s)` | 数字，p 位有效数字，s 位小数 |
| `DATE` | 日期时间 |

图书分类只有两个属性。在 `sql/1.3.sql` 里建这张表：

- `图书分类号` — `CHAR(3)`，不能为空
- `类名` — `VARCHAR2(30)`，不能为空

> ⚠️ 本库字符集是 `AL32UTF8`，一个汉字占 **3 字节**。`CHAR(1)` 存不下一个汉字，
> 会报 `ORA-01401`。所以后面存「是/否」要用 `CHAR(3)` 或 `VARCHAR2(3)`。

#### HINTS

- 用 `CREATE TABLE 表名 ( 列名 类型 NOT NULL, 列名 类型 NOT NULL );`
- 括号里逗号分隔，最后一行不要逗号；整条语句以分号结束
- 完整写法：`CREATE TABLE 图书分类 (图书分类号 CHAR(3) NOT NULL, 类名 VARCHAR2(30) NOT NULL);`

### 1.4 给「图书分类」加主键

主键（`PRIMARY KEY`）保证这一列的值唯一且不能为空。分类号天然唯一，所以它做主键。

在 `sql/1.4.sql` 里，用 `ALTER TABLE` 给已建好的表追加主键约束。

#### HINTS

- 用 `ALTER TABLE 表名 ADD CONSTRAINT 约束名 PRIMARY KEY (列名);`
- 约束名自己起，建议 `pk_图书分类` 这种一眼能看懂的名字；括号里是**列名**不是类型
- 完整写法：`ALTER TABLE 图书分类 ADD CONSTRAINT pk_图书分类 PRIMARY KEY (图书分类号);`

### 1.5 建「罚款分类」表

罚款分类要加一条 `CHECK` 约束：罚金必须大于 0。`CHECK` 写在括号里，条件不满足时插入会被拒绝。

- `罚款分类号` `NUMBER(1)`，主键
- `罚款名称` `VARCHAR2(20)`，不能为空
- `罚金` `NUMBER(6,2)`，不能为空，且 `CHECK (罚金 > 0)`

#### HINTS

- 表级约束写在列定义后面，用逗号隔开：`CONSTRAINT 约束名 CHECK (条件)`
- 骨架：`CREATE TABLE 罚款分类 (罚款分类号 NUMBER(1) NOT NULL, 罚款名称 VARCHAR2(20) NOT NULL, 罚金 NUMBER(6,2) NOT NULL, CONSTRAINT pk_罚款分类 PRIMARY KEY (罚款分类号), CONSTRAINT ck_罚款金额 CHECK (罚金 > 0));`
- 完整写法：`CREATE TABLE 罚款分类 (罚款分类号 NUMBER(1) NOT NULL, 罚款名称 VARCHAR2(20) NOT NULL, 罚金 NUMBER(6,2) NOT NULL, CONSTRAINT pk_罚款分类 PRIMARY KEY (罚款分类号), CONSTRAINT ck_罚款金额 CHECK (罚金 > 0));`

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
- 完整写法：`CREATE TABLE 书目 (ISBN VARCHAR2(13) NOT NULL, 书名 VARCHAR2(60) NOT NULL, 作者 VARCHAR2(30), 出版单位 VARCHAR2(50), 单价 NUMBER(7,2), 图书分类号 CHAR(3) NOT NULL, CONSTRAINT pk_书目 PRIMARY KEY (ISBN), CONSTRAINT fk_书目_分类 FOREIGN KEY (图书分类号) REFERENCES 图书分类(图书分类号), CONSTRAINT ck_书目_单价 CHECK (单价 >= 0));`

### 1.7 建「图书」表

`图书` 指向 `书目`。另外 `是否借出` 要有**默认值** `'否'`——插入时不写这一列，自动填这个值。

这一关只写 `CREATE TABLE`，不要发 INSERT。`DEFAULT '否'` 是否真的生效，下一关插数据时验证。

#### HINTS

- 默认值写法：`是否借出 CHAR(3) DEFAULT '否' NOT NULL`
- 注意 `CHAR(3)` 不是 `CHAR(1)`：一个汉字占 3 字节
- 完整写法：`CREATE TABLE 图书 (图书编号 CHAR(7) NOT NULL, ISBN VARCHAR2(13) NOT NULL, 是否借出 CHAR(3) DEFAULT '否' NOT NULL, 备注 VARCHAR2(100), CONSTRAINT pk_图书 PRIMARY KEY (图书编号), CONSTRAINT fk_图书_书目 FOREIGN KEY (ISBN) REFERENCES 书目(ISBN));`

### 1.8 插入一本测试图书（验证默认值）

表建好了，先插一条记录，看看 `DEFAULT '否'` 到底管不管用。

在 `sql/1.8.sql` 里插入一条图书记录：

- `图书编号` 写 `'9999999'`
- `ISBN` 写 `'7040195836'`（《数据库系统概论》）
- **不要写 `是否借出`**——留空才会用默认值

判题会先准备好这条 ISBN 对应的书目记录，再执行你的 INSERT，最后检查这条书的 `是否借出` 是不是 `'否'`。

#### HINTS

- 单行插入：`INSERT INTO 表名 (列名1, 列名2) VALUES (值1, 值2);`
- 只写 `图书编号` 和 `ISBN` 两列；`是否借出` 不写，Oracle 才会填默认值
- 完整写法：`INSERT INTO 图书 (图书编号, ISBN) VALUES ('9999999', '7040195836');`

### 1.9 建「读者」表

性别只能是「男」或「女」，用 `IN` 写。

#### HINTS

- `CONSTRAINT ck_读者_性别 CHECK (性别 IN ('男', '女'))`
- 性别用 `CHAR(3)`，因为一个汉字占 3 字节
- 完整写法：`CREATE TABLE 读者 (借书证号 CHAR(8) NOT NULL, 姓名 VARCHAR2(20) NOT NULL, 单位 VARCHAR2(60), 性别 CHAR(3), 地址 VARCHAR2(80), 联系电话 VARCHAR2(20), 身份证编号 VARCHAR2(18), CONSTRAINT pk_读者 PRIMARY KEY (借书证号), CONSTRAINT ck_读者_性别 CHECK (性别 IN ('男','女')));`

### 1.10 建「借阅」表（三个外键）

`借阅` 是核心表，同时指向 `读者`、`图书`、`罚款分类`。再加一条 CHECK 保证归还日期不早于借书日期。

> ⚠️ 建表前这三张被引用的表必须都已存在且有主键。

#### HINTS

- 三个外键要分别写，名字别重复
- CHECK：`归还日期 IS NULL OR 归还日期 >= 借书日期`（没还的时候归还日期是空的，要放行）
- 完整写法：`CREATE TABLE 借阅 (借阅流水号 NUMBER(6) NOT NULL, 借书证号 CHAR(8) NOT NULL, 图书编号 CHAR(7) NOT NULL, 借书日期 DATE, 归还日期 DATE, 罚款分类号 NUMBER(1), 备注 VARCHAR2(100), CONSTRAINT pk_借阅 PRIMARY KEY (借阅流水号), CONSTRAINT fk_借阅_读者 FOREIGN KEY (借书证号) REFERENCES 读者(借书证号), CONSTRAINT fk_借阅_图书 FOREIGN KEY (图书编号) REFERENCES 图书(图书编号), CONSTRAINT fk_借阅_罚款 FOREIGN KEY (罚款分类号) REFERENCES 罚款分类(罚款分类号), CONSTRAINT ck_借阅_日期 CHECK (归还日期 IS NULL OR 归还日期 >= 借书日期));`

### 1.11 建「预约」表

`预约` 记录「谁想借哪本书」，指向 `读者` 和 `书目`。

#### HINTS

- 预约时间要有默认值：`预约时间 DATE DEFAULT SYSDATE NOT NULL`
- 两个外键分别指向 `读者` 和 `书目`
- 完整写法：`CREATE TABLE 预约 (预约流水号 NUMBER(6) NOT NULL, 借书证号 CHAR(8) NOT NULL, ISBN VARCHAR2(13) NOT NULL, 预约时间 DATE DEFAULT SYSDATE NOT NULL, CONSTRAINT pk_预约 PRIMARY KEY (预约流水号), CONSTRAINT fk_预约_读者 FOREIGN KEY (借书证号) REFERENCES 读者(借书证号), CONSTRAINT fk_预约_书目 FOREIGN KEY (ISBN) REFERENCES 书目(ISBN));`

### 1.12 插入「图书分类」数据（3 行）

7 张表都建好了，现在装指导书 3.1.4 第 7 步的原始数据。

**插入顺序很重要**：先插被引用的表，再插引用它的表。顺序是：
`图书分类` → `罚款分类` → `书目` → `图书` → `读者` → `借阅` → `预约`

这一关只插 `图书分类`，一共 3 行：

| 图书分类号 | 类名 |
|---|---|
| 100 | 文学 |
| 200 | 科技 |
| 300 | 哲学 |

#### HINTS

- 一行数据一条 `INSERT`，字符串值要用单引号括起来
- 骨架：`INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('100', '文学');`，照这个写 3 条，只换值
- 完整写法：`INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('100', '文学');` `INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('200', '科技');` `INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('300', '哲学');`

### 1.13 插入「罚款分类」数据（3 行）

第 2 张表。分类号是 `NUMBER(1)`，所以**不要加引号**；罚金也是数字。

| 罚款分类号 | 罚款名称 | 罚金 |
|---|---|---|
| 1 | 延期 | 10 |
| 2 | 损坏 | 20 |
| 3 | 丢失 | 50 |

#### HINTS

- 数字列直接写数字，不要加单引号：`VALUES (1, '延期', 10)`
- 骨架：`INSERT INTO 罚款分类 (罚款分类号, 罚款名称, 罚金) VALUES (1, '延期', 10);`
- 完整写法：`INSERT INTO 罚款分类 (罚款分类号, 罚款名称, 罚金) VALUES (1, '延期', 10);` `INSERT INTO 罚款分类 (罚款分类号, 罚款名称, 罚金) VALUES (2, '损坏', 20);` `INSERT INTO 罚款分类 (罚款分类号, 罚款名称, 罚金) VALUES (3, '丢失', 50);`

### 1.14 插入「书目」数据（4 行）

`书目` 有外键指向 `图书分类`，所以上一关的 3 个分类号必须已经存在。

| ISBN | 书名 | 作者 | 出版单位 | 单价 | 图书分类号 |
|---|---|---|---|---|---|
| 7040195836 | 数据库系统概论 | 王珊 | 高等教育出版社 | 39.00 | 200 |
| 9787508040110 | 红楼梦 | 曹雪芹 | 人民出版社 | 20.00 | 100 |
| 9787506336239 | 红楼梦 | 曹雪芹 | 作家出版社 | 34.30 | 100 |
| 9787010073750 | 心学之路 | 张立文 | 人民出版社 | 33.80 | 300 |

#### HINTS

- 6 个列名和 6 个值要一一对应；单价是数字不用引号，分类号是 `CHAR(3)` 要加引号
- 骨架：`INSERT INTO 书目 (ISBN, 书名, 作者, 出版单位, 单价, 图书分类号) VALUES ('7040195836', '数据库系统概论', '王珊', '高等教育出版社', 39.00, '200');`
- 完整写法：`INSERT INTO 书目 (ISBN, 书名, 作者, 出版单位, 单价, 图书分类号) VALUES ('7040195836', '数据库系统概论', '王珊', '高等教育出版社', 39.00, '200');` `INSERT INTO 书目 (ISBN, 书名, 作者, 出版单位, 单价, 图书分类号) VALUES ('9787508040110', '红楼梦', '曹雪芹', '人民出版社', 20.00, '100');` `INSERT INTO 书目 (ISBN, 书名, 作者, 出版单位, 单价, 图书分类号) VALUES ('9787506336239', '红楼梦', '曹雪芹', '作家出版社', 34.30, '100');` `INSERT INTO 书目 (ISBN, 书名, 作者, 出版单位, 单价, 图书分类号) VALUES ('9787010073750', '心学之路', '张立文', '人民出版社', 33.80, '300');`

### 1.15 插入「图书」数据（5 行）

`图书` 的 `ISBN` 必须能在 `书目` 里找到。这里 `是否借出` 的数据是**明确给出的**，所以要把这一列写出来（默认值只在省略该列时生效）。

| 图书编号 | ISBN | 是否借出 |
|---|---|---|
| 2001231 | 7040195836 | 否 |
| 2001232 | 7040195836 | 是 |
| 1005050 | 9787506336239 | 否 |
| 1005063 | 9787508040110 | 是 |
| 3007071 | 9787010073750 | 是 |

`备注` 这一列这些数据里都是空的，可以不写。

#### HINTS

- 只写 3 列：`图书编号`、`ISBN`、`是否借出`；`备注` 留空不写
- 骨架：`INSERT INTO 图书 (图书编号, ISBN, 是否借出) VALUES ('2001231', '7040195836', '否');`
- 完整写法：`INSERT INTO 图书 (图书编号, ISBN, 是否借出) VALUES ('2001231', '7040195836', '否');` `INSERT INTO 图书 (图书编号, ISBN, 是否借出) VALUES ('2001232', '7040195836', '是');` `INSERT INTO 图书 (图书编号, ISBN, 是否借出) VALUES ('1005050', '9787506336239', '否');` `INSERT INTO 图书 (图书编号, ISBN, 是否借出) VALUES ('1005063', '9787508040110', '是');` `INSERT INTO 图书 (图书编号, ISBN, 是否借出) VALUES ('3007071', '9787010073750', '是');`

### 1.16 插入「读者」数据（5 行）

7 列全都要写。注意这几列的长度：`借书证号` 8 位、`联系电话` 11 位、`身份证编号` 18 位——下一关还要给它们加约束。

| 借书证号 | 姓名 | 单位 | 性别 | 地址 | 联系电话 | 身份证编号 |
|---|---|---|---|---|---|---|
| 20051001 | 王菲 | 四川绵阳西科大计算机学院 | 女 | 四川绵阳涪城区青龙大道中段59号 | 13981112345 | 510703199001011237 |
| 20062001 | 张江 | 四川绵阳中心医院 | 男 | 四川绵阳市涪城区卫生巷12号 | 13890123456 | 510703199002022341 |
| 20061234 | 郭敬明 | 四川江油305 | 男 | 四川江油市中坝镇解放路88号 | 13678123457 | 510781199003033455 |
| 20071235 | 李晓明 | 四川成都工商银行 | 男 | 四川成都市锦江区红星路二段45号 | 13908123458 | 510104199004044564 |
| 20081237 | 赵鑫 | 四川广元广元中学 | 女 | 四川广元市利州区嘉陵路10号 | 13508123459 | 510802199005055674 |

#### HINTS

- 7 个列名按上面的表头顺序写，字符串值都要加单引号
- 骨架：`INSERT INTO 读者 (借书证号, 姓名, 单位, 性别, 地址, 联系电话, 身份证编号) VALUES ('20051001', '王菲', '四川绵阳西科大计算机学院', '女', '四川绵阳涪城区青龙大道中段59号', '13981112345', '510703199001011237');`
- 完整写法（5 条，照抄后核对一下每行的 7 个值）：`INSERT INTO 读者 (借书证号, 姓名, 单位, 性别, 地址, 联系电话, 身份证编号) VALUES ('20051001','王菲','四川绵阳西科大计算机学院','女','四川绵阳涪城区青龙大道中段59号','13981112345','510703199001011237');` `INSERT INTO 读者 (借书证号, 姓名, 单位, 性别, 地址, 联系电话, 身份证编号) VALUES ('20062001','张江','四川绵阳中心医院','男','四川绵阳市涪城区卫生巷12号','13890123456','510703199002022341');` `INSERT INTO 读者 (借书证号, 姓名, 单位, 性别, 地址, 联系电话, 身份证编号) VALUES ('20061234','郭敬明','四川江油305','男','四川江油市中坝镇解放路88号','13678123457','510781199003033455');` `INSERT INTO 读者 (借书证号, 姓名, 单位, 性别, 地址, 联系电话, 身份证编号) VALUES ('20071235','李晓明','四川成都工商银行','男','四川成都市锦江区红星路二段45号','13908123458','510104199004044564');` `INSERT INTO 读者 (借书证号, 姓名, 单位, 性别, 地址, 联系电话, 身份证编号) VALUES ('20081237','赵鑫','四川广元广元中学','女','四川广元市利州区嘉陵路10号','13508123459','510802199005055674');`

### 1.17 插入「借阅」数据（6 行）

`借阅` 的三个外键分别指向读者、图书、罚款分类，所以前面几张表的数据必须先插完。

日期**不能直接写字符串**，要用 `TO_DATE('2010/09/19','yyyy/mm/dd')`。没归还的书`归还日期`写 `NULL`；没罚款的`罚款分类号`也写 `NULL`。

| 借阅流水号 | 借书证号 | 图书编号 | 借书日期 | 归还日期 | 罚款分类号 |
|---|---|---|---|---|---|
| 1 | 20081237 | 3007071 | 2010/09/19 | 2010/09/20 | NULL |
| 2 | 20071235 | 1005063 | 2010/10/20 | 2011/02/20 | 1 |
| 3 | 20071235 | 2001232 | 2011/09/01 | NULL | NULL |
| 4 | 20061234 | 1005063 | 2011/09/20 | NULL | NULL |
| 5 | 20051001 | 3007071 | 2011/09/10 | NULL | NULL |
| 6 | 20071235 | 1005050 | 2011/10/20 | 2012/02/20 | 1 |

#### HINTS

- 日期用 `TO_DATE('2010/09/19','yyyy/mm/dd')`；空值写 `NULL`
- 骨架：`INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号) VALUES (1, '20081237', '3007071', TO_DATE('2010/09/19','yyyy/mm/dd'), TO_DATE('2010/09/20','yyyy/mm/dd'), NULL);`
- 完整写法（6 条，注意没还的书和没罚款的列写 `NULL`）：`INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号) VALUES (1,'20081237','3007071',TO_DATE('2010/09/19','yyyy/mm/dd'),TO_DATE('2010/09/20','yyyy/mm/dd'),NULL);` `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号) VALUES (2,'20071235','1005063',TO_DATE('2010/10/20','yyyy/mm/dd'),TO_DATE('2011/02/20','yyyy/mm/dd'),1);` `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号) VALUES (3,'20071235','2001232',TO_DATE('2011/09/01','yyyy/mm/dd'),NULL,NULL);` `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号) VALUES (4,'20061234','1005063',TO_DATE('2011/09/20','yyyy/mm/dd'),NULL,NULL);` `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号) VALUES (5,'20051001','3007071',TO_DATE('2011/09/10','yyyy/mm/dd'),NULL,NULL);` `INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期, 归还日期, 罚款分类号) VALUES (6,'20071235','1005050',TO_DATE('2011/10/20','yyyy/mm/dd'),TO_DATE('2012/02/20','yyyy/mm/dd'),1);`

### 1.18 插入「预约」数据（1 行）

最后一张表，只有 1 行。`预约时间` 虽然有 `DEFAULT SYSDATE`，但指导书给的是固定日期，所以这里要显式写出来。

| 预约流水号 | 借书证号 | ISBN | 预约时间 |
|---|---|---|---|
| 1 | 20081237 | 9787508040110 | 2011/09/11 |

#### HINTS

- 4 个列名和 4 个值一一对应；日期用 `TO_DATE('2011/09/11','yyyy/mm/dd')`
- 骨架：`INSERT INTO 预约 (预约流水号, 借书证号, ISBN, 预约时间) VALUES (1, '20081237', '9787508040110', TO_DATE('2011/09/11','yyyy/mm/dd'));`
- 完整写法：`INSERT INTO 预约 (预约流水号, 借书证号, ISBN, 预约时间) VALUES (1, '20081237', '9787508040110', TO_DATE('2011/09/11','yyyy/mm/dd'));`

### 1.19 增：向「图书分类」插入一行

数据装完了，下面练 `INSERT` / `UPDATE` / `DELETE` 三个动作。每关只做一个。

这一关先插一行新分类：分类号 `'400'`，类名 `'艺术'`。只写这一条 `INSERT`。

#### HINTS

- 和前面插数据一样：`INSERT INTO 表名 (列名...) VALUES (值...)`
- 骨架：`INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('400', '艺术');`
- 完整写法：`INSERT INTO 图书分类 (图书分类号, 类名) VALUES ('400', '艺术');`

### 1.20 改：把分类 400 的类名改成「艺术设计」

上一关插入的分类现在叫「艺术」，用 `UPDATE` 把类名改成「艺术设计」。

判题会先重放你上一关的 INSERT，再执行这一关的 `UPDATE`，所以文件里**只写 UPDATE**。

#### HINTS

- 语法：`UPDATE 表名 SET 列 = 新值 WHERE 条件;`
- 不写 `WHERE` 会改到整张表，所以条件一定要写 `WHERE 图书分类号 = '400'`
- 完整写法：`UPDATE 图书分类 SET 类名 = '艺术设计' WHERE 图书分类号 = '400';`

### 1.21 删：删掉分类 400

最后用 `DELETE` 把这行删掉。判题会先重放前两关的 INSERT 和 UPDATE，只执行你的 `DELETE`。

#### HINTS

- 语法：`DELETE FROM 表名 WHERE 条件;`
- **DELETE 一定要带 WHERE**，否则整张表的数据都会被删光
- 完整写法：`DELETE FROM 图书分类 WHERE 图书分类号 = '400';`

### 1.22 给「读者」的电话加 CHECK 约束（11 位数字）

指导书 3.1.5 要求给已有表补完整性约束。约束加在已有表上，用 `ALTER TABLE ... ADD CONSTRAINT`。

第一条：`联系电话` 必须是 **11 位、而且每一位都是数字**。用 `REGEXP_LIKE(联系电话, '^[0-9]{11}$')` 一次把两个条件都表达清楚——`{11}` 限长度，`[0-9]` 限只能是数字。

> ⚠️ 加约束时 Oracle 会检查已有 5 条读者数据，全都要满足才能加成功，否则报 `ORA-02293`。基线里的电话都是 11 位，放心加。

#### HINTS

- 语法：`ALTER TABLE 表名 ADD CONSTRAINT 约束名 CHECK (条件);`
- 条件用正则：`REGEXP_LIKE(联系电话, '^[0-9]{11}$')`，`^` 开头 `$` 结尾，`{11}` 表示正好 11 个
- 完整写法：`ALTER TABLE 读者 ADD CONSTRAINT ck_读者_电话 CHECK (REGEXP_LIKE(联系电话, '^[0-9]{11}$'));`

### 1.23 给「读者」的身份证加 CHECK 约束（18 位）

第二条：`身份证编号` 必须是 **18 位**。用 `LENGTH()` 数字符个数。

#### HINTS

- 语法同上，只是条件换成 `LENGTH(身份证编号) = 18`
- `LENGTH` 算的是字符数；这里 18 位都是数字和 X，用 `LENGTH` 就够
- 完整写法：`ALTER TABLE 读者 ADD CONSTRAINT ck_读者_身份证 CHECK (LENGTH(身份证编号) = 18);`

### 1.24 给「图书」的借出状态加 CHECK 约束（只能是「是」或「否」）

第三条：`是否借出` 只能是 `'是'` 或 `'否'`，别的值一律拒绝。用 `IN` 列出来。

#### HINTS

- 语法：`ALTER TABLE 图书 ADD CONSTRAINT 约束名 CHECK (列名 IN ('值1','值2'));`
- 汉字是 `CHAR(3)`，`'是'`/`'否'` 各占 3 字节，正好放得下
- 完整写法：`ALTER TABLE 图书 ADD CONSTRAINT ck_图书_借出 CHECK (是否借出 IN ('是','否'));`

### 1.25 把「借阅」的借书日期改成 NOT NULL

最后一条不是 CHECK，而是列属性：`借书日期` 不能为空。

改列属性要用 `ALTER TABLE ... MODIFY`，**不是** `ADD CONSTRAINT`。

#### HINTS

- 语法：`ALTER TABLE 表名 MODIFY (列名 NOT NULL);`
- 不要写成 `ADD CONSTRAINT ... NOT NULL`——Oracle 没有这种约束写法
- 完整写法：`ALTER TABLE 借阅 MODIFY (借书日期 NOT NULL);`


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

这一章被拆成了很多小关：一个过程分「骨架 → 补一段 → 再补一段」三次写完。
每次只加一个动作，保存就能判题。

### 3.1 写出「借书」过程的骨架

存储过程是一段编译好、存在数据库里的 PL/SQL 代码，调用时只要写名字。

这一关**先只搭框架**，不写业务逻辑：

- 过程名 `借书`
- 三个输入参数：`借阅流水号`、`借书证号`、`图书编号`
- 过程体用 `NULL;` 占位（PL/SQL 的 `BEGIN ... END` 之间至少要有一条语句）

参数类型建议用 `表名.列名%TYPE`，比如 `借阅.借书证号%TYPE`——这样列的类型变了，过程自动跟着变。

#### HINTS

- 结构是 `CREATE OR REPLACE PROCEDURE 过程名 (参数名 类型, ...) IS BEGIN ... END;`，后面再单独一行 `/`
- 参数模板：`p_借阅流水号 借阅.借阅流水号%TYPE`、`p_借书证号 借阅.借书证号%TYPE`、`p_图书编号 借阅.图书编号%TYPE`，三个之间用逗号隔开
- 完整写法：`CREATE OR REPLACE PROCEDURE 借书 (p_借阅流水号 借阅.借阅流水号%TYPE, p_借书证号 借阅.借书证号%TYPE, p_图书编号 借阅.图书编号%TYPE) IS BEGIN NULL; END; /`

### 3.2 给「借书」补上 INSERT

骨架能编译了，现在往里填第一件事：**往 `借阅` 表插一行**。

插入四个字段：`借阅流水号`、`借书证号`、`图书编号` 用传入的参数，`借书日期` 取 `SYSDATE`。
`归还日期` 和 `罚款分类号` 先不填（留空就是 NULL，表示还没还）。

这一关先不要动 `图书.是否借出`，那是下一关的事。

#### HINTS

- `INSERT INTO 借阅 (列1, 列2, ...) VALUES (值1, 值2, ...);`，四个列名和四个值要一一对应
- 列名顺序：`借阅流水号, 借书证号, 图书编号, 借书日期`；值里最后一个用 `SYSDATE`
- 完整写法：`CREATE OR REPLACE PROCEDURE 借书 (p_借阅流水号 借阅.借阅流水号%TYPE, p_借书证号 借阅.借书证号%TYPE, p_图书编号 借阅.图书编号%TYPE) IS BEGIN INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期) VALUES (p_借阅流水号, p_借书证号, p_图书编号, SYSDATE); END; /`

### 3.3 给「借书」补上 UPDATE 和异常处理

还差两件事：

1. 把这本书标成已借出：`UPDATE 图书 SET 是否借出 = '是' WHERE 图书编号 = p_图书编号;`
2. 在 `END;` 之前加一段 `EXCEPTION`，把底层错误包装成中文提示：

```sql
EXCEPTION
  WHEN OTHERS THEN
    RAISE_APPLICATION_ERROR(-20010, '借书失败：' || SQLERRM);
```

为什么要异常处理：不加的话，出错时学生看到的是一串英文 `ORA-` 错误；
加了以后业务层能拿到一句能看懂的话，错误号也统一成 `-20010`。

注意 `EXCEPTION` 段写在 `END;` **之前**，每句结尾的分号不要漏。

#### HINTS

- 顺序是 `BEGIN INSERT...; UPDATE...; EXCEPTION WHEN OTHERS THEN ...; END;`，`EXCEPTION` 不能写在 `END` 后面
- 拼接错误信息用 `||`：`RAISE_APPLICATION_ERROR(-20010, '借书失败：' || SQLERRM);`
- 完整写法：`CREATE OR REPLACE PROCEDURE 借书 (p_借阅流水号 借阅.借阅流水号%TYPE, p_借书证号 借阅.借书证号%TYPE, p_图书编号 借阅.图书编号%TYPE) IS BEGIN INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期) VALUES (p_借阅流水号, p_借书证号, p_图书编号, SYSDATE); UPDATE 图书 SET 是否借出 = '是' WHERE 图书编号 = p_图书编号; EXCEPTION WHEN OTHERS THEN RAISE_APPLICATION_ERROR(-20010, '借书失败：' || SQLERRM); END; /`

### 3.4 调用「借书」存储过程

过程建好了要调用才会执行。用 `BEGIN 过程名(参数...); END; /`。

借出这本书：流水号 `100`，借书证号 `20051001`，图书编号 `1005050`。

判题会先建好上一关的标准过程，再执行你这一关的调用，然后检查数据变了没有。

#### HINTS

- 调用也是一个 PL/SQL 块，同样要用单独一行的 `/` 结束
- 参数顺序必须和过程定义一致：流水号、借书证号、图书编号
- 完整写法：`BEGIN 借书(100, '20051001', '1005050'); END; /`

### 3.5 写出「图书预约」过程的骨架

预约的业务规则：**只有当这个 ISBN 的书全部借出去了，才允许预约**；还有可借的就要拒绝。

这一关还是先搭框架：过程名 `图书预约`，三个参数（预约流水号、借书证号、ISBN），过程体 `NULL;`。

> ⚠️ 过程**不能**叫 `预约`——它和 `预约` 表重名，Oracle 同一个 schema 不允许，
> 会报 `ORA-00955`，所以名字叫 `图书预约`。

#### HINTS

- 和 3.1 一样，只是把名字和参数换掉
- 参数用 `预约.预约流水号%TYPE`、`预约.借书证号%TYPE`、`预约.ISBN%TYPE`
- 完整写法：`CREATE OR REPLACE PROCEDURE 图书预约 (p_预约流水号 预约.预约流水号%TYPE, p_借书证号 预约.借书证号%TYPE, p_ISBN 预约.ISBN%TYPE) IS BEGIN NULL; END; /`

### 3.6 给「图书预约」补上可借判断

现在往骨架里加三样东西（这一关还不要 INSERT）：

1. 声明一个变量：`v_可借数 NUMBER;`
2. 数一下这个 ISBN 还有几本没借出：
   `SELECT COUNT(*) INTO v_可借数 FROM 图书 WHERE ISBN = p_ISBN AND 是否借出 = '否';`
3. 大于 0 就抛业务错误：
   `IF v_可借数 > 0 THEN RAISE_APPLICATION_ERROR(-20001, '该书目有可借图书，请查找'); END IF;`

新概念：`RAISE_APPLICATION_ERROR(错误号, '提示语')` 用来主动抛出一个业务错误。
错误号要自己定，范围 `-20000` ~ `-20999`。

#### HINTS

- 变量声明写在 `IS` 和 `BEGIN` 之间，不要写在 `BEGIN` 里面
- `SELECT COUNT(*) INTO 变量 FROM 表 WHERE ...`——`INTO` 不能漏，它是把查询结果塞进变量的关键字
- 完整写法：`CREATE OR REPLACE PROCEDURE 图书预约 (p_预约流水号 预约.预约流水号%TYPE, p_借书证号 预约.借书证号%TYPE, p_ISBN 预约.ISBN%TYPE) IS v_可借数 NUMBER; BEGIN SELECT COUNT(*) INTO v_可借数 FROM 图书 WHERE ISBN = p_ISBN AND 是否借出 = '否'; IF v_可借数 > 0 THEN RAISE_APPLICATION_ERROR(-20001, '该书目有可借图书，请查找'); END IF; END; /`

### 3.7 给「图书预约」补上 INSERT

判断写好了，最后补上插入：`INSERT INTO 预约 (预约流水号, 借书证号, ISBN, 预约时间) VALUES (p_预约流水号, p_借书证号, p_ISBN, SYSDATE);`

顺序很重要：**先判断有没有可借的书，再 INSERT**。判断不过就抛错，后面的 INSERT 不会执行。

#### HINTS

- 把 `INSERT INTO 预约 ...;` 加在 `END IF;` 后面、`END;` 前面
- 四个值依次是：预约流水号、借书证号、ISBN、`SYSDATE`
- 完整写法：`CREATE OR REPLACE PROCEDURE 图书预约 (p_预约流水号 预约.预约流水号%TYPE, p_借书证号 预约.借书证号%TYPE, p_ISBN 预约.ISBN%TYPE) IS v_可借数 NUMBER; BEGIN SELECT COUNT(*) INTO v_可借数 FROM 图书 WHERE ISBN = p_ISBN AND 是否借出 = '否'; IF v_可借数 > 0 THEN RAISE_APPLICATION_ERROR(-20001, '该书目有可借图书，请查找'); END IF; INSERT INTO 预约 (预约流水号, 借书证号, ISBN, 预约时间) VALUES (p_预约流水号, p_借书证号, p_ISBN, SYSDATE); END; /`

### 3.8 写出「还书」过程的骨架（改图书状态）

还书是借书的逆操作：把书改回可借。这一关只做骨架 + 第一条 UPDATE。

建一个叫 `还书` 的过程，三个参数：借书证号、图书编号、罚款分类号。
过程体只有一条 `UPDATE 图书 SET 是否借出 = '否' WHERE 图书编号 = p_图书编号;`

借阅表上的 `归还日期` / `罚款分类号` 留到下一关再补——这次真的只加一个动作。

#### HINTS

- 结构和 3.1 一样，三个参数都要写上（第三个这关暂时用不到，但接口先定好）
- `UPDATE 图书 SET 是否借出 = '否' WHERE 图书编号 = p_图书编号;`
- 完整写法：`CREATE OR REPLACE PROCEDURE 还书 (p_借书证号 借阅.借书证号%TYPE, p_图书编号 借阅.图书编号%TYPE, p_罚款分类号 借阅.罚款分类号%TYPE) IS BEGIN UPDATE 图书 SET 是否借出 = '否' WHERE 图书编号 = p_图书编号; END; /`

### 3.9 给「还书」补上归还日期

现在补第二条 UPDATE，改 `借阅` 表：

```sql
UPDATE 借阅
   SET 归还日期 = SYSDATE,
       罚款分类号 = p_罚款分类号
 WHERE 借书证号 = p_借书证号
   AND 图书编号 = p_图书编号
   AND 归还日期 IS NULL;
```

一条 `UPDATE` 可以同时改两个字段。`WHERE` 里的 `归还日期 IS NULL` 不能少：
同一个读者可能借过同一本书多次，只改「还没还」的那一条。

把这条 UPDATE 写在 `UPDATE 图书` **之前**。

#### HINTS

- `SET 字段1 = 值1, 字段2 = 值2`，两个赋值之间是逗号，不是 `AND`
- `WHERE` 用三个条件串起来：证号、编号、`归还日期 IS NULL`
- 完整写法：`CREATE OR REPLACE PROCEDURE 还书 (p_借书证号 借阅.借书证号%TYPE, p_图书编号 借阅.图书编号%TYPE, p_罚款分类号 借阅.罚款分类号%TYPE) IS BEGIN UPDATE 借阅 SET 归还日期 = SYSDATE, 罚款分类号 = p_罚款分类号 WHERE 借书证号 = p_借书证号 AND 图书编号 = p_图书编号 AND 归还日期 IS NULL; UPDATE 图书 SET 是否借出 = '否' WHERE 图书编号 = p_图书编号; END; /`

### 3.10 建序列，让借阅流水号自动递增

现在借书要手写流水号，容易撞号。Oracle 用**序列**（SEQUENCE）生成自增数字。

建一个叫 `序列_借阅` 的序列，从 100 开始，每次加 1。用的时候写 `序列_借阅.NEXTVAL`。

#### HINTS

- 语法是 `CREATE SEQUENCE 序列名 START WITH 起始值 INCREMENT BY 步长;`
- 注意是 `CREATE SEQUENCE`，没有 `OR REPLACE`，也没有 `BEGIN/END`
- 完整写法：`CREATE SEQUENCE 序列_借阅 START WITH 100 INCREMENT BY 1;`

### 3.11 建「简化借书」存储过程（2 个参数）

有了序列，流水号就不用传了。建一个叫 `简化借书` 的过程，只要两个参数：
借书证号、图书编号。主体**只有一条 INSERT**，流水号用 `序列_借阅.NEXTVAL`。

这里先不要改 `图书.是否借出`——那是下一关触发器的活。

#### HINTS

- `VALUES (序列_借阅.NEXTVAL, p_借书证号, p_图书编号, SYSDATE)`
- 只有一条 INSERT，所以不需要 `UPDATE 图书`
- 完整写法：`CREATE OR REPLACE PROCEDURE 简化借书 (p_借书证号 借阅.借书证号%TYPE, p_图书编号 借阅.图书编号%TYPE) IS BEGIN INSERT INTO 借阅 (借阅流水号, 借书证号, 图书编号, 借书日期) VALUES (序列_借阅.NEXTVAL, p_借书证号, p_图书编号, SYSDATE); END; /`

### 3.12 建触发器：借阅表一插入就自动标记图书

触发器是「表上发生某种操作时自动执行」的代码。它比存储过程更省事——**不用调用，插入就触发**。

建一个行级触发器 `触发器_借书`，挂在 `借阅` 表上：每当插入一行，就把对应图书标成已借出。

关键概念：`:NEW.列名` —— 在行级 INSERT 触发器里，它代表刚插入那一行的值。

#### HINTS

- 语法是 `CREATE OR REPLACE TRIGGER 名 AFTER INSERT ON 表 FOR EACH ROW BEGIN ... END; /`
- `FOR EACH ROW` 不能少，否则只对整个表执行一次，拿不到 `:NEW`
- 完整写法：`CREATE OR REPLACE TRIGGER 触发器_借书 AFTER INSERT ON 借阅 FOR EACH ROW BEGIN UPDATE 图书 SET 是否借出 = '是' WHERE 图书编号 = :NEW.图书编号; END; /`

### 3.13 建「图书丢失」存储过程

书丢了：这条借阅记录要记成罚款分类 3（丢失）、备注写「丢失」；书本身仍然是「已借出」状态。

建一个叫 `图书丢失` 的过程，两个参数：借书证号、图书编号。一条 UPDATE 就能同时改两个字段。

#### HINTS

- `UPDATE 借阅 SET 罚款分类号 = 3, 备注 = '丢失' WHERE ... AND 归还日期 IS NULL`
- 不要再改 `图书.是否借出`，它本来就该是 '是'
- 完整写法：`CREATE OR REPLACE PROCEDURE 图书丢失 (p_借书证号 借阅.借书证号%TYPE, p_图书编号 借阅.图书编号%TYPE) IS BEGIN UPDATE 借阅 SET 罚款分类号 = 3, 备注 = '丢失' WHERE 借书证号 = p_借书证号 AND 图书编号 = p_图书编号 AND 归还日期 IS NULL; END; /`


## 4. 数据库恢复与安全性

> 备份恢复（Data Pump + 闪回）、用户与权限、角色、视图隔离、账号安全策略。
>
> 这一章 4.1–4.8 是**终端命令**（expdp/impdp），不是 SQL；4.9 之后回到 SQL。
>
> 和上一章一样，一个大实验被拆成了很多小关：
> expdp 命令先写骨架、再补文件名、最后补「导什么」，每关只加一个参数。

### 4.1 写出 expdp 命令的骨架

`expdp` 是 Oracle 的**数据泵导出**工具，和 `sqlplus` 一样是命令行程序——在终端里敲，不是在 SQL 里敲。

这一关只要写出命令的开头两个部件：

```bash
expdp COURSE/course@//localhost:1521/FREEPDB1 DIRECTORY=DUMPDIR
```

| 部件 | 说明 |
|---|---|
| 连接串 | `COURSE/course@//localhost:1521/FREEPDB1`（用户名/密码@主机:端口/服务名） |
| `DIRECTORY` | 目录对象名。课程已备好 `DUMPDIR`，它指向容器里的 `/tmp/dump` |

> ⚠️ `DIRECTORY` 不是 Linux 路径，是数据库里的「目录对象」名字。路径本身存在对象里。

这一关不写 `DUMPFILE` / `LOGFILE` / `TABLES`，后面两步再补。

#### HINTS

- 命令必须以 `expdp` 开头，紧接着是连接串，然后 `DIRECTORY=目录对象名`
- 连接串照抄 `COURSE/course@//localhost:1521/FREEPDB1`，注意是双斜杠 `//`
- 完整写法：`expdp COURSE/course@//localhost:1521/FREEPDB1 DIRECTORY=DUMPDIR`

### 4.2 给 expdp 补上 DUMPFILE 和 LOGFILE

导出的文件得有名字。在上一关的命令后面加两个参数：

- `DUMPFILE=yuyue.dmp` —— 导出的二进制文件
- `LOGFILE=yuyue.log` —— 导出过程的日志

> ⚠️ 两个文件名都必须纯英文（中文会报 `ORA-39155`）。扩展名习惯用 `.dmp` / `.log`。

这一关还不要写 `TABLES`，下一步再补「导哪张表」。

#### HINTS

- 参数之间用空格分隔，每个都是 `名字=值`
- 文件名别用中文；`DUMPFILE` 以 `.dmp` 结尾，`LOGFILE` 以 `.log` 结尾
- 完整写法：`expdp COURSE/course@//localhost:1521/FREEPDB1 DIRECTORY=DUMPDIR DUMPFILE=yuyue.dmp LOGFILE=yuyue.log`

### 4.3 给 expdp 补上 TABLES，真正导出「预约」表

最后一个参数：`TABLES=预约`——告诉 expdp 只导这一张表。

写完保存，判题器会**真的执行**这条命令，然后检查：
`/tmp/dump` 里有没有 `yuyue.dmp`、日志里有没有 `successfully completed`。

四个参数缺一不可：

| 参数 | 作用 |
|---|---|
| `DIRECTORY` | 目录对象名（`DUMPDIR`） |
| `DUMPFILE` | 导出的二进制文件，必须纯英文 |
| `LOGFILE` | 日志文件名，同样纯英文 |
| `TABLES` | 要导出的表 |

#### HINTS

- 在上一关命令的最后加 ` TABLES=预约`
- 中文表名直接写，不要加引号
- 完整写法：`expdp COURSE/course@//localhost:1521/FREEPDB1 DIRECTORY=DUMPDIR DUMPFILE=yuyue.dmp LOGFILE=yuyue.log TABLES=预约`

### 4.4 先把「预约」表真的删掉

下一关要用 `impdp` 把表导回来。但在导入之前，表必须**真的不存在**——
否则 `impdp` 会报 `ORA-39151 ... due to table_exists_action of skip`，
日志看起来像"完成"，实际上**什么都没导**。

这一关只写一条：

```sql
DROP TABLE 预约 CASCADE CONSTRAINTS;
```

`CASCADE CONSTRAINTS` 的作用：把别的表指向 `预约` 的外键一起删掉。
（本课程没有这种外键，但写上是个好习惯。）

#### HINTS

- 语法是 `DROP TABLE 表名 CASCADE CONSTRAINTS;`
- `CASCADE CONSTRAINTS` 不能省，否则有外键引用时会报 `ORA-02449`
- 完整写法：`DROP TABLE 预约 CASCADE CONSTRAINTS;`

### 4.5 写出 impdp 命令的骨架

`impdp` 是 `expdp` 的反操作（导入）。命令的开头和 expdp 一样：

```bash
impdp COURSE/course@//localhost:1521/FREEPDB1 DIRECTORY=DUMPDIR
```

这一关先只写这两段，`DUMPFILE` / `LOGFILE` / `TABLES` 下一步再补。

#### HINTS

- 把 4.1 那个 expdp 骨架的第一个字母 `e` 换成 `i`（`impdp`）
- 连接串和 `DIRECTORY=DUMPDIR` 原样保留
- 完整写法：`impdp COURSE/course@//localhost:1521/FREEPDB1 DIRECTORY=DUMPDIR`

### 4.6 给 impdp 补上参数，把表导回来

在骨架上加三个参数：

- `DUMPFILE=yuyue.dmp` —— 要读的转储文件（4.3 导出的那个）
- `LOGFILE=imp_yuyue.log` —— 导入日志，**换个名字**，别覆盖导出日志
- `TABLES=预约` —— 要导回来的表

判题器会先自己造出「表不存在」的起点，再执行你的 impdp，最后检查表、行数（1 行）、主键都回来了。

#### HINTS

- 三个参数和 expdp 写法一样，只是 `LOGFILE` 建议改名成 `imp_yuyue.log`
- `TABLES=预约`，中文表名不加引号
- 完整写法：`impdp COURSE/course@//localhost:1521/FREEPDB1 DIRECTORY=DUMPDIR DUMPFILE=yuyue.dmp LOGFILE=imp_yuyue.log TABLES=预约`

### 4.7 写出「按用户导出」的 expdp 骨架

前面用 `TABLES=` 导一张表，这一关换成导一整个用户（schema）的全部对象。

关键参数是 `SCHEMAS=COURSE`。`SCHEMAS` 和 `TABLES` 是**互斥**的：
导整库用 `SCHEMAS`，导单表用 `TABLES`，不能同时写。

这一关先写 `expdp + DIRECTORY + SCHEMAS=COURSE`，文件名下一步再补。

#### HINTS

- 把 4.1 的骨架后面直接加 `SCHEMAS=COURSE`
- 值要用大写 `COURSE`（schema 名），不要写成 `course`
- 完整写法：`expdp COURSE/course@//localhost:1521/FREEPDB1 DIRECTORY=DUMPDIR SCHEMAS=COURSE`

### 4.8 给整库导出补上文件名，真正导出

补上 `DUMPFILE=course.dmp` 和 `LOGFILE=course.log`，其余不变。

判题会真的执行，然后检查日志里 7 张表都被导出了（`exported "COURSE"` 出现 7 次以上）。

#### HINTS

- 在 4.7 的命令后面再加 `DUMPFILE=course.dmp LOGFILE=course.log`，注意别和 `TABLES` 混用
- 文件名纯英文，`.dmp` / `.log` 结尾
- 完整写法：`expdp COURSE/course@//localhost:1521/FREEPDB1 DIRECTORY=DUMPDIR DUMPFILE=course.dmp LOGFILE=course.log SCHEMAS=COURSE`

### 4.9 让「预约」表支持闪回

`FLASHBACK TABLE` 能把表恢复到之前某个时刻的样子，但前提是这张表开了**行移动**（row movement）。

```sql
ALTER TABLE 预约 ENABLE ROW MOVEMENT;
```

不开就闪回，会报：

```
ORA-08189: cannot flashback the table because row movement is not enabled
```

#### HINTS

- 用 `ALTER TABLE` 改表的属性，关键字是 `ENABLE ROW MOVEMENT`
- 顺序是 `ALTER TABLE 表名 ENABLE ROW MOVEMENT;`，不是 `ALTER TABLE ... ROW MOVEMENT ENABLE`
- 完整写法：`ALTER TABLE 预约 ENABLE ROW MOVEMENT;`

### 4.10 删掉「预约」表的数据并提交

两步：

```sql
DELETE FROM 预约;
COMMIT;
```

为什么一定要 `COMMIT`：`DELETE` 只是把改动留在当前会话里，提交之后才真正写进数据库，
也才能被下一关的闪回「看见」。

这一关**不要**写 `FLASHBACK`——那是下一关的事。

#### HINTS

- 两条语句，各占一行，每句结尾一个分号
- `DELETE FROM 预约;` 后面紧跟 `COMMIT;`
- 完整写法：`DELETE FROM 预约; COMMIT;`

### 4.11 把「预约」表闪回恢复

上一关表被清空了，这一关用一条语句恢复：

```sql
FLASHBACK TABLE 预约 TO TIMESTAMP (SYSTIMESTAMP - INTERVAL '5' SECOND);
```

> ⚠️ **这一关最容易踩的坑**：闪回的目标时间必须
> ① 晚于这张表最后一次结构变更（DDL，比如 4.9 的 `ENABLE ROW MOVEMENT`）
> ② 早于你 `DELETE` 的时刻。
>
> 写 `- INTERVAL '5' SECOND` 就落在这个安全区间里；
> 如果写成 `- INTERVAL '5' MINUTE`，会落在 DDL 之前，报：
>
> ```
> ORA-01466: unable to read data - table definition has changed
> ```
>
> 判题器会保证你交卷时距离 4.9 的 DDL 已经过了足够长时间（它自己会等 12 秒）。

#### HINTS

- 语法是 `FLASHBACK TABLE 表名 TO TIMESTAMP (时间表达式);`
- 时间写成 `SYSTIMESTAMP - INTERVAL '5' SECOND`（秒，不是分钟）
- 完整写法：`FLASHBACK TABLE 预约 TO TIMESTAMP (SYSTIMESTAMP - INTERVAL '5' SECOND);`

### 4.12 建用户并授 CONNECT / RESOURCE

数据库里每个应用/每个人一个用户。建完要授角色才能干活：

- `CONNECT`：能登录（最基础）
- `RESOURCE`：能建表、建索引

```sql
CREATE USER zhangwei IDENTIFIED BY zw2026oracle;
GRANT CONNECT, RESOURCE TO zhangwei;
```

> ⚠️ 23ai 的默认密码策略区分大小写、要求不能纯数字，`123456` 这种会报 `ORA-28003`。

#### HINTS

- 两条语句：`CREATE USER 名字 IDENTIFIED BY 密码;` + `GRANT ... TO 名字;`
- 两个角色可以写在一条 GRANT 里，用逗号隔开
- 完整写法：`CREATE USER zhangwei IDENTIFIED BY zw2026oracle; GRANT CONNECT, RESOURCE TO zhangwei;`

### 4.13 用数据字典查「角色」

Oracle 把「谁有什么权限」存在数据字典视图里。三张最常用：

| 视图 | 查什么 |
|---|---|
| `user_role_privs` | 我有哪些角色 |
| `user_sys_privs` | 我有哪些系统权限（CREATE USER、DROP ANY TABLE…） |
| `user_tab_privs` | 我有哪些对象权限（某张表上的 SELECT、EXECUTE…） |

这一关只查第一张：`user_role_privs`。

`user_` 前缀的视图只显示**你自己**的权限；换成 `dba_` 就能看全库（需要权限）。

#### HINTS

- 一条 `SELECT * FROM user_role_privs;` 就够了
- 注意视图名是复数带 `_privs` 后缀，别写成 `user_roles`
- 完整写法：`SELECT * FROM user_role_privs;`

### 4.14 用数据字典查「系统权限」

系统权限是「能对数据库做什么」的大权：`CREATE USER`、`DROP ANY TABLE`、`CREATE SESSION`……
对应的视图是 `user_sys_privs`。

#### HINTS

- 一条 `SELECT * FROM user_sys_privs;`
- 别和上一关的 `user_role_privs` 搞混：一个是「角色」，一个是「系统权限」
- 完整写法：`SELECT * FROM user_sys_privs;`

### 4.15 用数据字典查「对象权限」

对象权限是「能对某张表/某个过程做什么」：`书目` 上的 `SELECT`、`借书` 过程上的 `EXECUTE`……
对应的视图是 `user_tab_privs`。

#### HINTS

- 一条 `SELECT * FROM user_tab_privs;`
- 名字里的 `tab` 不只是表，过程、视图的对象权限也在里面
- 完整写法：`SELECT * FROM user_tab_privs;`

### 4.16 建角色「图书管理员」，先授 CONNECT

角色是**一组权限的打包**。先把权限授给角色，再把角色授给人，就不用一个个授。

这一关只做两件事：建角色 + 让它能登录。

```sql
CREATE ROLE 图书管理员;
GRANT CONNECT TO 图书管理员;
```

> 💡 为什么授 `CONNECT` 角色而不是 `CREATE SESSION` 系统权限：
> 给角色授**系统权限**需要 `GRANT ANY PRIVILEGE`，课程用户没有这个权限；
> 授**角色**只需要 `GRANT ANY ROLE`（有）。教学效果一样。

#### HINTS

- 一条 `CREATE ROLE 角色名;`，一条 `GRANT CONNECT TO 角色名;`
- `CREATE ROLE` 不需要 `OR REPLACE`，重复建会报 `ORA-01921`
- 完整写法：`CREATE ROLE 图书管理员; GRANT CONNECT TO 图书管理员;`

### 4.17 给角色授「书目」表的查询权限

一条语句：

```sql
GRANT SELECT ON 书目 TO 图书管理员;
```

表上的权限关键字是 `SELECT` / `INSERT` / `UPDATE` / `DELETE`。

#### HINTS

- 语法是 `GRANT 权限 ON 对象 TO 角色;`
- 对象是 `书目`，权限是 `SELECT`，接收者是 `图书管理员`
- 完整写法：`GRANT SELECT ON 书目 TO 图书管理员;`

### 4.18 给角色授三个过程的执行权限

角色要能调用三个过程：`借书`、`还书`、`图书预约`。

```sql
GRANT EXECUTE ON 借书     TO 图书管理员;
GRANT EXECUTE ON 还书     TO 图书管理员;
GRANT EXECUTE ON 图书预约 TO 图书管理员;
```

过程上的权限关键字是 `EXECUTE`，表上的叫 `SELECT`。

#### HINTS

- 三条 GRANT，对象分别换掉，其余一样
- 关键字是 `EXECUTE`，不是 `RUN` 也不是 `CALL`
- 完整写法：`GRANT EXECUTE ON 借书 TO 图书管理员; GRANT EXECUTE ON 还书 TO 图书管理员; GRANT EXECUTE ON 图书预约 TO 图书管理员;`

### 4.19 建 用户_oper，授角色，用它借书

```sql
CREATE USER 用户_oper IDENTIFIED BY oper2026;
GRANT 图书管理员 TO 用户_oper;
```

判题器会**自己**用 `用户_oper/oper2026` 登录，调一次 `COURSE.借书`，
然后检查借阅表真的多了一行——证明角色授到过程上是真能用，不是只在字典里躺一行。

> ⚠️ 跨 schema 调过程必须带 `COURSE.` 前缀。
> 直接写 `借书(...)` 会报 `PLS-00201: identifier '借书' must be declared`——
> 因为这个名字在 `用户_oper` 自己的 schema 里不存在。

#### HINTS

- `CREATE USER` + `GRANT 角色 TO 用户;`，两条
- 角色名是 `图书管理员`（中文），直接把角色名写在 `GRANT` 后面
- 完整写法：`CREATE USER 用户_oper IDENTIFIED BY oper2026; GRANT 图书管理员 TO 用户_oper;`

### 4.20 建视图 VIEW_READER

视图是**存起来的查询**。这里把书目和它的分类名拼成一张"虚拟表"。

```sql
CREATE OR REPLACE VIEW VIEW_READER AS
SELECT b.ISBN, b.书名, c.类名
  FROM 书目 b
  JOIN 图书分类 c ON b.图书分类号 = c.图书分类号;
```

`CREATE OR REPLACE` 的好处：视图已存在时直接替换，不报错，可以反复执行。

#### HINTS

- `CREATE OR REPLACE VIEW 名字 AS SELECT ...`，SELECT 里要 JOIN 图书分类
- 三列：`b.ISBN`、`b.书名`、`c.类名`；连接条件 `b.图书分类号 = c.图书分类号`
- 完整写法：`CREATE OR REPLACE VIEW VIEW_READER AS SELECT b.ISBN, b.书名, c.类名 FROM 书目 b JOIN 图书分类 c ON b.图书分类号 = c.图书分类号;`

### 4.21 建 用户_USER1，先只给登录

```sql
CREATE USER 用户_USER1 IDENTIFIED BY view2026;
GRANT CONNECT TO 用户_USER1;
```

这一关先**不给任何查询权限**——目的是让你看清「能登录」和「能查数据」是两件不同的事。
下一步才授视图的 `SELECT`。

#### HINTS

- 两条：`CREATE USER 用户_USER1 IDENTIFIED BY view2026;` + `GRANT CONNECT TO 用户_USER1;`
- 密码必须是本题要求的 `view2026`（判题要用它登录）
- 完整写法：`CREATE USER 用户_USER1 IDENTIFIED BY view2026; GRANT CONNECT TO 用户_USER1;`

### 4.22 只给 用户_USER1 授「视图」的查询权限

这一关演示**视图做权限隔离**：

- 给用户 `VIEW_READER` 的 SELECT → 能查视图
- **不给** `书目` 的 SELECT → 不能查基表

这样用户只能看到视图暴露的那三列，看不到书目的其他列（比如单价、出版社）。

```sql
GRANT SELECT ON VIEW_READER TO 用户_USER1;
```

#### HINTS

- 只有一条 GRANT，对象是 `VIEW_READER`
- **不要**给 `书目`、`图书` 这些基表授权，否则隔离就失效了（判题会反向检查）
- 完整写法：`GRANT SELECT ON VIEW_READER TO 用户_USER1;`

### 4.23 建 PROFILE「限时锁定」

PROFILE 是**账号安全策略的模板**：密码错几次锁、锁多久、密码多久过期。

```sql
CREATE PROFILE 限时锁定 LIMIT
  FAILED_LOGIN_ATTEMPTS 3
  PASSWORD_LOCK_TIME 10;
```

| 参数 | 含义 |
|---|---|
| `FAILED_LOGIN_ATTEMPTS 3` | 连续错 3 次就锁 |
| `PASSWORD_LOCK_TIME 10` | 锁 10 天（单位是天） |

> 📌 本关只校验参数配置，不真的让你连错 3 次密码——
> 那会把你自己的账号锁住、还要额外解锁，且污染审计日志。
> 讲义把这个取舍讲明白：**会配策略**是本关目标。

#### HINTS

- `CREATE PROFILE 名字 LIMIT 参数 值 参数 值;`
- 两个参数名：`FAILED_LOGIN_ATTEMPTS` 和 `PASSWORD_LOCK_TIME`
- 完整写法：`CREATE PROFILE 限时锁定 LIMIT FAILED_LOGIN_ATTEMPTS 3 PASSWORD_LOCK_TIME 10;`

### 4.24 手工解锁被锁的账号

账号被锁后，管理员不用等 10 天，可以直接解锁：

```sql
ALTER USER 用户_USER1 ACCOUNT UNLOCK;
```

如果账号是因为**密码过期**被锁，只 UNLOCK 不够，要重置密码：

```sql
ALTER USER 用户_USER1 IDENTIFIED BY view2026;
```

#### HINTS

- 用 `ALTER USER 用户名 ACCOUNT UNLOCK;`
- 注意是 `ACCOUNT UNLOCK` 两个词，不是 `UNLOCK ACCOUNT`
- 完整写法：`ALTER USER 用户_USER1 ACCOUNT UNLOCK;`

### 4.25 撤销权限并删除用户

清理工作分两步，顺序不能反：

```sql
REVOKE SELECT ON VIEW_READER FROM 用户_USER1;
DROP USER 用户_USER1;
```

> 💡 其实 `DROP USER` 会**自动**把该用户的所有授权记录删掉，
> 所以 `REVOKE` 严格来说不是必须的。但要养成习惯：
> 先明确收回授权，再删账号——审计日志里能看出"权限被主动收回了"。
>
> ⚠️ 只撤授权、删用户，**不要 DROP VIEW**：视图是你自己的对象，还要留给别人用。

#### HINTS

- `REVOKE 权限 ON 对象 FROM 用户;` + `DROP USER 用户名;`
- 如果用户自己建过对象，`DROP USER` 要加 `CASCADE`
- 完整写法：`REVOKE SELECT ON VIEW_READER FROM 用户_USER1; DROP USER 用户_USER1;`
