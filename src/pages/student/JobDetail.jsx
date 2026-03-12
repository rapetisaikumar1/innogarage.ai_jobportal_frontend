import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin, Building, Calendar, ExternalLink, Download, Zap } from 'lucide-react';

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [tailoredResume, setTailoredResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [generatingResume, setGeneratingResume] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const { data } = await api.get(`/jobs/${id}`);
        setJob(data);
      } catch (error) {
        toast.error('Failed to load job details');
        navigate('/dashboard/jobs');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.post(`/jobs/${id}/apply`);
      toast.success('Application submitted!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleGenerateResume = async () => {
    setGeneratingResume(true);
    try {
      const { data } = await api.get(`/jobs/${id}/tailored-resume`);
      setTailoredResume(data);
      toast.success('Tailored resume generated!');
    } catch (error) {
      toast.error('Failed to generate resume');
    } finally {
      setGeneratingResume(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!job) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
        <ArrowLeft size={18} />
        Back to Jobs
      </button>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-500">
              <span className="flex items-center gap-1"><Building size={16} />{job.company}</span>
              {job.location && <span className="flex items-center gap-1"><MapPin size={16} />{job.location}</span>}
              {job.datePosted && <span className="flex items-center gap-1"><Calendar size={16} />{new Date(job.datePosted).toLocaleDateString()}</span>}
            </div>
            {job.salary && <p className="text-lg font-semibold text-emerald-600 mt-2">{job.salary}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <span className={job.applicationType === 'EASY_APPLY' ? 'badge-green text-center' : 'badge-yellow text-center'}>
              {job.applicationType === 'EASY_APPLY' ? 'Easy Apply' : 'Manual Apply'}
            </span>
            <span className="badge-blue text-center">{job.source}</span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Job Description</h2>
          <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
            {job.description}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-100">
          {job.applicationType === 'EASY_APPLY' ? (
            <button onClick={handleApply} disabled={applying} className="btn-success flex items-center gap-2">
              <Zap size={18} />
              {applying ? 'Applying...' : 'Easy Apply'}
            </button>
          ) : (
            job.sourceUrl && (
              <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
                Apply on {job.source} <ExternalLink size={16} />
              </a>
            )
          )}

          <button onClick={handleGenerateResume} disabled={generatingResume} className="btn-secondary flex items-center gap-2">
            <Download size={18} />
            {generatingResume ? 'Generating...' : 'Generate Tailored Resume'}
          </button>
        </div>

        {/* Tailored Resume Info */}
        {tailoredResume && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800">Tailored Resume Generated!</h3>
            <p className="text-sm text-green-600 mt-1">Match Score: {tailoredResume.matchScore}%</p>
            <p className="text-sm text-green-600">Keywords: {tailoredResume.keywords?.join(', ')}</p>
            <a href={tailoredResume.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-green-700 font-medium mt-2 hover:underline">
              <Download size={14} /> Download Resume
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetail;
