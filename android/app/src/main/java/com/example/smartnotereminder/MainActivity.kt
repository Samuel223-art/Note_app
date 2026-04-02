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

    private enum class NoteView {
        ACTIVE, ARCHIVED, TRASH, FAVOURITES
    }

    private var currentView = NoteView.ACTIVE
    private var searchQuery = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        applyTheme()
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        db = NoteDatabase.getDatabase(this)
        notificationHelper = NotificationHelper(this)

        checkNotificationPermission()
        setupRecyclerView()
        setupNavigation()

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
        adapter = NoteAdapter(notesList, 
            onDeleteClick = { note -> showDeleteConfirmation(note) },
            onPinClick = { note -> togglePin(note) },
            onArchiveClick = { note -> toggleArchive(note) },
            onFavouriteClick = { note -> toggleFavourite(note) }
        )
        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.recyclerView.adapter = adapter
    }

    private fun togglePin(note: Note) {
        lifecycleScope.launch {
            db.noteDao().update(note.copy(isPinned = !note.isPinned, updatedAt = System.currentTimeMillis()))
        }
    }

    private fun toggleArchive(note: Note) {
        lifecycleScope.launch {
            db.noteDao().update(note.copy(isArchived = !note.isArchived, isPinned = false, updatedAt = System.currentTimeMillis()))
        }
    }

    private fun toggleFavourite(note: Note) {
        lifecycleScope.launch {
            db.noteDao().update(note.copy(isFavourite = !note.isFavourite, updatedAt = System.currentTimeMillis()))
        }
    }

    private fun applyTheme() {
        val prefs = getSharedPreferences("XNotePrefs", MODE_PRIVATE)
        val themeId = prefs.getString("themeId", "default")
        when (themeId) {
            "midnight" -> setTheme(R.style.Theme_SmartNoteReminder_Midnight)
            "forest" -> setTheme(R.style.Theme_SmartNoteReminder_Forest)
            "sunset" -> setTheme(R.style.Theme_SmartNoteReminder_Sunset)
            "ocean" -> setTheme(R.style.Theme_SmartNoteReminder_Ocean)
            else -> setTheme(R.style.Theme_SmartNoteReminder)
        }
    }

    private fun showThemeDialog() {
        val themes = arrayOf("Default", "Midnight", "Forest", "Sunset", "Ocean")
        AlertDialog.Builder(this)
            .setTitle("Choose Theme")
            .setItems(themes) { _, which ->
                val themeId = themes[which].lowercase()
                getSharedPreferences("XNotePrefs", MODE_PRIVATE)
                    .edit()
                    .putString("themeId", themeId)
                    .apply()
                recreate()
            }
            .show()
    }

    private fun observeNotes() {
        lifecycleScope.launch {
            val flow = when (currentView) {
                NoteView.ACTIVE -> db.noteDao().getAllActiveNotes()
                NoteView.ARCHIVED -> db.noteDao().getArchivedNotes()
                NoteView.TRASH -> db.noteDao().getDeletedNotes()
                NoteView.FAVOURITES -> db.noteDao().getFavouriteNotes()
            }

            flow.collect { notes ->
                val filteredNotes = if (searchQuery.isEmpty()) {
                    notes
                } else {
                    notes.filter { 
                        it.title.contains(searchQuery, ignoreCase = true) || 
                        it.content.contains(searchQuery, ignoreCase = true) 
                    }
                }
                notesList.clear()
                notesList.addAll(filteredNotes)
                adapter.notifyDataSetChanged()
            }
        }
    }

    override fun onCreateOptionsMenu(menu: android.view.Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        val searchItem = menu.findItem(R.id.action_search)
        val searchView = searchItem.actionView as androidx.appcompat.widget.SearchView

        searchView.setOnQueryTextListener(object : androidx.appcompat.widget.SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                searchQuery = query ?: ""
                observeNotes()
                return true
            }

            override fun onQueryTextChange(newText: String?): Boolean {
                searchQuery = newText ?: ""
                observeNotes()
                return true
            }
        })
        return true
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        when (item.itemId) {
            R.id.action_view_active -> {
                currentView = NoteView.ACTIVE
                supportActionBar?.title = "X Note"
                observeNotes()
            }
            R.id.action_view_favourites -> {
                currentView = NoteView.FAVOURITES
                supportActionBar?.title = "Favourites"
                observeNotes()
            }
            R.id.action_view_archived -> {
                currentView = NoteView.ARCHIVED
                supportActionBar?.title = "Archive"
                observeNotes()
            }
            R.id.action_view_trash -> {
                currentView = NoteView.TRASH
                supportActionBar?.title = "Trash"
                observeNotes()
            }
            R.id.action_themes -> {
                showThemeDialog()
            }
            R.id.action_export -> {
                exportNotes()
            }
            R.id.action_import -> {
                importNotes()
            }
        }
        return super.onOptionsItemSelected(item)
    }

    private fun exportNotes() {
        val allNotesText = notesList.joinToString("\n\n---\n\n") { 
            "Title: ${it.title}\nContent: ${it.content}" 
        }
        // Simplified export for now, usually would use SAF
        Toast.makeText(this, "Exporting ${notesList.size} notes...", Toast.LENGTH_SHORT).show()
        // In a real app, I'd use MediaStore or SAF to save a .txt file
    }

    private fun importNotes() {
        // Simplified import for now
        Toast.makeText(this, "Select a .txt file to import", Toast.LENGTH_SHORT).show()
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
                isReminderSet = reminderTime != null,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
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
        private val onDeleteClick: (Note) -> Unit,
        private val onPinClick: (Note) -> Unit,
        private val onArchiveClick: (Note) -> Unit,
        private val onFavouriteClick: (Note) -> Unit
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
            
            holder.binding.ivPinned.visibility = if (note.isPinned) View.VISIBLE else View.GONE
            holder.binding.ivFavourite.visibility = if (note.isFavourite) View.VISIBLE else View.GONE
            
            holder.binding.btnPin.setImageResource(if (note.isPinned) android.R.drawable.btn_star_big_on else android.R.drawable.btn_star_big_off)
            holder.binding.btnFavourite.setImageResource(if (note.isFavourite) android.R.drawable.btn_star_big_on else android.R.drawable.btn_star_big_off)
            
            holder.binding.btnPin.setOnClickListener { onPinClick(note) }
            holder.binding.btnFavourite.setOnClickListener { onFavouriteClick(note) }
            holder.binding.btnArchive.setOnClickListener { onArchiveClick(note) }
            
            if (note.isReminderSet && note.reminderTime != null) {
                holder.binding.reminderLayout.visibility = View.VISIBLE
                val sdf = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())
                holder.binding.tvReminderTime.text = "Reminder: ${sdf.format(Date(note.reminderTime))}"
            } else {
                holder.binding.reminderLayout.visibility = View.GONE
            }

            holder.itemView.setOnClickListener {
                // Open editor
            }

            holder.itemView.setOnLongClickListener {
                onDeleteClick(note)
                true
            }
        }

        override fun getItemCount() = notes.size
    }
}
