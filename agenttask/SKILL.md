---
name: dsh-agenttask-skill
description: dsh-AgentTask 插件(任务监视 + 进阶重启)的使用规则。AgentTask 入口在主页顶部 tabs 行最右侧 (x/y)，运行中蓝/等待决策黄/已完成绿，点击跳转、✕标记已读、打开会话两侧消点同步。进阶重启: AI 触发经 dshat_restart 工具，触发前必须阅读铁律；有他人运行弹窗等用户允许/拒绝，结果回传 agent。
---

# dsh-AgentTask

> 独立插件 · 全端可用(APK/手机浏览器/PC) · 数据 sessions.list 官方同源 · 端点一律 /api/dshat-*

## 功能

### AgentTask 入口 (x/y 胶囊, 主页顶部 tabs 行最右侧)
| 值 | 颜色 | 语义 |
|---|---|---|
| x | 蓝(>0) / 灰(0) | 运行中对话数 |
| y | 黄(有等待决策) / 绿 / 灰(0) | 等待决策 + 已完成未查看 |

面板: 运行中(蓝矩阵) → 等待决策(黄, 点击跳转不消除) → 已完成(绿, 点击跳转消除 + ✕已读)
0/0: 灰 + 点击无动作

### 进阶重启按钮 (sidebar.footer.action, priority -10 shadow 普通版)
- 点击: 重载前端; 长按(移动端)/右键(鼠标): 重启
- 用户长按: 有任何运行(含当前) → 确认窗显示运行列表; 无运行 → 普通确认(标题+两按钮)
- AI 触发(dshat_restart 工具): 无他人运行 → 直接重启; 有他人运行 → 确认窗等用户允许/拒绝, 结果回传 agent

## 端点
| 端点 | 用途 |
|---|---|
| `/api/dshat-reload-sse` | SSE 通道(reload / JSON restart 帧带 reqId + sessionId) |
| `/api/dshat-restart-confirm` | 前端回传 allow/deny |
| `/api/dshat-restart-go` | 用户主动重启的实际执行 |
| `/api/dshat-agents` | AgentTask 数据(running 计数 + 会话) |

## 工具
- `dshat_reload`: 重载前端，非截断，可随时使用。
- `dshat_restart`: 重启 dsh。仅限当前会话的最后一步调用；调用即截断所有对话；调用后不得继续等待、不得继续任何后续动作。有他人运行时先经用户 allow/deny，结果回传 agent；无他人运行时直接重启。

## 触发重启时必须先阅读
当出现以下任一情况时，必须先重新阅读本文件的“铁律”和 `dshat_restart` 工具说明，再决定是否调用：
- 用户或其它 agent 要求重启 dsh
- 自己判断需要重启 dsh
- 正在评估是否调用 `dshat_restart`

## 铁律: restart ≈ 截断
- 重启杀 host、中断所有对话，不可逆。
- AI 只能在当前会话的最终/末尾步骤调用 `dshat_restart`。
- 调用后即截断，不能继续等待、不能继续任何后续动作。
- 有他人运行时必须等待用户允许/拒绝；用户拒绝则放弃，不得再次尝试。
- 无他人运行时可以不经确认直接重启，但仍必须满足“末尾调用”约束。
- 重启只能走 `dshat_restart` 工具；不要用 shell 直接执行 `dsh-web-restart` 或 kill dsh 进程，容易变成 kill 后起不来，且绕过确认流程。
