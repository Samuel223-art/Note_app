package com.example.smartnotereminder.reminder

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.example.smartnotereminder.data.NoteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val db = NoteDatabase.getDatabase(context)
            val notificationHelper = NotificationHelper(context)

            CoroutineScope(Dispatchers.IO).launch {
                val notes = db.noteDao().getAllNotes().first()
                val currentTime = System.currentTimeMillis()
                
                notes.forEach { note ->
                    if (note.isReminderSet && note.reminderTime != null && note.reminderTime > currentTime) {
                        notificationHelper.scheduleAlarm(
                            note.id,
                            note.reminderTime,
                            note.title,
                            note.content
                        )
                    }
                }
            }
        }
    }
}
