import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Calendar, Plus, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';

const AdminSlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', startTime: '09:00', endTime: '10:00' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchSlots(); }, []);

  const fetchSlots = async () => {
    try {
      const res = await api.get('/mentoring/my-slots');
      setSlots(res.data);
    } catch (error) {
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.endTime) {
      toast.error('Fill all fields'); return;
    }
    setCreating(true);
    try {
      const startTime = new Date(`${form.date}T${form.startTime}:00`);
      const endTime = new Date(`${form.date}T${form.endTime}:00`);
      if (endTime <= startTime) { toast.error('End time must be after start'); setCreating(false); return; }
      await api.post('/mentoring/slots', { slots: [{ startTime: startTime.toISOString(), endTime: endTime.toISOString() }] });
      toast.success('Slot created');
      setShowForm(false);
      setForm({ date: '', startTime: '09:00', endTime: '10:00' });
      fetchSlots();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create slot');
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
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete slot');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const upcoming = slots.filter(s => new Date(s.startTime) > new Date()).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const past = slots.filter(s => new Date(s.startTime) <= new Date()).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mentoring Slots</h1>
          <p className="text-gray-500 mt-1">Create and manage your availability</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Slot
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="input-field" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="btn-primary flex-1">{creating ? 'Creating...' : 'Create'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Upcoming Slots */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><Calendar size={18} /> Upcoming Slots ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <div className="card text-center py-8">
            <Clock size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No upcoming slots. Create one to start!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((slot) => (
              <div key={slot.id} className={`card border-l-4 ${slot.isBooked ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{format(new Date(slot.startTime), 'MMM dd, yyyy')}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(slot.startTime), 'hh:mm a')} &mdash; {format(new Date(slot.endTime), 'hh:mm a')}
                    </p>
                  </div>
                  {!slot.isBooked && (
                    <button onClick={() => handleDelete(slot.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  )}
                </div>
                <div className="mt-3">
                  {slot.isBooked ? (
                    <div className="bg-green-50 text-green-700 rounded-lg p-2 text-sm">
                      <p className="font-medium">Booked by: {slot.booking?.student?.fullName}</p>
                      {slot.booking?.meetLink && (
                        <a href={slot.booking.meetLink} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-1 block">Join Google Meet</a>
                      )}
                    </div>
                  ) : (
                    <span className="badge-blue">Available</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Slots */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Past Slots ({past.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.slice(0, 6).map((slot) => (
              <div key={slot.id} className="card opacity-60">
                <p className="font-medium text-gray-700">{format(new Date(slot.startTime), 'MMM dd, yyyy')}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(slot.startTime), 'hh:mm a')} &mdash; {format(new Date(slot.endTime), 'hh:mm a')}
                </p>
                <span className={`mt-2 inline-block text-xs ${slot.isBooked ? 'badge-green' : 'badge-yellow'}`}>{slot.isBooked ? 'Completed' : 'Unused'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSlots;
