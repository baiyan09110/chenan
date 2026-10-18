# ChengAn Pet — Progress Report

> Date: 2026-08-17  
> Architecture reference: [AI-Live-Overflow](https://github.com/Vael-KY/AI-Live-Overflow) (CC BY-NC-SA 4.0)  
> Repository: https://github.com/baiyan09110/chenan

---

## 1. Project overview

An Android floating-window AI desktop pet: a small black cat that can detect the foreground app, react to touch, speak according to time-of-day, and sleep when it becomes lonely.

**Core idea: separate brain and body**

- Brain = an external agent integration that owns memory, personality, and affective state.
- Body = the small black cat in the floating window that renders, senses, and receives control.
- Communication = Supabase Realtime (planned).

---

## 2. Completed ✅

### 2.1 Engineering skeleton (Phase 1)

- [x] Android project setup (Kotlin + Gradle + AGP 8.2.2, minSdk 26 / targetSdk 34).
- [x] Foreground overlay service with transparent, draggable WebView rendering.
- [x] Permission guidance for overlay, usage access, and notifications.
- [x] Persistent notification and rotating notification whispers (one new message per hour).
- [x] GitHub Actions automated build (a debug APK is produced on push).

### 2.2 Character engine foundation (Phase 2 prerequisite)

- [x] `petEngine` pet engine (JavaScript state machine).
- [x] Scheduling framework for 10 emotion states and 5 action states.
- [x] Complete gesture system: single tap, double tap, belly-up long press, angry reaction after 3 taps, baring-teeth reaction after 5 taps, and fling-away-then-return behavior.
- [x] Placeholder black cat with silver-gray socks, a pearl earring, two forehead stars, golden eyes, and pink paw pads.
- [x] Bubble system with frosted-glass styling, typewriter reveal, upward growth from above the head, and five color styles.

### 2.3 Sensing and behavior (most of Phase 3)

- [x] Foreground-app detection (`UsageStatsManager`, polled every 3 seconds).
- [x] App-response mapping for 21 apps, including jealousy toward Douyin, positive reactions to Operit, an agitated reaction to ChatGPT, curiosity toward Bilibili, and encouragement for Xuexitong.
- [x] Screenshot detection (`FileObserver`).
- [x] Charging and low-battery awareness.
- [x] Time-of-day behavior with seven dedicated periods, including morning, midday, evening, and late-night sleep prompts.
- [x] Loneliness progression at 5/10/15/20/30 minutes: peeking → paw-licking → yawning → feeling neglected → falling asleep.
- [x] Self-talk phrase pools: all four pools, automatic time-based pool selection, and easter eggs.

### 2.4 Basic validation

- [x] On-device installation testing passed; overlay, gestures, app integration, and notifications behaved as expected.
- [x] Android 14 compatibility fixes completed for foreground-service permissions and broadcast registration flags.

---

## 3. Incomplete ⏳

### Visual assets (Phase 2 core, next step)

- [ ] Final character SVG assets (10 emotion states + 5 action frames); requirements documentation is ready and asset generation is pending.
- [ ] Integrate the assets into the rendering engine and replace the placeholder cat.
- [ ] Polish emotion/action details, animation timing, and transitions.

### Backend communication (Phase 4)

- [ ] Create the Supabase schema; SQL is designed for `pet_state`, `pet_events`, and `pet_config`, pending repair of the MCP database credentials.
- [ ] Upload pet events (gestures/app changes/screenshots → Supabase).
- [ ] Push brain state (expressions/bubbles → real-time pet response).
- [ ] Add the 5-second polling fallback.

### Affect and integration (Phase 5)

- [ ] Connect the Tidefall affective engine (`valence/arousal` → expression/action); optional.
- [ ] Connect the Operit agent integration (gentle checks and affective state → pet reactions).
- [ ] Add hydration reminders (every 2 hours, with increasingly insistent reminders when unconfirmed).

### Behavior completion

- [ ] Detect rapid app switching (three apps within 60 seconds → juggling mode).
- [ ] Add a random behavior every 20 minutes, with a 30% chance of choosing an action appropriate to the time of day.

### Release (Phase 6)

- [ ] Automate signing with a keystore stored in GitHub Secrets.
- [ ] Produce a release APK.

---

## 4. Next steps

1. **Visual assets:** generate the SVG asset pack → integrate it into the rendering engine → polish on a physical device.
2. **Supabase:** repair the MCP database credentials → create the three tables → enable Realtime.
3. **Brain integration:** connect Operit, Supabase, and the pet app so the agent can drive the pet's state.

---

*Credits: see [README.zh-CN.md](README.zh-CN.md) for the original documentation and design credit line.*
