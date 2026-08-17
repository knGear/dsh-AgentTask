# dsh-AgentTask

dsh 任务监视插件（纯任务监视，无重启/重载）。全端可用（APK / 手机浏览器 / PC）。

> Topic: [dsh-plugin](https://github.com/topics/dsh-plugin)

## 功能

### AgentTask 入口
主页顶部 tabs 行最右侧 **(x/y)** 胶囊：

| 值 | 颜色 | 语义 |
|---|---|---|
| x | 蓝 / 灰(0) | 运行中对话数 |
| y | 黄(有等待决策) / 绿 / 灰(0) | 等待决策 + 已完成未查看 |

点开面板：**运行中**（蓝矩阵）→ **等待决策**（黄，点击跳转不消除）→ **已完成**（绿，点击跳转消除 + ✕ 标记已读）。
数据与侧栏同源（`sessions.list`），打开会话两侧消点同步。

## 截图

| 截图 | 说明 |
|---|---|
| <img src="screenshots/agent%20task主页.png" width="260"> | AgentTask 主页顶部入口 |
| <img src="screenshots/agent%20task按钮.png" width="260"> | 顶部 (x/y) 计数胶囊 |

## 安装

### 标准安装（Profile Bundle，推荐）

```sh
# web profile
dsh plugin --profile web add github:knGear/dsh-AgentTask

# headless profile（dsh run 默认使用）
dsh plugin --profile headless add github:knGear/dsh-AgentTask
```

装完重启 `dsh --profile web` 生效；包内 `cordis.patch.yml` 会自动把插件加入 profile layer stack。

### 增强安装（Termux 一键，含 skill）

```bash
# 已有 dsh 环境 (Termux)
bash <(curl -fsSL https://raw.githubusercontent.com/knGear/dsh-agenttask/main/scripts/install-agenttask.sh)

# 本地/开发
bash scripts/install-agenttask.sh /path/to/agenttask

# 卸载
bash <(curl -fsSL https://raw.githubusercontent.com/knGear/dsh-agenttask/main/scripts/uninstall-agenttask.sh)
```

> 手动安装与旧版本兼容：增强脚本把插件包复制进 `~/.dsh/profiles/node_modules/dsh-agenttask/` 并挂载同款 patch，效果与标准安装一致，额外部署 SKILL。

装完重启 dsh web 生效。

## 结构

```
agenttask/        插件包(index.js host + client.js + package.json + SKILL.md + cordis.patch.yml + dsh.plugin.json + index.d.ts)
scripts/          install-agenttask.sh / uninstall-agenttask.sh
```

## 端点

| 端点 | 用途 |
|---|---|
| `/api/dshat-agents` | AgentTask 数据（运行中计数 + 会话） |
