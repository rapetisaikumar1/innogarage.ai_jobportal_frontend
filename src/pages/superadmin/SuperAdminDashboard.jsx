import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, UserCog, GraduationCap, BarChart3,
  CheckCircle2, Calendar, FileText,
  TrendingUp, HelpCircle, AlertCircle, Clock, MessageSquareMore, Code2
} from 'lucide-react';

// Mini donut chart component
const DonutChart = ({ value, max, color, trackColor = '#e0e7ff', size = 80, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - percentage * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
    </svg>
  );
};

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [queryStats, setQueryStats] = useState({ open: 0, inProgress: 0, closed: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, queryStatsRes] = await Promise.all([
          api.get('/admin/analytics'),
          api.get('/queries/stats'),
        ]);
        setAnalytics(analyticsRes.data);
        setQueryStats(queryStatsRes.data);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
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

  const totalStudents = analytics?.totalStudents ?? 0;
  const totalMentors = analytics?.totalMentors ?? 0;
  const totalApplications = analytics?.totalApplications ?? 0;
  const completedBookings = analytics?.completedBookings ?? 0;
  const offersReceived = analytics?.offersReceived ?? 0;
  const totalBookings = analytics?.totalBookings ?? 0;

  const statCards = [
    { label: 'Total Students', value: totalStudents, icon: Users, gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Total Mentors', value: totalMentors, icon: UserCog, gradient: 'from-violet-500 to-violet-600', light: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'Jobs Applied', value: totalApplications, icon: FileText, gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Mentoring Sessions', value: completedBookings, icon: Calendar, gradient: 'from-orange-500 to-orange-600', light: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'Students Placed', value: offersReceived, icon: CheckCircle2, gradient: 'from-teal-500 to-teal-600', light: 'bg-teal-50', text: 'text-teal-600' },
    { label: 'Total Bookings', value: totalBookings, icon: TrendingUp, gradient: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50', text: 'text-cyan-600' },
  ];

  // Summary data for donut sections
  const summaryTotal = totalStudents + totalMentors;
  const placementTotal = totalApplications > 0 ? totalApplications : 1;

  const quickActions = [
    { to: '/superadmin/admins', icon: UserCog, label: 'Manage Mentors', iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600' },
    { to: '/superadmin/students', icon: Users, label: 'Manage Students', iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600' },
    { to: '/superadmin/training', icon: GraduationCap, label: 'Training Materials', iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
    { to: '/superadmin/queries', icon: HelpCircle, label: 'Queries', iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600' },
    { to: '/superadmin/analytics', icon: BarChart3, label: 'Analytics', iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50/40 border border-gray-200/60 px-7 py-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-100/30 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">
            {greeting}, <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">{user?.fullName || 'Super Admin'}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1.5">Here's your platform overview. Manage and monitor everything from here.</p>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Donut Chart Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:flex-[3]">
          {/* Users Overview */}
          <div className="bg-white rounded-xl border border-gray-200/60 px-5 py-4 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Users Overview</h3>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <DonutChart value={totalStudents} max={summaryTotal || 1} color="#0e7490" trackColor="#be185d" size={90} strokeWidth={9} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-gray-900 leading-none">{summaryTotal}</span>
                  <span className="text-[10px] text-gray-400 font-medium">Total</span>
                </div>
              </div>
              <div className="space-y-2.5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-700" />
                    <span className="text-xs text-gray-600">Students</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{totalStudents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-pink-700" />
                    <span className="text-xs text-gray-600">Mentors</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{totalMentors}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Applications */}
          <div className="bg-white rounded-xl border border-gray-200/60 px-5 py-4 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Applications</h3>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <DonutChart value={offersReceived} max={placementTotal} color="#15803d" trackColor="#9333ea" size={90} strokeWidth={9} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-gray-900 leading-none">{totalApplications}</span>
                  <span className="text-[10px] text-gray-400 font-medium">Total</span>
                </div>
              </div>
              <div className="space-y-2.5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-700" />
                    <span className="text-xs text-gray-600">Placed</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{offersReceived}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    <span className="text-xs text-gray-600">Applied</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{totalApplications}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Technology-wise Candidates */}
          <div className="bg-white rounded-xl border border-gray-200/60 px-5 py-4 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Technology / Role</h3>
            {analytics?.technologyBreakdown && Object.keys(analytics.technologyBreakdown).length > 0 ? (
              <div className="space-y-2 max-h-[110px] overflow-y-auto pr-1">
                {Object.entries(analytics.technologyBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([role, count], i) => {
                    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-teal-500'];
                    const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                    return (
                      <div key={role} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                        <span className="text-xs text-gray-600 truncate flex-1">{role}</span>
                        <span className="text-xs font-bold text-gray-900">{count}</span>
                        <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[80px] text-gray-400">
                <Code2 size={20} className="mb-1" />
                <span className="text-xs">No role data yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Card - wider, different size */}
        <div className="bg-white rounded-xl border border-gray-200/60 px-5 py-4 hover:shadow-md transition-shadow duration-300 lg:flex-[1.5]">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</h3>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
            {statCards.map(({ label, value, icon: Icon, light, text }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 ${light} rounded-lg flex items-center justify-center`}>
                    <Icon size={14} className={text} strokeWidth={2} />
                  </div>
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application Status Breakdown */}
      {analytics?.applicationsByStatus && Object.keys(analytics.applicationsByStatus).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">Application Status Breakdown</h2>
            <span className="text-xs text-gray-400 font-medium">{totalApplications} total</span>
          </div>
          <div className="px-6 py-5">
            {/* Progress bar */}
            <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-5">
              {Object.entries(analytics.applicationsByStatus).map(([status, count], i) => {
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500', 'bg-teal-500', 'bg-orange-500'];
                const pct = totalApplications > 0 ? (count / totalApplications) * 100 : 0;
                return <div key={status} className={`${colors[i % colors.length]} transition-all duration-500`} style={{ width: `${pct}%` }} />;
              })}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Object.entries(analytics.applicationsByStatus).map(([status, count], i) => {
                const dotColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500', 'bg-teal-500', 'bg-orange-500'];
                return (
                  <div key={status} className="bg-gray-50/80 px-3 py-3.5 rounded-lg text-center hover:bg-gray-100/80 transition-colors">
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                      <p className="text-lg font-extrabold text-gray-900">{count}</p>
                    </div>
                    <p className="text-[11px] text-gray-400 capitalize font-medium">{status.replace(/_/g, ' ').toLowerCase()}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Technology / Role-wise Candidates */}
      {analytics?.technologyBreakdown && Object.keys(analytics.technologyBreakdown).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">Technology / Role-wise Candidates</h2>
            <span className="text-xs text-gray-400 font-medium">{Object.values(analytics.technologyBreakdown).reduce((a, b) => a + b, 0)} with roles</span>
          </div>
          <div className="px-6 py-5">
            {/* Progress bar */}
            <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-5">
              {Object.entries(analytics.technologyBreakdown).sort((a, b) => b[1] - a[1]).map(([role, count], i) => {
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500', 'bg-indigo-500'];
                const total = Object.values(analytics.technologyBreakdown).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return <div key={role} className={`${colors[i % colors.length]} transition-all duration-500`} style={{ width: `${pct}%` }} />;
              })}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(analytics.technologyBreakdown).sort((a, b) => b[1] - a[1]).map(([role, count], i) => {
                const dotColors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-teal-500', 'bg-rose-500', 'bg-indigo-500'];
                return (
                  <div key={role} className="bg-gray-50/80 px-3 py-3.5 rounded-lg text-center hover:bg-gray-100/80 transition-colors">
                    <div className="flex items-center justify-center gap-1.5 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                      <p className="text-lg font-extrabold text-gray-900">{count}</p>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium truncate" title={role}>{role}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Query Status Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Query Status Overview</h2>
          <Link to="/superadmin/queries" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View All &rarr;</Link>
        </div>
        <div className="px-6 py-5">
          {/* Progress bar */}
          {queryStats.total > 0 && (
            <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-5">
              <div className="bg-amber-500 transition-all duration-500" style={{ width: `${(queryStats.open / queryStats.total) * 100}%` }} />
              <div className="bg-blue-500 transition-all duration-500" style={{ width: `${(queryStats.inProgress / queryStats.total) * 100}%` }} />
              <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(queryStats.closed / queryStats.total) * 100}%` }} />
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: queryStats.total, icon: MessageSquareMore, dot: 'bg-gray-500', bg: 'bg-gray-50', text: 'text-gray-600' },
              { label: 'Open', value: queryStats.open, icon: AlertCircle, dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
              { label: 'In Progress', value: queryStats.inProgress, icon: Clock, dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
              { label: 'Closed', value: queryStats.closed, icon: CheckCircle2, dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} px-4 py-4 rounded-lg text-center hover:opacity-90 transition-opacity`}>
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <s.icon size={14} className={s.text} />
                  <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <p className="text-[11px] text-gray-500 font-medium">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-3.5">Quick Actions</h2>
        <div className="flex flex-wrap items-center gap-3">
          {quickActions.map(({ to, icon: Icon, label, iconBg }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-5 py-3 bg-white border border-gray-200/60 rounded-xl hover:shadow-md hover:border-gray-300 transition-all duration-300 group"
            >
              <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                <Icon size={16} className="text-white" strokeWidth={2} />
              </div>
              <span className="text-[13px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
