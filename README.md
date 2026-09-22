# 🐾 Desk Pet · Kimi Code 桌面宠物

在桌面上养一只会互动的 AI 桌宠。Kimi Code agent 可以让它说话、做表情、走到指定位置、切换形象；会话开始和命令失败时它还会主动打招呼 / 安慰你。

基于 [Chorylee7/desk-pet](https://github.com/Chorylee7/desk-pet)（Electron）封装为 Kimi Code 插件。

## 功能

- 📊 **任务状态外显**：Kimi Code 干活时宠物头顶 HUD 胶囊转 ⚙️ 蓝光，本轮完成 ✅ 绿光，失败 ❌ 红光 + 安慰，后台任务完成 ❗ 橙光提醒，按 Esc 打断则收起
- 🖱️ **点击聚焦**：单击宠物把 Kimi Code 窗口带到前台（对标 Codex 宠物；设置里可切回互动模式）
- 🤖 **科技感机器人**：默认形象是银色小机器人（青色发光目镜/天线/耳机），另有小猫 / 小狗 / 史莱姆 / 小兔 / 外星人 / 拼豆鸭（点几下拼豆 → 熨烫 → 撕纸诞生 🦆），支持导入自定义图片
- 🗣️ **agent 驱动**：`pet_say` 说话、`pet_mood` 表情（happy/sad/angry/dizzy/sleepy/think/love）、`pet_animate` 动作、`pet_move` 走到屏幕任意位置、`pet_task` 状态徽标、`pet_set` 换形象/调尺寸/开关随机走动
- 👋 **主动互动**：会话开始打招呼；Bash 命令失败时安慰（带 20 秒冷却，不会刷屏）
- 🖱️ **经典桌宠体验**：悬浮置顶、拖拽、点击互动（跳跃/转圈/爱心粒子）、随机走动
- ♻️ **常驻共享**：宠物是独立进程，CLI 会话结束后留在桌面；多个会话共享同一只

## 快速上手

**1. 安装插件**（需要 Node.js ≥ 18 和 npm）

在 Kimi Code 里执行：

```
/plugins install https://github.com/Chorylee7/kimi-desk-pet
```

然后 `/reload` 或开新会话。

**2. 等宠物出现**

首次使用会自动下载 Electron 并启动宠物（几十秒，取决于网络；国内慢可设 `ELECTRON_MIRROR=https://mirrors.huaweicloud.com/electron/` 后重试）。新会话开始时宠物会跟你打招呼——看到它，就说明一切就绪。

**3. 直接用**

随便对 Kimi Code 说一句“让宠物打个招呼”，剩下的交给 agent。无需记任何命令。

> 开发调试可以 `/plugins install <本地路径>`，但注意本地安装会复制到受管目录，改源码后需重装。

## 使用指南

直接用自然语言描述，agent 会自动选择合适的工具：

| 你说什么 | 宠物会… |
| --- | --- |
| “让宠物说句加油” | 弹出气泡说话 |
| “任务完成了，让它庆祝一下” | 开心动画 + 撒花 |
| “把宠物换成小猫 / 拼豆鸭 / 大一点的” | 切换形象 / 调尺寸 |
| “让宠物走到屏幕右上角 / 来我鼠标这边” | 平滑走到指定位置 |
| “宠物现在什么状态？” | 汇报存活、形象、位置 |
| “别让它乱走了 / 隐藏一下 / 退掉吧” | 关闭随机走动 / 隐藏 / 退出 |

agent 侧有 11 个 MCP 工具可用：`pet_status` `pet_show` `pet_hide` `pet_say` `pet_mood` `pet_animate` `pet_move` `pet_set` `pet_task` `pet_focus` `pet_quit`，详见 `skills/desk-pet/SKILL.md`。

**手动入口**：右键（macOS 点按菜单栏）托盘图标可切换形象、开关随机走动、打开设置、退出；单击宠物会把 Kimi Code 窗口带到前台。

## 自定义形象

**内置形象**（托盘菜单「选择形象」或设置窗里切换）：

| 形象 | 特点 |
| --- | --- |
| 🤖 机器人（默认） | 科技感，青色发光目镜，任务状态动效最全 |
| 🐱🐶🐰👽🟢 猫/狗/兔/外星人/史莱姆 | 经典卡通，点击有跳跃/转圈小动画 |
| 🦆 拼豆鸭 | 小游戏：点几下拼豆 → 熨烫 → 撕纸，鸭子诞生 |
| 🖼️ 自定义 | 用你自己的图片当宠物 |

**导入自己的图**（两种方式）：

1. 直接把图片文件**拖到宠物身上**——立刻生效；
2. 打开**设置窗**（托盘菜单 → 设置…）→「＋ 导入自定义图片」。

支持格式：**PNG / GIF（动图）/ JPG / WebP / SVG / BMP**，建议透明底、正方形构图，显示尺寸 80–400px 可调。

## 常见问题

**Q：安装后宠物没出现？**
首次启动要下载 Electron（约 100MB），耐心等一会儿；任何一次工具调用或新会话都会触发启动。看日志：`$KIMI_CODE_HOME/desk-pet/mcp.log`。

**Q：点击宠物没反应 / 弹权限框？**
macOS 首次点击会请求「自动化」权限（系统设置 → 隐私与安全性 → 自动化 → 允许桌宠控制“System Events”）。允许后点击即可把 Kimi Code 带到前台。

**Q：宠物被我不小心关了？**
托盘图标还在就没事：托盘菜单 →（宠物会自动在下次会话/工具调用时重新拉起）。想彻底退出：托盘菜单 → 退出。

**Q：多个 Kimi Code 会话会怎样？**
它们共享同一只宠物。任务状态以“最近事件”为准；手动 `pet_say` 等操作各会话都能用。

**Q：Windows 能用吗？**
代码是跨平台的，但只在 macOS 上实测过。Windows 首次使用同样自动装 Electron；点击聚焦用 PowerShell 实现。

**Q：状态徽标都代表什么？**

| 徽标 | 含义 |
| --- | --- |
| 🔵 工作中 | Kimi Code 正在执行任务 |
| 🟢 完成 | 本轮正常结束 |
| 🔴 出错 | 本轮失败（宠物会安慰你） |
| 🟠 提醒 | 后台任务完成，来看看结果 |

## 架构

```
kimi.plugin.json        # 插件 manifest（skills / mcpServers / hooks）
mcp/server.mjs          # stdio MCP server：发现/拉起宠物进程，转发指令
mcp/hooks/notify.mjs    # 生命周期 hooks：任务状态徽标、会话打招呼、失败安慰
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
