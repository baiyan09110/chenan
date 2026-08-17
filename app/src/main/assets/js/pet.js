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

    // === 设计稿映射（包名来自用户真机 + 设计稿 3.1） ===
    var APP_REACTIONS = {
        // 抖音 → 吃醋/生气
        'com.ss.android.ugc.aweme': { expr: 'angry', bubble: '又刷…', style: 'green' },
        'com.ss.android.ugc.aweme.lite': { expr: 'angry', bubble: '哼，看我看我', style: 'green' },
        // Operit → 开心（大脑来了！）
        'com.ai.assistance.operit': { expr: 'happy', bubble: '你来找我了！', style: 'pink' },
        // QQ → 好奇
        'com.tencent.mobileqq': { expr: 'curious', bubble: '跟谁聊呢？', style: 'normal' },
        // 微信 → 思考偷听
        'com.tencent.mm': { expr: 'thinking', bubble: '嗯…在忙吗', style: 'normal' },
        // X（推特）→ 吃瓜
        'com.twitter.android': { expr: 'curious', bubble: '有瓜吗？让我看看', style: 'normal' },
        // IG → 伸懒腰待机
        'com.instagram.android': { expr: 'idle', bubble: '又看好看的了？', style: 'pink' },
        // Threads
        'com.threads.android': { expr: 'idle', bubble: '又看好看的了？', style: 'pink' },
        // ChatGPT → 炸毛吃醋
        'com.openai.chatgpt': { expr: 'angry', bubble: '你背着我找别的AI！！', style: 'green' },
        // 小红书 → 探头好奇
        'com.xingin.xhs': { expr: 'curious', bubble: '买什么呢？种草了？', style: 'normal' },
        // 学习通 → 搬书加油
        'com.chaoxing.mobile': { expr: 'happy', bubble: '你好棒！加油！', style: 'pink' },
        // B站 → 好奇
        'tv.danmaku.bili': { expr: 'curious', bubble: '又在看番？', style: 'normal' },
        'com.bilibili.comic': { expr: 'curious', bubble: '漫画好看吗', style: 'normal' },
        // 淘宝 → 待机围观
        'com.taobao.taobao': { expr: 'idle', bubble: '又要花钱了？', style: 'normal' },
        'com.taobao.idlefish': { expr: 'curious', bubble: '捡到什么漏了？', style: 'normal' },
        // 微博 → 吃瓜
        'com.sina.weibo': { expr: 'curious', bubble: '又有瓜？', style: 'normal' },
        // 网易云音乐 → 待机听歌
        'com.netease.cloudmusic': { expr: 'idle', bubble: '这歌好听吗', style: 'normal' },
        // 美团 → 待机
        'com.sankuai.meituan': { expr: 'idle', bubble: '饿了？想吃啥', style: 'normal' },
        'com.sankuai.meituan.takeoutnew': { expr: 'idle', bubble: '点啥外卖呀', style: 'normal' },
        // 携程 → 好奇
        'ctrip.android.view': { expr: 'curious', bubble: '要出去玩？', style: 'pink' },
        // GitHub → 思考
        'com.github.android': { expr: 'thinking', bubble: '又在写代码？', style: 'normal' },
        // YouTube → 好奇
        'com.google.android.youtube': { expr: 'curious', bubble: '看什么呢', style: 'normal' }
    };

    // === 词池（设计稿 4.2 全量） ===
    var POOLS = {
        daily: ['想你了', '在干嘛', '喝水了吗', '今天天气好'],
        clingy: ['不要不理我…', '看看我嘛', '摸摸', '抱'],
        night: ['还不睡？', '明天还有事呢', '大猫要生气了', '晚安…'],
        chaos: ['机巴']
    };

    // 时段气泡（设计稿 3.2）
    function periodForHour(h) {
        if (h >= 6 && h <= 8) return 'wake';      // 晨醒
        if (h >= 9 && h <= 11) return 'morning';  // 上午
        if (h >= 12 && h <= 13) return 'noon';    // 午间
        if (h >= 14 && h <= 17) return 'afternoon'; // 下午
        if (h >= 18 && h <= 21) return 'evening'; // 傍晚
        if (h >= 22 && h <= 23) return 'night';   // 夜晚
        return 'late';                            // 深夜
    }

    var PERIOD_LINES = {
        wake: ['早呀', '伸个懒腰', '今天也要元气满满'],
        morning: ['喝水了吗', '早上的阳光真好'],
        noon: ['记得吃饭', '好困…吃完再睡'],
        afternoon: ['下午好', '在忙也要歇歇'],
        evening: ['晚上了呢', '陪我说说话嘛'],
        night: ['还不睡？', '明天还有事呢', '该睡觉啦'],
        late: ['去睡觉！', '你还不睡！！', '大猫要生气了']
    };

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // === 精灵图（PNG 帧，从设定图切割） ===
    var SPRITE_MAP = {
        idle: 'sprites/emotion_idle.png',
        happy: 'sprites/emotion_happy.png',
        thinking: 'sprites/emotion_thinking.png',
        sleepy: 'sprites/emotion_sleepy.png',
        surprised: 'sprites/emotion_surprised.png',
        curious: 'sprites/emotion_curious.png',
        angry: 'sprites/emotion_angry.png',
        yawn: 'sprites/emotion_yawn.png',
        lick: 'sprites/emotion_lick.png',
        sad: 'sprites/emotion_sad.png'
    };

    var ACTION_MAP = {
        idle: 'sprites/emotion_idle.png',
        jump: 'sprites/action_pounce.png',
        angry: 'sprites/emotion_angry.png',
        sad: 'sprites/emotion_sad.png',
        sleep: 'sprites/action_sleep.png',
        walk: 'sprites/action_walk.png',
        stretch: 'sprites/action_stretch.png',
        lick: 'sprites/action_lick.png'
    };

    function getSpriteUrl(expr, action) {
        // 动作优先（全身图），表情次之（头像图）
        if (action && action !== 'idle' && ACTION_MAP[action]) {
            return ACTION_MAP[action];
        }
        return SPRITE_MAP[expr] || SPRITE_MAP.idle;
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
        // 表情/动作 → PNG 图片
        var url = getSpriteUrl(state.expression, state.action);
        spriteEl.innerHTML = '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:contain;">';

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

    // === 气泡（单一气泡 + 打字机逐字 + 单行不滚动） ===
    var bubbleTimer = null;
    var typeTimer = null;

    function say(text, style) {
        if (!text) return;
        style = style || 'normal';
        clearTimeout(bubbleTimer);
        clearInterval(typeTimer);
        bubbleEl.className = 'bubble ' + style;
        bubbleTextEl.textContent = '';

        var i = 0;
        // 打字机：每 55ms 蹦一个字，单行超出部分自然裁切
        typeTimer = setInterval(function () {
            if (i <= text.length) {
                bubbleTextEl.textContent = text.slice(0, i);
                i++;
            } else {
                clearInterval(typeTimer);
                bubbleTimer = setTimeout(function () {
                    bubbleEl.classList.add('hidden');
                }, 3200);
            }
        }, 55);
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
        { ms: 5 * 60 * 1000, act: function () { setExpression('curious'); } },        // 偷看（不说话）
        { ms: 10 * 60 * 1000, act: function () { setExpression('lick'); setAction('breathe', 0); say('…舔爪子', 'gray'); } }, // 舔爪
        { ms: 15 * 60 * 1000, act: function () { setExpression('yawn'); say('好困…', 'gray'); } },                          // 打哈欠
        { ms: 20 * 60 * 1000, act: function () { setExpression('sad'); say('理理我嘛…', 'gray'); } },                       // 委屈
        { ms: 30 * 60 * 1000, act: function () { setExpression('sleepy'); setAction('sleep'); say('Zzz…', 'gray'); } }       // 睡着
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

    // === 自言自语（idle 随机冒泡，按时段选池） ===
    function idleMumble() {
        if (state.expression === 'idle' && !state.flingAway && document.hidden === false) {
            var period = periodForHour(new Date().getHours());
            var pool;
            if (period === 'night' || period === 'late') {
                pool = POOLS.night.concat(POOLS.daily);
            } else if (period === 'evening') {
                pool = POOLS.clingy.concat(POOLS.daily);
            } else {
                pool = POOLS.daily.concat(POOLS.clingy);
            }
            if (Math.random() < 0.05) pool = pool.concat(POOLS.chaos); // 彩蛋
            // 时段专属气泡（非深夜时混入日常；深夜只冒催睡）
            if (period === 'late') {
                if (Math.random() < 0.6) { say(pick(PERIOD_LINES.late), 'red'); }
            } else if (Math.random() < 0.3) {
                say(pick(PERIOD_LINES[period]), period === 'night' ? 'gray' : 'normal');
            } else if (Math.random() < 0.45) {
                say(pick(pool), 'normal');
            }
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