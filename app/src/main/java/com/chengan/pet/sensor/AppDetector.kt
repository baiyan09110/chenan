package com.chengan.pet.sensor

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * 前台 App 检测（骨架版）
 *
 * 每 3 秒轮询一次 UsageStatsManager，检测到前台 App 切换时回调。
 * Phase 3 将在此之上补全 App→反应映射表（抖音吃醋、Operit 开心…）。
 *
 * @param onAppChanged 前台 App 变化回调（包名）
 */
class AppDetector(
    private val context: Context,
    private val onAppChanged: (String) -> Unit
) {

    companion object {
        private const val TAG = "AppDetector"
        private const val POLL_MS = 3000L
        /** 忽略的包名（系统 UI、自己等） */
        private val IGNORED = setOf(
            "android",
            "com.android.systemui",
            "com.android.launcher",
            "com.google.android.apps.nexuslauncher",
            "com.miui.home",
            "com.chengan.pet"
        )
    }

    private val handler = Handler(Looper.getMainLooper())
    private var currentApp: String? = null
    private var running = false

    private val pollRunnable = object : Runnable {
        override fun run() {
            if (!running) return
            val foreground = detectForegroundApp()
            if (foreground != null && foreground != currentApp) {
                Log.d(TAG, "前台 App 切换: $currentApp -> $foreground")
                currentApp = foreground
                onAppChanged(foreground)
            }
            handler.postDelayed(this, POLL_MS)
        }
    }

    fun start() {
        if (running) return
        running = true
        handler.post(pollRunnable)
    }

    fun stop() {
        running = false
        handler.removeCallbacks(pollRunnable)
    }

    private fun detectForegroundApp(): String? {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val end = System.currentTimeMillis()
        val begin = end - 10_000L
        val events = usm.queryEvents(begin, end)
        var lastForeground: String? = null
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                lastForeground = event.packageName
            }
        }
        return lastForeground?.takeIf { it !in IGNORED }
    }
}