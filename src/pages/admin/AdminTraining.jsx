import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { BookOpen, Plus, Edit, Trash2, FileText, Video, Link as LinkIcon, ExternalLink, Download, Calendar, Tag, FolderOpen, Users, UserPlus, X, Check, Search, ChevronDown, ChevronRight, Layers } from 'lucide-react';

const CATEGORIES = ['Interview Prep', 'Career Development', 'Technical Skills', 'Soft Skills'];

const CAT_STYLE = {
  'Interview Prep':     { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  headerBg: 'bg-gradient-to-r from-violet-50 to-violet-100/60',  icon: '\u{1F3AF}', pill: 'bg-violet-100 text-violet-700' },
  'Career Development': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', headerBg: 'bg-gradient-to-r from-emerald-50 to-emerald-100/60', icon: '\u{1F680}', pill: 'bg-emerald-100 text-emerald-700' },
  'Technical Skills':   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100/60',    icon: '\u{1F4BB}', pill: 'bg-blue-100 text-blue-700' },
  'Soft Skills':        { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   headerBg: 'bg-gradient-to-r from-amber-50 to-amber-100/60',   icon: '\u{1F91D}', pill: 'bg-amber-100 text-amber-700' },
  'Uncategorized':      { bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200',    headerBg: 'bg-gradient-to-r from-gray-50 to-gray-100/60',    icon: '\u{1F4C1}', pill: 'bg-gray-100 text-gray-600' },
};

const AdminTraining = () => {
  const [materials, setMaterials] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'PDF', category: '', url: '' });
  const [file, setFile] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const [assignModal, setAssignModal] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');

  const [categoryAssignModal, setCategoryAssignModal] = useState(null);
  const [categoryAssignStudents, setCategoryAssignStudents] = useState([]);
  const [categoryStudentSearch, setCategoryStudentSearch] = useState('');
  const [categoryAssigning, setCategoryAssigning] = useState(false);

  useEffect(() => {
    fetchMaterials();
    fetchStudents();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/training/materials');
      setMaterials(res.data);
    } catch {
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/training/students');
      setStudents(res.data);
    } catch { /* silent */ }
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
      if (file) formData.append('material', file);

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
    } catch {
      toast.error('Failed to delete material');
    }
  };

  const openAssignModal = (mat) => {
    const alreadyAssigned = (mat.assignments || []).map(a => a.student.id);
    setSelectedStudents(alreadyAssigned);
    setAssignModal(mat.id);
    setStudentSearch('');
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleAssign = async () => {
    const mat = materials.find(m => m.id === assignModal);
    const currentlyAssigned = (mat?.assignments || []).map(a => a.student.id);
    const toAssign = selectedStudents.filter(id => !currentlyAssigned.includes(id));
    const toUnassign = currentlyAssigned.filter(id => !selectedStudents.includes(id));

    try {
      if (toAssign.length > 0) {
        await api.post(`/training/materials/${assignModal}/assign`, { studentIds: toAssign });
      }
      if (toUnassign.length > 0) {
        await api.post(`/training/materials/${assignModal}/unassign`, { studentIds: toUnassign });
      }
      toast.success('Assignments updated');
      fetchMaterials();
      setAssignModal(null);
    } catch {
      toast.error('Failed to update assignments');
    }
  };

  const openCategoryAssign = (category) => {
    setCategoryAssignModal(category);
    setCategoryAssignStudents([]);
    setCategoryStudentSearch('');
  };

  const toggleCategoryStudent = (studentId) => {
    setCategoryAssignStudents(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleCategoryAssign = async () => {
    if (categoryAssignStudents.length === 0) { toast.error('Select at least one student'); return; }
    const categoryMats = materials.filter(m => {
      const cat = m.category && CATEGORIES.includes(m.category) ? m.category : 'Uncategorized';
      return cat === categoryAssignModal;
    });
    setCategoryAssigning(true);
    try {
      for (const mat of categoryMats) {
        const currentlyAssigned = (mat.assignments || []).map(a => a.student.id);
        const toAssign = categoryAssignStudents.filter(id => !currentlyAssigned.includes(id));
        if (toAssign.length > 0) {
          await api.post(`/training/materials/${mat.id}/assign`, { studentIds: toAssign });
        }
      }
      toast.success(`Assigned ${categoryMats.length} ${categoryAssignModal} materials to ${categoryAssignStudents.length} students`);
      fetchMaterials();
      setCategoryAssignModal(null);
    } catch {
      toast.error('Failed to assign category materials');
    } finally {
      setCategoryAssigning(false);
    }
  };

  const filteredStudents = students.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.registrationNumber || '').toLowerCase().includes(q);
  });

  const filteredCategoryStudents = students.filter(s => {
    if (!categoryStudentSearch.trim()) return true;
    const q = categoryStudentSearch.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.registrationNumber || '').toLowerCase().includes(q);
  });

  const grouped = useMemo(() => {
    const groups = {};
    CATEGORIES.forEach(c => { groups[c] = []; });
    groups['Uncategorized'] = [];
    const source = filterCategory ? materials.filter(m => {
      const cat = m.category && CATEGORIES.includes(m.category) ? m.category : 'Uncategorized';
      return cat === filterCategory;
    }) : materials;
    source.forEach(m => {
      const cat = m.category && CATEGORIES.includes(m.category) ? m.category : 'Uncategorized';
      groups[cat].push(m);
    });
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [materials, filterCategory]);

  const categoryCounts = useMemo(() => {
    const counts = { All: materials.length };
    CATEGORIES.forEach(c => { counts[c] = 0; });
    counts['Uncategorized'] = 0;
    materials.forEach(m => {
      const cat = m.category && CATEGORIES.includes(m.category) ? m.category : 'Uncategorized';
      counts[cat]++;
    });
    return counts;
  }, [materials]);

  const typeConfig = (type) => {
    switch (type) {
      case 'PDF': return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', label: 'PDF' };
      case 'VIDEO': return { icon: Video, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', label: 'Video' };
      case 'LINK': return { icon: LinkIcon, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Link' };
      default: return { icon: BookOpen, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100', label: 'Document' };
    }
  };

  const toggleCollapse = (cat) => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Training Materials</h1>
          <p className="text-xs text-gray-500 mt-0.5">Upload documents and assign to your students by category</p>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                <option value="">Select Category</option>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
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

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilterCategory('')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${!filterCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          All ({categoryCounts.All})
        </button>
        {CATEGORIES.map(cat => {
          const style = CAT_STYLE[cat];
          const count = categoryCounts[cat] || 0;
          if (count === 0) return null;
          return (
            <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${filterCategory === cat ? style.pill + ' ring-2 ring-offset-1 ring-gray-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <span>{style.icon}</span> {cat} ({count})
            </button>
          );
        })}
        {(categoryCounts['Uncategorized'] || 0) > 0 && (
          <button onClick={() => setFilterCategory(filterCategory === 'Uncategorized' ? '' : 'Uncategorized')} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${filterCategory === 'Uncategorized' ? 'bg-gray-200 text-gray-700 ring-2 ring-offset-1 ring-gray-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Uncategorized ({categoryCounts['Uncategorized']})
          </button>
        )}
      </div>

      {materials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-10 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <FolderOpen size={22} className="text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm font-medium">No training materials yet</p>
          <p className="text-xs text-gray-400 mt-0.5">Click "Add Material" to get started</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([category, items]) => {
            const style = CAT_STYLE[category] || CAT_STYLE['Uncategorized'];
            const isCollapsed = collapsed[category];
            const totalAssigned = items.reduce((sum, m) => sum + (m.assignments || []).length, 0);
            return (
              <div key={category} className={`border ${style.border} rounded-xl overflow-hidden shadow-sm bg-white`}>
                <div className={`flex items-center justify-between px-5 py-3 ${style.headerBg}`}>
                  <button onClick={() => toggleCollapse(category)} className="flex items-center gap-3 flex-1 text-left">
                    <span className="text-lg">{style.icon}</span>
                    <div>
                      <h2 className={`text-[14px] font-bold ${style.text}`}>{category}</h2>
                      <p className="text-[11px] text-gray-400">{items.length} material{items.length !== 1 ? 's' : ''} &middot; {totalAssigned} assignment{totalAssigned !== 1 ? 's' : ''}</p>
                    </div>
                    {isCollapsed ? <ChevronRight size={16} className="text-gray-400 ml-2" /> : <ChevronDown size={16} className="text-gray-400 ml-2" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openCategoryAssign(category); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-white text-violet-600 rounded-lg text-[11px] font-semibold transition-colors shadow-sm border border-violet-200"
                  >
                    <Layers size={13} /> Assign Category
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((mat) => {
                      const tc = typeConfig(mat.type);
                      const TypeIcon = tc.icon;
                      return (
                        <div key={mat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 group overflow-hidden">
                          <div className={`px-4 py-2.5 ${tc.bg} border-b ${tc.border} flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                              <TypeIcon size={14} className={tc.color} />
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${tc.color}`}>{tc.label}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openAssignModal(mat)} className="p-1.5 rounded-lg hover:bg-white/70 text-gray-500 hover:text-violet-600 transition-colors" title="Assign Students">
                                <UserPlus size={13} />
                              </button>
                              <button onClick={() => handleEdit(mat)} className="p-1.5 rounded-lg hover:bg-white/70 text-gray-500 hover:text-blue-600 transition-colors" title="Edit">
                                <Edit size={13} />
                              </button>
                              <button onClick={() => handleDelete(mat.id)} className="p-1.5 rounded-lg hover:bg-white/70 text-gray-500 hover:text-red-500 transition-colors" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="text-[13px] font-bold text-gray-900 mb-1 line-clamp-1">{mat.title}</h3>
                            {mat.description && <p className="text-[11px] text-gray-500 mb-3 line-clamp-2 leading-relaxed">{mat.description}</p>}
                            {!mat.description && <div className="mb-3" />}
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              {mat.url && (
                                <a href={mat.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-semibold hover:bg-blue-100 transition-colors">
                                  <ExternalLink size={11} /> Open
                                </a>
                              )}
                              {mat.url && ['PDF', 'DOCUMENT'].includes((mat.type || '').toUpperCase()) && (
                                <a href="#" onClick={(e) => {
                                    e.preventDefault();
                                    const token = localStorage.getItem('ADMIN_accessToken');
                                    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/training/materials/${mat.id}/download`, {
                                      headers: { Authorization: `Bearer ${token}` }
                                    })
                                      .then(r => { if (!r.ok) throw new Error('Download failed'); return r.blob(); })
                                      .then(blob => {
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = mat.title + '.pdf';
                                        a.click();
                                        URL.revokeObjectURL(url);
                                      })
                                      .catch(() => alert('Failed to download file'));
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-semibold hover:bg-emerald-100 transition-colors">
                                  <Download size={11} /> Download
                                </a>
                              )}
                              <button onClick={() => openAssignModal(mat)} className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 text-violet-600 rounded-md text-[10px] font-semibold hover:bg-violet-100 transition-colors">
                                <Users size={11} /> {(mat.assignments || []).length}
                              </button>
                            </div>
                            <div className="flex items-center text-[10px] text-gray-400 pt-2 border-t border-gray-50">
                              <Calendar size={11} className="mr-1" />
                              {new Date(mat.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Single Material Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Assign Students</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select students to assign this material to</p>
              </div>
              <button onClick={() => setAssignModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Search size={14} className="text-gray-400" />
                <input type="text" placeholder="Search students..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder-gray-400" />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-gray-400">{selectedStudents.length} selected</span>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedStudents(filteredStudents.map(s => s.id))} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">Select All</button>
                  <button onClick={() => setSelectedStudents([])} className="text-[11px] text-gray-500 hover:text-gray-700 font-medium">Clear</button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-2">
              {filteredStudents.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">No students found</p>
              ) : (
                <div className="space-y-1">
                  {filteredStudents.map(student => {
                    const isSelected = selectedStudents.includes(student.id);
                    return (
                      <button key={student.id} onClick={() => toggleStudent(student.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-600' : 'border-2 border-gray-300'}`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{student.fullName}</p>
                          <p className="text-[11px] text-gray-400 truncate">{student.email}</p>
                        </div>
                        {student.registrationNumber && (
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{student.registrationNumber}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setAssignModal(null)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleAssign} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">Save Assignments</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Bulk Assign Modal */}
      {categoryAssignModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Assign Category: {categoryAssignModal}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Assign all {materials.filter(m => { const c = m.category && CATEGORIES.includes(m.category) ? m.category : 'Uncategorized'; return c === categoryAssignModal; }).length} materials in this category to selected students
                </p>
              </div>
              <button onClick={() => setCategoryAssignModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Search size={14} className="text-gray-400" />
                <input type="text" placeholder="Search students..." value={categoryStudentSearch} onChange={e => setCategoryStudentSearch(e.target.value)} className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder-gray-400" />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-gray-400">{categoryAssignStudents.length} selected</span>
                <div className="flex gap-2">
                  <button onClick={() => setCategoryAssignStudents(filteredCategoryStudents.map(s => s.id))} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">Select All</button>
                  <button onClick={() => setCategoryAssignStudents([])} className="text-[11px] text-gray-500 hover:text-gray-700 font-medium">Clear</button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-2">
              {filteredCategoryStudents.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-8">No students found</p>
              ) : (
                <div className="space-y-1">
                  {filteredCategoryStudents.map(student => {
                    const isSelected = categoryAssignStudents.includes(student.id);
                    return (
                      <button key={student.id} onClick={() => toggleCategoryStudent(student.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${isSelected ? 'bg-violet-50 border border-violet-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-violet-600' : 'border-2 border-gray-300'}`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{student.fullName}</p>
                          <p className="text-[11px] text-gray-400 truncate">{student.email}</p>
                        </div>
                        {student.registrationNumber && (
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{student.registrationNumber}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setCategoryAssignModal(null)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleCategoryAssign} disabled={categoryAssigning} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
                {categoryAssigning ? 'Assigning...' : 'Assign All Materials'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTraining;
