import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, Video, X, CalendarCheck, CalendarX, ChevronRight } from 'lucide-react';

const MentoringPage = () => {
  const { user } = useAuth();
  const [mentor, setMentor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('slots');

  useEffect(() => {
    const init = async () => {
      try {
        // Fetch full profile which includes assignedMentor relation
        const { data: profile } = await api.get('/users/profile');
        const assignedMentor = profile.assignedMentor || null;
        setMentor(assignedMentor);

        const promises = [api.get('/mentoring/my-bookings')];
        if (assignedMentor?.id) {
          promises.push(api.get(`/mentoring/slots?mentorId=${assignedMentor.id}`));
        }
        const results = await Promise.all(promises);
        setBookings(results[0].data);
        if (results[1]) setSlots(results[1].data);
      } catch (error) {
        console.error('Failed to load mentoring data:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refreshData = async () => {
    try {
      const promises = [api.get('/mentoring/my-bookings')];
      if (mentor?.id) {
        promises.push(api.get(`/mentoring/slots?mentorId=${mentor.id}`));
      }
      const results = await Promise.all(promises);
      setBookings(results[0].data);
      if (results[1]) setSlots(results[1].data);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  // Group available slots by date
  const slotsByDate = useMemo(() => {
    const grouped = {};
    slots.forEach((slot) => {
      const date = new Date(slot.startTime).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(slot);
    });
    return grouped;
  }, [slots]);

  // Dates the student already has a confirmed booking
  const bookedDates = useMemo(() => {
    const dates = new Set();
    bookings.forEach((b) => {
      if (b.status === 'CONFIRMED' && b.slot?.startTime) {
        dates.add(new Date(b.slot.startTime).toDateString());
      }
    });
    return dates;
  }, [bookings]);

  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');
  const pastBookings = bookings.filter((b) => b.status !== 'CONFIRMED');

  const handleBook = async (slotId, slotDate) => {
    if (bookedDates.has(new Date(slotDate).toDateString())) {
      toast.error('You already have a session booked on this day');
      return;
    }
    try {
      await api.post(`/mentoring/book/${slotId}`);
      toast.success('Session booked! Check your email for details.');
      refreshData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
    }
  };

  const handleCancel = async (bookingId) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await api.patch(`/mentoring/bookings/${bookingId}/cancel`);
      toast.success('Booking cancelled');
      refreshData();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Mentoring</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Connect with your mentor and book sessions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-gray-300" />
          </div>
          <p className="text-[15px] font-semibold text-gray-700">No mentor assigned yet</p>
          <p className="text-[12px] text-gray-400 mt-1 max-w-xs mx-auto">A mentor will be assigned to you shortly. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">Mentoring</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">Connect with your mentor and book sessions</p>
      </div>

      {/* Mentor Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-blue-200 flex-shrink-0">
            {mentor.fullName?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-gray-900">{mentor.fullName}</h2>
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">Your Mentor</span>
            </div>
            <p className="text-[12px] text-gray-400 mt-0.5">{mentor.email}</p>
            {mentor.mentorBio && <p className="text-[12px] text-gray-500 mt-1.5 line-clamp-2">{mentor.mentorBio}</p>}
          </div>
          <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
            <div className="text-center">
              <p className="text-xl font-black text-gray-900">{slots.length}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Open Slots</p>
            </div>
            <div className="h-8 w-px bg-gray-100"></div>
            <div className="text-center">
              <p className="text-xl font-black text-gray-900">{confirmedBookings.length}</p>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Booked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('slots')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-semibold transition-colors ${
            tab === 'slots' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar size={14} /> Available Slots
        </button>
        <button
          onClick={() => setTab('upcoming')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-semibold transition-colors ${
            tab === 'upcoming' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarCheck size={14} /> Upcoming ({confirmedBookings.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-semibold transition-colors ${
            tab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarX size={14} /> History ({pastBookings.length})
        </button>
      </div>

      {/* Available Slots Tab */}
      {tab === 'slots' && (
        <div>
          {slots.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-14">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <Calendar size={24} className="text-gray-300" />
              </div>
              <p className="text-[14px] font-semibold text-gray-600">No available slots</p>
              <p className="text-[12px] text-gray-400 mt-1">Your mentor hasn't posted any open slots yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(slotsByDate).map(([date, dateSlots]) => {
                const dateObj = new Date(dateSlots[0].startTime);
                const isBookedDay = bookedDates.has(dateObj.toDateString());
                return (
                  <div key={date} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {date}
                      </h3>
                      {isBookedDay && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md ring-1 ring-inset ring-amber-100">Already booked this day</span>
                      )}
                    </div>
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {dateSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                            isBookedDay
                              ? 'border-gray-100 bg-gray-50/50 opacity-50'
                              : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isBookedDay ? 'bg-gray-100' : 'bg-blue-50'}`}>
                              <Clock size={14} className={isBookedDay ? 'text-gray-400' : 'text-blue-500'} />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-gray-800">
                                {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {' — '}
                                {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleBook(slot.id, slot.startTime)}
                            disabled={isBookedDay}
                            className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                              isBookedDay
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-blue-600 hover:bg-blue-100 hover:text-blue-700'
                            }`}
                          >
                            Book
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Bookings Tab */}
      {tab === 'upcoming' && (
        <div>
          {confirmedBookings.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-14">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <CalendarCheck size={24} className="text-gray-300" />
              </div>
              <p className="text-[14px] font-semibold text-gray-600">No upcoming sessions</p>
              <p className="text-[12px] text-gray-400 mt-1">Book a slot to schedule your next mentoring session</p>
            </div>
          ) : (
            <div className="space-y-3">
              {confirmedBookings.map((booking) => {
                const slotDate = new Date(booking.slot?.startTime);
                const isPast = slotDate < new Date();
                return (
                  <div
                    key={booking.id}
                    className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${isPast ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <CalendarCheck size={18} className="text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-gray-800">
                            {slotDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[12px] text-gray-400 flex items-center gap-1">
                              <Clock size={11} />
                              {slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {' — '}
                              {new Date(booking.slot?.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
                          Confirmed
                        </span>
                        {booking.meetLink && !isPast && (
                          <a
                            href={booking.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700 transition-colors"
                          >
                            <Video size={13} /> Join
                          </a>
                        )}
                        {!isPast && (
                          <button
                            onClick={() => handleCancel(booking.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <X size={13} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div>
          {pastBookings.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-14">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <CalendarX size={24} className="text-gray-300" />
              </div>
              <p className="text-[14px] font-semibold text-gray-600">No past sessions</p>
              <p className="text-[12px] text-gray-400 mt-1">Your completed and cancelled sessions will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                    <th className="px-5 py-2.5 font-semibold">Time</th>
                    <th className="px-5 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastBookings.map((booking) => {
                    const slotDate = new Date(booking.slot?.startTime);
                    const statusStyles = {
                      COMPLETED: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
                      CANCELLED: 'bg-red-50 text-red-600 ring-red-100',
                      PENDING: 'bg-amber-50 text-amber-600 ring-amber-100',
                    };
                    return (
                      <tr key={booking.id} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                        <td className="px-5 py-3 text-[13px] font-semibold text-gray-700">
                          {slotDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-3 text-[12px] text-gray-400">
                          {slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' — '}
                          {new Date(booking.slot?.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold ring-1 ring-inset ${statusStyles[booking.status] || 'bg-gray-50 text-gray-500 ring-gray-100'}`}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MentoringPage;
