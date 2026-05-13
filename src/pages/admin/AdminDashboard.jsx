import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, BookOpen, CheckCircle2, XCircle, Clock, Layers, MessageSquare, FileQuestion, Send } from 'lucide-react';
import { format } from 'date-fns';

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
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

const AdminDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [rawBookings, setRawBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, slotsRes, bookingsRes, requestsRes, chatsRes, queriesRes] = await Promise.allSettled([
          api.get('/admin/my-students'),
          api.get('/mentoring/my-slots'),
          api.get('/mentoring/mentor-bookings'),
          api.get('/admin/requests'),
          api.get('/chat/contacts'),
          api.get('/queries/all'),
        ]);
        setStudents(studentsRes.status === 'fulfilled' ? studentsRes.value.data : []);
        setSlots(slotsRes.status === 'fulfilled' ? slotsRes.value.data : []);
        setRawBookings(bookingsRes.status === 'fulfilled' ? bookingsRes.value.data : []);
        setRequests(requestsRes.status === 'fulfilled' ? requestsRes.value.data : []);
        setRecentChats(chatsRes.status === 'fulfilled' ? chatsRes.value.data : []);
        setQueries(queriesRes.status === 'fulfilled' ? queriesRes.value.data : []);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const now = new Date();

  const bookings = rawBookings
    .filter(s => s.booking)
    .map(s => ({ ...s.booking, startTime: s.startTime, endTime: s.endTime }));

  const availableSlots = slots.filter(s => !s.isBooked && new Date(s.startTime) > now).length;
  const upcomingBookings = bookings.filter(b =>
    new Date(b.startTime) > now && (b.status === 'CONFIRMED' || b.status === 'PENDING')
  );
  const totalBookings = bookings.length;
  const completedSessions = bookings.filter(b =>
    b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && new Date(b.startTime) <= now)
  ).length;
  const cancelledSessions = bookings.filter(b => b.status === 'CANCELLED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const recentRequests = [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  const topChats = [...recentChats].sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0)).slice(0, 4);
  const recentQueries = [...queries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);

  const statCards = [
    { label: 'Assigned Students', value: students.length, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-500', numColor: 'text-blue-600' },
    { label: 'Available Slots', value: availableSlots, icon: Calendar, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', numColor: 'text-emerald-600' },
    { label: 'Upcoming Sessions', value: upcomingBookings.length, icon: Clock, iconBg: 'bg-violet-50', iconColor: 'text-violet-500', numColor: 'text-violet-600' },
    { label: 'Total Bookings', value: totalBookings, icon: BookOpen, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', numColor: 'text-amber-600' },
    { label: 'Total Slots', value: slots.length, icon: Layers, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', numColor: 'text-indigo-600' },
    { label: 'Completed', value: completedSessions, icon: CheckCircle2, iconBg: 'bg-teal-50', iconColor: 'text-teal-500', numColor: 'text-teal-600' },
    { label: 'Cancelled', value: cancelledSessions, icon: XCircle, iconBg: 'bg-rose-50', iconColor: 'text-rose-500', numColor: 'text-rose-600' },
  ];

  return (
    <div className="space-y-3">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {greeting}, <span className="text-indigo-600">{user?.fullName || 'Mentor'}</span>
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">Here's your mentoring overview. Manage your students and sessions from here.</p>
        </div>
      </div>

      {/* Stat Grid — all 7 cards in one row */}
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
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Send size={15} className="text-blue-500" /> Recent Raised Requests</h2>
            <Link to="/admin/raise-request" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">View All</Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm font-medium text-gray-400">No raised requests yet</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {recentRequests.map((request) => (
                <div key={request.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{request.studentFullName}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{request.technology || request.registrationNumber || 'Assignment request'}</p>
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
            <Link to="/admin/chat" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">Open Chat</Link>
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
            <Link to="/admin/queries" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">View All</Link>
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

      {/* Content Panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Assigned Students */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Assigned Students</h2>
            <Link to="/admin/students" className="text-sm text-indigo-600 font-semibold flex items-center gap-0.5 hover:text-indigo-700">
              View All <span className="text-base leading-none">›</span>
            </Link>
          </div>
          {students.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No students assigned</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {students.slice(0, 5).map((student) => {
                const stuInitials = getInitials(student.fullName);
                const appCount = student._count?.jobApplications || 0;
                return (
                  <div key={student.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-bold text-sm">{stuInitials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{student.fullName}</p>
                      <p className="text-xs text-gray-400 truncate">{student.email}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-400">{format(new Date(student.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${student.isActive !== false ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${student.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {student.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">{appCount} applications</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Upcoming Sessions</h2>
            <Link to="/admin/bookings" className="text-sm text-indigo-600 font-semibold flex items-center gap-0.5 hover:text-indigo-700">
              View All <span className="text-base leading-none">›</span>
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
                <Calendar size={22} className="text-violet-400" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-gray-700 text-sm">No upcoming sessions</p>
              <p className="text-gray-400 text-xs mt-1 text-center">When you schedule sessions, they will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {upcomingBookings.slice(0, 5).map((b) => {
                const bInitials = b.student?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${b.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {bInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{b.student?.fullName}</p>
                        <p className="text-xs text-gray-400">{format(new Date(b.startTime), 'MMM dd · h:mm a')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${b.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{b.status}</span>
                      {b.meetLink && (
                        <a href={b.meetLink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">Join</a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
