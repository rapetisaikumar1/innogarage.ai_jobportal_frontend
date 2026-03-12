import { useState, useEffect } from 'react';
import api from '../../services/api';
import { BookOpen, FileText, Video, Link as LinkIcon } from 'lucide-react';

const TrainingPage = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

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
      case 'video': return <Video size={20} className="text-red-500" />;
      case 'pdf': return <FileText size={20} className="text-blue-500" />;
      case 'link': return <LinkIcon size={20} className="text-green-500" />;
      default: return <BookOpen size={20} className="text-purple-500" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Training Materials</h1>
          <p className="text-gray-500 mt-1">Access learning resources and interview prep materials</p>
        </div>
        <select className="input-field w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="Interview Prep">Interview Prep</option>
          <option value="Career Development">Career Development</option>
          <option value="Technical Skills">Technical Skills</option>
          <option value="Soft Skills">Soft Skills</option>
        </select>
      </div>

      {materials.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-600">No materials available</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material) => (
            <div key={material.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                  {getIcon(material.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{material.title}</h3>
                  {material.category && <span className="badge-blue mt-1">{material.category}</span>}
                </div>
              </div>
              {material.description && (
                <p className="text-sm text-gray-500 mb-3">{material.description}</p>
              )}
              {material.content && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {material.content}
                </div>
              )}
              {material.url && (
                <a href={material.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium mt-3">
                  Open Resource <LinkIcon size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainingPage;
