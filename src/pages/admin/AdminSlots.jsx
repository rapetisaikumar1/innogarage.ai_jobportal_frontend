import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Calendar, Plus, Trash2, Clock, ChevronDown, ChevronUp,
  Users, CheckCircle2, XCircle, AlertCircle, X, Video
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

const AdminSlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', startTime: '09:00', endTime: '18:00' });
  const [creating, setCreating] = useState(false);
  const [expandedDates, setExpandedDates] = useState({});
  const [filter, setFilter] = useState('all'); // all | booked | expired

  useEffect(() => { fetchSlots(); }, []);

  // Refresh every 60s so expired/booked slots update without page reload (paused when tab hidden)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchSlots();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await api.get('/mentoring/my-slots');
      setSlots(res.data);
    } catch (err) {
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  // Generate 30-min interval slots from a time range
  const generateSlots = (dateStr, startStr, endStr) => {
    const result = [];
    const start = new Date(`${dateStr}T${startStr}:00`);
    const end = new Date(`${dateStr}T${endStr}:00`);
    if (end <= start) return result;

    let current = new Date(start);
    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + 30 * 60 * 1000);
      if (slotEnd > end) break;
      result.push({ startTime: slotStart.toISOString(), endTime: slotEnd.toISOString() });
      current = slotEnd;
    }
    return result;
  };

  const previewSlots = useMemo(() => {
    if (!form.date || !form.startTime || !form.endTime) return [];
    return generateSlots(form.date, form.startTime, form.endTime);
  }, [form.date, form.startTime, form.endTime]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.endTime) {
      toast.error('Please fill all fields');
      return;
    }
    const slotsToCreate = generateSlots(form.date, form.startTime, form.endTime);
    if (slotsToCreate.length === 0) {
      toast.error('Invalid time range. End time must be after start time.');
      return;
    }
    // Check if any of the generated slots are in the past
    const now = new Date();
    const futureSlots = slotsToCreate.filter(s => new Date(s.startTime) > now);
    if (futureSlots.length === 0) {
      toast.error('All slots would be in the past. Please select a future time.');
      return;
    }

    setCreating(true);
    try {
      await api.post('/mentoring/slots', { slots: futureSlots });
      toast.success(`${futureSlots.length} slot${futureSlots.length > 1 ? 's' : ''} created successfully`);
      setShowForm(false);
      setForm({ date: '', startTime: '09:00', endTime: '18:00' });
      fetchSlots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create slots');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this slot?')) return;
    try {
      await api.delete(`/mentoring/slots/${id}`);
      toast.success('Slot deleted');
      fetchSlots();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete slot');
    }
  };

  const toggleDate = (dateKey) => {
    setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  // Categorize slots
  const categorized = useMemo(() => {
    const now = new Date();
    return slots.map(s => {
      const start = new Date(s.startTime);
      const expired = start <= now && !s.isBooked;
      const booked = s.isBooked;
      const pastBooked = booked && start <= now;
      const available = !expired && !booked && start > now;
      return { ...s, expired, booked, pastBooked, available };
    });
  }, [slots]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'booked': return categorized.filter(s => s.booked);
      case 'expired': return categorized.filter(s => s.expired);
      default: return categorized;
    }
  }, [categorized, filter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    [...filtered].sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).forEach(s => {
      const key = format(new Date(s.startTime), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [filtered]);

  const dateKeys = Object.keys(grouped).sort();

  // Auto-expand today and tomorrow
  const dateKeysStr = dateKeys.join(',');
  useEffect(() => {
    const auto = {};
    dateKeys.forEach(k => {
      const d = new Date(k + 'T00:00:00');
      if (isToday(d) || isTomorrow(d)) auto[k] = true;
    });
    setExpandedDates(prev => ({ ...auto, ...prev }));
  }, [dateKeysStr]);

  // Summary stats
  const stats = useMemo(() => ({
    total: categorized.length,
    available: categorized.filter(s => s.available).length,
    booked: categorized.filter(s => s.booked).length,
    expired: categorized.filter(s => s.expired).length,
  }), [categorized]);

  const getDateLabel = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEEE, MMM dd, yyyy');
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Time Slots</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Create and manage your mentoring availability</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'Create Slots'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-[13px] font-semibold text-gray-900">Create Time Slots</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Select a date and time range. 30-minute slots will be auto-generated.</p>
          </div>
          <form onSubmit={handleCreate} className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  required
                />
              </div>
            </div>

            {/* Preview */}
            {previewSlots.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-blue-800">
                    <Clock size={13} className="inline mr-1 -mt-0.5" />
                    {previewSlots.length} slot{previewSlots.length > 1 ? 's' : ''} will be created (30 min each)
                  </p>
                  <p className="text-[11px] text-blue-600">{form.startTime} — {form.endTime}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {previewSlots.map((s, i) => (
                    <span key={i} className="px-2 py-1 bg-white text-[11px] font-medium text-blue-700 rounded-md border border-blue-200">
                      {format(new Date(s.startTime), 'h:mm a')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <button
                type="submit"
                disabled={creating || previewSlots.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Create {previewSlots.length} Slot{previewSlots.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm({ date: '', startTime: '09:00', endTime: '18:00' }); }}
                className="px-4 py-2.5 text-[13px] font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-2.5">
        {[
          { label: 'Total Slots', value: stats.total, icon: <Calendar size={14} />, color: 'text-slate-600', bg: 'bg-slate-50', numColor: 'text-slate-700' },
          { label: 'Available', value: stats.available, icon: <Clock size={14} />, color: 'text-blue-500', bg: 'bg-blue-50', numColor: 'text-blue-600' },
          { label: 'Booked', value: stats.booked, icon: <Users size={14} />, color: 'text-emerald-500', bg: 'bg-emerald-50', numColor: 'text-emerald-600' },
          { label: 'Expired', value: stats.expired, icon: <AlertCircle size={14} />, color: 'text-gray-400', bg: 'bg-gray-50', numColor: 'text-gray-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 px-3.5 py-3 w-36">
            <div className={`w-7 h-7 rounded-md ${s.bg} flex items-center justify-center ${s.color} mb-2`}>{s.icon}</div>
            <p className={`text-xl font-bold ${s.numColor} leading-tight`}>{s.value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'booked', label: 'Booked' },
          { key: 'expired', label: 'Expired' },
          { key: 'all', label: 'All' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-md transition-all ${filter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Slots by Date */}
      {dateKeys.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
          <Clock size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {filter === 'upcoming' ? 'No upcoming slots' : filter === 'booked' ? 'No booked slots' : filter === 'expired' ? 'No expired slots' : 'No slots yet'}
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            {filter === 'upcoming' ? 'Create time slots to get started' : 'Slots will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dateKeys.map(dateKey => {
            const dateSlots = grouped[dateKey];
            const expanded = expandedDates[dateKey] !== false;
            const bookedCount = dateSlots.filter(s => s.booked).length;
            const availableCount = dateSlots.filter(s => s.available).length;
            const expiredCount = dateSlots.filter(s => s.expired).length;
            const dateLabel = getDateLabel(dateKey);
            const todayOrTomorrow = isToday(new Date(dateKey + 'T00:00:00')) || isTomorrow(new Date(dateKey + 'T00:00:00'));

            return (
              <div key={dateKey} className={`bg-white rounded-xl border overflow-hidden ${todayOrTomorrow ? 'border-blue-200 ring-1 ring-blue-50' : 'border-gray-200'}`}>
                {/* Date Header */}
                <button
                  onClick={() => toggleDate(dateKey)}
                  className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${todayOrTomorrow ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}>
                      <Calendar size={16} />
                    </div>
                    <div className="text-left">
                      <p className={`text-[13px] font-semibold ${todayOrTomorrow ? 'text-blue-900' : 'text-gray-900'}`}>{dateLabel}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-500">{dateSlots.length} slot{dateSlots.length > 1 ? 's' : ''}</span>
                        {availableCount > 0 && <span className="text-[11px] text-blue-600 font-medium">{availableCount} available</span>}
                        {bookedCount > 0 && <span className="text-[11px] text-emerald-600 font-medium">{bookedCount} booked</span>}
                        {expiredCount > 0 && <span className="text-[11px] text-gray-400">{expiredCount} expired</span>}
                      </div>
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </button>

                {expanded && (
                  <div className="px-5 pb-4 pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {dateSlots.map(slot => {
                        const startF = format(new Date(slot.startTime), 'h:mm a');
                        const endF = format(new Date(slot.endTime), 'h:mm a');

                        // Expired
                        if (slot.expired) {
                          return (
                            <div key={slot.id} className="rounded-lg border border-gray-100 bg-white p-3 opacity-40">
                              <p className="text-xs font-semibold text-gray-600">{startF}</p>
                              <p className="text-[11px] text-gray-400">to {endF}</p>
                              <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                                <XCircle size={10} /> Expired
                              </span>
                            </div>
                          );
                        }

                        // Booked - PENDING
                        if (slot.booked && slot.booking?.status === 'PENDING') {
                          return (
                            <div key={slot.id} className="rounded-lg border border-gray-200 bg-white p-3">
                              <p className="text-xs font-semibold text-gray-800">{startF}</p>
                              <p className="text-[11px] text-gray-400">to {endF}</p>
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                                  <AlertCircle size={9} /> Pending
                                </span>
                                {slot.booking?.student?.fullName && (
                                  <p className="text-[10px] text-gray-500 mt-1 truncate" title={slot.booking.student.fullName}>
                                    {slot.booking.student.fullName}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Booked - CONFIRMED, COMPLETED, or CANCELLED
                        if (slot.booked) {
                          const isConfirmed = slot.booking?.status === 'CONFIRMED';
                          const isCancelled = slot.booking?.status === 'CANCELLED';
                          const statusLabel = isCancelled ? 'Cancelled' : isConfirmed ? 'Confirmed' : 'Completed';
                          const statusClass = isCancelled
                            ? 'text-red-500 bg-red-50'
                            : isConfirmed ? 'text-emerald-600 bg-emerald-50'
                            : 'text-blue-600 bg-blue-50';
                          return (
                            <div key={slot.id} className={`rounded-lg border border-gray-200 bg-white p-3 ${slot.pastBooked ? 'opacity-40' : ''}`}>
                              <p className="text-xs font-semibold text-gray-800">{startF}</p>
                              <p className="text-[11px] text-gray-400">to {endF}</p>
                              <div className="mt-2">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusClass}`}>
                                  {isCancelled ? <XCircle size={9} /> : <CheckCircle2 size={9} />}
                                  {statusLabel}
                                </span>
                                {slot.booking?.student?.fullName && (
                                  <p className="text-[10px] text-gray-500 mt-1 truncate" title={slot.booking.student.fullName}>
                                    {slot.booking.student.fullName}
                                  </p>
                                )}
                                {isConfirmed && slot.booking?.meetLink && !slot.pastBooked && (
                                  <a
                                    href={slot.booking.meetLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-600 text-white text-[10px] font-semibold hover:bg-green-700 transition-colors"
                                  >
                                    <Video size={9} /> Join
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Available
                        return (
                          <div key={slot.id} className="group relative rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 hover:shadow-sm transition-all">
                            <p className="text-xs font-semibold text-gray-800">{startF}</p>
                            <p className="text-[11px] text-gray-400">to {endF}</p>
                            <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                              <Clock size={9} /> Available
                            </span>
                            <button
                              onClick={() => handleDelete(slot.id)}
                              className="absolute top-2 right-2 p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete slot"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSlots;
