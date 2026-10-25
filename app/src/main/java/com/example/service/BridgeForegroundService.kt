package com.example.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.BatteryManager
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.data.BridgePreferences
import com.example.data.PendingNotificationEntity
import com.example.data.BridgeAppDatabase
import com.example.network.BridgeNotifyRequest
import com.example.network.HeartbeatRequest
import com.example.network.RetrofitClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class BridgeForegroundService : Service() {
    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    companion object {
        const val CHANNEL_ID = "BridgeServiceChannel"
        const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createNotification("PaisaBridge is active and listening for SMS/notifications")
        startForeground(NOTIFICATION_ID, notification)

        startHeartbeatLoop()
        startOfflineSyncLoop()

        return START_STICKY
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "PaisaBridge Foreground Service",
            NotificationManager.IMPORTANCE_LOW
        )
        val manager = getSystemService(NotificationManager::class.java)
        manager?.createNotificationChannel(channel)
    }

    private fun createNotification(content: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("PaisaBridge PK Active")
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()
    }

    private fun startHeartbeatLoop() {
        serviceScope.launch {
            while (isActive) {
                try {
                    val prefs = BridgePreferences(applicationContext)
                    if (prefs.isPairedFlow.first()) {
                        val baseUrl = prefs.workerBaseUrlFlow.first()
                        val deviceId = prefs.deviceIdFlow.first()
                        val secret = prefs.deviceSecretFlow.first()

                        val batteryManager = getSystemService(BATTERY_SERVICE) as BatteryManager
                        val batteryPct = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

                        val api = RetrofitClient.getApi(baseUrl, { deviceId }, { secret })
                        api.sendHeartbeat(
                            HeartbeatRequest(
                                battery_pct = batteryPct,
                                app_version = "1.0",
                                network_type = "WiFi/Cellular"
                            )
                        )
                        Log.d("BridgeFGS", "Heartbeat sent successfully")
                    }
                } catch (e: Exception) {
                    Log.e("BridgeFGS", "Heartbeat failed", e)
                }
                delay(60_000L) // every 1 minute
            }
        }
    }

    private fun startOfflineSyncLoop() {
        serviceScope.launch {
            while (isActive) {
                try {
                    val prefs = BridgePreferences(applicationContext)
                    if (prefs.isPairedFlow.first()) {
                        val baseUrl = prefs.workerBaseUrlFlow.first()
                        val deviceId = prefs.deviceIdFlow.first()
                        val secret = prefs.deviceSecretFlow.first()

                        val db = BridgeAppDatabase.getDatabase(applicationContext)
                        val pendingList = db.pendingNotificationDao().getAllPending()

                        if (pendingList.isNotEmpty()) {
                            val api = RetrofitClient.getApi(baseUrl, { deviceId }, { secret })
                            for (item in pendingList) {
                                try {
                                    val res = api.notifyTransaction(
                                        BridgeNotifyRequest(
                                            provider = item.provider,
                                            raw_text = item.rawText,
                                            received_at = item.receivedAt,
                                            sender = item.sender
                                        )
                                    )
                                    if (res.success) {
                                        db.pendingNotificationDao().delete(item)
                                        Log.d("BridgeFGS", "Synced buffered notification ID ${item.id}")
                                    }
                                } catch (e: Exception) {
                                    break // stop syncing if network is down
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e("BridgeFGS", "Offline sync error", e)
                }
                delay(30_000L) // every 30 seconds
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
    }
}
