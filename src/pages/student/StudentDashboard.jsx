import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  Briefcase, FileText, Calendar, Award, TrendingUp, Clock,
  GraduationCap, HelpCircle, Trophy, Search, Megaphone, CheckCircle2, XCircle
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
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const statCards = [
    { label: 'Jobs Applied', value: stats?.totalApplied || 0, icon: FileText, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Interviews Scheduled', value: stats?.interviewScheduled || 0, icon: Calendar, color: 'bg-violet-500', bg: 'bg-violet-50' },
    { label: 'Offers Received', value: stats?.offerReceived || 0, icon: CheckCircle2, color: 'bg-amber-500', bg: 'bg-amber-50' },
    { label: 'Rejected', value: stats?.rejected || 0, icon: XCircle, color: 'bg-red-500', bg: 'bg-red-50' },
  ];

  const quickActions = [
    { to: '/dashboard/jobs', icon: Search, label: 'Find Jobs', desc: 'Browse & apply for jobs', iconBg: 'bg-blue-500' },
    { to: '/dashboard/applications', icon: FileText, label: 'Applications', desc: 'Track your applications', iconBg: 'bg-emerald-500' },
    { to: '/dashboard/training', icon: GraduationCap, label: 'Training', desc: 'Prepare for interviews', iconBg: 'bg-violet-500' },
    { to: '/dashboard/mentoring', icon: Calendar, label: 'Mentoring', desc: 'Book a mentor session', iconBg: 'bg-orange-500' },
    { to: '/dashboard/chat', icon: HelpCircle, label: 'Support & Help', desc: 'Get help & guidance', iconBg: 'bg-rose-500' },
    { to: '/dashboard/achievers', icon: Trophy, label: 'Achievers', desc: 'Success stories', iconBg: 'bg-amber-500' },
  ];

  const getStatusBadge = (status) => {
    const map = {
      APPLIED: 'bg-blue-50 text-blue-700 border border-blue-200',
      INTERVIEW_SCHEDULED: 'bg-violet-50 text-violet-700 border border-violet-200',
      REJECTED: 'bg-red-50 text-red-700 border border-red-200',
      OFFER_RECEIVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
    return map[status] || 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  return (
    <div className="space-y-7">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/40 border border-gray-100 px-7 py-6">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 85% 30%, rgba(199,210,254,0.5) 0%, transparent 50%), radial-gradient(circle at 15% 70%, rgba(219,234,254,0.5) 0%, transparent 50%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              {greeting}, <span className="text-indigo-600">{user?.fullName || 'User'}</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1.5">Ready to take the next step in your career? Let's make it happen.</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/jobs')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Search size={15} />
              Find Jobs
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-4`}>
              <Icon size={18} className="text-white" strokeWidth={2} />
            </div>
            <p className="text-[28px] font-extrabold text-gray-900 leading-none">{value}</p>
            <p className="text-[12px] text-gray-400 mt-1.5 font-medium tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-[14px] font-bold text-gray-800 mb-4 tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-5">
          {quickActions.map(({ to, icon: Icon, label, desc, iconBg }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center text-center group"
            >
              <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-2 group-hover:scale-105 group-hover:shadow-md transition-all duration-200`}>
                <Icon size={20} className="text-white" strokeWidth={1.8} />
              </div>
              <span className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-[15px] font-bold text-gray-800">Recent Applications</h2>
          <Link to="/dashboard/applications" className="text-[13px] text-violet-600 hover:text-violet-700 font-semibold">View All →</Link>
        </div>
        {recentApps.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-[14px] text-gray-500 font-medium">No applications yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Start applying for jobs to track your progress here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[12px] text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <th className="px-6 py-3 font-semibold">Job Title</th>
                  <th className="px-6 py-3 font-semibold">Company</th>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentApps.map((app) => (
                  <tr key={app.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-gray-800 text-[13px]">{app.job?.title}</td>
                    <td className="px-6 py-3.5 text-gray-600 text-[13px]">{app.job?.company}</td>
                    <td className="px-6 py-3.5 text-gray-400 text-[13px]">{new Date(app.appliedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getStatusBadge(app.status)}`}>
                        {app.status.replace('_', ' ')}
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
