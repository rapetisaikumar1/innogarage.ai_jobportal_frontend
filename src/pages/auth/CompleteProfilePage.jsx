import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, User, GraduationCap, Briefcase, FileText, Mail, CheckCircle2, Phone, Linkedin, Target } from 'lucide-react';
import Logo from '../../components/Logo';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CompleteProfilePage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    jobRole: '',
    phone: '',
    linkedinProfile: '',
    education: '',
    experience: '',
    keySkills: '',
  });
  const [resume, setResume] = useState(null);

  // Redirect if no user (not logged in)
  if (!user) {
    navigate('/signup', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', form.fullName);
      formData.append('jobRole', form.jobRole);
      formData.append('phone', form.phone);
      formData.append('linkedinProfile', form.linkedinProfile);
      formData.append('education', form.education);
      formData.append('experience', form.experience);
      formData.append('keySkills', form.keySkills);
      if (resume) formData.append('resume', resume);

      const { data } = await api.post('/auth/complete-profile', formData);

      updateUser(data.user);
      toast.success('Profile completed! Welcome to INNOGARAGE.ai');
      navigate('/dashboard', { replace: true, state: { showSubscribe: true } });
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to save profile';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
          <Logo size="md" />
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center py-10 pt-24">
        <div className="w-full max-w-xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100/80 p-7 sm:p-9">
            {/* Header */}
            <div className="text-center mb-7">
              {user?.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-gray-100"
                  referrerPolicy="no-referrer"
                />
              )}
              {user?.avatarUrl && (
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-3">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700">Google account linked</span>
                </div>
              )}
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Complete your profile</h2>
              <p className="text-sm text-gray-500 mt-1.5">Just a few more details to personalize your career dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <User size={14} className="text-gray-400" />
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="John Doe"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <Mail size={14} className="text-gray-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl bg-gray-100/70 text-gray-500 cursor-not-allowed"
                  value={user?.email || ''}
                  disabled
                />
                <p className="text-xs text-gray-400 mt-1">Email from your account &#8212; can't be changed.</p>
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <Phone size={14} className="text-gray-400" />
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <Linkedin size={14} className="text-gray-400" />
                  LinkedIn Profile URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="https://linkedin.com/in/your-profile"
                  value={form.linkedinProfile}
                  onChange={(e) => setForm({ ...form, linkedinProfile: e.target.value })}
                  required
                />
              </div>

              {/* Education & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                    <GraduationCap size={14} className="text-gray-400" />
                    Education <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                    placeholder="B.S. Computer Science"
                    value={form.education}
                    onChange={(e) => setForm({ ...form, education: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                    <Briefcase size={14} className="text-gray-400" />
                    Experience <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                    placeholder="2 years in Software Dev"
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Job Role / Title */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <Target size={14} className="text-gray-400" />
                  Job Role You're Looking For <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="e.g. Frontend Developer, Data Analyst, UI/UX Designer"
                  value={form.jobRole}
                  onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">This is the main role used to find matching jobs for you.</p>
              </div>

              {/* Key Skills */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <Briefcase size={14} className="text-gray-400" />
                  Key Skills <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="React, Node.js, Python"
                  value={form.keySkills}
                  onChange={(e) => setForm({ ...form, keySkills: e.target.value })}
                  required
                />
              </div>

              {/* Resume */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <FileText size={14} className="text-gray-400" />
                  Resume (PDF) <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/50 text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all cursor-pointer"
                  onChange={(e) => setResume(e.target.files[0])}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all text-[15px] mt-2"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Complete & Go to Dashboard
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
