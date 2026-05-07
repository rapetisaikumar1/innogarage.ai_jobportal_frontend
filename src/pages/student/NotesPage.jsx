import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { StickyNote, Plus, Edit3, Trash2, Save, X, Search, Clock, Tag } from 'lucide-react';

const CATEGORY_STYLE = {
  'Interview Prep': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'Technical Notes': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Career Development': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'General': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
};

const NotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: '' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data } = await api.get('/training/notes');
      setNotes(data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/training/notes/${editingId}`, form);
        toast.success('Note updated!');
      } else {
        await api.post('/training/notes', form);
        toast.success('Note created!');
      }
      setForm({ title: '', content: '', category: '' });
      setShowForm(false);
      setEditingId(null);
      fetchNotes();
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const handleEdit = (note) => {
    setForm({ title: note.title, content: note.content, category: note.category || '' });
    setEditingId(note.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;
    try {
      await api.delete(`/training/notes/${id}`);
      toast.success('Note deleted');
      fetchNotes();
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.category || '').toLowerCase().includes(q)
    );
  }, [notes, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[16px] font-bold text-gray-900">My Notes</h1>
          {notes.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
              <StickyNote size={12} />
              {notes.length} notes
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center gap-2 shadow-sm w-64">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-800"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ title: '', content: '', category: '' }); }}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm whitespace-nowrap"
          >
            <Plus size={15} /> {showForm ? 'Close' : 'New Note'}
          </button>
        </div>
      </div>

      {/* Body: side-by-side when form is open, full-width grid otherwise */}
      <div className="flex gap-5 flex-1 min-h-0">

        {/* Form Panel */}
        {showForm && (
          <div className="w-80 shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-sm font-bold text-gray-900">{editingId ? 'Edit Note' : 'New Note'}</h3>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); setForm({ title: '', content: '', category: '' }); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col flex-1 p-5 gap-3 min-h-0">
              <input
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-colors"
                placeholder="Note title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <select
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-colors"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select category</option>
                <option value="Interview Prep">Interview Prep</option>
                <option value="Technical Notes">Technical Notes</option>
                <option value="Career Development">Career Development</option>
                <option value="General">General</option>
              </select>
              <textarea
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-colors resize-none flex-1"
                style={{ minHeight: '180px' }}
                placeholder="Write your notes here..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                <Save size={14} /> {editingId ? 'Update' : 'Save'} Note
              </button>
            </form>
          </div>
        )}

        {/* Notes Grid */}
        <div className="flex-1 overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <StickyNote size={24} className="text-gray-300" />
              </div>
              <h3 className="text-sm font-semibold text-gray-500">
                {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {notes.length === 0 ? 'Click "New Note" to start writing' : 'Try a different search term'}
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 p-5">
              <div className={`grid gap-4 ${showForm ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {filtered.map((note) => {
                  const cs = CATEGORY_STYLE[note.category] || CATEGORY_STYLE.General;
                  const dateStr = new Date(note.updatedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  });
                  return (
                    <div
                      key={note.id}
                      className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all group flex flex-col"
                    >
                      {/* Title + Actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{note.title}</h3>
                        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(note)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Category */}
                      {note.category && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border ${cs.bg} ${cs.text} ${cs.border} mb-2`}>
                          <Tag size={9} />
                          {note.category}
                        </span>
                      )}

                      {/* Content */}
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap mt-1 flex-1 line-clamp-5">
                        {note.content}
                      </p>

                      {/* Date */}
                      <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-gray-100">
                        <Clock size={10} className="text-gray-300" />
                        <span className="text-xs text-gray-400">{dateStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesPage;
