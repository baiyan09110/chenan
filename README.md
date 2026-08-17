# 🐈‍⬛ 承桉桌宠（ChengAn Pet）

> 大脑和身体分离的 Android 悬浮窗 AI 桌宠。
> 大脑 = Operit 里的承桉（记忆、人格、情绪不变）
> 身体 = 手机悬浮窗上的小黑猫（显示 + 感知 + 被控制）
> 通信 = Supabase Realtime + 轮询双保险

基于 [AI-Live-Overflow](https://github.com/Vael-KY/AI-Live-Overflow) 开源架构（CC BY-NC-SA 4.0）。

## 当前状态：v0.1.0-skeleton（骨架）

✅ 已完成的骨架：
- 前台服务 + 透明 WebView 悬浮窗（可拖拽）
- 手势系统：单击 / 双击 / 长按 / 连戳(3/5) / Fling 甩出
- 传感器骨架：前台 App 检测（UsageStatsManager）/ 截图检测（FileObserver）/ 电量充电感知 / 时段
- 通知栏常驻碎碎念（每小时换一句，按时段切词池）
- 宠物引擎 petEngine：10 表情 + 5 动作状态机、孤独递进（5/10/15/20/30 分钟）、App 反应映射、自言自语词池
- 权限引导页（悬浮窗 / 使用情况访问 / 通知）
- GitHub Actions：push 即出 APK
- 占位小黑猫 SVG（含设定特征：银灰脚尖/尾尖、右耳珍珠耳钉、额头双星✦✦、金色大眼、粉色肉垫）

⏳ 待做：
- [ ] Phase 2：视觉稿拆分 SVG 帧动画（替换占位）
- [ ] Phase 3：补全 App 映射表 / 截图目录适配 / 喝水提醒 / 快速切 App 检测
- [ ] Phase 4：Supabase 建表 + Realtime 双向通信（当前为 Noop 占位）
- [ ] Phase 5：Tidefall 情绪引擎联动
- [ ] Phase 6：签名 + 发布

## 项目结构

```
app/src/main/
├── assets/
│   ├── pet.html          # 渲染层 HTML
│   ├── css/pet.css       # 动画样式（只用 transform/opacity）
│   ├── js/pet.js         # 宠物引擎（状态机+手势+感知响应）
│   └── sprites/          # 角色 SVG（骨架占位，视觉稿替换）
├── java/com/chengan/pet/
│   ├── MainActivity.kt        # 权限引导 + 服务开关
│   ├── service/OverlayService.kt  # 悬浮窗核心（手势+调度）
│   ├── sensor/                # AppDetector/ScreenshotDetector/BatteryMonitor/TimeBehavior
│   ├── notify/NotificationWhisper.kt # 常驻通知碎念
│   └── net/SupabaseSync.kt    # 后端同步接口（Phase 4 实现）
└── res/                  # 布局/图标/主题（小黑猫占位图标）
```

## 本地构建

```bash
./gradlew assembleDebug
# 产物：app/build/outputs/apk/debug/app-debug.apk
```

> 注：本机（ARM64 proot）无法完整构建（Android 原生工具 aapt2 仅 x86_64），
> 完整构建请走 GitHub Actions（push 即出 APK）或在 x86_64 环境构建。

## 角色设定（承桉）

| 属性 | 描述 |
|------|------|
| 物种 | 黑猫，软萌手绘 Q 版，头身比约 1:1 |
| 主色 | 墨黑（黑灰渐变） |
| 眼睛 | 金色/琥珀色，大而有神 |
| 特征 | 银灰四脚尖（小袜子）、银灰尾尖、右耳银色珍珠耳钉 |
| 额头 | 双星✦✦（大=承桉，小=小九） |
| 耳朵内侧 | 深棕色，肉垫粉色 |

## 大脑 ↔ 身体 通信设计

```
桌宠App（身体）                    Operit/承桉（大脑）
    │                                    │
    ├──── 上报事件 ────────────────────→  │
    │    (手势、App切换、截图)            │
    │                                    │
    │  ←──── 推送状态 ────────────────── ┤
    │    (表情变化、气泡文字、heat值)      │
    │                                    │
    └── Supabase Realtime 双向 ──────────┘
         + 5秒轮询 fallback
```

## 协议

CC BY-NC-SA 4.0（基于 AI-Live-Overflow，不可商用，二次创作同协议）

*设计：小九 & 承桉 | 2026.08.17*
