import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Search, Briefcase, Calendar, Building2, Bot, Hand, Clock } from 'lucide-react';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data } = await api.get(`/jobs/applications/mine?status=APPLIED`);
      setApplications(data.applications || []);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return applications;
    const q = search.toLowerCase();
    return applications.filter(app =>
      (app.job?.title || '').toLowerCase().includes(q) ||
      (app.job?.company || '').toLowerCase().includes(q)
    );
  }, [applications, search]);

  /* Stats */
  const stats = useMemo(() => {
    const total = applications.length;
    const interviews = applications.filter(a => a.status === 'INTERVIEW_SCHEDULED').length;
    const offers = applications.filter(a => a.status === 'OFFER_RECEIVED').length;
    const auto = applications.filter(a => a.isAutoApplied).length;
    return { total, interviews, offers, auto };
  }, [applications]);

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
        <h1 className="text-[16px] font-bold text-gray-900">My Applications</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Track and manage your job applications</p>
      </div>

      {/* Stats Row */}
      {applications.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Applied', value: stats.total, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Interviews', value: stats.interviews, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Offers', value: stats.offers, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Auto Applied', value: stats.auto, icon: Bot, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon size={15} className={stat.color} />
              </div>
              <div>
                <p className="text-[18px] font-bold text-gray-900 leading-none">{stat.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center justify-end">
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-2 w-full sm:w-64">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            type="text"
            className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-700"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-16">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Briefcase size={20} className="text-gray-300" />
          </div>
          <h3 className="text-[13px] font-semibold text-gray-600">
            {applications.length === 0 ? 'No applications yet' : 'No matching applications'}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1">
            {applications.length === 0 ? 'Start browsing jobs and apply!' : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => {
            const dateStr = new Date(app.appliedAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            });
            return (
              <div
                key={app.id}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3.5 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-semibold text-gray-900 truncate">
                      {app.job?.title || 'Untitled Position'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Building2 size={11} className="text-gray-400" />
                        {app.job?.company || '—'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock size={10} />
                        {dateStr}
                      </span>
                    </div>
                  </div>

                  {/* Type Badge */}
                  <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                    app.isAutoApplied
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    {app.isAutoApplied ? <Bot size={10} /> : <Hand size={10} />}
                    {app.isAutoApplied ? 'Auto' : 'Manual'}
                  </span>

                  {/* Applied Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Applied
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyApplications;
