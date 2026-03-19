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
      <div className="space-y-5">
        <div>
          <h1 className="text-[16px] font-bold text-gray-900">Mentoring</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Connect with your mentor and book sessions</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <User size={20} className="text-gray-300" />
          </div>
          <p className="text-[13px] font-semibold text-gray-600">No mentor assigned yet</p>
          <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">A mentor will be assigned to you shortly. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[16px] font-bold text-gray-900">Mentoring</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Connect with your mentor and book sessions</p>
      </div>

      {/* Mentor Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-[13px] font-bold text-gray-900">{mentor.fullName}</h2>
            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">Mentor</span>
            {mentor.mentorBio && (
              <span className="hidden md:inline text-[11px] text-gray-400 truncate max-w-xs">— {mentor.mentorBio}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[16px] font-bold text-gray-900">{slots.length}</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Open Slots</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 p-0.5 rounded-lg w-fit">
        <button
          onClick={() => setTab('slots')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
            tab === 'slots' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar size={12} /> Available Slots
        </button>
        <button
          onClick={() => setTab('upcoming')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
            tab === 'upcoming' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarCheck size={12} /> Upcoming ({upcomingBookings.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
            tab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarX size={12} /> History ({pastBookings.length})
        </button>
      </div>

      {/* Available Slots Tab */}
      {tab === 'slots' && (
        <div>
          {slots.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 text-center py-14">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <Calendar size={20} className="text-gray-300" />
              </div>
              <p className="text-[13px] font-semibold text-gray-600">No available slots</p>
              <p className="text-[11px] text-gray-400 mt-1">Your mentor hasn't posted any open slots yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(slotsByDate).map(([date, dateSlots]) => {
                const dateObj = new Date(dateSlots[0].startTime);
                const isBookedDay = bookedDates.has(dateObj.toDateString());
                return (
                  <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="text-[12px] font-bold text-gray-800 flex items-center gap-2">
                        <Calendar size={12} className="text-gray-400" />
                        {date}
                      </h3>
                      {isBookedDay && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md ring-1 ring-inset ring-amber-100">Already booked this day</span>
                      )}
                    </div>
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {dateSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-md border transition-colors ${
                            isBookedDay
                              ? 'border-gray-100 bg-gray-50/50 opacity-50'
                              : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Clock size={13} className={isBookedDay ? 'text-gray-400' : 'text-blue-500'} />
                            <div>
                              <p className="text-[12px] font-semibold text-gray-800">
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
          {upcomingBookings.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 text-center py-14">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <CalendarCheck size={20} className="text-gray-300" />
              </div>
              <p className="text-[13px] font-semibold text-gray-600">No upcoming sessions</p>
              <p className="text-[11px] text-gray-400 mt-1">Book a slot to schedule your next mentoring session</p>
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
                    className={`bg-white rounded-lg border overflow-hidden ${isPending ? 'border-amber-200' : 'border-gray-200'} ${isPast ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CalendarCheck size={15} className={isPending ? 'text-amber-500 shrink-0' : 'text-emerald-500 shrink-0'} />
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
                        {isPending ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
                            Awaiting Confirmation
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
                            Confirmed
                          </span>
                        )}
                        {!isPending && booking.meetLink && !isPast && (
                          <a
                            href={booking.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-[12px] font-semibold hover:bg-green-700 transition-colors"
                          >
                            <Video size={13} /> Join Meet
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
            <div className="bg-white rounded-lg border border-gray-200 text-center py-14">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <CalendarX size={20} className="text-gray-300" />
              </div>
              <p className="text-[13px] font-semibold text-gray-600">No past sessions</p>
              <p className="text-[11px] text-gray-400 mt-1">Your completed and cancelled sessions will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
