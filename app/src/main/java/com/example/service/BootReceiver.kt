package com.example.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.example.data.BridgePreferences
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            CoroutineScope(Dispatchers.IO).launch {
                val prefs = BridgePreferences(context)
                if (prefs.isPairedFlow.first()) {
                    val serviceIntent = Intent(context, BridgeForegroundService::class.java)
                    ContextCompat.startForegroundService(context, serviceIntent)
                }
            }
        }
    }
}
