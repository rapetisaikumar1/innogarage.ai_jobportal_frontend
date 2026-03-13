import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Video, Clock, CheckCircle2, User, Hash } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

const AdminBookings = () => {
  const [rawSlots, setRawSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/mentoring/mentor-bookings');
      setRawSlots(res.data);
    } catch (err) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // Normalize: API returns slots with nested booking — flatten to booking-centric objects
  const bookings = useMemo(() => {
    return rawSlots
      .filter(slot => slot.booking)
      .map(slot => ({
        id: slot.booking.id,
        status: slot.booking.status,
        meetLink: slot.booking.meetLink,
        student: slot.booking.student,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotId: slot.id,
      }))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [rawSlots]);

  const now = useMemo(() => new Date(), [rawSlots]);

  // Part 1: Next upcoming confirmed session (single)
  const nextUpcoming = useMemo(() => {
    return bookings.find(b => b.status === 'CONFIRMED' && new Date(b.startTime) > now) || null;
  }, [bookings, now]);

  // Part 2: All confirmed except the next upcoming
  const confirmed = useMemo(() => {
    return bookings.filter(b => b.status === 'CONFIRMED' && new Date(b.startTime) > now && b.id !== nextUpcoming?.id);
  }, [bookings, now, nextUpcoming]);

  // Part 3: Completed sessions
  const completed = useMemo(() => {
    return bookings.filter(b => b.status === 'COMPLETED').sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [bookings]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEE, MMM dd, yyyy');
  };

  const dummyMeetLink = '#';

  // Stats
  const stats = useMemo(() => ({
    total: bookings.length,
    upcoming: (nextUpcoming ? 1 : 0) + confirmed.length,
    completed: completed.length,
  }), [bookings, nextUpcoming, confirmed, completed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bookings</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">View and manage your mentoring sessions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Sessions', value: stats.total, icon: <Calendar size={17} />, color: 'text-slate-600', bg: 'bg-slate-50', ring: 'ring-slate-100' },
          { label: 'Upcoming', value: stats.upcoming, icon: <Clock size={17} />, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle2 size={17} />, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border border-gray-100 bg-white p-4 ring-1 ${s.ring}`}>
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.color} mb-2`}>{s.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-[12px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
          <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No bookings yet</p>
          <p className="text-[12px] text-gray-400 mt-1">Booked sessions will appear here</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ─── Part 1: Next Upcoming ─── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <h2 className="text-[14px] font-semibold text-gray-900">Up Next</h2>
            </div>
            {nextUpcoming ? (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent"></div>
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white text-sm font-bold ring-1 ring-white/20 flex-shrink-0">
                      {getInitials(nextUpcoming.student?.fullName)}
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-white">{nextUpcoming.student?.fullName}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[12px] text-gray-300">
                          <Hash size={11} className="text-gray-400" />{nextUpcoming.student?.id?.slice(0, 8)}
                        </span>
                        {nextUpcoming.student?.email && (
                          <span className="text-[12px] text-gray-400">{nextUpcoming.student.email}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-blue-300 font-medium">
                          <Calendar size={12} />
                          {getDateLabel(nextUpcoming.startTime)}
                        </span>
                        <span className="text-gray-600">·</span>
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-blue-300 font-medium">
                          <Clock size={12} />
                          {format(new Date(nextUpcoming.startTime), 'h:mm a')} – {format(new Date(nextUpcoming.endTime), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 sm:flex-col sm:items-end">
                    <a
                      href={dummyMeetLink}
                      onClick={(e) => e.preventDefault()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                    >
                      <Video size={13} /> Join Meet
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 text-center py-8">
                <Clock size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-[13px] text-gray-400">No upcoming session scheduled</p>
              </div>
            )}
          </div>

          {/* ─── Part 2: Confirmed ─── */}
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Clock size={15} className="text-blue-600" />
              Confirmed
              {confirmed.length > 0 && <span className="text-[11px] font-medium text-gray-400 ml-1">{confirmed.length} session{confirmed.length !== 1 ? 's' : ''}</span>}
            </h2>
            {confirmed.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {confirmed.map(b => (
                  <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 text-[12px] font-bold ring-1 ring-blue-100 flex-shrink-0">
                        {getInitials(b.student?.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{b.student?.fullName}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <Hash size={10} />{b.student?.id?.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-[12px] text-gray-600">
                        <Calendar size={12} className="text-gray-400" />
                        <span className="font-medium">{getDateLabel(b.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-gray-500 mt-1">
                        <Clock size={12} className="text-gray-400" />
                        <span>{format(new Date(b.startTime), 'h:mm a')} – {format(new Date(b.endTime), 'h:mm a')}</span>
                      </div>
                    </div>
                    <a
                      href={dummyMeetLink}
                      onClick={(e) => e.preventDefault()}
                      className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-700 text-[12px] font-medium rounded-lg transition-colors border border-gray-200 hover:border-blue-200"
                    >
                      <Video size={12} /> Meeting Link
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 text-center py-8">
                <Calendar size={22} className="mx-auto text-gray-300 mb-2" />
                <p className="text-[13px] text-gray-400">No other confirmed sessions</p>
              </div>
            )}
          </div>

          {/* ─── Part 3: Completed ─── */}
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              Completed
              {completed.length > 0 && <span className="text-[11px] font-medium text-gray-400 ml-1">{completed.length} session{completed.length !== 1 ? 's' : ''}</span>}
            </h2>
            {completed.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {completed.map(b => (
                    <div key={b.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 text-[11px] font-bold ring-1 ring-emerald-100 flex-shrink-0">
                          {getInitials(b.student?.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-gray-800 truncate">{b.student?.fullName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Hash size={9} />{b.student?.id?.slice(0, 8)}
                            </span>
                            <span className="text-[11px] text-gray-300">·</span>
                            <span className="text-[11px] text-gray-400">
                              {format(new Date(b.startTime), 'MMM dd, yyyy')} · {format(new Date(b.startTime), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <a
                          href={dummyMeetLink}
                          onClick={(e) => e.preventDefault()}
                          className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-600 font-medium transition-colors cursor-pointer"
                        >
                          <Video size={11} /> Link
                        </a>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          <CheckCircle2 size={9} /> Done
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 text-center py-8">
                <CheckCircle2 size={22} className="mx-auto text-gray-300 mb-2" />
                <p className="text-[13px] text-gray-400">No completed sessions yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
