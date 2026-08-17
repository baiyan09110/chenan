package com.chengan.pet.sensor

import android.os.FileObserver
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * 截图检测（骨架版）
 *
 * FileObserver 监听系统截图目录（Screenshots / DCIM / Pictures），
 * 检测到新图片写入时回调。回调发生在后台线程，需切主线程。
 */
class ScreenshotDetector(
    private val screenshotDir: String,
    private val onScreenshot: () -> Unit
) {

    companion object {
        private const val TAG = "ScreenshotDetector"
        private const val MASK = FileObserver.CLOSE_WRITE or FileObserver.CREATE
    }

    private var observer: FileObserver? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    fun start() {
        if (observer != null) return
        observer = object : FileObserver(screenshotDir, MASK) {
            override fun onEvent(event: Int, path: String?) {
                if (path == null) return
                Log.d(TAG, "截图目录事件: $path")
                mainHandler.post { onScreenshot() }
            }
        }.apply { startWatching() }
    }

    fun stop() {
        observer?.stopWatching()
        observer = null
    }
}