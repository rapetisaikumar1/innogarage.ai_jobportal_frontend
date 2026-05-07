import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, User, GraduationCap, Briefcase, FileText, Mail, CheckCircle2, Phone, Linkedin, Target, ChevronDown, MapPin } from 'lucide-react';
import Logo from '../../components/Logo';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Country codes list (ISO 3166-1 + dialing codes)
const COUNTRY_CODES = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { code: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
];

const PREFERRED_LOCATIONS = [
  { value: 'USA', label: '🇺🇸 United States' },
  { value: 'Canada', label: '🇨🇦 Canada' },
  { value: 'India', label: '🇮🇳 India' },
];

const EXPERIENCE_OPTIONS = [
  { value: '0-1 years', label: 'Less than 1 year' },
  { value: '1-2 years', label: '1 – 2 years' },
  { value: '2-3 years', label: '2 – 3 years' },
  { value: '3-5 years', label: '3 – 5 years' },
  { value: '5-7 years', label: '5 – 7 years' },
  { value: '7-10 years', label: '7 – 10 years' },
  { value: '10+ years', label: '10+ years' },
];

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
    location: '',
  });
  const [resume, setResume] = useState(null);
  const [countryCode, setCountryCode] = useState('US');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [linkedinError, setLinkedinError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const selectedCountry = useMemo(() => COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0], [countryCode]);

  const validateLinkedin = (url) => {
    if (!url) { setLinkedinError(''); return true; }
    const valid = /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w\-%.]+\/?$/.test(url.trim());
    setLinkedinError(valid ? '' : 'Must be a valid LinkedIn profile URL (e.g. https://www.linkedin.com/in/your-name)');
    return valid;
  };

  const validatePhone = (num) => {
    if (!num) { setPhoneError(''); return true; }
    const digits = num.replace(/[\s\-().]/g, '');
    const valid = /^\d{6,15}$/.test(digits);
    setPhoneError(valid ? '' : 'Enter a valid phone number (6-15 digits)');
    return valid;
  };

  // Redirect if no user (not logged in)
  if (!user) {
    navigate('/signup', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateLinkedin(form.linkedinProfile)) { toast.error('Please enter a valid LinkedIn URL'); return; }
    if (!validatePhone(phoneNumber)) { toast.error('Please enter a valid phone number'); return; }

    const fullPhone = selectedCountry.dial + phoneNumber.replace(/[\s\-().]/g, '');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', form.fullName);
      formData.append('jobRole', form.jobRole);
      formData.append('phone', fullPhone);
      formData.append('linkedinProfile', form.linkedinProfile);
      formData.append('education', form.education);
      formData.append('experience', form.experience);
      formData.append('keySkills', form.keySkills);
      if (form.location) formData.append('location', form.location);
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
                  className="w-full px-3.5 py-2.5 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
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
                  className="w-full px-3.5 py-2.5 text-base border border-gray-200 rounded-xl bg-gray-100/70 text-gray-500 cursor-not-allowed"
                  value={user?.email || ''}
                  disabled
                />
                <p className="text-xs text-gray-400 mt-1">Email from your account &#8212; can't be changed.</p>
              </div>

              {/* Phone with Country Code */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <Phone size={14} className="text-gray-400" />
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="appearance-none w-[130px] pl-3 pr-7 py-2.5 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all cursor-pointer"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <input
                    type="tel"
                    className={`flex-1 px-3.5 py-2.5 text-base border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all ${phoneError ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder="9876543210"
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value); validatePhone(e.target.value); }}
                    required
                  />
                </div>
                {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                <p className="text-xs text-gray-400 mt-1">Stored as {selectedCountry.dial}{phoneNumber.replace(/[\s\-().]/g, '') || 'XXXXXXXXXX'}</p>
              </div>

              {/* LinkedIn */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <Linkedin size={14} className="text-gray-400" />
                  LinkedIn Profile URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  className={`w-full px-3.5 py-2.5 text-base border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all ${linkedinError ? 'border-red-300' : 'border-gray-200'}`}
                  placeholder="https://www.linkedin.com/in/your-profile"
                  value={form.linkedinProfile}
                  onChange={(e) => { setForm({ ...form, linkedinProfile: e.target.value }); validateLinkedin(e.target.value); }}
                  required
                />
                {linkedinError && <p className="text-xs text-red-500 mt-1">{linkedinError}</p>}
              </div>

              {/* Preferred Location */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <MapPin size={14} className="text-gray-400" />
                  Preferred Location <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none px-3.5 py-2.5 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all cursor-pointer"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                  >
                    <option value="">Select a country…</option>
                    {PREFERRED_LOCATIONS.map(loc => (
                      <option key={loc.value} value={loc.value}>{loc.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
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
                    className="w-full px-3.5 py-2.5 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                    placeholder="B.S. Computer Science"
                    value={form.education}
                    onChange={(e) => setForm({ ...form, education: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                    <Briefcase size={14} className="text-gray-400" />
                    Years of Experience <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className="w-full appearance-none px-3.5 py-2.5 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all cursor-pointer"
                      value={form.experience}
                      onChange={(e) => setForm({ ...form, experience: e.target.value })}
                      required
                    >
                      <option value="">Select…</option>
                      {EXPERIENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Job Role / Title */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <Target size={14} className="text-gray-400" />
                  Job Role <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
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
                  Key Skills (comma separated) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
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
                  Resume <span className="text-gray-400 font-normal text-xs">(PDF, DOC, DOCX)</span> <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  required
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/50 text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all cursor-pointer"
                  onChange={(e) => setResume(e.target.files[0])}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all text-base mt-2"
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
