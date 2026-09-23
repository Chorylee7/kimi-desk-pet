---
name: desk-pet
description: 控制桌面宠物（Desk Pet）。当用户想让桌宠说话、做表情、走动、换形象，或希望在任务完成/失败时让宠物互动时使用。
---

# Desk Pet 桌面宠物

桌面上有一只常驻的 Electron 宠物（猫/狗/史莱姆/兔/外星人/拼豆鸭）。本插件通过 MCP 工具驱动它。

## 可用工具（namespace: desk-pet）

| 工具 | 用途 |
| --- | --- |
| `pet_status` | 查看宠物是否存活、当前形象、尺寸、位置 |
| `pet_say` | 让宠物用气泡说话（≤60 字），可附带 mood |
| `pet_mood` | happy / sad / angry / dizzy / sleepy / think / love |
| `pet_animate` | jump / spin / happy / shake |
| `pet_move` | 平滑走到屏幕坐标（不传则到主屏幕中央） |
| `pet_set` | 换形象（cat/dog/slime/bunny/alien/bead/intj/infp/isfj/estp/custom）、尺寸 80–400、开关随机走动 |
| `pet_show` / `pet_hide` | 显示 / 隐藏（隐藏后用户可在托盘菜单勾回「显示宠物」） |
| `pet_quit` | 退出宠物进程 |
| `pet_task` | 任务状态徽标：thinking 思考中 / working 工作中 / done 完成一闪 / review 待复核(持续) / error 出错 / notice 提醒 / idle |
| `pet_focus` | 把 Kimi Code 窗口带到前台（等同点击宠物） |

首次调用工具时 MCP server 会自动安装依赖并启动宠物（可能需要几十秒，取决于 Electron 下载速度）。宠物常驻桌面，CLI 会话结束后不会退出。

## 任务状态外显（自动）

hooks 自动同步，无需手动调用；`pet_status` 的 `task` 字段可以读到当前值：

- 一轮对话开始 → 思考中 thinking（浅蓝）
- 第一个工具调用落地 → 工作中 working（蓝，机器人目镜发光呼吸）
- 本轮正常结束 → 待复核 review（琥珀色常驻，用户点宠物或开新一轮才收起）
- 本轮失败 → 出错 error + 难过动画 + 安慰
- 用户打断（Esc）→ 徽标隐藏
- 后台任务完成 → 提醒 notice + 气泡

`pet_task` 的 `done` 只用于 agent 主动汇报“这一步做完了”，一闪而过（2.5 秒）；它不代表回合结束——
回合结束的徽标由 hooks 统一发成 `review`，别用 `done` 去抢这个语义。

## 点击宠物

默认单击宠物 = 把 Kimi Code 窗口带到前台（macOS 首次会请求「自动化」权限，允许即可）。设置窗可改为“互动”或“两者都要”。
无论哪种模式，点击都会清掉「待复核」徽标。

## 什么时候用

- 用户明确要求宠物做事（“让猫说句加油”）。
- 庆祝时刻：任务/测试/构建成功时 `pet_say` 一句 + `happy`。
- 安抚时刻：明显失败（测试全红、构建失败）时 `pet_say` 安慰 + `sad`。
- 长任务开始或结束时同步一次进度。

## 克制原则（重要）

- 默认不主动打扰；上面“庆祝/安抚”只在结果明确且重要时各用一次。
- 同一任务里连续调用 pet 工具不超过 2 次。
- 不确定宠物是否在运行时先 `pet_status`；不在且确有需要再让其他工具拉起。
- 不要替用户 `pet_quit`，除非用户要求。
