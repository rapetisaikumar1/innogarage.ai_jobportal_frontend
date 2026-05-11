import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Users,
  UserCog,
  CheckCircle2,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  Clock,
  MessageSquareMore,
  Code2,
} from 'lucide-react';
import { format } from 'date-fns';

const buildDonutSegments = (items, total, circumference) => {
  let accumulated = 0;

  return items.map(([label, count], index) => {
    const fraction = total > 0 ? count / total : 0;
    const dash = fraction * circumference;
    const offset = -accumulated * circumference;
    accumulated += fraction;

    return {
      label,
      count,
      index,
      dash,
      offset,
    };
  });
};

const isStudentActive = (student) => {
  if (!student) return false;
  if (typeof student.status === 'string') return student.status === 'ACTIVE';
  if (typeof student.isActive === 'boolean') return student.isActive;
  return false;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const SuperAdminDashboard = () => {
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

  const totalStudents = analytics?.totalStudents ?? 0;
  const activeStudents = analytics?.activeStudents ?? 0;
  const totalMentors = analytics?.totalMentors ?? 0;
  const totalApplications = analytics?.totalApplications ?? 0;
  const offersReceived = analytics?.offersReceived ?? 0;
  const totalBookings = analytics?.totalBookings ?? 0;
  const studentsWithoutMentor = analytics?.studentsWithoutMentor ?? 0;
  const recentStudents = analytics?.recentStudents ?? [];
  const technologyEntries = Object.entries(analytics?.technologyBreakdown ?? {}).sort((a, b) => b[1] - a[1]);
  const technologyItems = technologyEntries.slice(0, 6);
  const totalWithRole = technologyEntries.reduce((sum, [, count]) => sum + count, 0);

  const statCards = [
    { label: 'Total Students', value: totalStudents, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-500', numColor: 'text-blue-600' },
    { label: 'Active Students', value: activeStudents, icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', numColor: 'text-emerald-600' },
    { label: 'Total Mentors', value: totalMentors, icon: UserCog, iconBg: 'bg-violet-50', iconColor: 'text-violet-500', numColor: 'text-violet-600' },
    { label: 'Jobs Applied', value: totalApplications, icon: FileText, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', numColor: 'text-amber-600' },
    { label: 'Students Placed', value: offersReceived, icon: TrendingUp, iconBg: 'bg-teal-50', iconColor: 'text-teal-500', numColor: 'text-teal-600' },
    { label: 'Total Bookings', value: totalBookings, icon: Calendar, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', numColor: 'text-indigo-600' },
    { label: 'Without Mentor', value: studentsWithoutMentor, icon: AlertCircle, iconBg: 'bg-rose-50', iconColor: 'text-rose-500', numColor: 'text-rose-600' },
  ];

  const queryCards = [
    { label: 'Total', value: queryStats.total, icon: MessageSquareMore, iconBg: 'bg-slate-50', iconColor: 'text-slate-500', numColor: 'text-slate-700' },
    { label: 'Open', value: queryStats.open, icon: AlertCircle, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', numColor: 'text-amber-600' },
    { label: 'In Progress', value: queryStats.inProgress, icon: Clock, iconBg: 'bg-blue-50', iconColor: 'text-blue-500', numColor: 'text-blue-600' },
    { label: 'Closed', value: queryStats.closed, icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', numColor: 'text-emerald-600' },
  ];

  const roleColors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-indigo-500',
  ];

  const roleStrokeColors = [
    '#3b82f6',
    '#10b981',
    '#8b5cf6',
    '#f59e0b',
    '#f43f5e',
    '#06b6d4',
    '#14b8a6',
    '#6366f1',
  ];

  const donutSize = 170;
  const donutStroke = 22;
  const donutRadius = (donutSize - donutStroke) / 2;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutSegments = buildDonutSegments(technologyItems, totalWithRole, donutCircumference);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, numColor }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-3 py-2.5">
            <div className={`w-6 h-6 ${iconBg} rounded-md flex items-center justify-center mb-1.5`}>
              <Icon size={13} className={iconColor} strokeWidth={1.8} />
            </div>
            <p className={`text-lg font-bold ${numColor} leading-tight`}>{value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recent Students</h2>
            <Link to="/superadmin/students" className="text-sm text-indigo-600 font-semibold flex items-center gap-0.5 hover:text-indigo-700">
              View All <span className="text-base leading-none">›</span>
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">No students found</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[255px] overflow-y-auto">
              {recentStudents.map((student) => {
                const active = isStudentActive(student);
                return (
                  <div key={student.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-bold text-xs">{getInitials(student.fullName)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-[13px] truncate">{student.fullName}</p>
                      <p className="text-xs text-gray-400 truncate">{student.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{student.registrationNumber || 'No Reg No'}</span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">{format(new Date(student.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${active ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Query Status Overview</h2>
            <Link to="/superadmin/queries" className="text-sm text-indigo-600 font-semibold flex items-center gap-0.5 hover:text-indigo-700">
              View All <span className="text-base leading-none">›</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            {queryCards.map(({ label, value, icon: Icon, iconBg, iconColor, numColor }) => (
              <div key={label} className="rounded-xl border border-gray-200 px-3 py-3">
                <div className={`w-7 h-7 ${iconBg} rounded-md flex items-center justify-center mb-3`}>
                  <Icon size={14} className={iconColor} strokeWidth={1.8} />
                </div>
                <p className={`text-2xl font-bold ${numColor} leading-tight`}>{value}</p>
                <p className="text-[11px] text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Technology wise Candidates</h2>
        </div>
        {technologyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-gray-400">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
              <Code2 size={24} className="text-slate-400" strokeWidth={1.8} />
            </div>
            <p className="font-semibold text-sm">No role data yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 p-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
            <div className="flex items-center justify-center">
              <div className="relative flex h-[170px] w-[170px] items-center justify-center">
                <svg width={donutSize} height={donutSize} className="-rotate-90">
                  <circle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={donutRadius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth={donutStroke}
                  />
                  {donutSegments.map(({ label, dash, offset, index }) => (
                    <circle
                      key={label}
                      cx={donutSize / 2}
                      cy={donutSize / 2}
                      r={donutRadius}
                      fill="none"
                      stroke={roleStrokeColors[index % roleStrokeColors.length]}
                      strokeWidth={donutStroke}
                      strokeLinecap="butt"
                      strokeDasharray={`${dash} ${donutCircumference - dash}`}
                      strokeDashoffset={offset}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-gray-900 leading-none">{totalWithRole}</span>
                  <span className="mt-1 text-[11px] font-medium leading-4 text-gray-400">Total Candidates</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[185px] overflow-y-auto pr-1">
              {technologyItems.map(([role, count], index) => {
                const percentage = totalWithRole > 0 ? ((count / totalWithRole) * 100).toFixed(1) : '0.0';
                return (
                  <div key={role} className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${roleColors[index % roleColors.length]}`} />
                    <span className="text-sm text-gray-700 flex-1 truncate">{role}</span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                    <span className="text-xs text-gray-400 w-14 text-right">({percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
