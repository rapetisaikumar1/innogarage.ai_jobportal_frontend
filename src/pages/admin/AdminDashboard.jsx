import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, BookOpen, MessageSquare } from 'lucide-react';

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

const AdminDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, slotsRes] = await Promise.all([
          api.get('/admin/my-students'),
          api.get('/mentoring/my-slots'),
        ]);
        setStudents(studentsRes.data);
        setSlots(slotsRes.data);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const upcomingBookings = slots.filter(s => s.isBooked && s.booking && new Date(s.startTime) > new Date());
  const totalBooked = slots.filter(s => s.isBooked).length;

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
    { label: 'Assigned Students', value: students.length, icon: Users, light: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Total Slots', value: slots.length, icon: Calendar, light: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'Upcoming Sessions', value: upcomingBookings.length, icon: BookOpen, light: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Total Bookings', value: totalBooked, icon: MessageSquare, light: 'bg-orange-50', text: 'text-orange-600' },
  ];

  const quickActions = [
    { to: '/admin/students', icon: Users, label: 'My Students', iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600' },
    { to: '/admin/slots', icon: Calendar, label: 'Manage Slots', iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600' },
    { to: '/admin/bookings', icon: BookOpen, label: 'Bookings', iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
    { to: '/admin/chat', icon: MessageSquare, label: 'Messages', iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600' },
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

      {/* Summary Cards Row with Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Students & Slots */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-[13px] font-bold text-gray-800 mb-4">Students & Slots</h3>
          <div className="flex items-center gap-5">
            <div className="relative">
              <DonutChart value={students.length} max={(students.length + slots.length) || 1} color="#0e7490" trackColor="#9333ea" size={90} strokeWidth={10} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-extrabold text-gray-900 leading-none">{students.length + slots.length}</span>
                <span className="text-[9px] text-gray-400 font-medium mt-0.5">Total</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-700" />
                  <span className="text-[12px] text-gray-600">Students</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{students.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  <span className="text-[12px] text-gray-600">Slots</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{slots.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Overview */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-[13px] font-bold text-gray-800 mb-4">Sessions Overview</h3>
          <div className="flex items-center gap-5">
            <div className="relative">
              <DonutChart value={upcomingBookings.length} max={totalBooked || 1} color="#15803d" trackColor="#c2410c" size={90} strokeWidth={10} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-extrabold text-gray-900 leading-none">{totalBooked}</span>
                <span className="text-[9px] text-gray-400 font-medium mt-0.5">Booked</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-700" />
                  <span className="text-[12px] text-gray-600">Upcoming</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{upcomingBookings.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-700" />
                  <span className="text-[12px] text-gray-600">Total Bookings</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{totalBooked}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-[13px] font-bold text-gray-800 mb-4">Summary</h3>
          <div className="space-y-3">
            {statCards.map(({ label, value, icon: Icon, light, text }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 ${light} rounded-lg flex items-center justify-center`}>
                    <Icon size={14} className={text} strokeWidth={2} />
                  </div>
                  <span className="text-[12px] text-gray-600">{label}</span>
                </div>
                <span className="text-[14px] font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-[13px] font-bold text-gray-800 mb-3">Quick Actions</h2>
        <div className="flex flex-wrap items-center gap-3">
          {quickActions.map(({ to, icon: Icon, label, iconBg }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-gray-200/60 rounded-xl hover:shadow-md hover:border-gray-300 transition-all duration-300 group"
            >
              <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                <Icon size={15} className="text-white" strokeWidth={2} />
              </div>
              <span className="text-[12px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
            </Link>
          ))}
        </div>
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
            <div className="divide-y divide-gray-100">
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
            <div className="divide-y divide-gray-100">
              {upcomingBookings.slice(0, 5).map((slot) => (
                <div key={slot.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/60 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-800 text-[13px]">{slot.booking?.student?.fullName}</p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(slot.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {slot.booking?.meetLink && (
                    <a href={slot.booking.meetLink} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">Join</a>
                  )}
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
