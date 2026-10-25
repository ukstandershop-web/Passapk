package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_notifications")
data class PendingNotificationEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val provider: String,
    val rawText: String,
    val sender: String,
    val receivedAt: Long,
    val retryCount: Int = 0
)
