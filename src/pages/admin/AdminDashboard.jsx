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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Mentor Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.fullName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Users size={22} /></div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{students.length}</p>
            <p className="text-sm text-gray-500">Assigned Students</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><Calendar size={22} /></div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{slots.length}</p>
            <p className="text-sm text-gray-500">Total Slots</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><BookOpen size={22} /></div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{upcomingBookings.length}</p>
            <p className="text-sm text-gray-500">Upcoming Sessions</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><MessageSquare size={22} /></div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{slots.filter(s => s.isBooked).length}</p>
            <p className="text-sm text-gray-500">Total Bookings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Students */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Assigned Students</h2>
            <Link to="/admin/students" className="text-sm text-primary-600 font-medium">View All</Link>
          </div>
          {students.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No students assigned</p>
          ) : (
            <div className="space-y-3">
              {students.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                      {student.fullName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{student.fullName}</p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </div>
                  </div>
                  <span className="badge-blue">{student._count?.jobApplications || 0} apps</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Upcoming Sessions</h2>
            <Link to="/admin/bookings" className="text-sm text-primary-600 font-medium">View All</Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No upcoming sessions</p>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.slice(0, 5).map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{slot.booking?.student?.fullName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(slot.startTime).toLocaleDateString()} at {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {slot.booking?.meetLink && (
                    <a href={slot.booking.meetLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 font-medium">Join</a>
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
