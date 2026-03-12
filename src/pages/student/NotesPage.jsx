import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { StickyNote, Plus, Edit3, Trash2, Save, X } from 'lucide-react';

const NotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: '' });

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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Notes</h1>
          <p className="text-gray-500 mt-1">Write and manage your training notes</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ title: '', content: '', category: '' }); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Note
        </button>
      </div>

      {showForm && (
        <div className="card">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{editingId ? 'Edit Note' : 'New Note'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <input type="text" className="input-field" placeholder="Note title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category</option>
              <option value="Interview Prep">Interview Prep</option>
              <option value="Technical Notes">Technical Notes</option>
              <option value="Career Development">Career Development</option>
              <option value="General">General</option>
            </select>
            <textarea className="input-field" rows={6} placeholder="Write your notes here..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Save size={18} /> {editingId ? 'Update' : 'Save'} Note
            </button>
          </form>
        </div>
      )}

      {notes.length === 0 && !showForm ? (
        <div className="card text-center py-12">
          <StickyNote className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-600">No notes yet</h3>
          <p className="text-gray-400 mt-1">Start writing your training notes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <div key={note.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{note.title}</h3>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(note)} className="p-1 text-gray-400 hover:text-primary-600"><Edit3 size={16} /></button>
                  <button onClick={() => handleDelete(note.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
              {note.category && <span className="badge-blue mb-2">{note.category}</span>}
              <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2 max-h-40 overflow-y-auto">{note.content}</p>
              <p className="text-xs text-gray-400 mt-3">{new Date(note.updatedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesPage;
