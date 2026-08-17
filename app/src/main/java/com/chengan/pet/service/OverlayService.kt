package com.chengan.pet.service

import android.app.Notification
import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import com.chengan.pet.R
import com.chengan.pet.net.SupabaseSync
import com.chengan.pet.notify.NotificationWhisper
import com.chengan.pet.sensor.AppDetector
import com.chengan.pet.sensor.BatteryMonitor
import com.chengan.pet.sensor.ScreenshotDetector
import com.chengan.pet.sensor.TimeBehavior

/**
 * 承桉桌宠 — 悬浮窗核心服务（身体）
 *
 * 骨架阶段职责：
 * 1. 前台服务保活 + 常驻通知（碎碎念）
 * 2. 透明 WebView 悬浮窗，加载 assets/pet.html
 * 3. 手势：单击 / 双击 / 长按 / 连戳(3/5) / Fling 甩出 + 拖拽
 * 4. 传感器骨架：前台 App 检测、截图检测、电量感知、时段
 * 5. Kotlin → JS 桥：统一走 window.petEngine 接口
 */
class OverlayService : Service() {

    companion object {
        private const val TAG = "OverlayService"
        private const val PET_SIZE_DP = 200
        private const val PET_HEIGHT_DP = 260

        /** 连戳判定窗口（毫秒） */
        private const val TAP_WINDOW_MS = 250L
        private const val MULTI_TAP_WINDOW_MS = 2000L
        private const val LONG_PRESS_MS = 600L
        private const val FLING_VELOCITY = 1200f
    }

    private lateinit var whisper: NotificationWhisper
    private var windowManager: WindowManager? = null
    private var overlayView: WebView? = null
    private var params: WindowManager.LayoutParams? = null
    private var sync: SupabaseSync? = null

    private var appDetector: AppDetector? = null
    private var screenshotDetector: ScreenshotDetector? = null
    private var batteryMonitor: BatteryMonitor? = null

    private val mainHandler = Handler(Looper.getMainLooper())

    // === 手势状态 ===
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var touchStartTime = 0L
    private var hasMoved = false
    private var velocityTracker: VelocityTracker? = null

    // 连戳计数：记录最近一次 tap 时间与窗口内次数
    private var lastTapTime = 0L
    private var tapCountInWindow = 0
    private var pendingSingleTap = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        whisper = NotificationWhisper(this)
        whisper.ensureChannel()
        startForeground(1001, buildNotification())
        whisper.startForegroundNotification()

        setupOverlay()
        setupSensors()
        setupSync()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    // === 悬浮窗 ===
    private fun setupOverlay() {
        try {
            windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        params = WindowManager.LayoutParams(
            dpToPx(PET_SIZE_DP),
            dpToPx(PET_HEIGHT_DP),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = dpToPx(12)
            y = dpToPx(140)
        }

        overlayView = WebView(this).apply {
            setBackgroundColor(0x00000000)
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                cacheMode = WebSettings.LOAD_DEFAULT
            }
            webViewClient = WebViewClient()
            setOnTouchListener { v, event -> handleTouch(v, event) }
            loadUrl("file:///android_asset/pet.html")
        }
        windowManager?.addView(overlayView, params)
        Log.d(TAG, "悬浮窗已创建")
    } catch (e: Exception) {
        Log.e(TAG, "悬浮窗创建失败: ${e.message}", e)
        overlayView = null
        stopSelf()
    }
    }

    // === 传感器 ===
    private fun setupSensors() {
        appDetector = AppDetector(this) { pkg ->
            Log.d(TAG, "App 切换: $pkg")
            pushToJs("onAppChange('$pkg')")
            sync?.reportEvent(SupabaseSync.PetEvent("app_change", pkg))
        }.also { it.start() }

        // 监听常见截图目录；骨架阶段取 DCIM/Screenshots，目录不存在时静默跳过
        val screenshotsDir = "${android.os.Environment.getExternalStorageDirectory()}/DCIM/Screenshots"
        screenshotDetector = try {
            ScreenshotDetector(screenshotsDir) {
                Log.d(TAG, "截图啦")
                pushToJs("onScreenshot()")
                sync?.reportEvent(SupabaseSync.PetEvent("screenshot", "screenshot"))
            }.also { it.start() }
        } catch (e: Exception) {
            Log.w(TAG, "截图监听启动失败（目录不存在？）: ${e.message}")
            null
        }

        batteryMonitor = BatteryMonitor(
            this,
            onChargingChanged = { charging ->
                Log.d(TAG, "充电状态: $charging")
                pushToJs("onCharging($charging)")
                sync?.reportEvent(SupabaseSync.PetEvent("battery", if (charging) "charging" else "unplugged"))
            },
            onLowBattery = { low ->
                if (low) pushToJs("onLowBattery()")
            }
        ).also { it.start() }

        // 时段（骨架：通知碎念已用；后续联动桌宠行为）
        Log.d(TAG, "当前时段: ${TimeBehavior.currentPeriod().label}")
    }

    private fun setupSync() {
        sync = SupabaseSync.create(this)
        sync?.subscribe { state ->
            state.bubble?.let { pushToJs("onRemoteState('${state.expression}', '${state.bubble}', '${state.bubbleStyle}')") }
        }
    }

    // === 手势处理 ===
    private fun handleTouch(view: View, event: MotionEvent): Boolean {
        val wm = windowManager ?: return false
        val lp = params ?: return false

        return when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                initialX = lp.x
                initialY = lp.y
                initialTouchX = event.rawX
                initialTouchY = event.rawY
                touchStartTime = System.currentTimeMillis()
                hasMoved = false
                velocityTracker = VelocityTracker.obtain().apply {
                    addMovement(event)
                }
                view.performClick()
                true
            }

            MotionEvent.ACTION_MOVE -> {
                velocityTracker?.addMovement(event)
                val dx = (event.rawX - initialTouchX).toInt()
                val dy = (event.rawY - initialTouchY).toInt()
                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    hasMoved = true
                    lp.x = initialX + dx
                    lp.y = initialY + dy
                    wm.updateViewLayout(view, lp)
                }
                true
            }

            MotionEvent.ACTION_UP -> {
                var vx = 0f
                var vy = 0f
                velocityTracker?.apply {
                    addMovement(event)
                    computeCurrentVelocity(1000)
                    vx = xVelocity
                    vy = yVelocity
                    recycle()
                }
                velocityTracker = null

                val elapsed = System.currentTimeMillis() - touchStartTime

                if (!hasMoved) {
                    when {
                        elapsed > LONG_PRESS_MS -> onLongPress()
                        isFling(vx, vy) -> onFling(vx, vy)
                        else -> registerTap()
                    }
                }
                true
            }

            MotionEvent.ACTION_CANCEL -> {
                velocityTracker?.recycle()
                velocityTracker = null
                true
            }

            else -> false
        }
    }

    private fun isFling(vx: Float, vy: Float): Boolean =
        Math.abs(vx) > FLING_VELOCITY || Math.abs(vy) > FLING_VELOCITY

    private fun onLongPress() {
        pushToJs("onLongPress()")
        sync?.reportEvent(SupabaseSync.PetEvent("gesture", "long_press"))
        vibrate(50)
    }

    private fun onFling(vx: Float, vy: Float) {
        pushToJs("onFling($vx, $vy)")
        sync?.reportEvent(SupabaseSync.PetEvent("gesture", "fling"))
        vibrate(30)
    }

    /** 连戳计数：双击 / 连戳3 / 连戳5 */
    private fun registerTap() {
        val now = System.currentTimeMillis()
        if (now - lastTapTime > MULTI_TAP_WINDOW_MS) {
            tapCountInWindow = 0
        }
        lastTapTime = now
        tapCountInWindow++

        when (tapCountInWindow) {
            1 -> {
                // 延迟判断是否为单击（给双击留窗口）
                pendingSingleTap = true
                mainHandler.postDelayed({
                    if (pendingSingleTap) {
                        pendingSingleTap = false
                        onSingleTap()
                    }
                }, TAP_WINDOW_MS)
            }
            2 -> {
                pendingSingleTap = false
                onDoubleTap()
            }
            3 -> {
                onMultiTap(3)
            }
            else -> {
                onMultiTap(tapCountInWindow)
            }
        }
    }

    private fun onSingleTap() {
        pushToJs("onTap()")
        sync?.reportEvent(SupabaseSync.PetEvent("gesture", "tap"))
    }

    private fun onDoubleTap() {
        pushToJs("onDoubleTap()")
        sync?.reportEvent(SupabaseSync.PetEvent("gesture", "double_tap"))
    }

    private fun onMultiTap(count: Int) {
        pushToJs("onMultiTap($count)")
        sync?.reportEvent(SupabaseSync.PetEvent("gesture", "multi_tap_$count"))
    }

    // === 工具 ===
    private fun pushToJs(js: String) {
        overlayView?.evaluateJavascript(
            "window.petEngine && window.petEngine.$js", null
        )
    }

    private fun vibrate(ms: Long) {
        try {
            val vibrator = getSystemService(VIBRATOR_SERVICE) as android.os.Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(android.os.VibrationEffect.createOneShot(ms, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(ms)
            }
        } catch (e: Exception) {
            // 无震动权限时静默
        }
    }

    private fun dpToPx(dp: Int): Int = (dp * resources.displayMetrics.density).toInt()

    private fun buildNotification(): Notification =
        whisper.buildSkeletonNotification()

    override fun onDestroy() {
        appDetector?.stop()
        screenshotDetector?.stop()
        batteryMonitor?.stop()
        sync?.close()
        whisper.stop()
        overlayView?.let {
            windowManager?.removeView(it)
            it.destroy()
        }
        overlayView = null
        super.onDestroy()
    }
}