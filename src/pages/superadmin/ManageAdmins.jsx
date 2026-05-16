import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { UserPlus, Search, Info, Mail, Phone, Users, Calendar, Shield, ShieldOff, X, PencilLine } from 'lucide-react';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editAdminId, setEditAdminId] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    try {
      const res = await api.get('/admin/admins');
      setAdmins(res.data);
      if (res.data.length === 0) {
        setSelectedAdmin(null);
        return;
      }

      if (selectedAdmin) {
        const refreshedAdmin = res.data.find((admin) => admin.id === selectedAdmin.id);
        setSelectedAdmin(refreshedAdmin || res.data[0]);
      } else {
        setSelectedAdmin(res.data[0]);
      }
    } catch (error) {
      toast.error('Failed to load mentors');
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
      toast.success('Mentor created successfully');
      setShowForm(false);
      setForm({ fullName: '', email: '', password: '', phone: '' });
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create mentor');
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (adminId) => {
    try {
      const res = await api.patch(`/admin/admins/${adminId}/toggle-status`);
      toast.success(res.data.message);
      fetchAdmins();
      if (selectedAdmin?.id === adminId) {
        setSelectedAdmin(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
      }
    } catch (error) {
      toast.error('Failed to update mentor status');
    }
  };

  const openEditModal = (admin) => {
    setEditAdminId(admin.id);
    setEditForm({
      fullName: admin.fullName || '',
      email: admin.email || '',
      phone: admin.phone || '',
      password: '',
    });
  };

  const closeEditModal = () => {
    if (updating) return;
    setEditAdminId(null);
    setEditForm({ fullName: '', email: '', password: '', phone: '' });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editAdminId) return;
    if (!editForm.fullName || !editForm.email) {
      toast.error('Fill required fields');
      return;
    }

    setUpdating(true);
    try {
      const payload = {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
      };

      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await api.patch(`/admin/admins/${editAdminId}`, payload);
      toast.success('Mentor updated successfully');
      setAdmins((prev) => prev.map((admin) => (admin.id === editAdminId ? { ...admin, ...res.data } : admin)));
      if (selectedAdmin?.id === editAdminId) {
        setSelectedAdmin((prev) => (prev ? { ...prev, ...res.data } : prev));
      }
      closeEditModal();
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update mentor');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    if (!query) return admins;
    return admins.filter(a =>
      a.fullName?.toLowerCase().includes(query) ||
      a.email?.toLowerCase().includes(query)
    );
  }, [admins, debouncedSearch]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Manage Mentors</h1>
          <p className="text-gray-500 text-xs mt-0.5">Create and manage mentor accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium">{filtered.length} total</span>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus size={14} /> New Mentor
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Create Mentor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="btn-primary text-sm">{creating ? 'Creating...' : 'Create Mentor'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      {editAdminId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={handleUpdate} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Edit Mentor</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update mentor details and credentials</p>
              </div>
              <button type="button" onClick={closeEditModal} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="input-field text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="input-field text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="input-field text-sm" placeholder="Leave blank to keep current password" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 bg-gray-50/60">
              <button type="button" onClick={closeEditModal} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={updating} className="btn-primary text-sm">{updating ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Split Screen */}
      <div className="flex gap-4" style={{ minHeight: '420px' }}>
        {/* Left Panel — Admin List */}
        <div className={`${selectedAdmin ? 'w-1/2' : 'w-full'} transition-all duration-300 flex flex-col`}>
          {/* Search */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search admins..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-colors" />
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-gray-100">
              <p className="text-gray-400 text-sm">No mentors found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex-1">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Students</th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((admin) => (
                    <tr key={admin.id} className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${selectedAdmin?.id === admin.id ? 'bg-primary-50/40' : ''}`}
                      onClick={() => setSelectedAdmin(admin)}>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-gray-800 text-[13px]">{admin.fullName}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                          {admin._count?.assignedStudents || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStatus(admin.id); }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                            admin.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600'
                              : 'bg-red-50 text-red-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                          title={admin.isActive ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${admin.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          {admin.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(admin); }}
                            className="p-1.5 rounded-lg text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                            title="Edit admin"
                          >
                            <PencilLine size={15} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedAdmin(admin); }}
                            className={`p-1.5 rounded-lg transition-colors ${selectedAdmin?.id === admin.id ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'}`}
                            title="View details"
                          >
                            <Info size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Panel — Admin Details */}
        {selectedAdmin && (
          <div className="w-1/2 bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right">
            {/* Detail Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div>
                <h3 className="text-sm font-bold text-gray-800">{selectedAdmin.fullName}</h3>
                <span className="text-[11px] text-gray-400">Mentor</span>
              </div>
              <button onClick={() => setSelectedAdmin(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account Status</span>
                <button
                  onClick={() => toggleStatus(selectedAdmin.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedAdmin.isActive
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600'
                      : 'bg-red-50 text-red-600 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                  title={selectedAdmin.isActive ? 'Click to deactivate' : 'Click to activate'}
                >
                  {selectedAdmin.isActive ? <Shield size={12} /> : <ShieldOff size={12} />}
                  {selectedAdmin.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Info Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Email</p>
                    <p className="text-[13px] text-gray-800 font-medium">{selectedAdmin.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Phone size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Phone</p>
                    <p className="text-[13px] text-gray-800 font-medium">{selectedAdmin.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users size={14} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Assigned Students</p>
                    <p className="text-[13px] text-gray-800 font-medium">{selectedAdmin._count?.assignedStudents || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Calendar size={14} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Joined</p>
                    <p className="text-[13px] text-gray-800 font-medium">{selectedAdmin.createdAt ? new Date(selectedAdmin.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2.5">Quick Actions</p>
                <button
                  onClick={() => openEditModal(selectedAdmin)}
                  className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                >
                  <PencilLine size={13} /> Edit Mentor
                </button>
                <button
                  onClick={() => toggleStatus(selectedAdmin.id)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedAdmin.isActive
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  {selectedAdmin.isActive ? <><ShieldOff size={13} /> Deactivate Mentor</> : <><Shield size={13} /> Activate Mentor</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageAdmins;
