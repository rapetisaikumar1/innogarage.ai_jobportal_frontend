import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Video, X } from 'lucide-react';
import { format } from 'date-fns';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/mentoring/mentor-bookings');
      setBookings(res.data);
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter);
  const upcoming = filtered.filter(b => new Date(b.slot?.startTime) > new Date());
  const past = filtered.filter(b => new Date(b.slot?.startTime) <= new Date());

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Bookings</h1>
        <p className="text-gray-500 mt-1">View your mentoring sessions</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-800 mb-3">Upcoming ({upcoming.length})</h2>
              <div className="space-y-3">
                {upcoming.map((booking) => (
                  <div key={booking.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                        {booking.student?.fullName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{booking.student?.fullName}</p>
                        <p className="text-sm text-gray-500">{booking.student?.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(booking.slot?.startTime), 'EEE, MMM dd yyyy')} &bull; {format(new Date(booking.slot?.startTime), 'hh:mm a')} - {format(new Date(booking.slot?.endTime), 'hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge-${booking.status === 'CONFIRMED' ? 'green' : booking.status === 'CANCELLED' ? 'red' : 'blue'}`}>
                        {booking.status}
                      </span>
                      {booking.meetLink && (
                        <a href={booking.meetLink} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm flex items-center gap-1">
                          <Video size={14} /> Join Meet
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-700 mb-3">Past Sessions ({past.length})</h2>
              <div className="space-y-3">
                {past.map((booking) => (
                  <div key={booking.id} className="card opacity-70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                        {booking.student?.fullName?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">{booking.student?.fullName}</p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(booking.slot?.startTime), 'EEE, MMM dd yyyy')} &bull; {format(new Date(booking.slot?.startTime), 'hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <span className={`badge-${booking.status === 'COMPLETED' ? 'green' : booking.status === 'CANCELLED' ? 'red' : 'blue'}`}>
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
