import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { BookOpen, FileText, Link as LinkIcon, Search, ExternalLink, Play, GraduationCap, Download, StickyNote } from 'lucide-react';

const CATEGORIES = ['Interview Prep', 'Career Development', 'Technical Skills', 'Soft Skills'];

const CAT_STYLE = {
  'Interview Prep':     { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  icon: '🎯' },
  'Career Development': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '🚀' },
  'Technical Skills':   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: '💻' },
  'Soft Skills':        { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: '🤝' },
};
const DEFAULT_STYLE = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: '📁' };

const TrainingPage = () => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/training/materials');
        setAllItems(data);
      } catch {
        // fetch failed silently
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const notes = useMemo(() => allItems.filter(m => m.type === 'NOTE'), [allItems]);
  const materials = useMemo(() => allItems.filter(m => m.type !== 'NOTE'), [allItems]);

  const getIcon = (type) => {
    switch ((type || '').toUpperCase()) {
      case 'VIDEO': return <Play size={18} className="text-red-500" />;
      case 'PDF':   return <FileText size={18} className="text-blue-500" />;
      case 'LINK':  return <LinkIcon size={18} className="text-emerald-500" />;
      default:      return <BookOpen size={18} className="text-violet-500" />;
    }
  };

  const getTypeBadge = (type) => {
    switch ((type || '').toUpperCase()) {
      case 'VIDEO': return { label: 'Video',    bg: 'bg-red-50',     text: 'text-red-600' };
      case 'PDF':   return { label: 'PDF',      bg: 'bg-blue-50',    text: 'text-blue-600' };
      case 'LINK':  return { label: 'Link',     bg: 'bg-emerald-50', text: 'text-emerald-600' };
      default:      return { label: 'Document', bg: 'bg-violet-50',  text: 'text-violet-600' };
    }
  };

  const categoryCounts = useMemo(() => {
    const counts = { All: materials.length };
    CATEGORIES.forEach(c => {
      counts[c] = materials.filter(m => m.category === c).length;
    });
    return counts;
  }, [materials]);

  const filtered = useMemo(() => {
    let result = materials;
    if (activeCategory !== 'All') {
      result = result.filter(m =>
        (m.category && CATEGORIES.includes(m.category) ? m.category : 'Other') === activeCategory
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [materials, search, activeCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[16px] font-bold text-gray-900">Training Materials</h1>
          {materials.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
              <GraduationCap size={12} />
              {filtered.length} of {materials.length} resources
            </span>
          )}
        </div>
        <div className="flex-1 max-w-xs ml-6 bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center gap-2 shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-800"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {['All', ...CATEGORIES].map(cat => {
          const style = CAT_STYLE[cat];
          const count = categoryCounts[cat] ?? 0;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              {style?.icon && <span className="leading-none">{style.icon}</span>}
              {cat}
              <span className={`text-xs font-bold ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" style={{ minHeight: '320px' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No materials found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search ? 'Try a different search term' : 'No resources in this category yet'}
            </p>
          </div>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((material) => {
                const typeBadge = getTypeBadge(material.type);
                const catStyle = CAT_STYLE[material.category] || DEFAULT_STYLE;
                return (
                  <div
                    key={material.id}
                    className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-md transition-all group flex flex-col bg-white"
                  >
                    {/* Card Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-10 h-10 ${catStyle.bg} rounded-xl flex items-center justify-center shrink-0`}>
                        {getIcon(material.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                          {material.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${typeBadge.bg} ${typeBadge.text}`}>
                            {typeBadge.label}
                          </span>
                          {material.category && (
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${catStyle.bg} ${catStyle.text}`}>
                              {material.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {material.description && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-3 flex-1">
                        {material.description}
                      </p>
                    )}

                    {/* Content preview */}
                    {material.content && (
                      <div className="mb-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600 leading-relaxed max-h-20 overflow-y-auto whitespace-pre-wrap">
                        {material.content}
                      </div>
                    )}

                    {/* Actions */}
                    {material.url && (
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-auto">
                        {['PDF', 'DOCUMENT'].includes((material.type || '').toUpperCase()) && (
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              const token = localStorage.getItem('STUDENT_accessToken');
                              fetch(
                                `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/training/materials/${material.id}/download`,
                                { headers: { Authorization: `Bearer ${token}` } }
                              )
                                .then(r => { if (!r.ok) throw new Error('Download failed'); return r.blob(); })
                                .then(blob => {
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = material.title + '.pdf';
                                  a.click();
                                  URL.revokeObjectURL(url);
                                })
                                .catch(() => alert('Failed to download file'));
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
                          >
                            <Download size={12} /> Download
                          </a>
                        )}
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium group-hover:underline whitespace-nowrap"
                        >
                          Open Resource <ExternalLink size={11} />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Notes Section */}
      {notes.length > 0 && (
        <div className="mt-4">
          <div className="border border-amber-100 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50 border-b border-amber-100">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-100 text-base">📝</div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Notes from your mentor</h2>
                <p className="text-xs text-gray-400">{notes.length} note{notes.length !== 1 ? 's' : ''} shared with you</p>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-amber-50/70 rounded-xl border border-amber-100 hover:border-amber-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
                  <div className="px-4 py-2.5 border-b border-amber-100 flex items-center gap-1.5">
                    <StickyNote size={12} className="text-amber-500" />
                    <span className="text-xs font-semibold text-amber-600">Note</span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-bold text-gray-900 mb-1.5 line-clamp-1">{note.title}</h3>
                    {note.description && (
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line flex-1">{note.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingPage;
