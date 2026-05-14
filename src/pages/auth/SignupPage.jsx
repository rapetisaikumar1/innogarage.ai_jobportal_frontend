import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, CheckCircle2, Mail, Lock, User, Sparkles, Zap, Layers, Compass, TrendingUp, Rocket } from 'lucide-react';
import Logo from '../../components/Logo';
import AuthFooter from '../../components/AuthFooter';
import { getGoogleClientId } from '../../utils/googleAuth';

const SignupPage = () => {
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const passwordChecks = [
    { label: 'At least 8 characters', met: form.password.length >= 8 },
    { label: 'An uppercase letter', met: /[A-Z]/.test(form.password) },
    { label: 'A lowercase letter', met: /[a-z]/.test(form.password) },
    { label: 'A number', met: /[0-9]/.test(form.password) },
    { label: 'A special character (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(form.password) },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return alert('Passwords do not match');
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', form.fullName);
      formData.append('email', form.email);
      formData.append('password', form.password);

      await signup(formData);
      navigate('/complete-profile');
    } catch (error) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!window.google?.accounts?.oauth2) {
      toast.error('Google sign-in is still loading. Please wait a moment and try again.');
      return;
    }

    const clientId = await getGoogleClientId();
    if (!clientId) {
      toast.error('Google sign-in is not configured.');
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            toast.error('Google sign-up was cancelled or failed.');
            return;
          }
          setGoogleLoading(true);
          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            const profile = await res.json();
            const result = await googleLogin(null, profile);
            if (result.isNewUser || !result.profileComplete) {
              navigate('/complete-profile');
            } else {
              navigate('/dashboard');
            }
          } catch (error) {
            // Error handled in context
          } finally {
            setGoogleLoading(false);
          }
        },
      });
      client.requestAccessToken();
    } catch (error) {
      toast.error('Failed to start Google sign-in. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 w-full bg-white border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-gray-500">Already a member?</span>
            <Link to="/login" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center py-10 lg:py-16 pt-24 lg:pt-24">
        <div className="w-full max-w-6xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24 items-center">

            {/* Left: Branding / Features */}
            <div className="hidden lg:flex flex-col justify-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-5 w-fit">
                <Zap size={14} className="text-indigo-500" />
                <span className="text-sm font-semibold text-indigo-700">Zero to Offer · AI-Powered Career Suite</span>
              </div>

              <h1 className="text-[2.75rem] xl:text-[3.25rem] font-extrabold text-gray-900 tracking-tight leading-[1.12] mb-4">
                Turn Applications<br />Into{' '}
                <span className="bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">Offers</span>
              </h1>

              <p className="text-gray-500 text-[15px] leading-relaxed mb-8 max-w-[420px]">
                One platform to build a strong profile, track every application, and get 1:1 mentorship — all powered by AI, all completely free.
              </p>

              {/* Feature list */}
              <div className="space-y-4 mb-8">
                {[
                  { icon: Zap, title: 'Smart Job Matching', desc: 'Run a search and surface the strongest-fit roles for your profile in seconds.' },
                  { icon: Layers, title: 'All-in-One Tracker', desc: 'One dashboard for every application, status, and deadline.' },
                  { icon: Compass, title: 'Matched Mentorship', desc: 'Get paired with industry mentors who\'ve been where you want to go.' },
                  { icon: TrendingUp, title: 'Real-Time Insights', desc: 'See exactly where you stand with interview-readiness scores.' },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <f.icon size={17} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-[15px] leading-snug">{f.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom banner */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/80 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <Rocket size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">12,000+ resumes generated · 500+ offers landed</p>
                  <p className="text-gray-500 text-xs">Join the fastest-growing career platform for students & professionals.</p>
                </div>
              </div>
            </div>

            {/* Right: Form card */}
            <div>
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100/80 p-7 sm:p-9">
                {/* Form header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create your account</h2>
                  <p className="text-sm text-gray-500 mt-1.5">Fill in your details to get started — it only takes a minute.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                      <User size={14} className="text-gray-400" />
                      Name <span className="text-red-400">*</span>
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

                  {/* Email */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                      <Mail size={14} className="text-gray-400" />
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                      placeholder="john@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                      <Lock size={14} className="text-gray-400" />
                      Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="w-full px-3.5 py-2.5 pr-10 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                        placeholder="Create a strong password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {/* Password requirements */}
                    {form.password && (
                      <div className="mt-2.5 space-y-1 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Password requirements</p>
                        {passwordChecks.map((check, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            {check.met ? (
                              <CheckCircle2 size={12} className="text-emerald-500" />
                            ) : (
                              <span className="text-[11px] text-gray-300 font-medium">✕</span>
                            )}
                            <span className={`text-[12px] ${check.met ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>{check.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 mb-1.5">
                      <Lock size={14} className="text-gray-400" />
                      Confirm Password <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      className="w-full px-3.5 py-2.5 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-gray-50/50 text-gray-900 placeholder-gray-400 transition-all"
                      placeholder="Confirm your password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      required
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
                        Get Started Now
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-[12px] text-gray-400 font-medium">Or continue with</span>
                  </div>
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={() => handleGoogleSignup()}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 text-gray-700 font-medium py-2.5 rounded-xl transition-all text-[15px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {googleLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg width="17" height="17" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Sign up with Google
                    </>
                  )}
                </button>

                <p className="mt-5 text-center text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">Sign in here</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
};

export default SignupPage;
