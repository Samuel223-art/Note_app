package com.example.smartnotereminder.reminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val noteId = intent.getIntExtra("NOTE_ID", -1)
        val title = intent.getStringExtra("TITLE") ?: "Reminder"
        val content = intent.getStringExtra("CONTENT") ?: ""

        if (noteId != -1) {
            val notificationHelper = NotificationHelper(context)
            notificationHelper.showNotification(title, content, noteId)
        }
    }
}
