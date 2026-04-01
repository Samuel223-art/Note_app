package com.example.smartnotereminder.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "notes")
data class Note(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val title: String,
    val content: String,
    val reminderTime: Long? = null, // Timestamp in milliseconds
    val isReminderSet: Boolean = false
)
