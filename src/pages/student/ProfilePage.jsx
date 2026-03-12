import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Linkedin, GraduationCap, Briefcase, Tag, FileText, Lock, MapPin, Target } from 'lucide-react';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    linkedinProfile: '',
    education: '',
    experience: '',
    keySkills: '',
    jobRole: '',
    location: '',
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/users/profile');
        setProfile(data);
        setForm({
          fullName: data.fullName || '',
          phone: data.phone || '',
          linkedinProfile: data.linkedinProfile || '',
          education: data.education || '',
          experience: data.experience || '',
          keySkills: (data.keySkills || []).join(', '),
          jobRole: data.jobRole || '',
          location: data.location || '',
        });
      } catch (error) {
        console.error('Failed to load profile:', error);
        toast.error('Failed to load profile data');
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
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('resume', file);
    try {
      const { data } = await api.put('/users/profile', formData);
      setProfile(data);
      toast.success('Resume uploaded!');
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to upload resume');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800">Profile</h1>

      {profile?.registrationNumber && (
        <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">ID</div>
            <div>
              <p className="text-xs text-primary-600 font-medium">Registration Number</p>
              <p className="text-lg font-bold text-primary-800 tracking-wide">{profile.registrationNumber}</p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <User size={14} /> Full Name
              </label>
              <input type="text" className="input-field" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Mail size={14} /> Email
              </label>
              <input type="email" className="input-field bg-gray-50" value={profile?.email || ''} disabled />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Phone size={14} /> Phone
              </label>
              <input type="tel" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Linkedin size={14} /> LinkedIn Profile
              </label>
              <input type="url" className="input-field" placeholder="https://linkedin.com/in/..." value={form.linkedinProfile} onChange={(e) => setForm({ ...form, linkedinProfile: e.target.value })} />
            </div>
          </div>

          {/* Job Search Fields — used by "My Jobs" automation */}
          <div className="border border-violet-200 bg-violet-50/50 rounded-lg p-4 space-y-4">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Job Search Info (used by My Jobs)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Target size={14} /> Job Role
                </label>
                <input type="text" className="input-field" placeholder="e.g. Frontend Developer" value={form.jobRole} onChange={(e) => setForm({ ...form, jobRole: e.target.value })} />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <MapPin size={14} /> Preferred Location
                </label>
                <input type="text" className="input-field" placeholder="e.g. Hyderabad, Remote" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Tag size={14} /> Key Skills / Keywords (comma separated)
              </label>
              <input type="text" className="input-field" placeholder="e.g. React, Node.js, Python" value={form.keySkills} onChange={(e) => setForm({ ...form, keySkills: e.target.value })} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <FileText size={14} /> Resume
              </label>
              {profile?.resumeUrl && (
                <p className="text-sm text-gray-500 mb-2">Current: <a href={profile.resumeUrl} className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">View Resume</a></p>
              )}
              <input type="file" accept=".pdf,.doc,.docx" className="input-field text-sm" onChange={handleResumeUpload} />
            </div>
          </div>

          {/* Additional Profile */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <GraduationCap size={14} /> Education
            </label>
            <input type="text" className="input-field" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Briefcase size={14} /> Experience
            </label>
            <textarea className="input-field" rows={3} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password Change */}
      <div className="card">
        <button
          onClick={() => setShowPasswordSection(!showPasswordSection)}
          className="flex items-center gap-2 text-gray-700 font-semibold"
        >
          <Lock size={18} />
          Change Password
        </button>

        {showPasswordSection && (
          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            <input type="password" className="input-field" placeholder="Current Password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
            <input type="password" className="input-field" placeholder="New Password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={8} />
            <input type="password" className="input-field" placeholder="Confirm New Password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
            <button type="submit" className="btn-primary" disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
