import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { BookOpen, FileText, Video, Link as LinkIcon, Search, ExternalLink, Play, GraduationCap } from 'lucide-react';

const CATEGORY_CONFIG = {
  'Interview Prep': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  'Career Development': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Technical Skills': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Soft Skills': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

const CATEGORY_TABS = [
  { value: '', label: 'All' },
  { value: 'Interview Prep', label: 'Interview Prep' },
  { value: 'Career Development', label: 'Career' },
  { value: 'Technical Skills', label: 'Technical' },
  { value: 'Soft Skills', label: 'Soft Skills' },
];

const TrainingPage = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const params = category ? `?category=${category}` : '';
        const { data } = await api.get(`/training/materials${params}`);
        setMaterials(data);
      } catch (error) {
        console.error('Failed to fetch materials:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [category]);

  const getIcon = (type) => {
    switch (type) {
      case 'video': return <Play size={16} className="text-red-500" />;
      case 'pdf': return <FileText size={16} className="text-blue-500" />;
      case 'link': return <LinkIcon size={16} className="text-emerald-500" />;
      default: return <BookOpen size={16} className="text-violet-500" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'video': return { label: 'Video', bg: 'bg-red-50', text: 'text-red-600' };
      case 'pdf': return { label: 'PDF', bg: 'bg-blue-50', text: 'text-blue-600' };
      case 'link': return { label: 'Link', bg: 'bg-emerald-50', text: 'text-emerald-600' };
      default: return { label: 'Document', bg: 'bg-violet-50', text: 'text-violet-600' };
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[16px] font-bold text-gray-900">Training Materials</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Access learning resources and interview prep materials</p>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1 bg-gray-100/80 rounded-lg p-0.5 overflow-x-auto">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setCategory(tab.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                category === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-2 w-full sm:w-56">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            type="text"
            className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-700"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Materials */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-16">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <GraduationCap size={20} className="text-gray-300" />
          </div>
          <h3 className="text-[13px] font-semibold text-gray-600">No materials available</h3>
          <p className="text-[11px] text-gray-400 mt-1">Check back later for new resources</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((material) => {
            const catStyle = CATEGORY_CONFIG[material.category] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
            const typeBadge = getTypeBadge(material.type);

            return (
              <div
                key={material.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors group"
              >
                {/* Top Row: Icon + Title + Type */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(material.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-semibold text-gray-900 leading-snug">{material.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      {material.category && (
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                          {material.category}
                        </span>
                      )}
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${typeBadge.bg} ${typeBadge.text}`}>
                        {typeBadge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {material.description && (
                  <p className="text-[11px] text-gray-500 mt-2.5 leading-relaxed line-clamp-2">{material.description}</p>
                )}

                {/* Content Preview */}
                {material.content && (
                  <div className="mt-2.5 bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-[11px] text-gray-600 leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {material.content}
                  </div>
                )}

                {/* Resource Link */}
                {material.url && (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-700 font-medium mt-3 group-hover:underline"
                  >
                    Open Resource <ExternalLink size={11} />
                  </a>
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
