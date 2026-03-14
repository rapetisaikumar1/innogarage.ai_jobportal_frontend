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
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-gray-900">My Notes</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Write and manage your training notes</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ title: '', content: '', category: '' }); }}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-[12px]"
        >
          <Plus size={14} /> New Note
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <form onSubmit={handleSave} className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[13px] font-semibold text-gray-900">{editingId ? 'Edit Note' : 'New Note'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors"
              placeholder="Note title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <select
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-700 outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors"
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
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-800 placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-colors resize-none"
              rows={5}
              placeholder="Write your notes here..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-[12px]"
            >
              <Save size={13} /> {editingId ? 'Update' : 'Save'} Note
            </button>
          </form>
        </div>
      )}

      {/* Search */}
      {notes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-2 w-full sm:w-64">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            type="text"
            className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-700"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Notes */}
      {filtered.length === 0 && !showForm ? (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-16">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <StickyNote size={20} className="text-gray-300" />
          </div>
          <h3 className="text-[13px] font-semibold text-gray-600">
            {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1">
            {notes.length === 0 ? 'Start writing your training notes' : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((note) => {
            const cs = CATEGORY_STYLE[note.category] || CATEGORY_STYLE.General;
            const dateStr = new Date(note.updatedAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            });

            return (
              <div
                key={note.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors group"
              >
                {/* Title + Actions */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-[13px] font-semibold text-gray-900 leading-snug">{note.title}</h3>
                  <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(note)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Category */}
                {note.category && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${cs.bg} ${cs.text} ${cs.border} mb-2`}>
                    <Tag size={9} />
                    {note.category}
                  </span>
                )}

                {/* Content */}
                <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap mt-1 max-h-28 overflow-y-auto line-clamp-4">
                  {note.content}
                </p>

                {/* Date */}
                <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-gray-100">
                  <Clock size={10} className="text-gray-300" />
                  <span className="text-[10px] text-gray-400">{dateStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotesPage;
