-- 4.4 先把「预约」表真的删掉
-- 目标：一条 DROP TABLE，带上 CASCADE CONSTRAINTS。
-- 为什么必须先删：表还在的话 impdp 会 skip（ORA-39151），看起来成功其实没导。

-- TODO 在下面写 DROP TABLE 预约
