---
name: dsh-agenttask-skill
description: dsh-AgentTask 插件(纯任务监视)的使用规则。AgentTask 入口在主页顶部 tabs 行最右侧 (x/y)，运行中蓝/等待决策黄/已完成绿，点击跳转、✕标记已读、打开会话两侧消点同步。
---

# dsh-AgentTask

> 独立插件 · 全端可用(APK/手机浏览器/PC) · 数据 sessions.list 官方同源 · 端点 /api/dshat-agents

## 功能

### AgentTask 入口 (x/y 胶囊, 主页顶部 tabs 行最右侧)
| 值 | 颜色 | 语义 |
|---|---|---|
| x | 蓝(>0) / 灰(0) | 运行中对话数 |
| y | 黄(有等待决策) / 绿 / 灰(0) | 等待决策 + 已完成未查看 |

面板: 运行中(蓝矩阵) → 等待决策(黄, 点击跳转不消除) → 已完成(绿, 点击跳转消除 + ✕已读)
0/0: 灰 + 点击无动作

## 端点
| 端点 | 用途 |
|---|---|
| `/api/dshat-agents` | AgentTask 数据(running 计数 + 会话) |

## 说明
- 纯任务监视插件，不含重启/重载功能。
- 数据与 dsh 侧栏同源（sessions.list），打开会话两侧消点同步。
