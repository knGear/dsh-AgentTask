#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# dsh-AgentTask 插件 — 幂等安装
# 用法: bash install-agenttask.sh [本地插件目录]
#   - 无参: 从 GitHub raw 下载 (knGear/dsh-agenttask main 分支)
#   - 带参: 本地目录 (开发/离线), 如 bash install-agenttask.sh /sdcard/1tui/apk-dshm-agenttask/agenttask
# 效果: ① 插件 → ~/.dsh/profiles/node_modules/dsh-agenttask/
#       ② web profile 补丁 → ~/.dsh/profiles/web/cordis.patch.yml (insert 去重)
#       ③ skill → ~/.agents/skills/dsh-agenttask-skill/SKILL.md
#       ④ 重启脚本 → $PREFIX/bin/dsh-web-restart (缺失才生成)
# ============================================================
set -euo pipefail

P='[agenttask]'
BASE="https://raw.githubusercontent.com/knGear/dsh-agenttask/main/agenttask"
PLUGIN_DIR="$HOME/.dsh/profiles/node_modules/dsh-agenttask"
PATCH_FILE="$HOME/.dsh/profiles/web/cordis.patch.yml"
SKILL_FILE="$HOME/.agents/skills/dsh-agenttask-skill/SKILL.md"
RESTART_BIN="${PREFIX:-/nonexistent}/bin/dsh-web-restart"
IS_TERMUX=0
[ -n "${PREFIX:-}" ] && [ -d "$PREFIX" ] && IS_TERMUX=1
SRC="${1:-}"

echo "$P 1/4 安装插件 dsh-agenttask ..."
mkdir -p "$PLUGIN_DIR"
if [ -n "$SRC" ] && [ -d "$SRC" ]; then
  for f in index.js client.js package.json; do
    [ -f "$SRC/$f" ] && cp -f "$SRC/$f" "$PLUGIN_DIR/$f" && echo "  $f ✓ (本地)" || echo "  $f 缺失 ⚠️"
  done
else
  for f in index.js client.js package.json; do
    curl -fsSL -o "$PLUGIN_DIR/$f" "$BASE/$f" && echo "  $f ✓ (raw)" || echo "  $f 下载失败 ⚠️"
  done
fi

echo "$P 2/4 挂载 cordis.patch.yml ..."
mkdir -p "$(dirname "$PATCH_FILE")"
if [ ! -f "$PATCH_FILE" ]; then
  cat > "$PATCH_FILE" <<'PATCH'
- insert:
    - id: dsh-agenttask
      name: 'dsh-agenttask'
PATCH
  echo "  已生成 $PATCH_FILE"
elif ! grep -q "id: dsh-agenttask" "$PATCH_FILE"; then
  printf '\n- insert:\n    - id: dsh-agenttask\n      name: dsh-agenttask\n' >> "$PATCH_FILE"
  echo "  已挂载 dsh-agenttask"
else
  echo "  已挂载(跳过)"
fi

echo "$P 3/4 部署 skill ..."
mkdir -p "$(dirname "$SKILL_FILE")"
if [ -n "$SRC" ] && [ -f "$SRC/SKILL.md" ]; then cp -f "$SRC/SKILL.md" "$SKILL_FILE"; echo "  SKILL.md ✓ (本地)"
elif curl -fsSL -o "$SKILL_FILE" "$BASE/SKILL.md"; then echo "  SKILL.md ✓ (raw)"
else echo "  SKILL.md 下载失败 ⚠️"; fi

echo "$P 4/4 确保重启脚本 ..."
if [ "$IS_TERMUX" != 1 ]; then
  echo "  非 Termux, 跳过 (dsh-web-restart 仅 Termux 需要)"
elif [ ! -s "$RESTART_BIN" ]; then
  cat > "$RESTART_BIN" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
# dsh-web-restart: 重启 dsh web (由 dsh-agenttask /api/dshm-restart-go 调用)
BIN=$PREFIX/lib/node_modules/@deepseek-ai/dsh/lib/bin.js
LOG="\\$HOME/.cache/dsh-web.log"
sleep 1
PID=\\$(pgrep -f "^node .*lib/bin\\.js web" | head -1)
if [ -n "\\$PID" ]; then
  kill "\\$PID"
  for _ in \\$(seq 1 30); do
    kill -0 "\\$PID" 2>/dev/null || break
    sleep 0.5
  done
fi
sleep 1
mkdir -p "\\$HOME/.cache"
nohup node --expose-internals "\\$BIN" web >> "\\$LOG" 2>&1 &
EOF
  chmod +x "$RESTART_BIN"
  echo "  已生成 $RESTART_BIN"
else
  echo "  已存在(跳过)"
fi

echo "$P 完成。重启 dsh web 后生效"
