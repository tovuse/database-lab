-- 3.6 给「图书预约」补上「还有可借图书就不许预约」的判断
-- 在 3.5 骨架的基础上加：一个数字变量、一条 SELECT COUNT(*) INTO、一个 IF 判断。
-- 大于 0 就 RAISE_APPLICATION_ERROR(-20001, '该书目有可借图书，请查找')。这一关还不要 INSERT。

-- TODO 在下面写：变量声明 + SELECT COUNT INTO + IF 判断
