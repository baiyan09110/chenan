package com.chengan.pet.sensor

import java.util.Calendar

/**
 * 时段行为（骨架版）
 *
 * 设计稿 3.2 节：按小时返回行为时段。
 * Phase 3 会据此切换桌宠的行为风格与词池。
 */
object TimeBehavior {

    enum class Period(val label: String) {
        WAKE("晨醒"),      // 06-09 伸懒腰醒来，温柔早安
        MORNING("上午"),   // 09-12 活泼，提醒喝水
        NOON("午间"),      // 12-14 犯困，提醒吃饭
        AFTERNOON("下午"), // 14-18 正常活跃
        EVENING("傍晚"),   // 18-22 放松，偶尔撒娇
        NIGHT("夜晚"),     // 22-24 犯困，催睡觉
        LATE("深夜")       // 00-06 举牌催睡
    }

    fun currentPeriod(hour: Int = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)): Period {
        return when (hour) {
            in 6..8 -> Period.WAKE
            in 9..11 -> Period.MORNING
            in 12..13 -> Period.NOON
            in 14..17 -> Period.AFTERNOON
            in 18..21 -> Period.EVENING
            in 22..23 -> Period.NIGHT
            else -> Period.LATE
        }
    }
}