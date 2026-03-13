import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Video, Clock, CheckCircle2, Hash } from 'lucide-react';
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

  // Part 3: Completed sessions (status COMPLETED or confirmed but past)
  const completed = useMemo(() => {
    return bookings
      .filter(b => b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && new Date(b.startTime) <= now))
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [bookings, now]);

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
  const stats = useMemo(() => {
    const upcomingCount = (nextUpcoming ? 1 : 0) + confirmed.length;
    const completedCount = completed.length;
    return {
      total: upcomingCount + completedCount,
      upcoming: upcomingCount,
      completed: completedCount,
    };
  }, [nextUpcoming, confirmed, completed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bookings</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">View and manage your mentoring sessions</p>
        </div>
        <div className="flex items-center gap-5">
          {[
            { label: 'Total', value: stats.total, dot: 'bg-slate-400' },
            { label: 'Upcoming', value: stats.upcoming, dot: 'bg-blue-500' },
            { label: 'Completed', value: stats.completed, dot: 'bg-emerald-500' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></div>
              <span className="text-[12px] text-gray-500 font-medium">{s.label}</span>
              <span className="text-[14px] font-bold text-gray-900">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
          <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No bookings yet</p>
          <p className="text-[12px] text-gray-400 mt-1">Booked sessions will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* ─── Column 1: Up Next ─── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <h2 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider">Up Next</h2>
            </div>
            <div className="p-3">
              {nextUpcoming ? (
                <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/15 via-transparent to-transparent"></div>
                  <div className="relative p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[13px] font-bold shadow-lg shadow-blue-600/20 flex-shrink-0">
                        {getInitials(nextUpcoming.student?.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-white truncate">{nextUpcoming.student?.fullName}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{nextUpcoming.student?.email}</p>
                      </div>
                    </div>
                    <div className="mt-3.5 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/8 text-[11px] text-blue-300 font-medium">
                        <Calendar size={11} className="text-blue-400" />
                        {getDateLabel(nextUpcoming.startTime)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/8 text-[11px] text-blue-300 font-medium">
                        <Clock size={11} className="text-blue-400" />
                        {format(new Date(nextUpcoming.startTime), 'h:mm a')} – {format(new Date(nextUpcoming.endTime), 'h:mm a')}
                      </span>
                    </div>
                    <a
                      href={dummyMeetLink}
                      onClick={(e) => e.preventDefault()}
                      className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold rounded-lg transition-colors shadow-lg shadow-blue-600/25"
                    >
                      <Video size={13} /> Join Meet
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2.5">
                    <Clock size={18} className="text-gray-300" />
                  </div>
                  <p className="text-[12px] text-gray-400 font-medium">No upcoming session</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Column 2: Confirmed ─── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-white flex items-center gap-2">
              <Clock size={12} className="text-blue-600" />
              <h2 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider">Confirmed</h2>
              {confirmed.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full ring-1 ring-blue-100">{confirmed.length}</span>
              )}
            </div>
            <div className="p-3">
              {confirmed.length > 0 ? (
                <div className="space-y-2">
                  {confirmed.map(b => (
                    <div key={b.id} className="rounded-lg border border-gray-100 p-3.5 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 text-[11px] font-bold flex-shrink-0">
                          {getInitials(b.student?.fullName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{b.student?.fullName}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <Hash size={8} />{b.student?.id?.slice(0, 8)}
                          </p>
                        </div>
                        <a
                          href={dummyMeetLink}
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded-md bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0"
                          title="Meeting Link"
                        >
                          <Video size={12} />
                        </a>
                      </div>
                      <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex items-center gap-3 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={10} className="text-gray-400" />
                          {getDateLabel(b.startTime)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} className="text-gray-400" />
                          {format(new Date(b.startTime), 'h:mm a')} – {format(new Date(b.endTime), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2.5">
                    <Calendar size={18} className="text-gray-300" />
                  </div>
                  <p className="text-[12px] text-gray-400 font-medium">No confirmed sessions</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Column 3: Completed ─── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-white flex items-center gap-2">
              <CheckCircle2 size={12} className="text-emerald-600" />
              <h2 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider">Completed</h2>
              {completed.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-100">{completed.length}</span>
              )}
            </div>
            <div className="p-3">
              {completed.length > 0 ? (
                <div className="space-y-2">
                  {completed.map(b => (
                    <div key={b.id} className="rounded-lg border border-gray-100 p-3.5 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 text-[11px] font-bold flex-shrink-0">
                          {getInitials(b.student?.fullName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-gray-800 truncate">{b.student?.fullName}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <Hash size={8} />{b.student?.id?.slice(0, 8)}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200 flex-shrink-0 uppercase tracking-wider">
                          <CheckCircle2 size={8} /> Done
                        </span>
                      </div>
                      <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex items-center gap-3 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={10} className="text-gray-400" />
                          {format(new Date(b.startTime), 'MMM dd, yyyy')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} className="text-gray-400" />
                          {format(new Date(b.startTime), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-2.5">
                    <CheckCircle2 size={18} className="text-gray-300" />
                  </div>
                  <p className="text-[12px] text-gray-400 font-medium">No completed sessions</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AdminBookings;
