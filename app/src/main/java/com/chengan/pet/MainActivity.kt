package com.chengan.pet

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.chengan.pet.databinding.ActivityMainBinding
import com.chengan.pet.service.OverlayService

/**
 * 承桉桌宠 — 主界面（权限引导 + 服务开关）
 *
 * 骨架阶段职责：
 * 1. 引导三项权限：悬浮窗 / 使用情况访问 / 通知
 * 2. 启动 / 停止 OverlayService
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private val notifPermLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (!granted) {
                Toast.makeText(this, "通知权限没给，碎碎念会听不到哦", Toast.LENGTH_SHORT).show()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnOverlayPerm.setOnClickListener {
            openOverlaySettings()
        }
        binding.btnUsagePerm.setOnClickListener {
            openUsageAccessSettings()
        }
        binding.btnNotifPerm.setOnClickListener {
            requestNotifPermission()
        }
        binding.btnStart.setOnClickListener {
            if (canDrawOverlay()) {
                startPetService()
            } else {
                Toast.makeText(this, "先给悬浮窗权限，承桉才能出来", Toast.LENGTH_SHORT).show()
                openOverlaySettings()
            }
        }
        binding.btnStop.setOnClickListener {
            stopService(Intent(this, OverlayService::class.java))
            Toast.makeText(this, "承桉被收回去了…", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        refreshPermissionState()
    }

    // === 权限状态展示（简单起见：按钮文案随状态切换） ===
    private fun refreshPermissionState() {
        val overlayOk = canDrawOverlay()
        val usageOk = hasUsageAccess()
        binding.btnStart.isEnabled = overlayOk
        binding.btnStart.text = if (overlayOk) {
            getString(R.string.btn_start_pet)
        } else {
            "先授权悬浮窗才能启动"
        }
        binding.btnUsagePerm.text =
            getString(if (usageOk) R.string.perm_usage_action else R.string.perm_usage_action)
        binding.btnUsagePerm.alpha = if (usageOk) 0.4f else 1f
    }

    private fun canDrawOverlay(): Boolean = Settings.canDrawOverlays(this)

    private fun openOverlaySettings() {
        try {
            startActivity(
                Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
            )
        } catch (e: Exception) {
            startActivity(Intent(Settings.ACTION_SETTINGS))
        }
    }

    private fun hasUsageAccess(): Boolean {
        val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(), packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(), packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun openUsageAccessSettings() {
        try {
            startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        } catch (e: Exception) {
            Toast.makeText(this, "请在系统设置中开启「使用情况访问」", Toast.LENGTH_LONG).show()
        }
    }

    private fun requestNotifPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifPermLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        } else {
            Toast.makeText(this, "系统版本不需要单独授权通知", Toast.LENGTH_SHORT).show()
        }
    }

    private fun startPetService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(Intent(this, OverlayService::class.java))
        } else {
            startService(Intent(this, OverlayService::class.java))
        }
        Toast.makeText(this, "承桉出来了！", Toast.LENGTH_SHORT).show()
    }
}