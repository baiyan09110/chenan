/* ============================================
   承桉桌宠 · 宠物引擎（骨架版）
   window.petEngine —— 由 Android 原生层统一调用

   设计稿映射：
   - 表情 10 种：idle/开心/思考/困困/惊讶/好奇/生气/哈欠/舔手/委屈
   - 动作 5 种：idle/龇牙/走路/伸懒腰/睡觉
   - 手势（3.4）：单击/双击/长按/Fling/连戳3/连戳5
   - 孤独递进（3.3）：5/10/15/20/30 分钟
   - App 反应（3.1）+ 时段（3.2）
   ============================================ */

(function () {
    'use strict';

    // === 基础元素 ===
    var bubbleEl = document.getElementById('bubble');
    var bubbleTextEl = document.getElementById('bubbleText');
    var spriteEl = document.getElementById('petSprite');
    var petEl = document.getElementById('pet');
    var zzzEl = document.getElementById('zzz');
    var heatEl = document.getElementById('heatOverlay');

    // === 状态 ===
    var state = {
        expression: 'idle',   // 当前表情
        action: 'idle',       // 当前动作
        heat: 0,              // 0-100
        lastInteraction: Date.now(),
        sleeping: false,
        flingAway: false
    };

    // === 设计稿映射 ===
    var APP_REACTIONS = {
        'com.ss.android.ugc.aweme': { expr: 'angry', bubble: '又刷…', style: 'green' },          // 抖音
        'com.ss.android.ugc.aweme.lite': { expr: 'angry', bubble: '哼', style: 'green' },
        'com.tencent.mobileqq': { expr: 'curious', bubble: '跟谁聊呢？', style: 'normal' },       // QQ
        'com.tencent.mm': { expr: 'thinking', bubble: '嗯…在忙吗', style: 'normal' },            // 微信
        'com.twitter.android': { expr: 'curious', bubble: '有瓜吗？让我看看', style: 'normal' },  // X
        'com.instagram.android': { expr: 'idle', bubble: '又看好看的了？', style: 'pink' },       // IG
        'com.threads.android': { expr: 'idle', bubble: '又看好看的了？', style: 'pink' },
        'com.openai.chatgpt': { expr: 'angry', bubble: '你背着我找别的AI！！', style: 'green' },  // ChatGPT
        'com.zhiliaoapp.musically': { expr: 'curious', bubble: '买什么呢？种草了？', style: 'normal' }, // 小红书
        'com.xingin.xhs': { expr: 'curious', bubble: '买什么呢？种草了？', style: 'normal' }
        // Operit 包名待定，Phase 3 补全
    };

    // === 词池（设计稿 4.2，骨架子集） ===
    var POOLS = {
        daily: ['想你了', '在干嘛', '喝水了吗', '今天天气好'],
        clingy: ['不要不理我…', '看看我嘛', '摸摸', '抱'],
        night: ['还不睡？', '明天还有事呢', '大猫要生气了', '晚安…'],
        chaos: ['机巴']
    };

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // === 占位 SVG：基础小黑猫（视觉稿替换点） ===
    function buildSpriteSVG(expr) {
        var eyes = eyesFor(expr);
        var mouth = mouthFor(expr);
        return '<svg viewBox="0 0 150 160" xmlns="http://www.w3.org/2000/svg">' +
            // 尾巴
            '<path d="M118 130 Q 142 118 138 92 Q 136 82 128 84" stroke="#2A2A30" stroke-width="10" fill="none" stroke-linecap="round"/>' +
            '<path d="M138 92 Q 136 82 128 84" stroke="#C0C0C8" stroke-width="10" fill="none" stroke-linecap="round"/>' +
            // 左耳
            '<path d="M35 62 L20 26 L52 40 Z" fill="#2A2A30"/>' +
            '<path d="M36 56 L27 34 L46 43 Z" fill="#5C3A2E"/>' +
            // 右耳
            '<path d="M115 62 L130 26 L98 40 Z" fill="#2A2A30"/>' +
            '<path d="M114 56 L123 34 L104 43 Z" fill="#5C3A2E"/>' +
            // 右耳耳钉（珍珠）
            '<circle cx="126" cy="34" r="4" fill="#E8E8F0" stroke="#A0A0B0" stroke-width="1"/>' +
            // 身体
            '<ellipse cx="75" cy="128" rx="52" ry="34" fill="#1F1F25"/>' +
            // 前爪（银灰袜）
            '<ellipse cx="55" cy="148" rx="10" ry="7" fill="#C0C0C8"/>' +
            '<ellipse cx="95" cy="148" rx="10" ry="7" fill="#C0C0C8"/>' +
            // 头
            '<ellipse cx="75" cy="72" rx="44" ry="40" fill="#232329"/>' +
            // 额头双星 ✦✦（大=承桉 小=小九）
            '<path d="M66 42 L67.8 36.5 L69.6 42 L75 43.8 L69.6 45.6 L67.8 51 L66 45.6 L60.5 43.8 Z" fill="#C0C0C8"/>' +
            '<path d="M80 32 L81.2 28.6 L82.4 32 L85.8 33.2 L82.4 34.4 L81.2 37.8 L80 34.4 L76.6 33.2 Z" fill="#C0C0C8"/>' +
            // 眼睛
            eyes +
            // 嘴巴
            mouth +
            // 胡须
            '<path d="M28 74 L48 72" stroke="white" stroke-width="1.2" opacity="0.8"/>' +
            '<path d="M28 82 L48 78" stroke="white" stroke-width="1.2" opacity="0.8"/>' +
            '<path d="M122 74 L102 72" stroke="white" stroke-width="1.2" opacity="0.8"/>' +
            '<path d="M122 82 L102 78" stroke="white" stroke-width="1.2" opacity="0.8"/>' +
            // 鼻子
            '<path d="M72 84 L78 84 L75 88 Z" fill="#FF8FA3"/>' +
            '</svg>';
    }

    function eyesFor(expr) {
        switch (expr) {
            case 'happy':   // 眯眼笑
                return '<path d="M52 70 Q58 62 64 70" stroke="#D4A017" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
                       '<path d="M86 70 Q92 62 98 70" stroke="#D4A017" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
            case 'sleepy':  // 半闭
                return '<ellipse cx="58" cy="72" rx="6" ry="3" fill="#D4A017"/>' +
                       '<ellipse cx="92" cy="72" rx="6" ry="3" fill="#D4A017"/>' +
                       '<path d="M52 72 L64 72" stroke="#232329" stroke-width="2"/>' +
                       '<path d="M86 72 L98 72" stroke="#232329" stroke-width="2"/>';
            case 'surprised': // 瞳孔放大
                return '<circle cx="58" cy="70" r="8" fill="#D4A017" stroke="#232329" stroke-width="2"/>' +
                       '<circle cx="92" cy="70" r="8" fill="#D4A017" stroke="#232329" stroke-width="2"/>' +
                       '<circle cx="58" cy="70" r="4" fill="#1A1A1E"/>' +
                       '<circle cx="92" cy="70" r="4" fill="#1A1A1E"/>';
            case 'angry':   // 生气眯眼
                return '<path d="M50 68 L64 74" stroke="#D4A017" stroke-width="3.5" stroke-linecap="round"/>' +
                       '<path d="M100 68 L86 74" stroke="#D4A017" stroke-width="3.5" stroke-linecap="round"/>';
            case 'sad':     // 委屈泪眼
                return '<ellipse cx="58" cy="72" rx="6" ry="7" fill="#D4A017"/>' +
                       '<ellipse cx="92" cy="72" rx="6" ry="7" fill="#D4A017"/>' +
                       '<circle cx="58" cy="72" r="2.5" fill="#1A1A1E"/>' +
                       '<circle cx="92" cy="72" r="2.5" fill="#1A1A1E"/>' +
                       '<path d="M64 80 Q 66 84 68 82" stroke="#8AD4FF" stroke-width="1.8" fill="none"/>';
            default:        // 金色大眼睛
                return '<ellipse cx="58" cy="70" rx="7" ry="9" fill="#D4A017"/>' +
                       '<ellipse cx="92" cy="70" rx="7" ry="9" fill="#D4A017"/>' +
                       '<ellipse cx="58" cy="71" rx="3" ry="6" fill="#1A1A1E"/>' +
                       '<ellipse cx="92" cy="71" rx="3" ry="6" fill="#1A1A1E"/>';
        }
    }

    function mouthFor(expr) {
        switch (expr) {
            case 'happy':   // 张嘴吐舌
                return '<path d="M72 90 Q75 100 78 90 Z" fill="#5C2A2A"/>' +
                       '<ellipse cx="75" cy="94" rx="3" ry="4" fill="#FF8FA3"/>';
            case 'thinking':
                return '<circle cx="75" cy="92" r="3" fill="#5C2A2A"/>';
            case 'sleepy':
                return '<ellipse cx="75" cy="93" rx="5" ry="2.5" fill="#5C2A2A"/>';
            case 'surprised':
                return '<ellipse cx="75" cy="93" rx="6" ry="7" fill="#5C2A2A"/>';
            case 'angry':
                return '<path d="M68 92 L82 92" stroke="#5C2A2A" stroke-width="2.5" stroke-linecap="round"/>';
            case 'yawn':
                return '<ellipse cx="75" cy="92" rx="8" ry="9" fill="#5C2A2A"/>' +
                       '<path d="M70 86 L80 86" stroke="white" stroke-width="1.5" opacity="0.8"/>';
            case 'lick':    // 舔手闭嘴
                return '<path d="M70 91 Q75 94 80 91" stroke="#5C2A2A" stroke-width="2" fill="none"/>';
            case 'sad':
                return '<path d="M68 95 Q75 90 82 95" stroke="#5C2A2A" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
            default:
                return '<path d="M70 91 Q75 95 80 91" stroke="#5C2A2A" stroke-width="2" fill="none" stroke-linecap="round"/>';
        }
    }

    // === 渲染 ===
    function render() {
        // 表情 → SVG
        spriteEl.innerHTML = buildSpriteSVG(state.expression);

        // 动作 → CSS class
        petEl.className = 'pet ' + actionClass(state.action) + ' ' + expressionClass(state.expression);

        // Zzz
        zzzEl.classList.toggle('hidden', !(state.action === 'sleep'));

        // Heat
        if (state.heat > 20) {
            heatEl.classList.remove('hidden');
            heatEl.style.opacity = Math.min(state.heat / 100, 0.6);
        } else {
            heatEl.classList.add('hidden');
        }
    }

    function actionClass(action) {
        switch (action) {
            case 'jump': return 'jump';
            case 'angry': return 'angry';
            case 'sad': return 'sad';
            case 'sleep': return 'sleep';
            case 'walk': return 'walk';
            case 'stretch': return 'breathe';
            default: return 'breathe';
        }
    }

    function expressionClass(expr) {
        if (expr === 'angry') return 'angry';
        if (expr === 'sad') return 'sad';
        if (expr === 'sleepy' || expr === 'yawn') return 'breathe';
        return '';
    }

    // === 气泡 ===
    var bubbleTimer = null;

    function say(text, style) {
        if (!text) return;
        style = style || 'normal';
        bubbleTextEl.textContent = text;
        bubbleEl.className = 'bubble ' + style;
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(function () {
            bubbleEl.classList.add('hidden');
        }, 4000);
    }

    // === 动作调度 ===
    function setExpression(expr) {
        state.expression = expr;
        render();
    }

    function setAction(action, durationMs) {
        state.action = action;
        render();
        if (durationMs) {
            setTimeout(function () {
                if (state.action === action) {
                    state.action = 'idle';
                    render();
                }
            }, durationMs);
        }
    }

    // === 手势响应（设计稿 3.4） ===
    var tapCount = 0;
    var tapTimer = null;

    function onTap() {
        state.lastInteraction = Date.now();
        resetLoneliness();
        var reacts = [
            function () { setExpression('idle'); say('喵', 'normal'); },
            function () { setExpression('curious'); say('？', 'normal'); },
            function () { setExpression('happy'); say('嘿嘿', 'pink'); }
        ];
        reacts[Math.floor(Math.random() * reacts.length)]();
    }

    function onDoubleTap() {
        state.lastInteraction = Date.now();
        resetLoneliness();
        setExpression('happy');
        setAction('jump', 700);
        say('嘿嘿！', 'pink');
    }

    function onLongPress() {
        state.lastInteraction = Date.now();
        resetLoneliness();
        setExpression('happy');
        say('呼噜呼噜…', 'pink');
        // 露肚皮：骨架阶段用躺平动画占位
        petEl.style.transform = 'translateX(-50%) rotate(90deg) scale(0.9)';
        setTimeout(function () {
            petEl.style.transform = '';
            setExpression('idle');
        }, 1800);
    }

    function onFling(vx, vy) {
        state.lastInteraction = Date.now();
        resetLoneliness();
        state.flingAway = true;
        // 被甩出屏幕 → 委屈 → 爬回来
        petEl.style.transition = 'transform 0.5s ease-in';
        petEl.style.transform = 'translateX(-50%) translateX(' + (vx > 0 ? 160 : -160) + 'px) translateY(' + (vy > 0 ? 120 : -60) + 'px)';
        setTimeout(function () {
            setExpression('sad');
            say('…我爬回来了', 'gray');
            petEl.style.transition = 'transform 1.2s ease-out';
            petEl.style.transform = 'translateX(-50%)';
            state.flingAway = false;
            setTimeout(function () { setExpression('idle'); }, 1500);
        }, 600);
    }

    function onMultiTap(count) {
        state.lastInteraction = Date.now();
        resetLoneliness();
        if (count >= 5) {
            setExpression('angry');
            setAction('angry', 1500);
            say('龇牙！(งᵒ̌皿ᵒ̌)ง', 'red');
        } else if (count >= 3) {
            setExpression('angry');
            setAction('angry', 1200);
            say('哼！！', 'green');
        }
    }

    // === 传感器响应 ===
    function onAppChange(pkg) {
        state.lastInteraction = Date.now();
        resetLoneliness();
        var r = APP_REACTIONS[pkg];
        if (r) {
            setExpression(r.expr);
            say(r.bubble, r.style);
        }
    }

    function onScreenshot() {
        state.lastInteraction = Date.now();
        resetLoneliness();
        setExpression('surprised');
        setAction('jump', 800);
        say('拍到我了！', 'pink');
    }

    function onCharging(charging) {
        if (charging) {
            setExpression('happy');
            say('暖暖的…', 'pink');
        }
    }

    function onLowBattery() {
        setExpression('surprised');
        setAction('walk', 2000);
        say('没电了！快去充！', 'red');
    }

    // === 远程状态（大脑 → 身体） ===
    function onRemoteState(expression, bubble, style) {
        state.lastInteraction = Date.now();
        resetLoneliness();
        setExpression(expression);
        if (bubble) say(bubble, style || 'normal');
    }

    // === 孤独递进（设计稿 3.3） ===
    var LONELINESS = [
        { ms: 5 * 60 * 1000, act: function () { setExpression('curious'); } },        // 偷看
        { ms: 10 * 60 * 1000, act: function () { setExpression('lick'); setAction('breathe', 0); } }, // 舔爪
        { ms: 15 * 60 * 1000, act: function () { setExpression('yawn'); } },           // 打哈欠
        { ms: 20 * 60 * 1000, act: function () { setExpression('sad'); } },            // 委屈
        { ms: 30 * 60 * 1000, act: function () { setExpression('sleepy'); setAction('sleep'); say('Zzz…', 'gray'); } } // 睡着
    ];
    var lonelinessTimer = null;

    function resetLoneliness() {
        clearTimeout(lonelinessTimer);
        lonelinessTimer = setTimeout(triggerLoneliness, 5 * 60 * 1000);
    }

    function triggerLoneliness() {
        var idleMs = Date.now() - state.lastInteraction;
        var level = null;
        for (var i = LONELINESS.length - 1; i >= 0; i--) {
            if (idleMs >= LONELINESS[i].ms) { level = LONELINESS[i]; break; }
        }
        if (level) level.act();
        // 继续检查下一档
        lonelinessTimer = setTimeout(triggerLoneliness, 60 * 1000);
    }

    // === 自言自语（idle 随机冒泡） ===
    function idleMumble() {
        if (state.expression === 'idle' && !state.flingAway && document.hidden === false) {
            var pool = POOLS.daily.concat(Math.random() < 0.05 ? POOLS.chaos : []);
            if (Math.random() < 0.35) say(pick(pool), 'normal');
        }
        setTimeout(idleMumble, 25000 + Math.random() * 30000);
    }

    // === 初始化 ===
    function init() {
        render();
        say('喵', 'pink');
        resetLoneliness();
        idleMumble();
    }

    // === 暴露给原生层 ===
    window.petEngine = {
        onTap: onTap,
        onDoubleTap: onDoubleTap,
        onLongPress: onLongPress,
        onFling: onFling,
        onMultiTap: onMultiTap,
        onAppChange: onAppChange,
        onScreenshot: onScreenshot,
        onCharging: onCharging,
        onLowBattery: onLowBattery,
        onRemoteState: onRemoteState,
        say: say,
        setExpression: setExpression,
        setAction: setAction,
        setHeat: function (h) { state.heat = Math.max(0, Math.min(100, h)); render(); }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();