package com.example.ui

import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudSync
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.data.BridgeAppDatabase
import com.example.data.BridgePreferences
import com.example.service.BridgeForegroundService
import com.example.service.BridgeNotificationListenerService
import com.example.network.BridgeNotifyRequest
import com.example.network.RetrofitClient
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatusScreen(onUnpair: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val prefs = remember { BridgePreferences(context) }
    val db = remember { BridgeAppDatabase.getDatabase(context) }

    var baseUrl by remember { mutableStateOf("") }
    var deviceId by remember { mutableStateOf("") }
    var deviceSecret by remember { mutableStateOf("") }
    var pendingCount by remember { mutableStateOf(0) }
    var testResult by remember { mutableStateOf<String?>(null) }

    val notificationAccessGranted = remember {
        val enabledListeners = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        )
        enabledListeners?.contains(context.packageName) == true
    }

    LaunchedEffect(Unit) {
        baseUrl = prefs.workerBaseUrlFlow.first()
        deviceId = prefs.deviceIdFlow.first()
        deviceSecret = prefs.deviceSecretFlow.first()

        db.pendingNotificationDao().getPendingCountFlow().collect { count ->
            pendingCount = count
        }
    }

    // Start Foreground service if paired
    LaunchedEffect(deviceId) {
        if (deviceId.isNotEmpty()) {
            val intent = Intent(context, BridgeForegroundService::class.java)
            context.startForegroundService(intent)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("PaisaBridge Dashboard") },
                actions = {
                    TextButton(onClick = {
                        scope.launch {
                            prefs.clearPairing()
                            onUnpair()
                        }
                    }) {
                        Text("Unpair", color = MaterialTheme.colorScheme.error)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Status Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Text("Bridge Active & Online", style = MaterialTheme.typography.titleMedium)
                    }
                    Text("Device ID: $deviceId", style = MaterialTheme.typography.bodyMedium)
                    Text("Worker URL: $baseUrl", style = MaterialTheme.typography.bodySmall)
                }
            }

            // Permissions Card
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Required Permissions", style = MaterialTheme.typography.titleMedium)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Notification Access")
                        if (notificationAccessGranted) {
                            Text("Granted", color = MaterialTheme.colorScheme.primary)
                        } else {
                            Button(onClick = {
                                context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                            }) {
                                Text("Grant")
                            }
                        }
                    }
                }
            }

            // Queue Card
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Offline Queue Status", style = MaterialTheme.typography.titleMedium)
                    Text("Pending Notifications: $pendingCount", style = MaterialTheme.typography.bodyLarge)
                }
            }

            // Test Simulation Button
            Button(
                onClick = {
                    scope.launch {
                        try {
                            val api = RetrofitClient.getApi(baseUrl, { deviceId }, { deviceSecret })
                            val res = api.notifyTransaction(
                                BridgeNotifyRequest(
                                    provider = "TestBank",
                                    raw_text = "Your account has been credited with Rs. 1,500.00 on 25-Oct-2026. Ref: TR_TEST_999",
                                    received_at = System.currentTimeMillis(),
                                    sender = "8558"
                                )
                            )
                            testResult = if (res.success) "Test notification successfully sent and verified!" else "Failed to verify test notification"
                        } catch (e: Exception) {
                            testResult = "Error: ${e.localizedMessage}"
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.CloudSync, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Send Test Payment Notification")
            }

            if (testResult != null) {
                Text(
                    text = testResult!!,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.secondary
                )
            }
        }
    }
}
