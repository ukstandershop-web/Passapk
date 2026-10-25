package com.example

import android.app.Application

class BridgeApp : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: BridgeApp
            private set
    }
}
