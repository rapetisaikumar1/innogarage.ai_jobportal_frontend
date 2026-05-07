import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, BookOpen, CheckCircle2, XCircle, Clock, TrendingUp, Layers } from 'lucide-react';
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

  // Flatten bookings from slots+booking pairs
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
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const statCards = [
    { label: 'Assigned Students', value: students.length, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', numColor: 'text-blue-700', border: 'border-blue-100' },
    { label: 'Available Slots', value: availableSlots, icon: Calendar, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', numColor: 'text-emerald-700', border: 'border-emerald-100' },
    { label: 'Upcoming Sessions', value: upcomingBookings.length, icon: Clock, iconBg: 'bg-violet-50', iconColor: 'text-violet-600', numColor: 'text-violet-700', border: 'border-violet-100' },
    { label: 'Total Bookings', value: totalBookings, icon: BookOpen, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', numColor: 'text-amber-700', border: 'border-amber-100' },
    { label: 'Total Slots', value: slots.length, icon: Layers, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', numColor: 'text-indigo-700', border: 'border-indigo-100' },
    { label: 'Completed', value: completedSessions, icon: CheckCircle2, iconBg: 'bg-teal-50', iconColor: 'text-teal-600', numColor: 'text-teal-700', border: 'border-teal-100' },
    { label: 'Cancelled', value: cancelledSessions, icon: XCircle, iconBg: 'bg-rose-50', iconColor: 'text-rose-500', numColor: 'text-rose-600', border: 'border-rose-100' },
  ];

  return (
    <div className="space-y-5">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50/40 border border-gray-200/60 px-6 py-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-100/30 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">
            {greeting}, <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">{user?.fullName || 'Mentor'}</span>
          </h1>
          <p className="text-gray-500 text-[13px] mt-1">Here's your mentoring overview. Manage your students and sessions from here.</p>
        </div>
      </div>

      {/* Stat Grid — row 1: 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.slice(0, 4).map(({ label, value, icon: Icon, iconBg, iconColor, numColor, border }) => (
          <div key={label} className={`bg-white rounded-xl border ${border} p-4`}>
            <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon size={18} className={iconColor} strokeWidth={2} />
            </div>
            <p className={`text-3xl font-extrabold ${numColor} leading-none`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Stat Grid — row 2: 3 cards */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.slice(4).map(({ label, value, icon: Icon, iconBg, iconColor, numColor, border }) => (
          <div key={label} className={`bg-white rounded-xl border ${border} p-4`}>
            <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon size={18} className={iconColor} strokeWidth={2} />
            </div>
            <p className={`text-3xl font-extrabold ${numColor} leading-none`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Content Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assigned Students */}
        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-[13px] font-bold text-gray-800">Assigned Students</h2>
            <Link to="/admin/students" className="text-[11px] text-indigo-600 font-semibold hover:text-indigo-700">View All</Link>
          </div>
          {students.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No students assigned</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {students.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  <div className="min-w-0 w-[40%]">
                    <p className="font-semibold text-gray-800 text-[13px] truncate">{student.fullName}</p>
                    <p className="text-[11px] text-gray-400 truncate">{student.email}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 w-[25%] text-center whitespace-nowrap">{new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="w-[15%] text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${student.isActive !== false ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${student.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                      {student.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                  <span className="w-[20%] text-right">
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{(student._count?.jobApplications || 0) + (student._count?.sheetApplications || 0)} applications</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-[13px] font-bold text-gray-800">Upcoming Sessions</h2>
            <Link to="/admin/bookings" className="text-[11px] text-indigo-600 font-semibold hover:text-indigo-700">View All</Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No upcoming sessions</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {upcomingBookings.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${b.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {b.student?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-[13px] truncate">{b.student?.fullName}</p>
                      <p className="text-[11px] text-gray-400">{format(new Date(b.startTime), 'MMM dd · h:mm a')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{b.status}</span>
                    {b.meetLink && (
                      <a href={b.meetLink} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">Join</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
