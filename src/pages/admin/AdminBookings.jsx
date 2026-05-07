import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Video, Clock, CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

const AdminBookings = () => {
  const [rawSlots, setRawSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [meetLink, setMeetLink] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState('pending');

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

  const bookings = useMemo(() => {
    return rawSlots
      .filter(slot => slot.booking)
      .map(slot => ({
        id: slot.booking.id,
        status: slot.booking.status,
        meetLink: slot.booking.meetLink,
        notes: slot.booking.notes,
        student: slot.booking.student,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotId: slot.id,
      }))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [rawSlots]);

  const now = useMemo(() => new Date(), [rawSlots]);
  const pending = useMemo(() => bookings.filter(b => b.status === 'PENDING' && new Date(b.startTime) > now), [bookings, now]);
  const confirmed = useMemo(() => bookings.filter(b => b.status === 'CONFIRMED' && new Date(b.startTime) > now), [bookings, now]);
  const completed = useMemo(() => {
    return bookings.filter(b => b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && new Date(b.startTime) <= now))
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [bookings, now]);
  const cancelled = useMemo(() => bookings.filter(b => b.status === 'CANCELLED').sort((a, b) => new Date(b.startTime) - new Date(a.startTime)), [bookings]);

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

  const handleConfirm = async () => {
    if (!meetLink.trim()) {
      toast.error('Please paste the Google Meet link');
      return;
    }
    if (!meetLink.trim().startsWith('https://meet.google.com/')) {
      toast.error('Please enter a valid Google Meet link');
      return;
    }
    setProcessing(true);
    try {
      await api.patch(`/mentoring/bookings/${confirmModal.id}/confirm`, { meetLink: meetLink.trim() });
      toast.success('Session confirmed! Student has been notified.');
      setConfirmModal(null);
      setMeetLink('');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    setProcessing(true);
    try {
      await api.patch(`/mentoring/bookings/${cancelModal.id}/cancel`, { reason: cancelReason.trim() });
      toast.success('Session cancelled. Student has been notified.');
      setCancelModal(null);
      setCancelReason('');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabItems = [
    { key: 'pending', label: 'Pending', count: pending.length, dot: 'bg-amber-500' },
    { key: 'confirmed', label: 'Confirmed', count: confirmed.length, dot: 'bg-blue-500' },
    { key: 'completed', label: 'Completed', count: completed.length, dot: 'bg-emerald-500' },
    { key: 'cancelled', label: 'Cancelled', count: cancelled.length, dot: 'bg-red-400' },
  ];

  const currentList = tab === 'pending' ? pending : tab === 'confirmed' ? confirmed : tab === 'completed' ? completed : cancelled;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bookings</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Review, confirm, or cancel mentoring session requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending', value: pending.length },
          { label: 'Confirmed', value: confirmed.length },
          { label: 'Completed', value: completed.length },
          { label: 'Cancelled', value: cancelled.length },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-[12px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabItems.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold rounded-md transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${t.dot}`}></div>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {currentList.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
          <Calendar size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-medium text-gray-500">No {tab} bookings</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {currentList.map((b, idx) => {
            const isPast = new Date(b.startTime) <= now;
            return (
              <div key={b.id} className={`flex items-center justify-between px-4 py-3 gap-4 hover:bg-gray-50/60 transition-colors ${idx < currentList.length - 1 ? 'border-b border-gray-100' : ''} ${isPast ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    b.status === 'PENDING' ? 'bg-gray-100 text-gray-600' :
                    b.status === 'CONFIRMED' ? 'bg-gray-800 text-white' :
                    b.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getInitials(b.student?.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{b.student?.fullName}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 flex-wrap">
                      <span className="flex items-center gap-0.5"><Calendar size={10} /> {getDateLabel(b.startTime)}</span>
                      <span className="flex items-center gap-0.5"><Clock size={10} /> {format(new Date(b.startTime), 'h:mm a')} – {format(new Date(b.endTime), 'h:mm a')}</span>
                      {b.student?.email && <span className="hidden md:inline truncate max-w-[180px]">{b.student.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    b.status === 'PENDING' ? 'bg-gray-100 text-gray-500' :
                    b.status === 'CONFIRMED' ? 'bg-gray-800 text-white' :
                    b.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {b.status}
                  </span>

                  {b.status === 'PENDING' && !isPast && (
                    <>
                      <button
                        onClick={() => { setConfirmModal(b); setMeetLink(''); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-semibold hover:bg-gray-700 transition-colors"
                      >
                        <CheckCircle2 size={12} /> Confirm
                      </button>
                      <button
                        onClick={() => { setCancelModal(b); setCancelReason(''); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-500 text-[11px] font-semibold hover:bg-gray-100 transition-colors"
                      >
                        <XCircle size={12} /> Decline
                      </button>
                    </>
                  )}

                  {b.status === 'CONFIRMED' && !isPast && (
                    <>
                      {b.meetLink && (
                        <a
                          href={b.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-semibold hover:bg-gray-700 transition-colors"
                        >
                          <Video size={12} /> Join Meet
                        </a>
                      )}
                      <button
                        onClick={() => { setCancelModal(b); setCancelReason(''); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-500 text-[11px] font-semibold hover:bg-gray-100 transition-colors"
                      >
                        <XCircle size={12} /> Cancel
                      </button>
                    </>
                  )}

                  {b.status === 'CANCELLED' && b.notes && (
                    <span className="text-[10px] text-gray-400 max-w-[160px] truncate hidden md:inline" title={b.notes}>{b.notes}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-gray-900">Confirm Session</h3>
              <button onClick={() => setConfirmModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[12px] font-semibold text-gray-700">{confirmModal.student?.fullName}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {getDateLabel(confirmModal.startTime)} &middot; {format(new Date(confirmModal.startTime), 'h:mm a')} - {format(new Date(confirmModal.endTime), 'h:mm a')}
                </p>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Google Meet Link *</label>
                <input
                  type="url"
                  value={meetLink}
                  onChange={e => setMeetLink(e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Create a meeting at{' '}
                  <a href="https://meet.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                    meet.google.com
                  </a>{' '}
                  and paste the link here
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleConfirm}
                  disabled={processing}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {processing ? 'Confirming...' : (<><CheckCircle2 size={14} /> Confirm & Notify Student</>)}
                </button>
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2.5 text-[13px] font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-red-600">Cancel Session</h3>
              <button onClick={() => setCancelModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-[12px] font-semibold text-gray-700">{cancelModal.student?.fullName}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {getDateLabel(cancelModal.startTime)} &middot; {format(new Date(cancelModal.startTime), 'h:mm a')} - {format(new Date(cancelModal.endTime), 'h:mm a')}
                </p>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Reason (optional)</label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Urgent meeting, schedule conflict..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 text-white text-[13px] font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {processing ? 'Cancelling...' : (<><XCircle size={14} /> Cancel & Notify Student</>)}
                </button>
                <button
                  onClick={() => setCancelModal(null)}
                  className="px-4 py-2.5 text-[13px] font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
