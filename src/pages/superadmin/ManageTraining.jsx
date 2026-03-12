import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { BookOpen, Plus, Edit, Trash2, Upload, FileText, Video, Link as LinkIcon, ExternalLink, Download, Calendar, Tag, FolderOpen } from 'lucide-react';

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

  const typeConfig = (type) => {
    switch (type) {
      case 'PDF': return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', label: 'PDF' };
      case 'VIDEO': return { icon: Video, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', label: 'Video' };
      case 'LINK': return { icon: LinkIcon, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Link' };
      default: return { icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100', label: 'Document' };
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Training Materials</h1>
          <p className="text-xs text-gray-500 mt-0.5">Upload and manage training resources</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={14} /> Add Material
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-gray-900">{editId ? 'Edit Material' : 'Add New Material'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="e.g. Interview Prep" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                <option value="PDF">PDF</option>
                <option value="VIDEO">Video</option>
                <option value="LINK">Link</option>
                <option value="DOCUMENT">Document</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">URL (for Video/Link)</label>
              <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none" rows="2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Upload File</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer" accept=".pdf,.doc,.docx,.ppt,.pptx" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">{submitting ? 'Saving...' : (editId ? 'Update' : 'Create')}</button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {materials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-10 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <FolderOpen size={22} className="text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm font-medium">No training materials yet</p>
          <p className="text-xs text-gray-400 mt-0.5">Click "Add Material" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {materials.map((mat) => {
            const tc = typeConfig(mat.type);
            const TypeIcon = tc.icon;
            return (
              <div key={mat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 group overflow-hidden">
                {/* Card Header - Type Banner */}
                <div className={`px-5 py-3 ${tc.bg} border-b ${tc.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <TypeIcon size={15} className={tc.color} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${tc.color}`}>{tc.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(mat)} className="p-1.5 rounded-lg hover:bg-white/70 text-gray-500 hover:text-blue-600 transition-colors" title="Edit">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(mat.id)} className="p-1.5 rounded-lg hover:bg-white/70 text-gray-500 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5">
                  <h3 className="text-[15px] font-bold text-gray-900 mb-1.5 line-clamp-1">{mat.title}</h3>
                  {mat.description && <p className="text-[13px] text-gray-500 mb-4 line-clamp-2 leading-relaxed">{mat.description}</p>}
                  {!mat.description && <div className="mb-4" />}

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {mat.url && (
                      <a href={mat.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                        <ExternalLink size={13} /> Open Link
                      </a>
                    )}
                    {mat.filePath && (
                      <a href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/${mat.filePath}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors">
                        <Download size={13} /> Download
                      </a>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    {mat.category ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold">
                        <Tag size={12} /> {mat.category}
                      </span>
                    ) : <span />}
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-gray-400">
                      <Calendar size={13} />
                      {new Date(mat.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManageTraining;
