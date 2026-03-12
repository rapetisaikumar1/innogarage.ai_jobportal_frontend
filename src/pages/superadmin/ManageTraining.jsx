import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { BookOpen, Plus, Edit, Trash2, Upload, FileText, Video, Link as LinkIcon } from 'lucide-react';

const ManageTraining = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'PDF', category: '', url: '' });
  const [file, setFile] = useState(null);

  useEffect(() => { fetchMaterials(); }, []);

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/training/materials');
      setMaterials(res.data);
    } catch (error) {
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', type: 'PDF', category: '', url: '' });
    setFile(null); setEditId(null); setShowForm(false);
  };

  const handleEdit = (mat) => {
    setForm({ title: mat.title, description: mat.description || '', type: mat.type, category: mat.category || '', url: mat.url || '' });
    setEditId(mat.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.type) { toast.error('Title and type are required'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('type', form.type);
      formData.append('category', form.category);
      if (form.url) formData.append('url', form.url);
      if (file) formData.append('file', file);

      if (editId) {
        await api.put(`/training/materials/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Material updated');
      } else {
        await api.post('/training/materials', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Material created');
      }
      resetForm();
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save material');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this training material?')) return;
    try {
      await api.delete(`/training/materials/${id}`);
      toast.success('Material deleted');
      fetchMaterials();
    } catch (error) {
      toast.error('Failed to delete material');
    }
  };

  const typeIcon = (type) => {
    switch (type) {
      case 'PDF': return <FileText size={16} className="text-red-500" />;
      case 'VIDEO': return <Video size={16} className="text-blue-500" />;
      case 'LINK': return <LinkIcon size={16} className="text-green-500" />;
      default: return <BookOpen size={16} className="text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Training Materials</h1>
          <p className="text-gray-500 mt-1">Upload and manage training resources</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Material
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold text-gray-800">{editId ? 'Edit Material' : 'Add New Material'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field" placeholder="e.g. Interview Prep, Resume Writing" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                <option value="PDF">PDF</option>
                <option value="VIDEO">Video</option>
                <option value="LINK">Link</option>
                <option value="DOCUMENT">Document</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL (for Video/Link)</label>
              <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="input-field" placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows="2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="input-field" accept=".pdf,.doc,.docx,.ppt,.pptx" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : (editId ? 'Update' : 'Create')}</button>
            <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {materials.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No training materials yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((mat) => (
            <div key={mat.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {typeIcon(mat.type)}
                  <span className="text-xs font-medium text-gray-500 uppercase">{mat.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(mat)} className="text-gray-400 hover:text-primary-600"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(mat.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">{mat.title}</h3>
              {mat.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{mat.description}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                {mat.category && <span className="badge-blue text-xs">{mat.category}</span>}
                {mat.url && (
                  <a href={mat.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">Open Link</a>
                )}
                {mat.filePath && (
                  <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/${mat.filePath}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1"><Upload size={12} /> Download</a>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">Added {new Date(mat.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageTraining;
