import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, Shield, UserPlus, Eye, EyeOff, Check } from 'lucide-react';

const SuperAdminProfile = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ fullName: '', phone: '' });

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '', password: '' });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/users/profile');
        setProfile(data);
        setForm({ fullName: data.fullName || '', phone: data.phone || '' });
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', form);
      setProfile(data);
      updateUser({ ...user, fullName: data.fullName });
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast.error('Passwords do not match');
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCreateSuperAdmin = async (e) => {
    e.preventDefault();
    if (!adminForm.fullName || !adminForm.email || !adminForm.password) return toast.error('All fields are required');
    if (adminForm.password.length < 8) return toast.error('Password must be at least 8 characters');
    setCreatingAdmin(true);
    try {
      await api.post('/admin/super-admins', adminForm);
      toast.success('Super Admin created successfully!');
      setAdminForm({ fullName: '', email: '', password: '' });
      setShowCreateAdmin(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create super admin');
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account information and security</p>
      </div>

      {/* Profile Info Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <User size={14} className="text-blue-600" />
            </div>
            Basic Information
          </h2>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  value={profile?.email || ''}
                  disabled
                />
                <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50">
                <Shield size={14} className="text-indigo-500" />
                <span className="text-sm font-medium text-gray-700">Super Admin</span>
              </div>
            </div>
          </div>
          <div className="pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowPasswordSection(!showPasswordSection)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Lock size={14} className="text-amber-600" />
            </div>
            <span className="text-sm font-bold text-gray-900">Change Password</span>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${showPasswordSection ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>
            {showPasswordSection ? 'Close' : 'Update'}
          </span>
        </button>

        {showPasswordSection && (
          <form onSubmit={handleChangePassword} className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-5">
            {[
              { key: 'current', label: 'Current Password', field: 'currentPassword' },
              { key: 'new', label: 'New Password', field: 'newPassword' },
              { key: 'confirm', label: 'Confirm New Password', field: 'confirmPassword' },
            ].map(({ key, label, field }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <div className="relative">
                  <input
                    type={showPasswords[key] ? 'text' : 'password'}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all pr-10"
                    value={passwordForm[field]}
                    onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
                    required
                    minLength={field === 'currentPassword' ? undefined : 8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, [key]: !showPasswords[key] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-1">
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Create Super Admin Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowCreateAdmin(!showCreateAdmin)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <UserPlus size={14} className="text-emerald-600" />
            </div>
            <span className="text-sm font-bold text-gray-900">Create New Super Admin</span>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${showCreateAdmin ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {showCreateAdmin ? 'Close' : 'Create'}
          </span>
        </button>

        {showCreateAdmin && (
          <form onSubmit={handleCreateSuperAdmin} className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                value={adminForm.fullName}
                onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                placeholder="Enter email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all pr-10"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showAdminPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="pt-1">
              <button
                type="submit"
                disabled={creatingAdmin}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <UserPlus size={15} />
                {creatingAdmin ? 'Creating...' : 'Create Super Admin'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SuperAdminProfile;
