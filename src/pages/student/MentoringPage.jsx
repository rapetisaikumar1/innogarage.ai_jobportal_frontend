import { useState, useEffect, useMemo, useRef } from 'react';
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

  const lastRefreshAtRef = useRef(0);

  const refreshData = async () => {
    try {
      const promises = [api.get('/mentoring/my-bookings')];
      if (mentor?.id) {
        promises.push(api.get(`/mentoring/slots?mentorId=${mentor.id}`));
      }
      const results = await Promise.all(promises);
      setBookings(results[0].data);
      if (results[1]) setSlots(results[1].data);
      lastRefreshAtRef.current = Date.now();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  // Re-fetch when user returns to tab/window so admin booking changes appear
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefreshAtRef.current > 15000) refreshData();
    };
    const onFocus = () => {
      if (Date.now() - lastRefreshAtRef.current > 15000) refreshData();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [mentor]);

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

  // Dates the student already has a pending or confirmed booking
  const bookedDates = useMemo(() => {
    const dates = new Set();
    bookings.forEach((b) => {
      if ((b.status === 'CONFIRMED' || b.status === 'PENDING') && b.slot?.startTime) {
        dates.add(new Date(b.slot.startTime).toDateString());
      }
    });
    return dates;
  }, [bookings]);

  const upcomingBookings = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING');
  const pastBookings = bookings.filter((b) => b.status !== 'CONFIRMED' && b.status !== 'PENDING');

  const handleBook = async (slotId, slotDate) => {
    if (bookedDates.has(new Date(slotDate).toDateString())) {
      toast.error('You already have a session booked on this day');
      return;
    }
    try {
      await api.post(`/mentoring/book/${slotId}`);
      toast.success('Booking request sent! Your mentor will confirm shortly.');
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
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <h1 className="text-[16px] font-bold text-gray-900">Mentoring</h1>
        </div>
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <User size={24} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">No mentor assigned yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">A mentor will be assigned to you shortly. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[16px] font-bold text-gray-900">Mentoring</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold">
            <User size={12} />
            {mentor.fullName}
          </span>
          {slots.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
              <Calendar size={12} />
              {slots.length} open slots
            </span>
          )}
        </div>
        {/* Tabs in header */}
        <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl">
          <button
            onClick={() => setTab('slots')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === 'slots' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar size={13} /> Available Slots
          </button>
          <button
            onClick={() => setTab('upcoming')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === 'upcoming' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarCheck size={13} /> Upcoming
            {upcomingBookings.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold leading-none">
                {upcomingBookings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarX size={13} /> History ({pastBookings.length})
          </button>
        </div>
      </div>

      {/* Content Card */}
      <div className="flex-1 overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">

        {/* Mentor bio strip */}
        {mentor.mentorBio && (
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0 bg-gray-50/50">
            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <User size={13} className="text-purple-600" />
            </div>
            <p className="text-xs text-gray-500 italic">{mentor.mentorBio}</p>
          </div>
        )}

        {/* Available Slots Tab */}
        {tab === 'slots' && (
          <div className="flex-1 overflow-y-auto p-5">
            {slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <Calendar size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No available slots</p>
                <p className="text-xs text-gray-400 mt-1">Your mentor hasn't posted any open slots yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(slotsByDate).map(([date, dateSlots]) => {
                  const dateObj = new Date(dateSlots[0].startTime);
                  const isBookedDay = bookedDates.has(dateObj.toDateString());
                  return (
                    <div key={date}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <h3 className="text-sm font-bold text-gray-800">{date}</h3>
                        </div>
                        {isBookedDay && (
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg ring-1 ring-inset ring-amber-100">
                            Already booked this day
                          </span>
                        )}
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {dateSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                              isBookedDay
                                ? 'border-gray-100 bg-gray-50/50 opacity-50'
                                : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Clock size={12} className={isBookedDay ? 'text-gray-400' : 'text-blue-500'} />
                                <p className="text-xs font-semibold text-gray-700">
                                  {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <p className="text-xs text-gray-400 pl-4">
                                → {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <button
                              onClick={() => handleBook(slot.id, slot.startTime)}
                              disabled={isBookedDay}
                              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
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
          <div className="flex-1 overflow-y-auto p-5">
            {upcomingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <CalendarCheck size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No upcoming sessions</p>
                <p className="text-xs text-gray-400 mt-1">Book a slot to schedule your next mentoring session</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => {
                  const slotDate = new Date(booking.slot?.startTime);
                  const isPast = slotDate < new Date();
                  const isPending = booking.status === 'PENDING';
                  return (
                    <div
                      key={booking.id}
                      className={`rounded-xl border overflow-hidden ${isPending ? 'border-amber-200 bg-amber-50/20' : 'border-gray-200'} ${isPast ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPending ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                            <CalendarCheck size={18} className={isPending ? 'text-amber-600' : 'text-emerald-600'} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">
                              {slotDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Clock size={11} />
                              {slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {' — '}
                              {new Date(booking.slot?.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isPending ? (
                            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
                              Awaiting Confirmation
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
                              Confirmed
                            </span>
                          )}
                          {!isPending && booking.meetLink && !isPast && (
                            <a
                              href={booking.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                            >
                              <Video size={14} /> Join Meet
                            </a>
                          )}
                          {!isPast && (
                            <button
                              onClick={() => handleCancel(booking.id)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 border border-red-100 transition-colors"
                            >
                              <X size={14} /> Cancel
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
          <div className="flex-1 overflow-y-auto flex flex-col">
            {pastBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <CalendarX size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No past sessions</p>
                <p className="text-xs text-gray-400 mt-1">Your completed and cancelled sessions will appear here</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Time</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
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
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-700">
                          {slotDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-400">
                          {slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' — '}
                          {new Date(booking.slot?.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-inset ${statusStyles[booking.status] || 'bg-gray-50 text-gray-500 ring-gray-100'}`}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MentoringPage;
