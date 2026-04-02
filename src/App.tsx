import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Bell, Clock, Calendar as CalendarIcon, X, CheckCircle2, Menu, ChevronLeft, Save, User, ChevronRight, FileText, Star, Archive, Palette, Settings, Shield, Scale, Pin, Type, Palette as ColorIcon, Share2, ToggleLeft, ToggleRight, Bold, Italic, Underline, Highlighter, Undo, Redo, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Note {
  id: string;
  title: string;
  content: string;
  reminderTime: string | null;
  isReminderSet: boolean;
  isFavourite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  showToolbar: boolean;
  fontSize: number;
  textColor: string;
  createdAt: number;
}

interface Theme {
  id: string;
  name: string;
  bg: string;
  text: string;
  accent: string;
  accentText: string;
  secondary: string;
  border: string;
  card: string;
}

const THEMES: Theme[] = [
  { id: 'light', name: 'Light', bg: '#ffffff', text: '#000000', accent: '#000000', accentText: '#ffffff', secondary: '#f4f4f5', border: '#e4e4e7', card: '#ffffff' },
  { id: 'dark', name: 'Dark', bg: '#000000', text: '#ffffff', accent: '#ffffff', accentText: '#000000', secondary: '#18181b', border: '#27272a', card: '#18181b' },
  { id: 'system', name: 'System', bg: '', text: '', accent: '', accentText: '', secondary: '', border: '', card: '' },
];

type View = 'home' | 'editor' | 'favourites' | 'archived' | 'trash' | 'noteSettings' | 'themes' | 'privacy' | 'terms' | 'license';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<View>('home');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentThemeId, setCurrentThemeId] = useState('system');
  const [activeReminders, setActiveReminders] = useState<Record<string, number>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const menuItems: { icon: any, label: string, view?: View, separator?: boolean }[] = [
    { icon: FileText, label: 'All notes', view: 'home' },
    { icon: Star, label: 'Favourite notes', view: 'favourites' },
    { icon: Archive, label: 'Archived notes', view: 'archived' },
    { icon: Trash2, label: 'Deleted notes', view: 'trash' },
    { icon: Palette, label: 'Themes', view: 'themes', separator: true },
    { icon: Shield, label: 'Privacy and Policy', view: 'privacy' },
    { icon: FileText, label: 'Terms and Conditions', view: 'terms' },
    { icon: Scale, label: 'Licence', view: 'license' },
  ];

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('smart_notes_v2');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
    const savedTheme = localStorage.getItem('smart_notes_theme');
    if (savedTheme) {
      setCurrentThemeId(savedTheme);
    }
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem('smart_notes_v2', JSON.stringify(notes));
  }, [notes]);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('smart_notes_theme', currentThemeId);
    
    // Apply theme colors to CSS variables
    let theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
    
    if (currentThemeId === 'system') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = isDarkMode ? THEMES[1] : THEMES[0]; // Dark or Light
    }

    const root = document.documentElement;
    root.style.setProperty('--bg-color', theme.bg);
    root.style.setProperty('--text-color', theme.text);
    root.style.setProperty('--accent-color', theme.accent);
    root.style.setProperty('--secondary-color', theme.secondary);
    root.style.setProperty('--border-color', theme.border);
    root.style.setProperty('--card-color', theme.card);
    root.style.setProperty('--accent-text-color', theme.accentText);
  }, [currentThemeId]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const checkReminders = useCallback(() => {
    const now = new Date().getTime();
    notes.forEach((note) => {
      if (note.isReminderSet && note.reminderTime) {
        const reminderTime = new Date(note.reminderTime).getTime();
        if (reminderTime <= now && reminderTime > now - 60000) {
          if (!activeReminders[note.id]) {
            showNotification(note);
            setActiveReminders(prev => ({ ...prev, [note.id]: reminderTime }));
          }
        }
      }
    });
  }, [notes, activeReminders]);

  useEffect(() => {
    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  const showNotification = (note: Note) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Reminder: ${note.title}`, { body: note.content });
    } else {
      alert(`REMINDER: ${note.title}\n\n${note.content}`);
    }
  };

  const handleCreateNote = () => {
    if (!newNoteTitle.trim()) return;

    const note: Note = {
      id: crypto.randomUUID(),
      title: newNoteTitle,
      content: '',
      reminderTime: null,
      isReminderSet: false,
      isFavourite: false,
      isArchived: false,
      isDeleted: false,
      isPinned: false,
      showToolbar: false,
      fontSize: 16,
      textColor: '#e4e4e7', // zinc-200
      createdAt: Date.now(),
    };

    setNotes([note, ...notes]);
    setCurrentNote(note);
    setNewNoteTitle('');
    setIsModalOpen(false);
    setView('editor');
  };

  const toggleFavourite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(notes.map(n => n.id === id ? { ...n, isFavourite: !n.isFavourite } : n));
  };

  const toggleArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(notes.map(n => n.id === id ? { ...n, isArchived: !n.isArchived } : n));
  };

  const moveToTrash = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const restoreFromTrash = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(notes.map(n => n.id === id ? { ...n, isDeleted: false } : n));
  };

  const deletePermanently = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!noteToDeleteId) return;
    const note = notes.find(n => n.id === noteToDeleteId);
    if (!note) return;

    if (note.isDeleted) {
      setNotes(notes.filter(n => n.id !== noteToDeleteId));
    } else {
      setNotes(notes.map(n => n.id === noteToDeleteId ? { ...n, isDeleted: true, isArchived: false } : n));
    }
    setIsDeleteModalOpen(false);
    setNoteToDeleteId(null);
  };

  const handleExport = () => {
    if (!currentNote) return;
    const element = document.createElement("a");
    const plainText = currentNote.content.replace(/<[^>]*>/g, '');
    const file = new Blob([plainText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${currentNote.title}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentNote) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      updateNoteContent(content);
    };
    reader.readAsText(file);
  };

  const updateNoteContent = (content: string) => {
    if (!currentNote) return;
    const updatedNote = { ...currentNote, content };
    setCurrentNote(updatedNote);
    setNotes(prevNotes => prevNotes.map(n => n.id === updatedNote.id ? updatedNote : n));
  };

  useEffect(() => {
    if (editorRef.current && currentNote && view === 'editor') {
      // Only set content if it's different to avoid cursor jumps
      // We check if the innerHTML is different from the state content
      // This usually only happens when the note is first loaded or changed from outside
      if (editorRef.current.innerHTML !== currentNote.content) {
        editorRef.current.innerHTML = currentNote.content;
      }
    }
  }, [currentNote?.id, view]);

  const openNote = (note: Note) => {
    setCurrentNote(note);
    setView('editor');
  };

  const filteredNotes = notes.filter(note => {
    // If searching, include all notes that match the query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = note.title.toLowerCase().includes(query);
      const plainContent = note.content.replace(/<[^>]*>/g, '').toLowerCase();
      const contentMatch = plainContent.includes(query);
      return titleMatch || contentMatch;
    }

    // Otherwise, filter by view
    if (view === 'trash') {
      return note.isDeleted;
    } else {
      if (note.isDeleted) return false;
      if (view === 'archived') return note.isArchived;
      if (note.isArchived) return false;
      if (view === 'favourites') return note.isFavourite;
    }

    return true;
  }).sort((a, b) => {
    // If searching, prioritize active notes over archived/deleted
    if (searchQuery.trim()) {
      const getPriority = (n: Note) => {
        if (n.isDeleted) return 3;
        if (n.isArchived) return 2;
        return 1;
      };
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);
      if (priorityA !== priorityB) return priorityA - priorityB;
    }

    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  const getPageTitle = () => {
    if (searchQuery.trim()) return 'Search Results';
    switch (view) {
      case 'favourites': return 'Favourite Notes';
      case 'archived': return 'Archived Notes';
      case 'trash': return 'Deleted Notes';
      case 'themes': return 'Themes';
      case 'privacy': return 'Privacy Policy';
      case 'terms': return 'Terms & Conditions';
      case 'license': return 'License';
      default: return 'X Note';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (view === 'themes') {
    return (
      <div className="min-h-screen bg-theme-bg flex flex-col">
        <header className="bg-theme-card/50 backdrop-blur-md border-b border-theme-border sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
            <button 
              onClick={() => setView('home')}
              className="p-1.5 hover:bg-theme-card rounded-full transition-colors text-theme-text opacity-60"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-theme-text">Themes</h1>
          </div>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setCurrentThemeId(theme.id)}
                className={`group relative flex flex-col gap-2.5 p-3 rounded-xl border-2 transition-all ${
                  currentThemeId === theme.id ? 'border-theme-accent ring-2 ring-theme-accent/20' : 'border-theme-border hover:border-theme-accent/50'
                }`}
                style={{ backgroundColor: theme.bg }}
              >
                <div className="w-full aspect-video rounded-lg flex flex-col gap-1 p-2 overflow-hidden shadow-inner" style={{ backgroundColor: theme.card }}>
                  <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: theme.accent }} />
                  <div className="h-1 w-full rounded-full opacity-20" style={{ backgroundColor: theme.text }} />
                  <div className="h-1 w-3/4 rounded-full opacity-20" style={{ backgroundColor: theme.text }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate" style={{ color: theme.text }}>{theme.name}</span>
                  {currentThemeId === theme.id && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: theme.accent }} />}
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (view === 'privacy' || view === 'terms' || view === 'license') {
    const content = {
      privacy: {
        title: 'Privacy Policy',
        text: `Your privacy is important to us. It is X Note's policy to respect your privacy regarding any information we may collect from you across our website and other sites we own and operate.

We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.

We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.

We don’t share any personally identifying information publicly or with third-parties, except when required to by law.

Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies.

You are free to refuse our request for your personal information, with the understanding that we may be unable to provide you with some of your desired services.

Your continued use of our website will be regarded as acceptance of our practices around privacy and personal information. If you have any questions about how we handle user data and personal information, feel free to contact us.`
      },
      terms: {
        title: 'Terms & Conditions',
        text: `By accessing the app X Note, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this app are protected by applicable copyright and trademark law.

Use License: Permission is granted to temporarily download one copy of the materials (information or software) on X Note's app for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
- Modify or copy the materials;
- Use the materials for any commercial purpose, or for any public display (commercial or non-commercial);
- Attempt to decompile or reverse engineer any software contained on X Note's app;
- Remove any copyright or other proprietary notations from the materials; or
- Transfer the materials to another person or "mirror" the materials on any other server.

This license shall automatically terminate if you violate any of these restrictions and may be terminated by X Note at any time. Upon terminating your viewing of these materials or upon the termination of this license, you must destroy any downloaded materials in your possession whether in electronic or printed format.`
      },
      license: {
        title: 'License',
        text: `MIT License

Copyright (c) 2026 X Note

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`
      }
    }[view];

    return (
      <div className="min-h-screen bg-theme-bg flex flex-col">
        <header className="bg-theme-card/50 backdrop-blur-md border-b border-theme-border sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
            <button 
              onClick={() => setView('home')}
              className="p-1.5 hover:bg-theme-card rounded-full transition-colors text-theme-text opacity-60"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-theme-text">{content.title}</h1>
          </div>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto p-4">
          <div className="bg-theme-card rounded-xl border border-theme-border p-5">
            <div className="prose prose-xs max-w-none text-theme-text opacity-80 leading-relaxed whitespace-pre-wrap">
              {content.text}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'noteSettings' && currentNote) {
    const updateSetting = (key: keyof Note, value: any) => {
      const updatedNote = { ...currentNote, [key]: value };
      setCurrentNote(updatedNote);
      setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
    };

    const isDimmed = currentNote.isDeleted;
    const isFavouriteDimmed = currentNote.isDeleted || currentNote.isArchived;

    return (
      <div className="min-h-screen bg-theme-bg flex flex-col">
        <header className="bg-theme-card/50 backdrop-blur-md border-b border-theme-border sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
            <button 
              onClick={() => setView('editor')}
              className="p-1.5 hover:bg-theme-card rounded-full transition-colors text-theme-text opacity-60"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-theme-text">Note Settings</h1>
          </div>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto pt-8 pb-12">
          {/* Rename Section */}
          <section className={`mb-12 ${isDimmed ? 'opacity-40 pointer-events-none' : ''}`}>
            <h2 className="text-[10px] font-black text-theme-text opacity-40 uppercase tracking-[0.2em] px-4 mb-3">Note Title</h2>
            <div className="border-y border-theme-border bg-theme-card/20 p-4">
              <div className="flex items-center gap-3 mb-2">
                <Type className="w-4 h-4 text-theme-accent" />
                <span className="text-sm font-bold text-theme-text opacity-80">Rename Note</span>
              </div>
              <input 
                type="text"
                value={currentNote.title}
                onChange={(e) => updateSetting('title', e.target.value)}
                placeholder="Enter note title..."
                className="w-full bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-theme-text focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition-all"
              />
              <p className="text-[11px] text-theme-text opacity-40 mt-2 ml-1">This will update the title across all views</p>
            </div>
          </section>

          {/* General Settings */}
          <section className={`mb-12 ${isDimmed ? 'opacity-40 pointer-events-none' : ''}`}>
            <h2 className="text-[10px] font-black text-theme-text opacity-40 uppercase tracking-[0.2em] px-4 mb-3">General</h2>
            <div className="border-y border-theme-border">
              <div className="flex items-center justify-between p-4 hover:bg-theme-card/20 transition-colors">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <Pin className={`w-4 h-4 ${currentNote.isPinned ? 'text-theme-accent' : 'text-theme-text opacity-40'}`} />
                    <span className="text-sm font-bold text-theme-text opacity-80">Pin Note</span>
                  </div>
                  <p className="text-[11px] text-theme-text opacity-40 ml-7">Notes pinned will appear at the top above all notes</p>
                </div>
                <button onClick={() => updateSetting('isPinned', !currentNote.isPinned)}>
                  {currentNote.isPinned ? <ToggleRight className="w-7 h-7 text-theme-accent" /> : <ToggleLeft className="w-7 h-7 text-theme-border" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-theme-border hover:bg-theme-card/20 transition-colors">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <Menu className={`w-4 h-4 ${currentNote.showToolbar ? 'text-theme-accent' : 'text-theme-text opacity-40'}`} />
                    <span className="text-sm font-bold text-theme-text opacity-80">Tools Bar</span>
                  </div>
                  <p className="text-[11px] text-theme-text opacity-40 ml-7">Show rich text formatting tools at the bottom of the editor</p>
                </div>
                <button onClick={() => updateSetting('showToolbar', !currentNote.showToolbar)}>
                  {currentNote.showToolbar ? <ToggleRight className="w-7 h-7 text-theme-accent" /> : <ToggleLeft className="w-7 h-7 text-theme-border" />}
                </button>
              </div>
            </div>
          </section>

          {/* Reminders */}
          <section className={`mb-12 ${isDimmed ? 'opacity-40 pointer-events-none' : ''}`}>
            <h2 className="text-[10px] font-black text-theme-text opacity-40 uppercase tracking-[0.2em] px-4 mb-3">Reminders</h2>
            <div className="border-y border-theme-border p-4 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <Bell className={`w-4 h-4 ${currentNote.isReminderSet ? 'text-theme-accent' : 'text-theme-text opacity-40'}`} />
                    <span className="text-sm font-bold text-theme-text opacity-80">Enable Reminder</span>
                  </div>
                  <p className="text-[11px] text-theme-text opacity-40 ml-7">Get notified at a specific time</p>
                </div>
                <button onClick={() => updateSetting('isReminderSet', !currentNote.isReminderSet)}>
                  {currentNote.isReminderSet ? <ToggleRight className="w-7 h-7 text-theme-accent" /> : <ToggleLeft className="w-7 h-7 text-theme-border" />}
                </button>
              </div>

              {currentNote.isReminderSet && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-theme-text opacity-40" />
                    <span className="text-sm font-bold text-theme-text opacity-80">Set Time</span>
                  </div>
                  <div className="px-7">
                    <input 
                      type="datetime-local" 
                      value={currentNote.reminderTime || ''}
                      onChange={(e) => updateSetting('reminderTime', e.target.value)}
                      className="w-full bg-theme-bg border border-theme-border rounded-xl p-3 text-theme-text text-sm outline-none focus:border-theme-accent transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Appearance */}
          <section className={`mb-12 ${isDimmed ? 'opacity-40 pointer-events-none' : ''}`}>
            <h2 className="text-[10px] font-black text-theme-text opacity-40 uppercase tracking-[0.2em] px-4 mb-3">Appearance</h2>
            <div className="border-y border-theme-border p-4 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <Type className="w-4 h-4 text-theme-text opacity-40" />
                      <span className="text-sm font-bold text-theme-text opacity-80">Font Size</span>
                    </div>
                    <p className="text-[11px] text-theme-text opacity-40 ml-7">Adjust the editor text size</p>
                  </div>
                  <span className="text-xs font-bold text-theme-accent bg-theme-accent/10 px-2 py-1 rounded-md">{currentNote.fontSize}px</span>
                </div>
                <div className="px-7">
                  <input 
                    type="range" 
                    min="12" 
                    max="32" 
                    value={currentNote.fontSize}
                    onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                    className="w-full h-1.5 bg-theme-border rounded-lg appearance-none cursor-pointer accent-theme-accent"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-theme-text opacity-20">Small</span>
                    <span className="text-[10px] text-theme-text opacity-20">Large</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <ColorIcon className="w-4 h-4 text-theme-text opacity-40" />
                    <span className="text-sm font-bold text-theme-text opacity-80">Text Color</span>
                  </div>
                  <p className="text-[11px] text-theme-text opacity-40 ml-7">Choose a custom color for your text</p>
                </div>
                <div className="px-7 flex flex-wrap gap-3">
                  {['#f4f4f5', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'].map(color => (
                    <button
                      key={color}
                      onClick={() => updateSetting('textColor', color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${currentNote.textColor === color ? 'border-theme-accent scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="mb-12">
            <h2 className="text-[10px] font-black text-theme-text opacity-40 uppercase tracking-[0.2em] px-4 mb-3">Actions</h2>
            <div className="border-y border-theme-border">
              <button 
                onClick={handleExport}
                className="w-full flex items-center justify-between p-3.5 hover:bg-theme-card/20 transition-colors"
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2.5">
                    <Save className="w-3.5 h-3.5 text-theme-text opacity-40" />
                    <span className="text-xs font-bold text-theme-text opacity-80">Export as .txt</span>
                  </div>
                  <p className="text-[10px] text-theme-text opacity-40 ml-6">Save this note to your device as a text file</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-theme-text opacity-20" />
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-between p-3.5 border-t border-theme-border hover:bg-theme-card/20 transition-colors"
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2.5">
                    <Plus className="w-3.5 h-3.5 text-theme-text opacity-40" />
                    <span className="text-xs font-bold text-theme-text opacity-80">Import .txt</span>
                  </div>
                  <p className="text-[10px] text-theme-text opacity-40 ml-6">Upload a text file to replace note content</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImport} 
                  accept=".txt" 
                  className="hidden" 
                />
                <ChevronRight className="w-3.5 h-3.5 text-theme-text opacity-20" />
              </button>

              <button 
                onClick={(e) => toggleFavourite(currentNote.id, e)}
                className={`w-full flex items-center justify-between p-3.5 border-t border-theme-border hover:bg-theme-card/20 transition-colors ${isFavouriteDimmed ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2.5">
                    <Star className={`w-3.5 h-3.5 ${currentNote.isFavourite ? 'text-yellow-600 fill-current' : 'text-theme-text opacity-40'}`} />
                    <span className="text-xs font-bold text-theme-text opacity-80">Favourite</span>
                  </div>
                  <p className="text-[10px] text-theme-text opacity-40 ml-6">Quickly access this note from the favourites tab</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-theme-text opacity-20" />
              </button>

              <button 
                onClick={(e) => {
                  toggleArchive(currentNote.id, e);
                  if (!currentNote.isArchived) setView('home');
                }}
                className={`w-full flex items-center justify-between p-3.5 border-t border-theme-border hover:bg-theme-card/20 transition-colors ${isDimmed ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2.5">
                    <Archive className={`w-3.5 h-3.5 ${currentNote.isArchived ? 'text-theme-accent' : 'text-theme-text opacity-40'}`} />
                    <span className="text-xs font-bold text-theme-text opacity-80">Archive</span>
                  </div>
                  <p className="text-[10px] text-theme-text opacity-40 ml-6">Move to archive to keep your main list clean</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-theme-text opacity-20" />
              </button>

              <button 
                onClick={(e) => {
                  if (currentNote.isDeleted) {
                    deletePermanently(currentNote.id, e);
                    setView('home');
                  } else {
                    moveToTrash(currentNote.id, e);
                    setView('home');
                  }
                }}
                className="w-full flex items-center justify-between p-3.5 border-t border-theme-border hover:bg-red-950/20 transition-colors group"
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-xs font-bold text-red-600">{currentNote.isDeleted ? 'Delete Permanently' : 'Move to Trash'}</span>
                  </div>
                  <p className="text-[10px] text-red-600/40 ml-6">{currentNote.isDeleted ? 'This action cannot be undone' : 'Move this note to the trash bin'}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-red-600/20" />
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  } else if (view === 'editor' && currentNote) {
    const handleSave = () => {
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    };

    const formatText = (command: string, value?: string) => {
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand(command, false, value);
        // Trigger onInput manually if needed, but execCommand usually triggers it
      }
    };

    const handleHighlight = () => {
      // Toggle highlight: white background, black text
      const selection = window.getSelection();
      if (selection && selection.toString()) {
        document.execCommand('backColor', false, 'white');
        document.execCommand('foreColor', false, 'black');
      }
    };

    return (
      <div className="min-h-screen bg-theme-bg flex flex-col relative overflow-hidden">
        {/* Editor Header */}
        <header className="bg-theme-card/50 backdrop-blur-md border-b border-theme-border sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <button 
                onClick={() => setView('home')}
                className="p-1.5 hover:bg-theme-card rounded-full transition-colors text-theme-text opacity-60"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-base font-semibold text-theme-text truncate pr-4">
                {currentNote.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSave}
                className="bg-theme-accent hover:opacity-90 text-theme-accent-text px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 shadow-lg shadow-theme-accent/20"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
              <button 
                onClick={() => setView('noteSettings')}
                className="p-1.5 hover:bg-theme-card rounded-full transition-colors text-theme-text opacity-60"
              >
                <Settings className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Editor Content */}
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col">
          <div 
            ref={editorRef}
            id="note-editor"
            contentEditable
            onInput={(e) => updateNoteContent(e.currentTarget.innerHTML)}
            placeholder="Start writing your note here..."
            style={{ fontSize: `${currentNote.fontSize}px`, color: currentNote.textColor }}
            className="w-full flex-1 bg-transparent text-base leading-relaxed outline-none resize-none overflow-y-auto"
          />
        </main>

        {currentNote.showToolbar && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-theme-card border-t border-theme-border p-2 flex items-center justify-around shadow-xl w-full"
          >
            <button onClick={() => formatText('bold')} className="p-3 text-theme-text opacity-40 hover:text-theme-accent transition-colors flex-1 flex justify-center"><Bold className="w-4 h-4" /></button>
            <button onClick={() => formatText('italic')} className="p-3 text-theme-text opacity-40 hover:text-theme-accent transition-colors flex-1 flex justify-center"><Italic className="w-4 h-4" /></button>
            <button onClick={() => formatText('underline')} className="p-3 text-theme-text opacity-40 hover:text-theme-accent transition-colors flex-1 flex justify-center"><Underline className="w-4 h-4" /></button>
            <button onClick={handleHighlight} className="p-3 text-theme-text opacity-40 hover:text-theme-accent transition-colors flex-1 flex justify-center"><Highlighter className="w-4 h-4" /></button>
            <button onClick={() => formatText('undo')} className="p-3 text-theme-text opacity-40 hover:text-theme-accent transition-colors flex-1 flex justify-center"><Undo className="w-4 h-4" /></button>
            <button onClick={() => formatText('redo')} className="p-3 text-theme-text opacity-40 hover:text-theme-accent transition-colors flex-1 flex justify-center"><Redo className="w-4 h-4" /></button>
          </motion.div>
        )}

        {/* Saved Toast */}
        <AnimatePresence>
          {showSavedToast && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-theme-accent text-theme-accent-text px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-bold">Saved</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg pb-20">
      {/* Home Header */}
      <header className="bg-theme-card/50 backdrop-blur-md border-b border-theme-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-theme-text tracking-tight">{getPageTitle()}</h1>
          </div>
          <div className="flex items-center gap-2">
            {view === 'home' && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-theme-accent hover:opacity-90 text-theme-accent-text px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 shadow-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                New Note
              </button>
            )}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 hover:bg-theme-card rounded-full transition-colors text-theme-text opacity-60"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[320px] bg-theme-card border-r border-theme-border z-[70] overflow-y-auto"
            >
              <div className="p-6">
                {/* App Branding Section */}
                <div className="px-4 py-5 mb-1">
                  <h2 className="text-xl font-black text-theme-text tracking-tighter">X Note</h2>
                  <p className="text-[9px] text-theme-text opacity-40 font-medium mt-0.5 uppercase tracking-widest">Workspace</p>
                </div>

                {/* Menu Items */}
                <nav className="space-y-1">
                  {menuItems.map((item, index) => (
                    <React.Fragment key={index}>
                      {item.separator && <div className="h-px bg-theme-border my-4 mx-2" />}
                      <button 
                        onClick={() => {
                          if (item.view) {
                            setView(item.view);
                            setIsMenuOpen(false);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${
                          view === item.view ? 'bg-theme-accent/10 text-theme-accent' : 'text-theme-text opacity-60 hover:bg-theme-bg hover:text-theme-text'
                        }`}
                      >
                        <item.icon className={`w-4 h-4 group-hover:scale-110 transition-transform ${view === item.view ? 'text-theme-accent' : ''}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    </React.Fragment>
                  ))}
                </nav>
              </div>

              {/* Bottom Version Info */}
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-theme-text opacity-20 text-xs text-center">Smart Note v2.0.0</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8 relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-theme-text opacity-40" />
          </div>
          <input 
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-theme-card border border-theme-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-theme-text focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition-all shadow-lg"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-theme-text opacity-40 hover:opacity-60"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {filteredNotes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-theme-card rounded-full flex items-center justify-center mx-auto mb-4 border border-theme-border">
              {searchQuery.trim() ? <Search className="w-10 h-10 text-theme-text opacity-20" /> : <Bell className="w-10 h-10 text-theme-text opacity-20" />}
            </div>
            <h3 className="text-lg font-medium text-theme-text opacity-80">
              {searchQuery.trim() ? `No results for "${searchQuery}"` : (view === 'trash' ? 'No deleted notes' : view === 'archived' ? 'No archived notes' : view === 'favourites' ? 'No favourite notes' : 'No notes yet')}
            </h3>
            <p className="text-theme-text opacity-40 mt-1">
              {searchQuery.trim() ? 'Try searching for something else.' : (view === 'home' ? 'Tap the button to create your first note!' : 'Items you move here will appear here.')}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pinned Notes Section */}
            {filteredNotes.some(n => n.isPinned) && (
              <div>
                <h2 className="text-[10px] font-black text-theme-text opacity-40 uppercase tracking-[0.2em] px-4 mb-4">Pinned Note</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredNotes.filter(n => n.isPinned).map((note) => (
                      <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => openNote(note)}
                        className="bg-theme-card rounded-xl border border-theme-border p-4 shadow-sm hover:border-theme-accent/50 transition-all group relative cursor-pointer"
                      >
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {note.isDeleted ? (
                            <>
                              <button 
                                onClick={(e) => restoreFromTrash(note.id, e)}
                                className="p-1.5 text-theme-text opacity-40 hover:text-green-500"
                                title="Restore"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => deletePermanently(note.id, e)}
                                className="p-1.5 text-theme-text opacity-40 hover:text-red-500"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={(e) => toggleFavourite(note.id, e)}
                                className={`p-1.5 transition-colors ${note.isFavourite ? 'text-yellow-500' : 'text-theme-text opacity-40 hover:text-yellow-500'}`}
                                title={note.isFavourite ? 'Remove from Favourites' : 'Add to Favourites'}
                              >
                                <Star className={`w-3.5 h-3.5 ${note.isFavourite ? 'fill-current' : ''}`} />
                              </button>
                              <button 
                                onClick={(e) => toggleArchive(note.id, e)}
                                className={`p-1.5 transition-colors ${note.isArchived ? 'text-theme-accent' : 'text-theme-text opacity-40 hover:text-theme-accent'}`}
                                title={note.isArchived ? 'Unarchive' : 'Archive'}
                              >
                                <Archive className={`w-3.5 h-3.5 ${note.isArchived ? 'fill-current' : ''}`} />
                              </button>
                              <button 
                                onClick={(e) => moveToTrash(note.id, e)}
                                className="p-1.5 text-theme-text opacity-40 hover:text-red-500"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        <h3 className="font-bold text-theme-text text-base mb-1 pr-16 truncate">{note.title}</h3>
                        
                        {searchQuery.trim() && (note.isArchived || note.isDeleted) && (
                          <div className="flex gap-2 mb-2">
                            {note.isArchived && (
                              <span className="text-[10px] uppercase tracking-wider font-bold bg-theme-accent/20 text-theme-accent px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Archive className="w-2.5 h-2.5" /> Archived
                              </span>
                            )}
                            {note.isDeleted && (
                              <span className="text-[10px] uppercase tracking-wider font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Trash2 className="w-2.5 h-2.5" /> Deleted
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-theme-text opacity-60 text-xs line-clamp-3 mb-3">
                          {note.content ? note.content.replace(/<[^>]*>/g, '') : <span className="italic opacity-40">No content yet...</span>}
                        </p>
                        
                        {note.isReminderSet && note.reminderTime && (
                          <div className="flex items-center gap-2 text-theme-accent bg-theme-accent/10 px-3 py-1.5 rounded-lg w-fit">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{formatDate(note.reminderTime)}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Other Notes Section */}
            {filteredNotes.some(n => !n.isPinned) && (
              <div>
                <h2 className="text-[10px] font-black text-theme-text opacity-40 uppercase tracking-[0.2em] px-4 mb-4">Test Notes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredNotes.filter(n => !n.isPinned).map((note) => (
                      <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => openNote(note)}
                        className="bg-theme-card rounded-xl border border-theme-border p-4 shadow-sm hover:border-theme-accent/50 transition-all group relative cursor-pointer"
                      >
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {note.isDeleted ? (
                            <>
                              <button 
                                onClick={(e) => restoreFromTrash(note.id, e)}
                                className="p-1.5 text-theme-text opacity-40 hover:text-green-500"
                                title="Restore"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => deletePermanently(note.id, e)}
                                className="p-1.5 text-theme-text opacity-40 hover:text-red-500"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={(e) => toggleFavourite(note.id, e)}
                                className={`p-1.5 transition-colors ${note.isFavourite ? 'text-yellow-500' : 'text-theme-text opacity-40 hover:text-yellow-500'}`}
                                title={note.isFavourite ? 'Remove from Favourites' : 'Add to Favourites'}
                              >
                                <Star className={`w-3.5 h-3.5 ${note.isFavourite ? 'fill-current' : ''}`} />
                              </button>
                              <button 
                                onClick={(e) => toggleArchive(note.id, e)}
                                className={`p-1.5 transition-colors ${note.isArchived ? 'text-theme-accent' : 'text-theme-text opacity-40 hover:text-theme-accent'}`}
                                title={note.isArchived ? 'Unarchive' : 'Archive'}
                              >
                                <Archive className={`w-3.5 h-3.5 ${note.isArchived ? 'fill-current' : ''}`} />
                              </button>
                              <button 
                                onClick={(e) => moveToTrash(note.id, e)}
                                className="p-1.5 text-theme-text opacity-40 hover:text-red-500"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>

                        <h3 className="font-bold text-theme-text text-base mb-1 pr-16 truncate">{note.title}</h3>
                        
                        {searchQuery.trim() && (note.isArchived || note.isDeleted) && (
                          <div className="flex gap-2 mb-2">
                            {note.isArchived && (
                              <span className="text-[10px] uppercase tracking-wider font-bold bg-theme-accent/20 text-theme-accent px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Archive className="w-2.5 h-2.5" /> Archived
                              </span>
                            )}
                            {note.isDeleted && (
                              <span className="text-[10px] uppercase tracking-wider font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Trash2 className="w-2.5 h-2.5" /> Deleted
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-theme-text opacity-60 text-xs line-clamp-3 mb-3">
                          {note.content ? note.content.replace(/<[^>]*>/g, '') : <span className="italic opacity-40">No content yet...</span>}
                        </p>
                        
                        {note.isReminderSet && note.reminderTime && (
                          <div className="flex items-center gap-2 text-theme-accent bg-theme-accent/10 px-3 py-1.5 rounded-lg w-fit">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">{formatDate(note.reminderTime)}</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Title Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-theme-card w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-theme-border"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-theme-text mb-4 text-center">New Note</h2>
                <div className="space-y-4">
                  <div>
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Enter title..."
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateNote()}
                      className="w-full bg-theme-bg px-4 py-3 rounded-xl border border-theme-border text-theme-text focus:ring-2 focus:ring-theme-accent focus:border-transparent outline-none transition-all text-center text-base placeholder:text-theme-text/20"
                    />
                  </div>
                  <button 
                    onClick={handleCreateNote}
                    disabled={!newNoteTitle.trim()}
                    className="w-full py-3 rounded-xl bg-theme-accent text-theme-accent-text font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-theme-accent/20"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (Mobile) */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="sm:hidden fixed bottom-6 right-6 w-12 h-12 bg-theme-accent rounded-full flex items-center justify-center text-theme-accent-text shadow-2xl shadow-theme-accent/40 active:scale-90 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-theme-card border border-theme-border rounded-3xl p-6 z-[110] shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-theme-text mb-2">Delete Note?</h3>
              <p className="text-theme-text opacity-60 text-sm mb-6">
                {notes.find(n => n.id === noteToDeleteId)?.isDeleted 
                  ? "This action is permanent and cannot be undone." 
                  : "This note will be moved to the trash."}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-theme-bg text-theme-text font-bold text-sm hover:opacity-80 transition-opacity"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
