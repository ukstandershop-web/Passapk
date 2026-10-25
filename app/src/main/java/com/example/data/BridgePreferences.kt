package com.example.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore by preferencesDataStore(name = "bridge_prefs")

class BridgePreferences(private val context: Context) {
    object Keys {
        val WORKER_BASE_URL = stringPreferencesKey("worker_base_url")
        val DEVICE_ID = stringPreferencesKey("device_id")
        val DEVICE_SECRET = stringPreferencesKey("device_secret")
        val IS_PAIRED = booleanPreferencesKey("is_paired")
    }

    val workerBaseUrlFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[Keys.WORKER_BASE_URL] ?: ""
    }

    val deviceIdFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[Keys.DEVICE_ID] ?: ""
    }

    val deviceSecretFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[Keys.DEVICE_SECRET] ?: ""
    }

    val isPairedFlow: Flow<Boolean> = context.dataStore.data.map { prefs ->
        prefs[Keys.IS_PAIRED] ?: false
    }

    suspend fun savePairing(baseUrl: String, deviceId: String, secret: String) {
        context.dataStore.edit { prefs ->
            prefs[Keys.WORKER_BASE_URL] = baseUrl.trimEnd('/')
            prefs[Keys.DEVICE_ID] = deviceId
            prefs[Keys.DEVICE_SECRET] = secret
            prefs[Keys.IS_PAIRED] = true
        }
    }

    suspend fun clearPairing() {
        context.dataStore.edit { prefs ->
            prefs.clear()
        }
    }
}
