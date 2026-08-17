package com.chengan.pet.notify

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.chengan.pet.R
import com.chengan.pet.sensor.TimeBehavior
import kotlin.random.Random

/**
 * 通知栏碎碎念（骨架版）
 *
 * 常驻通知（保活）+ 每小时换一句。文案池按时段切。
 * 设计稿 4.3 节：每小时换一句，根据时段切内容。
 */
class NotificationWhisper(private val context: Context) {

    companion object {
        private const val CHANNEL_ID = "pet_overlay_channel"
        private const val NOTIFICATION_ID = 1001
        private const val WHISPER_INTERVAL_MS = 60 * 60 * 1000L

        /** 日常词池（Phase 3 会补全设计稿的全部词池） */
        private val DAILY = listOf(
            "我在这里哦",
            "想你了",
            "在干嘛",
            "喝水了吗",
            "今天天气好",
            "摸摸我嘛",
            "看我看我"
        )
        private val NIGHT = listOf(
            "还不睡？",
            "明天还有事呢",
            "大猫要生气了",
            "晚安…"
        )
        private val LATE = listOf(
            "去睡觉！",
            "你还不睡！！",
            "我先睡了…",
            "晚安，明天见"
        )
    }

    private val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    private val handler = Handler(Looper.getMainLooper())
    private var lastText: String? = null

    private val whisperRunnable = object : Runnable {
        override fun run() {
            updateWhisper()
            handler.postDelayed(this, WHISPER_INTERVAL_MS)
        }
    }

    /** 创建通知通道（幂等） */
    fun ensureChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.overlay_channel_name),
            NotificationManager.IMPORTANCE_LOW
        ).apply { setShowBadge(false) }
        nm.createNotificationChannel(channel)
    }

    fun startForegroundNotification() {
        updateWhisper()
        handler.postDelayed(whisperRunnable, WHISPER_INTERVAL_MS)
    }

    fun stop() {
        handler.removeCallbacks(whisperRunnable)
    }

    /** 供 OverlayService 直接构建前台通知 */
    fun buildSkeletonNotification(): Notification {
        val text = lastText ?: context.getString(R.string.service_running)
        return buildNotification(text)
    }

    private fun updateWhisper() {
        val text = pickWhisper()
        lastText = text
        nm.notify(NOTIFICATION_ID, buildNotification(text))
    }

    private fun pickWhisper(): String {
        val pool = when (TimeBehavior.currentPeriod()) {
            TimeBehavior.Period.NIGHT -> NIGHT
            TimeBehavior.Period.LATE -> LATE
            else -> DAILY
        }
        // 避免连续两句一样
        var pick = pool[Random.nextInt(pool.size)]
        if (pick == lastText) {
            pick = pool[(pool.indexOf(pick) + 1) % pool.size]
        }
        return pick
    }

    private fun buildNotification(text: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            context, 0,
            context.packageManager.getLaunchIntentForPackage(context.packageName),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("🐈‍⬛ 承桉")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_pet_face)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}