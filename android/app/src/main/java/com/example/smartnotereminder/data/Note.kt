package com.example.smartnotereminder.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "notes")
data class Note(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val title: String,
    val content: String,
    val isPinned: Boolean = false,
    val isArchived: Boolean = false,
    val isFavourite: Boolean = false,
    val isDeleted: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val reminderTime: Long? = null, // Timestamp in milliseconds
    val isReminderSet: Boolean = false,
    val textColor: String = "#000000",
    val fontSize: Int = 16,
    val showToolbar: Boolean = true
)
