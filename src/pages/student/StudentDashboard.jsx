import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  Briefcase, FileText, Calendar, Clock,
  CheckCircle2, XCircle, Search, ArrowRight
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, appsRes] = await Promise.all([
          api.get('/jobs/stats'),
          api.get('/jobs/applications/mine?limit=5'),
        ]);
        setStats(statsRes.data);
        setRecentApps(appsRes.data.applications || []);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.fullName?.split(' ')[0] || 'User';
  const totalApplied = stats?.totalApplied || 0;
  const interviewCount = stats?.interviewScheduled || 0;
  const offerCount = stats?.offerReceived || 0;
  const rejectedCount = stats?.rejected || 0;

  const getStatusBadge = (status) => {
    const map = {
      APPLIED: 'bg-blue-50 text-blue-700 ring-blue-600/10',
      INTERVIEW_SCHEDULED: 'bg-violet-50 text-violet-700 ring-violet-600/10',
      REJECTED: 'bg-red-50 text-red-700 ring-red-600/10',
      OFFER_RECEIVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    };
    return map[status] || 'bg-gray-50 text-gray-700 ring-gray-600/10';
  };

  const getStatusLabel = (status) => {
    const map = {
      APPLIED: 'Applied',
      INTERVIEW_SCHEDULED: 'Interview',
      REJECTED: 'Rejected',
      OFFER_RECEIVED: 'Offer',
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent"></div>
        <div className="relative px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {greeting}, <span className="text-blue-300">{firstName}</span>
            </h1>
            <p className="text-[12px] text-gray-400 mt-1">Here's your career progress at a glance</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/jobs')}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm text-white text-[12px] font-semibold hover:bg-white/20 transition-colors ring-1 ring-white/10"
          >
            <Search size={13} />
            Find Jobs
          </button>
        </div>

        {/* Stats inside banner */}
        <div className="relative px-6 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Applied', value: totalApplied, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Interviews', value: interviewCount, icon: Calendar, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'Offers', value: offerCount, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Rejected', value: rejectedCount, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white/5 backdrop-blur-sm rounded-lg px-4 py-3 ring-1 ring-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-md ${bg} flex items-center justify-center`}>
                    <Icon size={12} className={color} strokeWidth={2.2} />
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</span>
                </div>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Applications — Full Width */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
            <Briefcase size={14} className="text-gray-400" />
            Recent Applications
          </h2>
          {recentApps.length > 0 && (
            <Link to="/dashboard/applications" className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
              View All <ArrowRight size={11} />
            </Link>
          )}
        </div>
        {recentApps.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Briefcase size={24} className="text-gray-300" />
            </div>
            <p className="text-[14px] text-gray-600 font-semibold">No applications yet</p>
            <p className="text-[12px] text-gray-400 mt-1 mb-5 max-w-xs mx-auto">Start exploring job listings and apply to track your progress here</p>
            <Link
              to="/dashboard/jobs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-[12px] font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Search size={13} /> Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-2.5 font-semibold">Position</th>
                  <th className="px-5 py-2.5 font-semibold">Company</th>
                  <th className="px-5 py-2.5 font-semibold">Applied</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentApps.map((app) => (
                  <tr key={app.id} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-semibold text-gray-800">{app.job?.title}</p>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-gray-500">{app.job?.company}</td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] text-gray-400 flex items-center gap-1.5">
                        <Clock size={11} className="text-gray-300" />
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold ring-1 ring-inset ${getStatusBadge(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
