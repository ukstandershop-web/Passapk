package com.example.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
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

class SmsReceiver : BroadcastReceiver() {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val financialKeywords = listOf(
        "credited", "received", "Rs.", "PKR", "deposited", "jazzcash", "easypaisa", "balance", "A/c"
    )

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            for (sms in messages) {
                val sender = sms.displayOriginatingAddress ?: "Unknown"
                val messageBody = sms.messageBody ?: ""

                val containsKeyword = financialKeywords.any { messageBody.contains(it, ignoreCase = true) }
                if (!containsKeyword) continue

                Log.d("SmsReceiver", "Captured financial SMS from $sender: $messageBody")

                scope.launch {
                    processSms(context, sender, messageBody, sms.timestampMillis)
                }
            }
        }
    }

    private suspend fun processSms(context: Context, sender: String, body: String, timestamp: Long) {
        val prefs = BridgePreferences(context)
        if (!prefs.isPairedFlow.first()) return

        val baseUrl = prefs.workerBaseUrlFlow.first()
        val deviceId = prefs.deviceIdFlow.first()
        val secret = prefs.deviceSecretFlow.first()

        val db = BridgeAppDatabase.getDatabase(context)
        val api = RetrofitClient.getApi(baseUrl, { deviceId }, { secret })

        try {
            val response = api.notifyTransaction(
                BridgeNotifyRequest(
                    provider = "SMS:$sender",
                    raw_text = body,
                    received_at = timestamp,
                    sender = sender
                )
            )
            if (response.success) {
                Log.d("SmsReceiver", "Successfully forwarded SMS to Worker")
                return
            }
        } catch (e: Exception) {
            Log.e("SmsReceiver", "Failed to forward SMS online, buffering to Room", e)
        }

        db.pendingNotificationDao().insert(
            PendingNotificationEntity(
                provider = "SMS:$sender",
                rawText = body,
                sender = sender,
                receivedAt = timestamp
            )
        )
    }
}
