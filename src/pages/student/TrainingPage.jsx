import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { BookOpen, FileText, Video, Link as LinkIcon, Search, ExternalLink, Play, GraduationCap, Download, ChevronDown, ChevronRight } from 'lucide-react';

const CATEGORIES = ['Interview Prep', 'Career Development', 'Technical Skills', 'Soft Skills'];

const CAT_STYLE = {
  'Interview Prep':     { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  headerBg: 'bg-gradient-to-r from-violet-50 to-violet-100/60',  icon: '\u{1F3AF}' },
  'Career Development': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', headerBg: 'bg-gradient-to-r from-emerald-50 to-emerald-100/60', icon: '\u{1F680}' },
  'Technical Skills':   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100/60',    icon: '\u{1F4BB}' },
  'Soft Skills':        { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   headerBg: 'bg-gradient-to-r from-amber-50 to-amber-100/60',   icon: '\u{1F91D}' },
};
const DEFAULT_STYLE = { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', headerBg: 'bg-gradient-to-r from-gray-50 to-gray-100/60', icon: '\u{1F4C1}' };

const TrainingPage = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/training/materials');
        setMaterials(data);
      } catch {
        // fetch failed silently
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getIcon = (type) => {
    switch ((type || '').toUpperCase()) {
      case 'VIDEO': return <Play size={16} className="text-red-500" />;
      case 'PDF':   return <FileText size={16} className="text-blue-500" />;
      case 'LINK':  return <LinkIcon size={16} className="text-emerald-500" />;
      default:      return <BookOpen size={16} className="text-violet-500" />;
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

  const filtered = useMemo(() => {
    if (!search.trim()) return materials;
    const q = search.toLowerCase();
    return materials.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q) ||
      (m.category || '').toLowerCase().includes(q)
    );
  }, [materials, search]);

  const grouped = useMemo(() => {
    const groups = {};
    CATEGORIES.forEach(c => { groups[c] = []; });
    groups['Other'] = [];
    filtered.forEach(m => {
      const cat = m.category && CATEGORIES.includes(m.category) ? m.category : 'Other';
      groups[cat].push(m);
    });
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [filtered]);

  const toggle = (cat) => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-gray-900">Training Materials</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Access learning resources organized by category</p>
        </div>
        <span className="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-medium">
          {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 w-full sm:w-72">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-700"
          placeholder="Search across all categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {grouped.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-16">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <GraduationCap size={20} className="text-gray-300" />
          </div>
          <h3 className="text-[13px] font-semibold text-gray-600">No materials available</h3>
          <p className="text-[11px] text-gray-400 mt-1">Check back later for new resources</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([category, items]) => {
            const style = CAT_STYLE[category] || DEFAULT_STYLE;
            const isCollapsed = collapsed[category];
            return (
              <div key={category} className={`bg-white border ${style.border} rounded-xl overflow-hidden shadow-sm`}>
                <button
                  onClick={() => toggle(category)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 ${style.headerBg} hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{style.icon}</span>
                    <div className="text-left">
                      <h2 className={`text-[14px] font-bold ${style.text}`}>{category}</h2>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {items.length} material{items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {isCollapsed
                    ? <ChevronRight size={18} className="text-gray-400" />
                    : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {!isCollapsed && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((material) => {
                      const typeBadge = getTypeBadge(material.type);
                      return (
                        <div key={material.id} className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 hover:shadow-sm transition-all group">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                              {getIcon(material.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[13px] font-semibold text-gray-900 leading-snug">{material.title}</h3>
                              <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${typeBadge.bg} ${typeBadge.text}`}>
                                {typeBadge.label}
                              </span>
                            </div>
                          </div>

                          {material.description && (
                            <p className="text-[11px] text-gray-500 mt-2 leading-relaxed line-clamp-2">{material.description}</p>
                          )}

                          {material.content && (
                            <div className="mt-2 bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-[11px] text-gray-600 leading-relaxed max-h-20 overflow-y-auto whitespace-pre-wrap">
                              {material.content}
                            </div>
                          )}

                          {material.url && (
                            <div className="flex items-center gap-3 mt-3">
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
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[11px] font-semibold transition-colors"
                                >
                                  <Download size={13} /> Download
                                </a>
                              )}
                              <a
                                href={material.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-700 font-medium group-hover:underline"
                              >
                                Open Resource <ExternalLink size={11} />
                              </a>
                            </div>
                          )}
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
    </div>
  );
};

export default TrainingPage;
