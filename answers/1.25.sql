-- 1.25 标准答案：借阅.借书日期 改成 NOT NULL
ALTER TABLE 借阅 MODIFY (借书日期 NOT NULL);
