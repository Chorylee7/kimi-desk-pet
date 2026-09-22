# 🐾 Desk Pet · Kimi Code 桌面宠物

在桌面上养一只会互动的 AI 桌宠。Kimi Code agent 可以让它说话、做表情、走到指定位置、切换形象；会话开始和命令失败时它还会主动打招呼 / 安慰你。

基于 [Chorylee7/desk-pet](https://github.com/Chorylee7/desk-pet)（Electron）封装为 Kimi Code 插件。

## 功能

- 📊 **任务状态外显**：Kimi Code 干活时宠物头顶转 ⚙️，本轮完成 ✅，失败 ❌ + 安慰，后台任务完成 ❗ 提醒，按 Esc 打断则收起
- 🖱️ **点击聚焦**：单击宠物把 Kimi Code 窗口带到前台（对标 Codex 宠物；设置里可切回互动模式）
- 🎭 **多种形象**：小猫 / 小狗 / 史莱姆 / 小兔 / 外星人 / 拼豆鸭（点几下拼豆 → 熨烫 → 撕纸诞生 🦆），支持导入自定义图片
- 🗣️ **agent 驱动**：`pet_say` 说话、`pet_mood` 表情（happy/sad/angry/dizzy/sleepy/think/love）、`pet_animate` 动作、`pet_move` 走到屏幕任意位置、`pet_task` 状态徽标、`pet_set` 换形象/调尺寸/开关随机走动
- 👋 **主动互动**：会话开始打招呼；Bash 命令失败时安慰（带 20 秒冷却，不会刷屏）
- 🖱️ **经典桌宠体验**：悬浮置顶、拖拽、点击互动（跳跃/转圈/爱心粒子）、随机走动
- ♻️ **常驻共享**：宠物是独立进程，CLI 会话结束后留在桌面；多个会话共享同一只

## 安装

需要 Node.js ≥ 18 和 npm（首次使用会自动下载 Electron，国内网络慢可设 `ELECTRON_MIRROR=https://mirrors.huaweicloud.com/electron/`）。

在 Kimi Code 里执行：

```
/plugins install https://github.com/Chorylee7/kimi-desk-pet
```

然后 `/reload` 或开新会话。也可以用本地路径 `/plugins install <本目录>` 进行开发调试。

首次调用宠物工具或新会话开始时，会自动安装依赖并启动宠物（可能需要几十秒）。托盘菜单可切换形象、打开设置、退出。

## 使用

直接对 Kimi Code 说：

- “让宠物说句加油”
- “任务完成了，让猫庆祝一下”
- “把宠物换成拼豆鸭 / 调大一点 / 关掉随机走动”
- “宠物走到屏幕右上角”

agent 可用工具：`pet_status` `pet_show` `pet_hide` `pet_say` `pet_mood` `pet_animate` `pet_move` `pet_set` `pet_quit`，详见 `skills/desk-pet/SKILL.md`。

## 架构

```
kimi.plugin.json        # 插件 manifest（skills / mcpServers / hooks）
mcp/server.mjs          # stdio MCP server：发现/拉起宠物进程，转发指令
mcp/hooks/notify.mjs    # 生命周期 hooks：任务状态徽标（⚙️✅❌❗）、会话打招呼、失败安慰
app/                    # Electron 桌宠（透明置顶窗 + 气泡窗 + 设置窗）
  bridge.js             # 127.0.0.1 HTTP bridge（token 鉴权），状态写入 $KIMI_CODE_HOME/desk-pet/bridge.json
skills/desk-pet/        # agent 使用指南
marketplace.json        # 自定义市场 catalog 示例
```

通信链路：`agent → MCP tool → mcp/server.mjs → HTTP bridge → Electron 主进程 → IPC → 渲染动画`。宠物以 detached 进程常驻，MCP server 每次先 ping 已有实例，活着就复用。

## 开发

```bash
cd app && npm install && npm start   # 单独跑桌宠
cd app && npm run smoke              # 冒烟测试（3 秒自退）
cat kimi.plugin.json                 # 检查 manifest
```

调试日志：`$KIMI_CODE_HOME/desk-pet/mcp.log`（npm 安装日志同目录 `npm-install.log`）。

## 上架

- **GitHub 直装**：已支持 `/plugins install <repo-url>`（本 README 安装一节）。
- **Curated 市场**：`/plugins` 的 Curated 页由 Kimi 合作方审核上架，可通过[官方 contact 渠道](https://www.kimi.com/code/docs/en/kimi-code/contact-and-feedback.html)提交申请。
- **自定义市场**：把 `marketplace.json` 放到任意 URL，用户执行 `/plugins marketplace <url>` 即可浏览安装。

## License

[Apache License 2.0](LICENSE)
