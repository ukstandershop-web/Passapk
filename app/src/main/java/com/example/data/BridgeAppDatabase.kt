package com.example.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [PendingNotificationEntity::class], version = 1, exportSchema = false)
abstract class BridgeAppDatabase : RoomDatabase() {
    abstract fun pendingNotificationDao(): PendingNotificationDao

    companion object {
        @Volatile
        private var INSTANCE: BridgeAppDatabase? = null

        fun getDatabase(context: Context): BridgeAppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    BridgeAppDatabase::class.java,
                    "bridge_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
