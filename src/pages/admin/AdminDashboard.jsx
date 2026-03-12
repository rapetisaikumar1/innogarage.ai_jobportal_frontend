import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, BookOpen, MessageSquare } from 'lucide-react';

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
    { label: 'Assigned Students', value: students.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Slots', value: slots.length, icon: Calendar, color: 'bg-violet-500' },
    { label: 'Upcoming Sessions', value: upcomingBookings.length, icon: BookOpen, color: 'bg-emerald-500' },
    { label: 'Total Bookings', value: slots.filter(s => s.isBooked).length, icon: MessageSquare, color: 'bg-orange-500' },
  ];

  const quickActions = [
    { to: '/admin/students', icon: Users, label: 'My Students', iconBg: 'bg-blue-500' },
    { to: '/admin/slots', icon: Calendar, label: 'Manage Slots', iconBg: 'bg-violet-500' },
    { to: '/admin/bookings', icon: BookOpen, label: 'Bookings', iconBg: 'bg-emerald-500' },
    { to: '/admin/chat', icon: MessageSquare, label: 'Messages', iconBg: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/40 border border-gray-100 px-5 py-4">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 85% 30%, rgba(199,210,254,0.5) 0%, transparent 50%), radial-gradient(circle at 15% 70%, rgba(219,234,254,0.5) 0%, transparent 50%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight">
              {greeting}, <span className="text-indigo-600">{user?.fullName || 'Mentor'}</span>
            </h1>
            <p className="text-gray-500 text-xs mt-1">Here's your mentoring overview. Manage your students and sessions from here.</p>
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

      {/* Content Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assigned Students */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">Assigned Students</h2>
            <Link to="/admin/students" className="text-xs text-indigo-600 font-semibold hover:text-indigo-700">View All</Link>
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
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{student._count?.jobApplications || 0} applications</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-800">Upcoming Sessions</h2>
            <Link to="/admin/bookings" className="text-xs text-indigo-600 font-semibold hover:text-indigo-700">View All</Link>
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
