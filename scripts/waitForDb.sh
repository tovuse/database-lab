#!/usr/bin/env bash
# 等 Oracle 数据库就绪。首次建库约 2–3 分钟。
set -u

echo "⏳ 等待 Oracle 数据库启动……（首次启动需 2–3 分钟）"

for i in $(seq 1 90); do
  if sqlplus -S -L "COURSE/course@//localhost:1521/FREEPDB1" \
       <<<'SELECT 1 FROM dual;' >/dev/null 2>&1; then
    echo "✅ Oracle 就绪（等待约 $((i * 5)) 秒）"
    exit 0
  fi

  # 每 30 秒报一次进度，避免学生以为卡死
  if [ $((i % 6)) -eq 0 ]; then
    echo "   仍在启动中……已等待 $((i * 5)) 秒"
  fi
  sleep 5
done

echo "❌ Oracle 启动超时（7.5 分钟）。" >&2
echo "   请关闭本 codespace 后重新创建：https://github.com/codespaces" >&2
exit 1
