# dsh-AgentTask

dsh 任务监视 + 进阶重启插件。全端可用（APK / 手机浏览器 / PC）。

## 功能

### AgentTask 入口
主页顶部 tabs 行最右侧 **(x/y)** 胶囊：

| 值 | 颜色 | 语义 |
|---|---|---|
| x | 蓝 / 灰(0) | 运行中对话数 |
| y | 黄(有等待决策) / 绿 / 灰(0) | 等待决策 + 已完成未查看 |

点开面板：**运行中**（蓝矩阵）→ **等待决策**（黄，点击跳转不消除）→ **已完成**（绿，点击跳转消除 + ✕ 标记已读）。
数据与侧栏同源（`sessions.list`），打开会话两侧消点同步。

### 进阶重启按钮（sidebar.footer.action）
- 点击：重载前端；长按(移动端) / 右键(鼠标)：重启
- **无其他对话运行** → 直接重启（转圈+读秒+心跳）
- **有其他运行（含等待决策）** → 确认窗（标题按 agent/用户触发）→ ⚠ 黄色二次警告（上限 5）→ 确认重启
- 文案"刷新/重启"仅侧栏展开时显示

### 与 dshm-ui 共存
都安装时 AgentTask 接管（隐藏 dshm-ui 普通版按钮）；只装 dshm-ui 用普通版。

## 安装

```bash
# 已有 dsh 环境 (Termux)
bash <(curl -fsSL https://raw.githubusercontent.com/knGear/dsh-agenttask/main/scripts/install-agenttask.sh)

# 本地/开发
bash scripts/install-agenttask.sh /path/to/agenttask

# 卸载
bash <(curl -fsSL https://raw.githubusercontent.com/knGear/dsh-agenttask/main/scripts/uninstall-agenttask.sh)
```

装完重启 dsh web 生效。

## 结构

```
agenttask/        插件包(index.js host + client.js + package.json + SKILL.md)
scripts/          install-agenttask.sh / uninstall-agenttask.sh
```

## 端点

| 端点 | 用途 |
|---|---|
| `/api/dshm-reload-sse` | SSE 通道（reload / restart 帧） |
| `/api/dsh-restart` | agent 触发重启（推帧，前端分级确认） |
| `/api/dshm-restart-go` | 实际重启执行（确认后调用） |
| `/api/dshm-agents` | AgentTask 数据（运行中计数 + 会话） |

## 铁律：restart ≈ 截断
重启杀 host、中断所有对话。逻辑已分级（无其他直接 / 有其他确认），agent 只能在会话末尾触发，执行后不再等待/继续。
