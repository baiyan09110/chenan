# ChengAn Pet

Chinese documentation: [README.zh-CN.md](README.zh-CN.md)

> An Android floating-window AI desktop pet with a separated brain-and-body architecture.
> The brain is an external agent integration that owns memory, personality, and affective state.
> The body is a small black cat that renders state, senses device context, and receives interaction.
> Communication uses Supabase Realtime with polling as a fallback.

Based on the open-source architecture of [AI-Live-Overflow](https://github.com/Vael-KY/AI-Live-Overflow), under CC BY-NC-SA 4.0.

## Current status: v0.1.0-skeleton

Implemented in the current skeleton:
- Foreground service and draggable transparent WebView overlay.
- Gesture system: single tap, double tap, long press, 3/5-tap sequences, and fling.
- Sensor skeleton: foreground-app detection (`UsageStatsManager`), screenshot detection (`FileObserver`), charging state, and time-of-day behavior.
- Persistent notification whispers, rotating hourly and selected by time of day.
- `petEngine` with 10 emotion states, 5 action states, loneliness progression at 5/10/15/20/30 minutes, app-response mapping, and self-talk phrase pools.
- Permission guidance for overlay, usage access, and notifications.
- GitHub Actions workflow that produces an APK on push.
- Placeholder black-cat SVG with silver-gray paws and tail tip, a right-ear pearl, two forehead stars, golden eyes, and pink paw pads.

Planned work:
- [ ] Phase 2: split visual designs into SVG animation frames and replace the placeholder.
- [ ] Phase 3: complete app mappings, screenshot-directory support, hydration reminders, and fast app-switch detection.
- [ ] Phase 4: create the Supabase schema and implement bidirectional Realtime communication; currently a no-op placeholder.
- [ ] Phase 5: connect the Tidefall affective engine.
- [ ] Phase 6: signing and release.

## Project structure

```
app/src/main/
├── assets/
│   ├── pet.html          # Rendering layer HTML
│   ├── css/pet.css       # Animation styles using transform/opacity
│   ├── js/pet.js         # Pet engine: state machine, gestures, sensing
│   └── sprites/          # Character SVGs; placeholder skeleton
├── java/com/chengan/pet/
│   ├── MainActivity.kt        # Permission guidance and service toggle
│   ├── service/OverlayService.kt  # Overlay core: gestures and scheduling
│   ├── sensor/                # AppDetector/ScreenshotDetector/BatteryMonitor/TimeBehavior
│   ├── notify/NotificationWhisper.kt # Persistent notification whispers
│   └── net/SupabaseSync.kt    # Backend sync interface; Phase 4
└── res/                  # Layouts, icons, and themes
```

## Local build

```bash
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

> On the original ARM64 proot environment, a complete build is unavailable because
> the Android native tool `aapt2` is x86_64-only. Use GitHub Actions or an x86_64
> environment for a complete build.

## Character specification

| Attribute | Description |
|------|------|
| Species | Black cat, hand-drawn chibi style, approximately 1:1 head-to-body ratio |
| Primary color | Ink black with a dark-gray gradient |
| Eyes | Large gold/amber eyes |
| Distinguishing details | Silver-gray paws and tail tip; silver pearl earring on the right ear |
| Forehead | Two stars |
| Inner ears and paws | Dark brown inner ears and pink paw pads |

## Brain ↔ body communication

```
Pet app (body)                     External agent integration (brain)
    │                                    │
    ├──── report events ────────────────→  │
    │    (gestures, app switches, screenshots)
    │                                    │
    │  ←──── push state ──────────────── ┤
    │    (expression, bubble text, heat value)
    │                                    │
    └── Supabase Realtime bidirectional ──┘
         + 5-second polling fallback
```

## License

CC BY-NC-SA 4.0, inherited from the AI-Live-Overflow-based architecture. Commercial use is not permitted; derivative works must use the same license.
