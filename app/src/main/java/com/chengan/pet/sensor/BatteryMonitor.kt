package com.chengan.pet.sensor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager

/**
 * 电量 / 充电感知（骨架版）
 *
 * 监听 ACTION_BATTERY_CHANGED，回调三个状态：
 * - 充电中（plugged）
 * - 低电量（<=20%）
 * - 恢复（>20% 且未充电，可留作后续）
 */
class BatteryMonitor(
    private val context: Context,
    private val onChargingChanged: (Boolean) -> Unit,
    private val onLowBattery: (Boolean) -> Unit
) {

    private var registered = false

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
            val plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)
            val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)

            val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                    status == BatteryManager.BATTERY_STATUS_FULL ||
                    plugged != 0
            val pct = if (scale > 0) level * 100 / scale else -1

            onChargingChanged(isCharging)
            onLowBattery(pct in 1..20)
        }
    }

    fun start() {
        if (registered) return
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        context.registerReceiver(receiver, filter)
        registered = true
    }

    fun stop() {
        if (registered) {
            context.unregisterReceiver(receiver)
            registered = false
        }
    }
}