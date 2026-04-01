package com.example.smartnotereminder

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.smartnotereminder.data.Note
import com.example.smartnotereminder.data.NoteDatabase
import com.example.smartnotereminder.databinding.ActivityMainBinding
import com.example.smartnotereminder.databinding.ItemNoteBinding
import com.example.smartnotereminder.reminder.NotificationHelper
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var db: NoteDatabase
    private lateinit var notificationHelper: NotificationHelper
    private val notesList = mutableListOf<Note>()
    private lateinit var adapter: NoteAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        db = NoteDatabase.getDatabase(this)
        notificationHelper = NotificationHelper(this)

        checkNotificationPermission()
        setupRecyclerView()

        binding.fab.setOnClickListener {
            showAddNoteDialog()
        }

        observeNotes()
    }

    private fun checkNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
            }
        }
    }

    private fun setupRecyclerView() {
        adapter = NoteAdapter(notesList) { note ->
            showDeleteConfirmation(note)
        }
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter
    }

    private fun observeNotes() {
        lifecycleScope.launch {
            db.noteDao().getAllNotes().collect { notes ->
                notesList.clear()
                notesList.addAll(notes)
                adapter.notifyDataSetChanged()
            }
        }
    }

    private fun showAddNoteDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_add_note, null)
        val etTitle = dialogView.findViewById<TextInputEditText>(R.id.etTitle)
        val etContent = dialogView.findViewById<TextInputEditText>(R.id.etContent)
        val btnPickDateTime = dialogView.findViewById<View>(R.id.btnPickDateTime)
        val tvSelectedDateTime = dialogView.findViewById<TextView>(R.id.tvSelectedDateTime)

        var selectedCalendar: Calendar? = null

        btnPickDateTime.setOnClickListener {
            val currentCalendar = Calendar.getInstance()
            DatePickerDialog(this, { _, year, month, dayOfMonth ->
                TimePickerDialog(this, { _, hourOfDay, minute ->
                    val calendar = Calendar.getInstance().apply {
                        set(Calendar.YEAR, year)
                        set(Calendar.MONTH, month)
                        set(Calendar.DAY_OF_MONTH, dayOfMonth)
                        set(Calendar.HOUR_OF_DAY, hourOfDay)
                        set(Calendar.MINUTE, minute)
                        set(Calendar.SECOND, 0)
                    }
                    
                    if (calendar.timeInMillis <= System.currentTimeMillis()) {
                        Toast.makeText(this, "Please select a future time", Toast.LENGTH_SHORT).show()
                    } else {
                        selectedCalendar = calendar
                        val sdf = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
                        tvSelectedDateTime.text = "Reminder: ${sdf.format(calendar.time)}"
                    }
                }, currentCalendar.get(Calendar.HOUR_OF_DAY), currentCalendar.get(Calendar.MINUTE), false).show()
            }, currentCalendar.get(Calendar.YEAR), currentCalendar.get(Calendar.MONTH), currentCalendar.get(Calendar.DAY_OF_MONTH)).show()
        }

        AlertDialog.Builder(this)
            .setView(dialogView)
            .setPositiveButton("Save") { _, _ ->
                val title = etTitle.text.toString()
                val content = etContent.text.toString()

                if (title.isNotEmpty()) {
                    saveNote(title, content, selectedCalendar?.timeInMillis)
                } else {
                    Toast.makeText(this, "Title cannot be empty", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun saveNote(title: String, content: String, reminderTime: Long?) {
        lifecycleScope.launch {
            val note = Note(
                title = title,
                content = content,
                reminderTime = reminderTime,
                isReminderSet = reminderTime != null
            )
            val id = db.noteDao().insert(note).toInt()
            
            if (reminderTime != null) {
                notificationHelper.scheduleAlarm(id, reminderTime, title, content)
            }
        }
    }

    private fun showDeleteConfirmation(note: Note) {
        AlertDialog.Builder(this)
            .setTitle("Delete Note")
            .setMessage("Are you sure you want to delete this note?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    db.noteDao().delete(note)
                    if (note.isReminderSet) {
                        notificationHelper.cancelAlarm(note.id)
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    inner class NoteAdapter(
        private val notes: List<Note>,
        private val onDeleteClick: (Note) -> Unit
    ) : RecyclerView.Adapter<NoteAdapter.NoteViewHolder>() {

        inner class NoteViewHolder(val binding: ItemNoteBinding) : RecyclerView.ViewHolder(binding.root)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NoteViewHolder {
            val binding = ItemNoteBinding.inflate(LayoutInflater.from(parent.context), parent, false)
            return NoteViewHolder(binding)
        }

        override fun onBindViewHolder(holder: NoteViewHolder, position: Int) {
            val note = notes[position]
            holder.binding.tvTitle.text = note.title
            holder.binding.tvContent.text = note.content
            
            if (note.isReminderSet && note.reminderTime != null) {
                holder.binding.reminderLayout.visibility = View.VISIBLE
                val sdf = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())
                holder.binding.tvReminderTime.text = "Reminder: ${sdf.format(Date(note.reminderTime))}"
            } else {
                holder.binding.reminderLayout.visibility = View.GONE
            }

            holder.itemView.setOnLongClickListener {
                onDeleteClick(note)
                true
            }
        }

        override fun getItemCount() = notes.size
    }
}
