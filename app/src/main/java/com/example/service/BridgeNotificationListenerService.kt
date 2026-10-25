package com.example.service

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.example.data.BridgeAppDatabase
import com.example.data.BridgePreferences
import com.example.data.PendingNotificationEntity
import com.example.network.BridgeNotifyRequest
import com.example.network.RetrofitClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

class BridgeNotificationListenerService : NotificationListenerService() {
    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    private val financialKeywords = listOf(
        "credited", "received", "Rs.", "PKR", "deposited", "jazzcash", "easypaisa", "balance", "A/c"
    )

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: return
        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val rawText = "$title $text"

        // Check if message contains financial keywords
        val containsKeyword = financialKeywords.any { rawText.contains(it, ignoreCase = true) }
        if (!containsKeyword) return

        Log.d("BridgeNotification", "Captured notification from $packageName: $rawText")

        serviceScope.launch {
            processAndSendNotification(packageName, rawText, sbn.postTime)
        }
    }

    private suspend fun processAndSendNotification(provider: String, rawText: String, receivedAt: Long) {
        val prefs = BridgePreferences(applicationContext)
        val isPaired = prefs.isPairedFlow.first()
        if (!isPaired) return

        val baseUrl = prefs.workerBaseUrlFlow.first()
        val deviceId = prefs.deviceIdFlow.first()
        val secret = prefs.deviceSecretFlow.first()

        val db = BridgeAppDatabase.getDatabase(applicationContext)
        val api = RetrofitClient.getApi(baseUrl, { deviceId }, { secret })

        try {
            val response = api.notifyTransaction(
                BridgeNotifyRequest(
                    provider = provider,
                    raw_text = rawText,
                    received_at = receivedAt,
                    sender = "Notification"
                )
            )
            if (response.success) {
                Log.d("BridgeNotification", "Successfully forwarded notification to Worker")
                return
            }
        } catch (e: Exception) {
            Log.e("BridgeNotification", "Failed to forward notification online, saving to Room buffer", e)
        }

        // Fallback: save to Room offline buffer
        db.pendingNotificationDao().insert(
            PendingNotificationEntity(
                provider = provider,
                rawText = rawText,
                sender = "Notification",
                receivedAt = receivedAt
            )
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
    }
}
