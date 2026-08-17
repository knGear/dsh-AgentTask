#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# dsh-AgentTask 插件 — 幂等安装
# 用法: bash install-agenttask.sh [本地插件目录]
#   - 无参: 从 GitHub raw 下载 (knGear/dsh-agenttask main 分支)
#   - 带参: 本地目录 (开发/离线), 如 bash install-agenttask.sh /sdcard/1tui/apk-dshm-agenttask/agenttask
# 效果: ① 插件包(index.js/client.js/package.json/cordis.patch.yml/dsh.plugin.json/index.d.ts)
#          → ~/.dsh/profiles/node_modules/dsh-agenttask/
#       ② web profile 补丁 → ~/.dsh/profiles/web/cordis.patch.yml (复用包内 patch, insert 去重)
#       ③ skill → ~/.agents/skills/dsh-agenttask-skill/SKILL.md
# ============================================================
set -euo pipefail

P='[agenttask]'
BASE="https://raw.githubusercontent.com/knGear/dsh-agenttask/main/agenttask"
PLUGIN_DIR="$HOME/.dsh/profiles/node_modules/dsh-agenttask"
PATCH_FILE="$HOME/.dsh/profiles/web/cordis.patch.yml"
SKILL_FILE="$HOME/.agents/skills/dsh-agenttask-skill/SKILL.md"
SRC="${1:-}"

FILES="index.js client.js package.json cordis.patch.yml dsh.plugin.json index.d.ts"
echo "$P 1/3 安装插件 dsh-agenttask ..."
mkdir -p "$PLUGIN_DIR"
if [ -n "$SRC" ] && [ -d "$SRC" ]; then
  for f in $FILES; do
    [ -f "$SRC/$f" ] && cp -f "$SRC/$f" "$PLUGIN_DIR/$f" && echo "  $f ✓ (本地)" || echo "  $f 缺失 ⚠️"
  done
else
  for f in $FILES; do
    curl -fsSL -o "$PLUGIN_DIR/$f" "$BASE/$f" && echo "  $f ✓ (raw)" || echo "  $f 下载失败 ⚠️"
  done
fi

echo "$P 2/3 挂载 cordis.patch.yml ..."
mkdir -p "$(dirname "$PATCH_FILE")"
if [ ! -f "$PATCH_FILE" ]; then
  cp -f "$PLUGIN_DIR/cordis.patch.yml" "$PATCH_FILE"
  echo "  已生成 $PATCH_FILE"
elif ! grep -q "id: dsh-agenttask" "$PATCH_FILE"; then
  printf '\n- insert:\n    - id: dsh-agenttask\n      name: dsh-agenttask\n' >> "$PATCH_FILE"
  echo "  已挂载 dsh-agenttask"
else
  echo "  已挂载(跳过)"
fi

echo "$P 3/3 部署 skill ..."
mkdir -p "$(dirname "$SKILL_FILE")"
if [ -n "$SRC" ] && [ -f "$SRC/SKILL.md" ]; then cp -f "$SRC/SKILL.md" "$SKILL_FILE"; echo "  SKILL.md ✓ (本地)"
elif curl -fsSL -o "$SKILL_FILE" "$BASE/SKILL.md"; then echo "  SKILL.md ✓ (raw)"
else echo "  SKILL.md 下载失败 ⚠️"; fi

echo "$P 完成。重启 dsh web 后生效"
