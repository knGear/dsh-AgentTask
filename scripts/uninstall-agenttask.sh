#!/data/data/com.termux/files/usr/bin/bash
# dsh-AgentTask 插件 — 卸载
set -euo pipefail
P='[agenttask]'
PLUGIN_DIR="$HOME/.dsh/profiles/node_modules/dsh-agenttask"
PATCH_FILE="$HOME/.dsh/profiles/web/cordis.patch.yml"
SKILL_DIR="$HOME/.agents/skills/dsh-agenttask-skill"

[ -d "$PLUGIN_DIR" ] && rm -rf "$PLUGIN_DIR" && echo "$P 1/3 已删插件" || echo "$P 1/3 插件不存在"
if [ -f "$PATCH_FILE" ]; then
  python3 - "$PATCH_FILE" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
parts = s.split('\n')
out, i = [], 0
while i < len(parts):
    line = parts[i]
    if line.strip().startswith('- insert:'):
        j = i + 1
        block = [line]
        while j < len(parts) and (parts[j].startswith('    ') or parts[j].strip() == ''):
            block.append(parts[j]); j += 1
        if 'dsh-agenttask' in '\n'.join(block):
            i = j
            continue
        out.extend(block); i = j
        continue
    out.append(line); i += 1
open(p, 'w', encoding='utf-8').write(re.sub(r'\n{3,}', '\n\n', '\n'.join(out)))
print('  patch 已移除 dsh-agenttask')
PY
else
  echo "$P 2/3 patch 不存在"
fi
[ -d "$SKILL_DIR" ] && rm -rf "$SKILL_DIR" && echo "$P 3/3 已删 skill" || echo "$P 3/3 skill 不存在"
echo "$P 完成。重启 dsh web 后完全移除"
