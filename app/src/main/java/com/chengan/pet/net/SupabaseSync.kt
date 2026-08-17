package com.chengan.pet.net

import android.content.Context

/**
 * Supabase 同步层 — 接口占位（Phase 4 实现）
 *
 * 设计稿 5.2 节：
 * 桌宠App（身体）上报事件 → Supabase → Operit（大脑）读取
 * Operit（大脑）写状态 → Supabase Realtime → 桌宠App 立刻响应
 * 轮询 5 秒 fallback 兜底。
 *
 * 骨架阶段只定义接口，不接真实网络，避免依赖 Supabase SDK。
 */
interface SupabaseSync {

    /** 上报一次事件（手势 / App切换 / 截图） */
    fun reportEvent(event: PetEvent)

    /** 拉取最新宠物状态（表情/动作/气泡/heat） */
    fun fetchState(onResult: (PetState?) -> Unit)

    /** 订阅 Realtime 变更 */
    fun subscribe(onState: (PetState) -> Unit)

    /** 取消订阅 / 停止轮询 */
    fun close()

    data class PetEvent(
        val type: String,      // "gesture" | "app_change" | "screenshot" | "battery"
        val value: String,     // "tap" / 包名 / "charging" ...
        val ts: Long = System.currentTimeMillis()
    )

    data class PetState(
        val expression: String = "idle",  // 待机/开心/思考/困困/惊讶/好奇/生气/哈欠/舔手/委屈
        val action: String? = null,       // idle/龇牙/走路/伸懒腰/睡觉
        val bubble: String? = null,       // 气泡文字
        val bubbleStyle: String = "normal", // normal/pink/green/red/gray
        val heat: Int = 0                 // 0-100
    )

    companion object {
        fun create(context: Context): SupabaseSync = NoopSupabaseSync
    }
}

/** 骨架阶段空实现：一切静默，等 Phase 4 替换为 Supabase 真实实现 */
object NoopSupabaseSync : SupabaseSync {
    override fun reportEvent(event: SupabaseSync.PetEvent) = Unit
    override fun fetchState(onResult: (SupabaseSync.PetState?) -> Unit) =
        onResult(null)

    override fun subscribe(onState: (SupabaseSync.PetState) -> Unit) = Unit
    override fun close() = Unit
}