import { useState, useMemo, useRef, useEffect } from 'react';
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

// Popular cities for autosuggest
const CITIES = [
  'New York, NY','Los Angeles, CA','Chicago, IL','Houston, TX','Phoenix, AZ','Philadelphia, PA','San Antonio, TX','San Diego, CA','Dallas, TX','San Jose, CA','Austin, TX','Jacksonville, FL','Fort Worth, TX','Columbus, OH','Charlotte, NC','Indianapolis, IN','San Francisco, CA','Seattle, WA','Denver, CO','Washington, DC','Nashville, TN','Oklahoma City, OK','El Paso, TX','Boston, MA','Portland, OR','Las Vegas, NV','Memphis, TN','Louisville, KY','Baltimore, MD','Milwaukee, WI','Albuquerque, NM','Tucson, AZ','Fresno, CA','Mesa, AZ','Sacramento, CA','Atlanta, GA','Kansas City, MO','Colorado Springs, CO','Omaha, NE','Raleigh, NC','Miami, FL','Minneapolis, MN','Tampa, FL','New Orleans, LA','Cleveland, OH','Orlando, FL','Pittsburgh, PA','Cincinnati, OH','St. Louis, MO','Salt Lake City, UT',
  'London, UK','Manchester, UK','Birmingham, UK','Edinburgh, UK','Glasgow, UK',
  'Toronto, Canada','Vancouver, Canada','Montreal, Canada','Calgary, Canada','Ottawa, Canada',
  'Mumbai, India','Bangalore, India','Delhi, India','Hyderabad, India','Chennai, India','Pune, India','Kolkata, India','Ahmedabad, India','Noida, India','Gurgaon, India','Jaipur, India',
  'Sydney, Australia','Melbourne, Australia','Brisbane, Australia','Perth, Australia',
  'Berlin, Germany','Munich, Germany','Frankfurt, Germany','Hamburg, Germany',
  'Paris, France','Lyon, France','Toulouse, France',
  'Singapore','Dubai, UAE','Abu Dhabi, UAE',
  'Tokyo, Japan','Osaka, Japan',
  'Seoul, South Korea',
  'São Paulo, Brazil','Rio de Janeiro, Brazil',
  'Mexico City, Mexico',
  'Amsterdam, Netherlands','Dublin, Ireland','Zurich, Switzerland',
  'Remote','Hybrid','Remote (US)','Remote (India)','Remote (UK)',
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
  const [locationInput, setLocationInput] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationRef = useRef(null);

  // Close location dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => { if (locationRef.current && !locationRef.current.contains(e.target)) setShowLocationDropdown(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLocationChange = (val) => {
    setLocationInput(val);
    setForm(prev => ({ ...prev, location: val }));
    if (val.length >= 2) {
      const lower = val.toLowerCase();
      const matches = CITIES.filter(c => c.toLowerCase().includes(lower)).slice(0, 8);
      setLocationSuggestions(matches);
      setShowLocationDropdown(matches.length > 0);
    } else {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
    }
  };

  const selectLocation = (city) => {
    setLocationInput(city);
    setForm(prev => ({ ...prev, location: city }));
    setShowLocationDropdown(false);
  };

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
                      className="appearance-none w-[130px] pl-3 pr-7 py-2.5 text-[14px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 transition-all cursor-pointer"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <input
                    type="tel"
                    className={`flex-1 px-3.5 py-2.5 text-[15px] border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all ${phoneError ? 'border-red-300' : 'border-gray-200'}`}
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
                  className={`w-full px-3.5 py-2.5 text-[15px] border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all ${linkedinError ? 'border-red-300' : 'border-gray-200'}`}
                  placeholder="https://www.linkedin.com/in/your-profile"
                  value={form.linkedinProfile}
                  onChange={(e) => { setForm({ ...form, linkedinProfile: e.target.value }); validateLinkedin(e.target.value); }}
                  required
                />
                {linkedinError && <p className="text-xs text-red-500 mt-1">{linkedinError}</p>}
              </div>

              {/* Preferred Job Location */}
              <div ref={locationRef} className="relative">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                  <MapPin size={14} className="text-gray-400" />
                  Preferred Job Location <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                  placeholder="e.g. San Francisco, CA or Remote"
                  value={locationInput}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  onFocus={() => { if (locationSuggestions.length) setShowLocationDropdown(true); }}
                  required
                />
                {showLocationDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {locationSuggestions.map((city) => (
                      <button
                        key={city}
                        type="button"
                        className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        onClick={() => selectLocation(city)}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
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
