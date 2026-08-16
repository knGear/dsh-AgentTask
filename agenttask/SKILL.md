---
name: dsh-agenttask-skill
description: dsh-AgentTask 插件(任务监视 + 进阶重启)的使用规则。AgentTask 入口在主页顶部 tabs 行最右侧 (x/y)，运行中蓝/等待决策黄/已完成绿，点击跳转、✕标记已读、打开会话两侧消点同步。进阶重启: 无其他对话运行直接重启，有其他运行(含等待决策)弹确认窗+黄色二次警告。
---

# dsh-AgentTask

> 独立插件 · 全端可用(APK/手机浏览器/PC) · 数据 sessions.list 官方同源

## 功能

### AgentTask 入口 (x/y 胶囊, 主页顶部 tabs 行最右侧)
| 值 | 颜色 | 语义 |
|---|---|---|
| x | 蓝(>0) / 灰(0) | 运行中对话数 |
| y | 黄(有等待决策) / 绿 / 灰(0) | 等待决策 + 已完成未查看 |

面板: 运行中(蓝矩阵) → 等待决策(黄, 点击跳转不消除) → 已完成(绿, 点击跳转消除 + ✕已读)
0/0: 灰 + 点击无动作

### 进阶重启按钮 (sidebar.footer.action, priority -10 shadow 普通版)
- 点击: 重载前端; 长按: 重启
- 无其他对话运行 → 直接重启(转圈+读秒+心跳)
- 有其他运行(含等待决策) → 确认窗(标题按 agent/用户) + 黄色二次警告(上限5) → 确认重启

## 端点
| 端点 | 用途 |
|---|---|
| `/api/dshm-reload-sse` | SSE 通道(reload/restart 帧) |
| `/api/dsh-restart` | agent 触发重启(推帧, 等前端分级确认) |
| `/api/dshm-restart-go` | 实际重启执行(前端确认后调用) |
| `/api/dshm-agents` | AgentTask 数据(running 计数 + 会话) |

## 铁律: restart ≈ 截断
重启杀 host、中断所有对话。逻辑已分级(无其他直接/有其他确认)，agent 只能在会话末尾触发，执行后不再等待/继续。
