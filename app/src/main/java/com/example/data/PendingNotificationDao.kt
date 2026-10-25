package com.example.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface PendingNotificationDao {
    @Query("SELECT * FROM pending_notifications ORDER BY receivedAt ASC")
    suspend fun getAllPending(): List<PendingNotificationEntity>

    @Query("SELECT COUNT(*) FROM pending_notifications")
    fun getPendingCountFlow(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(notification: PendingNotificationEntity): Long

    @Delete
    suspend fun delete(notification: PendingNotificationEntity)

    @Query("DELETE FROM pending_notifications WHERE id = :id")
    suspend fun deleteById(id: Long)
}
