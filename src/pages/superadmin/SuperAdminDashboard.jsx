import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, UserCog, GraduationCap, Briefcase, BarChart3,
  UserPlus, XCircle, CheckCircle2, Calendar, FileText,
  TrendingUp, AlertCircle, Search
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/admin/analytics');
        setAnalytics(res.data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
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
    { label: 'Total Students', value: analytics?.totalStudents ?? 0, icon: Users, color: 'bg-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Mentors', value: analytics?.totalMentors ?? 0, icon: UserCog, color: 'bg-violet-500', bg: 'bg-violet-50' },
    { label: 'Jobs Applied', value: analytics?.totalApplications ?? 0, icon: FileText, color: 'bg-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Mentoring Sessions', value: analytics?.completedBookings ?? 0, icon: Calendar, color: 'bg-orange-500', bg: 'bg-orange-50' },
    { label: 'Students Placed', value: analytics?.offersReceived ?? 0, icon: CheckCircle2, color: 'bg-teal-500', bg: 'bg-teal-50' },
    { label: 'Students Rejected', value: analytics?.rejectedApplications ?? 0, icon: XCircle, color: 'bg-red-500', bg: 'bg-red-50' },
    { label: 'Assign Mentors', value: analytics?.studentsWithoutMentor ?? 0, icon: AlertCircle, color: 'bg-amber-500', bg: 'bg-amber-50' },
    { label: 'Issues', value: analytics?.totalBookings ?? 0, icon: TrendingUp, color: 'bg-cyan-500', bg: 'bg-cyan-50' },
  ];

  const quickActions = [
    { to: '/superadmin/admins', icon: UserCog, label: 'Manage Mentors', iconBg: 'bg-violet-500' },
    { to: '/superadmin/students', icon: Users, label: 'Manage Students', iconBg: 'bg-blue-500' },
    { to: '/superadmin/training', icon: GraduationCap, label: 'Training Materials', iconBg: 'bg-emerald-500' },
    { to: '/superadmin/analytics', icon: BarChart3, label: 'Analytics', iconBg: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/40 border border-gray-100 px-5 py-4">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 85% 30%, rgba(199,210,254,0.5) 0%, transparent 50%), radial-gradient(circle at 15% 70%, rgba(219,234,254,0.5) 0%, transparent 50%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">
              {greeting}, <span className="text-indigo-600">{user?.fullName || 'Super Admin'}</span>
            </h1>
            <p className="text-gray-500 text-xs mt-1">Here's your platform overview. Manage and monitor everything from here.</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-3.5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon size={15} className="text-white" strokeWidth={2} />
              </div>
              <div>
                <p className="text-lg font-extrabold text-gray-900 leading-none">{value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Application Status Breakdown */}
      {analytics?.applicationsByStatus && Object.keys(analytics.applicationsByStatus).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-50">
            <h2 className="text-[13px] font-bold text-gray-800">Application Status Breakdown</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3">
            {Object.entries(analytics.applicationsByStatus).map(([status, count]) => (
              <div key={status} className="bg-gray-50 p-2.5 rounded-lg text-center">
                <p className="text-base font-extrabold text-gray-900">{count}</p>
                <p className="text-[10px] text-gray-400 capitalize mt-0.5 font-medium">{status.replace(/_/g, ' ').toLowerCase()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-[12px] font-bold text-gray-800 mb-2.5 tracking-wide">Quick Actions</h2>
        <div className="flex items-center gap-3">
          {quickActions.map(({ to, icon: Icon, label, iconBg }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-100 rounded-lg hover:shadow-sm hover:border-gray-200 transition-all group"
            >
              <div className={`w-7 h-7 ${iconBg} rounded-md flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <Icon size={14} className="text-white" strokeWidth={2} />
              </div>
              <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
