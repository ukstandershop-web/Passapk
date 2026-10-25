package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.example.data.BridgePreferences
import com.example.ui.PairingScreen
import com.example.ui.StatusScreen
import com.example.ui.theme.MyApplicationTheme
import kotlinx.coroutines.flow.first

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    BridgeAppRoot()
                }
            }
        }
    }
}

@Composable
fun BridgeAppRoot() {
    val context = LocalContext.current
    val prefs = remember { BridgePreferences(context) }
    var isPaired by remember { mutableStateOf<Boolean?>(null) }

    LaunchedEffect(Unit) {
        prefs.isPairedFlow.collect { paired ->
            isPaired = paired
        }
    }

    when (isPaired) {
        true -> StatusScreen(onUnpair = { isPaired = false })
        false -> PairingScreen(onPaired = { isPaired = true })
        null -> {
            // Loading
        }
    }
}
