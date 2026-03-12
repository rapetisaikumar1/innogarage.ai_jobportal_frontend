import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { UserPlus, Shield, ShieldOff, Search } from 'lucide-react';

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/admin/admins');
      setAdmins(res.data);
    } catch (error) {
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      toast.error('Fill required fields'); return;
    }
    setCreating(true);
    try {
      await api.post('/admin/admins', form);
      toast.success('Admin created successfully');
      setShowForm(false);
      setForm({ fullName: '', email: '', password: '', phone: '' });
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (adminId) => {
    try {
      const res = await api.patch(`/admin/admins/${adminId}/toggle-status`);
      toast.success(res.data.message);
      fetchAdmins();
    } catch (error) {
      toast.error('Failed to update admin status');
    }
  };

  const filtered = admins.filter(a =>
    a.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Admins</h1>
          <p className="text-gray-500 mt-1">Create and manage mentor accounts</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> New Admin
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-4">
          <h3 className="font-semibold text-gray-800">Create Admin / Mentor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create Admin'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search admins..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-500">No admins found</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl border">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-4 text-sm font-semibold text-gray-600">Name</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Email</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Phone</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Students</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm">
                        {admin.fullName?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-800">{admin.fullName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{admin.email}</td>
                  <td className="p-4 text-sm text-gray-600">{admin.phone || '—'}</td>
                  <td className="p-4"><span className="badge-blue">{admin._count?.assignedStudents || 0}</span></td>
                  <td className="p-4">
                    <span className={`badge-${admin.isActive ? 'green' : 'red'}`}>{admin.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => toggleStatus(admin.id)}
                      className={`flex items-center gap-1 text-sm font-medium ${admin.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>
                      {admin.isActive ? <><ShieldOff size={14} /> Deactivate</> : <><Shield size={14} /> Activate</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageAdmins;
