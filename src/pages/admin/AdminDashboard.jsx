import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, BookOpen, CheckCircle2, XCircle, Clock, Layers } from 'lucide-react';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [rawBookings, setRawBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, slotsRes, bookingsRes] = await Promise.all([
          api.get('/admin/my-students'),
          api.get('/mentoring/my-slots'),
          api.get('/mentoring/mentor-bookings'),
        ]);
        setStudents(studentsRes.data);
        setSlots(slotsRes.data);
        setRawBookings(bookingsRes.data);
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

  const initials = user?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'ME';

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
    <div className="space-y-5">
      {/* Welcome Header */}
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {greeting}, <span className="text-indigo-600">{user?.fullName || 'Mentor'}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's your mentoring overview. Manage your students and sessions from here.</p>
        </div>
      </div>

      {/* Stat Grid — all 7 cards in one row */}
      <div className="grid grid-cols-7 gap-2.5">
        {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, numColor }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-3.5 py-3">
            <div className={`w-7 h-7 ${iconBg} rounded-md flex items-center justify-center mb-2`}>
              <Icon size={14} className={iconColor} strokeWidth={1.8} />
            </div>
            <p className={`text-xl font-bold ${numColor} leading-tight`}>{value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Content Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assigned Students */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Assigned Students</h2>
            <Link to="/admin/students" className="text-sm text-indigo-600 font-semibold flex items-center gap-0.5 hover:text-indigo-700">
              View All <span className="text-base leading-none">›</span>
            </Link>
          </div>
          {students.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">No students assigned</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {students.slice(0, 5).map((student) => {
                const stuInitials = student.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                const appCount = (student._count?.jobApplications || 0) + (student._count?.sheetApplications || 0);
                return (
                  <div key={student.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
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
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Upcoming Sessions</h2>
            <Link to="/admin/bookings" className="text-sm text-indigo-600 font-semibold flex items-center gap-0.5 hover:text-indigo-700">
              View All <span className="text-base leading-none">›</span>
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                <Calendar size={28} className="text-violet-400" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-gray-700 text-sm">No upcoming sessions</p>
              <p className="text-gray-400 text-xs mt-1 text-center">When you schedule sessions, they will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {upcomingBookings.slice(0, 5).map((b) => {
                const bInitials = b.student?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={b.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
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
  );
};

export default AdminDashboard;
