-- 3.3 给「借书」补上 UPDATE 和异常处理
-- 在 3.2 的基础上再加两段：一条 UPDATE 把这本书标成已借出；
-- 一段 EXCEPTION（写在 END; 之前）用 RAISE_APPLICATION_ERROR(-20010, ...) 包装错误。

-- TODO 在下面写完整的过程：INSERT + UPDATE 图书 + EXCEPTION
