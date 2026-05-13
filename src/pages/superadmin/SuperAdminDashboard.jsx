import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  UserCog,
  CheckCircle2,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Code2,
  FileQuestion,
  Send,
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

const safeFormatDate = (value, pattern = 'MMM d, yyyy') => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return format(date, pattern);
};

const statusBadgeClass = (status = '') => {
  const normalized = String(status).toUpperCase();
  if (['ACCEPTED', 'CLOSED', 'RESOLVED', 'CONFIRMED'].includes(normalized)) return 'bg-emerald-50 text-emerald-700';
  if (['REJECTED', 'CANCELLED'].includes(normalized)) return 'bg-rose-50 text-rose-700';
  if (['IN_PROGRESS', 'REQUEST_SENT', 'PENDING', 'OPEN'].includes(normalized)) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-50 text-slate-600';
};

const formatStatus = (status = '') => String(status || 'Open').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [requests, setRequests] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, requestsRes, chatsRes, queriesRes] = await Promise.allSettled([
          api.get('/admin/analytics'),
          api.get('/admin/requests'),
          api.get('/chat/contacts'),
          api.get('/queries/all', { params: { limit: 8 } }),
        ]);
        setAnalytics(analyticsRes.status === 'fulfilled' ? analyticsRes.value.data : null);
        setRequests(requestsRes.status === 'fulfilled' ? requestsRes.value.data : []);
        setRecentChats(chatsRes.status === 'fulfilled' ? chatsRes.value.data : []);
        setQueries(queriesRes.status === 'fulfilled' ? queriesRes.value.data : []);
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
  const totalWithAssignedTechnology = technologyEntries.reduce((sum, [, count]) => sum + count, 0);
  const recentRequests = [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  const topChats = [...recentChats].sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0)).slice(0, 4);
  const recentQueries = [...queries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const statCards = [
    { label: 'Total Students', value: totalStudents, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-500', numColor: 'text-blue-600' },
    { label: 'Active Students', value: activeStudents, icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', numColor: 'text-emerald-600' },
    { label: 'Total Mentors', value: totalMentors, icon: UserCog, iconBg: 'bg-violet-50', iconColor: 'text-violet-500', numColor: 'text-violet-600' },
    { label: 'Jobs Applied', value: totalApplications, icon: FileText, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', numColor: 'text-amber-600' },
    { label: 'Students Placed', value: offersReceived, icon: TrendingUp, iconBg: 'bg-teal-50', iconColor: 'text-teal-500', numColor: 'text-teal-600' },
    { label: 'Total Bookings', value: totalBookings, icon: Calendar, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', numColor: 'text-indigo-600' },
    { label: 'Without Mentor', value: studentsWithoutMentor, icon: AlertCircle, iconBg: 'bg-rose-50', iconColor: 'text-rose-500', numColor: 'text-rose-600' },
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
  const donutSegments = buildDonutSegments(technologyItems, totalWithAssignedTechnology, donutCircumference);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {greeting}, <span className="text-indigo-600">{user?.fullName || 'Super Admin'}</span>
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">Here's your platform overview. Track students, mentors, requests, and support activity from here.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, numColor }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm">
            <div className={`w-7 h-7 ${iconBg} rounded-md flex items-center justify-center mb-1.5`}>
              <Icon size={14} className={iconColor} strokeWidth={1.8} />
            </div>
            <p className={`text-lg font-bold ${numColor} leading-tight`}>{value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Send size={15} className="text-blue-500" /> Recent Requests</h2>
            <Link to="/superadmin/requests" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">View All</Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm font-medium text-gray-400">No recent requests</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {recentRequests.map((request) => (
                <div key={request.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{request.studentFullName}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{request.admin?.fullName || 'Admin'} · {request.technology || request.registrationNumber || 'Assignment request'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClass(request.status)}`}>{formatStatus(request.status)}</span>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-gray-400">{safeFormatDate(request.createdAt, 'MMM d, h:mm a')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><MessageSquare size={15} className="text-emerald-500" /> Recent Chat</h2>
            <Link to="/superadmin/chat" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">Open Chat</Link>
          </div>
          {topChats.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm font-medium text-gray-400">No recent chat contacts</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {topChats.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{getInitials(contact.fullName)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{contact.fullName}</p>
                    <p className="text-xs font-medium text-gray-400">{formatStatus(contact.role || 'Contact')}</p>
                  </div>
                  {contact.unreadCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">{contact.unreadCount}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><FileQuestion size={15} className="text-violet-500" /> Recent Queries</h2>
            <Link to="/superadmin/queries" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">View All</Link>
          </div>
          {recentQueries.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm font-medium text-gray-400">No recent queries</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {recentQueries.map((query) => (
                <div key={query.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{query.subject}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{query.user?.fullName || 'Student query'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClass(query.status)}`}>{formatStatus(query.status)}</span>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-gray-400">{safeFormatDate(query.createdAt, 'MMM d, h:mm a')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recent Students</h2>
            <Link to="/superadmin/students" className="text-sm text-indigo-600 font-semibold flex items-center gap-0.5 hover:text-indigo-700">
              View All <span className="text-base leading-none">›</span>
            </Link>
          </div>
          {recentStudents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No students found</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[255px] overflow-y-auto">
              {recentStudents.map((student) => {
                const active = isStudentActive(student);
                return (
                  <div key={student.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
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

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Technology wise Candidates</h2>
          </div>
          {technologyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-gray-400">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3">
                <Code2 size={24} className="text-slate-400" strokeWidth={1.8} />
              </div>
              <p className="font-semibold text-sm">No assigned technology data yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[190px_minmax(0,1fr)] xl:items-center">
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
                    <span className="text-2xl font-bold text-gray-900 leading-none">{totalWithAssignedTechnology}</span>
                    <span className="mt-1 text-[11px] font-medium leading-4 text-gray-400">Total Candidates</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[185px] overflow-y-auto pr-1">
                {technologyItems.map(([role, count], index) => {
                  const percentage = totalWithAssignedTechnology > 0 ? ((count / totalWithAssignedTechnology) * 100).toFixed(1) : '0.0';
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
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
