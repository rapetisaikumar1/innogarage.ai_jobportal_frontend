import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Linkedin, GraduationCap, Briefcase, Tag, FileText, Lock, MapPin, Target, Upload, Eye, X, CreditCard, Car, Plane } from 'lucide-react';

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
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

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

  const handleDocUpload = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoc(docType);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('docType', docType);
    try {
      const { data } = await api.put('/users/profile/document', formData);
      setProfile(prev => ({ ...prev, ...data }));
      toast.success(`${docType === 'drivingLicence' ? 'Driving Licence' : docType.charAt(0).toUpperCase() + docType.slice(1)} uploaded!`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-[18px] font-bold text-gray-900">Profile Settings</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Manage your account information and security</p>
      </div>

      {/* Registration Number */}
      {profile?.registrationNumber && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-[11px]">ID</div>
          <div>
            <p className="text-[10px] text-blue-600 font-medium">Registration Number</p>
            <p className="text-[15px] font-bold text-blue-800 tracking-wide">{profile.registrationNumber}</p>
          </div>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="flex gap-4 items-start">
        {/* Left Column — Basic Information */}
        <div className="flex-1 min-w-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Section Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <User size={15} className="text-gray-500" />
            <span className="text-[13px] font-bold text-gray-800">Basic Information</span>
          </div>

          {/* Avatar + Info */}
          <div className="px-5 pt-4 pb-3 flex items-center gap-3.5 border-b border-gray-50">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
              {profile?.fullName?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-gray-900">{profile?.fullName}</p>
              <p className="text-[11px] text-gray-400 truncate">{profile?.email}</p>
              <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-medium text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Student
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
            {/* Basic Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Full Name</label>
                <input type="text" className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-1">Email <Mail size={11} className="text-gray-400" /></label>
                <input type="email" className="w-full text-[13px] text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 cursor-not-allowed" value={profile?.email || ''} disabled />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Phone</label>
                <input type="tel" className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Role</label>
                <div className="w-full text-[13px] text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Student
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-1">
                  <Linkedin size={11} className="text-gray-400" /> LinkedIn Profile
                </label>
                <input type="url" className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all placeholder-gray-400" placeholder="https://linkedin.com/in/..." value={form.linkedinProfile} onChange={(e) => setForm({ ...form, linkedinProfile: e.target.value })} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-1">
                  <GraduationCap size={11} className="text-gray-400" /> Education
                </label>
                <input type="text" className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-1">
                <Briefcase size={11} className="text-gray-400" /> Experience
              </label>
              <textarea className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all resize-none" rows={2} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
            </div>

            {/* Job Search Fields */}
            <div className="border border-violet-200/80 bg-violet-50/40 rounded-lg p-4 space-y-3">
              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Job Search Info</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-1">
                    <Target size={11} className="text-gray-400" /> Job Role
                  </label>
                  <input type="text" className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all placeholder-gray-400" placeholder="e.g. Frontend Developer" value={form.jobRole} onChange={(e) => setForm({ ...form, jobRole: e.target.value })} />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-1">
                    <MapPin size={11} className="text-gray-400" /> Preferred Location
                  </label>
                  <input type="text" className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all placeholder-gray-400" placeholder="e.g. Hyderabad, Remote" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-1">
                  <Tag size={11} className="text-gray-400" /> Key Skills (comma separated)
                </label>
                <input type="text" className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all placeholder-gray-400" placeholder="e.g. React, Node.js, Python" value={form.keySkills} onChange={(e) => setForm({ ...form, keySkills: e.target.value })} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-1">
                  <FileText size={11} className="text-gray-400" /> Resume
                </label>
                {profile?.resumeUrl && (
                  <p className="text-[11px] text-gray-500 mb-1.5">Current: <a href={profile.resumeUrl} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">View Resume</a></p>
                )}
                <input type="file" accept=".pdf" className="w-full text-[12px] text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 border border-gray-200 rounded-lg py-1.5 px-2 cursor-pointer" onChange={handleResumeUpload} />
              </div>
            </div>

            <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-40" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Documents Section */}
          <div className="px-5 py-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-gray-500" />
              <span className="text-[13px] font-bold text-gray-800">Identity Documents</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'passport', label: 'Passport', icon: CreditCard, color: 'blue', url: profile?.passportUrl },
                { key: 'drivingLicence', label: 'Driving Licence', icon: Car, color: 'emerald', url: profile?.drivingLicenceUrl },
                { key: 'visa', label: 'Visa', icon: Plane, color: 'violet', url: profile?.visaUrl },
              ].map(doc => (
                <div key={doc.key} className={`border border-${doc.color}-200 bg-${doc.color}-50/30 rounded-lg p-3`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <doc.icon size={13} className={`text-${doc.color}-500`} />
                    <span className="text-[11px] font-semibold text-gray-700">{doc.label}</span>
                  </div>
                  {doc.url ? (
                    <div className="space-y-2">
                      <div className="relative group">
                        <img
                          src={doc.url}
                          alt={doc.label}
                          className="w-full h-24 object-cover rounded-md border border-gray-200 cursor-pointer"
                          onClick={() => setPreviewDoc({ url: doc.url, label: doc.label })}
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                          <Eye size={16} className="text-white" />
                        </div>
                      </div>
                      <label className="flex items-center justify-center gap-1 text-[10px] font-medium text-gray-500 hover:text-blue-600 cursor-pointer transition-colors">
                        <Upload size={10} /> Replace
                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={(e) => handleDocUpload(e, doc.key)} disabled={uploadingDoc === doc.key} />
                      </label>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center h-24 border-2 border-dashed border-${doc.color}-200 rounded-md cursor-pointer hover:border-${doc.color}-400 hover:bg-${doc.color}-50/50 transition-all ${uploadingDoc === doc.key ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploadingDoc === doc.key ? (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload size={16} className="text-gray-400 mb-1" />
                          <span className="text-[10px] text-gray-400">Upload {doc.label}</span>
                        </>
                      )}
                      <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={(e) => handleDocUpload(e, doc.key)} disabled={uploadingDoc === doc.key} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Change Password */}
        <div className="w-[320px] shrink-0 bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-4">
          {/* Section Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-gray-500" />
              <span className="text-[13px] font-bold text-gray-800">Change Password</span>
            </div>
            {!showPasswordSection && (
              <button
                onClick={() => setShowPasswordSection(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Update
              </button>
            )}
          </div>

          {showPasswordSection ? (
            <form onSubmit={handleChangePassword} className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Current Password</label>
                <input type="password" className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all" placeholder="Enter current password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">New Password</label>
                <input type="password" className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all" placeholder="Min 8 characters" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={8} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">Confirm Password</label>
                <input type="password" className="w-full text-[13px] text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 transition-all" placeholder="Re-enter new password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-40" disabled={changingPassword}>
                  {changingPassword ? 'Changing...' : 'Update Password'}
                </button>
                <button type="button" onClick={() => { setShowPasswordSection(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="px-4 py-2 text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="px-5 py-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center mx-auto mb-2">
                <Lock size={18} className="text-gray-300" />
              </div>
              <p className="text-[11px] text-gray-400">Click "Update" to change your password</p>
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="relative bg-white rounded-xl max-w-lg w-full p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[13px] font-bold text-gray-800">{previewDoc.label}</span>
              <button onClick={() => setPreviewDoc(null)} className="p-1 hover:bg-gray-100 rounded-md transition-colors"><X size={16} className="text-gray-500" /></button>
            </div>
            <img src={previewDoc.url} alt={previewDoc.label} className="w-full rounded-lg object-contain max-h-[70vh]" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
