import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, Video, Check } from 'lucide-react';

const MentoringPage = () => {
  const [mentors, setMentors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [tab, setTab] = useState('book'); // book | my-bookings

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mentorsRes, bookingsRes] = await Promise.all([
          api.get('/mentoring/mentors'),
          api.get('/mentoring/my-bookings'),
        ]);
        setMentors(mentorsRes.data);
        setBookings(bookingsRes.data);
      } catch (error) {
        console.error('Failed to load mentoring data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedMentor || tab === 'book') {
      fetchSlots();
    }
  }, [selectedMentor]);

  const fetchSlots = async () => {
    try {
      const params = selectedMentor ? `?mentorId=${selectedMentor}` : '';
      const { data } = await api.get(`/mentoring/slots${params}`);
      setSlots(data);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    }
  };

  const handleBook = async (slotId) => {
    try {
      await api.post(`/mentoring/book/${slotId}`);
      toast.success('Session booked! Check your email for details.');
      fetchSlots();
      const { data } = await api.get('/mentoring/my-bookings');
      setBookings(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
    }
  };

  const handleCancel = async (bookingId) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await api.patch(`/mentoring/bookings/${bookingId}/cancel`);
      toast.success('Booking cancelled');
      const { data } = await api.get('/mentoring/my-bookings');
      setBookings(data);
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Mentoring</h1>
        <p className="text-gray-500 mt-1">Connect with mentors and book sessions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setTab('book')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'book' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-600'}`}>
          Book Session
        </button>
        <button onClick={() => setTab('my-bookings')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'my-bookings' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-600'}`}>
          My Bookings ({bookings.length})
        </button>
      </div>

      {tab === 'book' && (
        <div className="space-y-4">
          {/* Mentor Selection */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3">Select a Mentor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mentors.map((mentor) => (
                <button
                  key={mentor.id}
                  onClick={() => setSelectedMentor(mentor.id)}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${selectedMentor === mentor.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                      {mentor.fullName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{mentor.fullName}</p>
                      <p className="text-xs text-gray-500">{mentor.email}</p>
                    </div>
                  </div>
                  {mentor.mentorBio && <p className="text-sm text-gray-500 mt-2">{mentor.mentorBio}</p>}
                </button>
              ))}
            </div>
            {mentors.length === 0 && <p className="text-gray-500 text-center py-4">No mentors available</p>}
          </div>

          {/* Available Slots */}
          {selectedMentor && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-3">Available Time Slots</h3>
              {slots.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No available slots for this mentor</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {slots.map((slot) => (
                    <div key={slot.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-700 mb-2">
                        <Calendar size={16} />
                        <span className="text-sm font-medium">{new Date(slot.startTime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 mb-3">
                        <Clock size={16} />
                        <span className="text-sm">
                          {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button onClick={() => handleBook(slot.id)} className="btn-primary w-full text-sm py-2">
                        Book Slot
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'my-bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="card text-center py-12">
              <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
              <h3 className="text-lg font-medium text-gray-600">No bookings yet</h3>
              <p className="text-gray-400">Book a mentoring session to get started</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                      {booking.slot?.mentor?.fullName?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">{booking.slot?.mentor?.fullName}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Calendar size={14} />{new Date(booking.slot?.startTime).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock size={14} />{new Date(booking.slot?.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${booking.status === 'CONFIRMED' ? 'badge-green' : booking.status === 'CANCELLED' ? 'badge-red' : 'badge-yellow'}`}>
                      {booking.status}
                    </span>
                    {booking.meetLink && booking.status === 'CONFIRMED' && (
                      <a href={booking.meetLink} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm py-1.5 flex items-center gap-1">
                        <Video size={14} /> Join Meet
                      </a>
                    )}
                    {booking.status === 'CONFIRMED' && (
                      <button onClick={() => handleCancel(booking.id)} className="text-sm text-red-600 hover:text-red-700">Cancel</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MentoringPage;
