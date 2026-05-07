import { useState, useEffect } from 'react';
import { X, Check, Crown, Shield, Target, GraduationCap, Headphones, BarChart3, FileText, MessageSquare, ArrowRight, Sparkles, Zap, Rocket, Loader2 } from 'lucide-react';
import api from '../services/api';

const plans = [
  {
    name: 'Basic',
    key: 'basic',
    price: '$49',
    period: '/month',
    badge: null,
    icon: Zap,
    accent: 'from-blue-500 to-cyan-400',
    accentBg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
    accentBorder: 'border-blue-200',
    accentCheck: 'text-blue-500',
    accentBtn: 'from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-blue-200/50',
    features: [
      'Smart Job Matching',
      'Basic Resume Builder',
      'Up to 35 Job Searches',
      '1 My Jobs Search per Day',
      'Email Support',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Pro',
    key: 'pro',
    price: '$199',
    period: '/month',
    badge: 'MOST POPULAR',
    icon: Sparkles,
    accent: 'from-violet-600 to-indigo-500',
    accentBg: 'bg-gradient-to-br from-violet-50 to-indigo-50',
    accentBorder: 'border-violet-200',
    accentCheck: 'text-violet-600',
    accentBtn: 'from-violet-600 to-indigo-500 hover:from-violet-700 hover:to-indigo-600 shadow-violet-200/50',
    features: [
      'AI-Powered Job Matching',
      'ATS-Optimized Resume Builder',
      'Up to 200 Applications',
      'Mentor Connect (2 sessions/month)',
      'Priority Support',
    ],
    cta: 'Choose Pro',
  },
  {
    name: 'Ultra',
    key: 'ultra',
    price: '$2,499',
    period: '/once',
    badge: 'BEST VALUE',
    icon: Rocket,
    accent: 'from-amber-500 to-orange-500',
    accentBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    accentBorder: 'border-amber-200',
    accentCheck: 'text-amber-600',
    accentBtn: 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200/50',
    features: [
      'Everything in Pro',
      '3-Month Guaranteed Placement Assistance',
      'Full Background Verification Support',
      'Unlimited Mentor Sessions',
      'Dedicated Career Advisor',
    ],
    cta: 'Go Ultra',
  },
];

const highlights = [
  { icon: Target, label: 'AI Job Matching' },
  { icon: FileText, label: 'Smart Resumes' },
  { icon: Headphones, label: 'Mock Interviews' },
  { icon: GraduationCap, label: 'Mentor Support' },
  { icon: BarChart3, label: 'Career Tracking' },
  { icon: MessageSquare, label: '24/7 Support' },
];

const SubscribeDialog = ({ isOpen, onClose, userEmail }) => {
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleCheckout = async (planKey) => {
    try {
      setLoadingPlan(planKey);
      const { data } = await api.post('/stripe/create-checkout', { plan: planKey });
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned:', data);
        setLoadingPlan(null);
      }
    } catch (err) {
      console.error('Checkout error:', err?.response?.data || err.message || err);
      alert('Failed to start checkout. Please try again.');
      setLoadingPlan(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center py-8 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-[1120px] max-h-[calc(100vh-4rem)] bg-white rounded-3xl shadow-2xl overflow-y-auto border border-gray-100">
        {/* Decorative blobs removed for clean white background */}

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/60 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all shadow-sm"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Header */}
        <div className="relative px-10 pt-8 pb-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 mb-4 shadow-lg shadow-violet-200/40">
            <Crown size={13} className="text-amber-300" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">Upgrade Your Career</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Unlock Your Full Potential with{' '}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">INNOGARAGE.ai</span>
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed mt-2">
            Choose the plan that accelerates your career — from smart job matching to personal mentorship, we've got you covered.
          </p>

          {/* Feature Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
            {highlights.map(({ icon: Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-sm">
                <Icon size={12} className="text-indigo-500" />
                <span className="text-xs font-semibold text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plans Grid */}
        <div className="relative px-10 pb-4 pt-2">
          <div className="grid grid-cols-3 gap-5">
            {plans.map((plan, idx) => {
              const PlanIcon = plan.icon;
              return (
                <div
                  key={plan.name}
                  onMouseEnter={() => setHoveredPlan(idx)}
                  onMouseLeave={() => setHoveredPlan(null)}
                  className={`relative rounded-2xl border bg-white/70 backdrop-blur-xl flex flex-col transition-all duration-300 ${
                    idx === 1
                      ? 'border-violet-300 shadow-xl shadow-violet-100/40 scale-[1.03]'
                      : `${plan.accentBorder} shadow-md`
                  } ${hoveredPlan === idx ? 'shadow-2xl scale-[1.04] -translate-y-1' : 'hover:shadow-lg'}`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider text-white bg-gradient-to-r ${plan.accent} whitespace-nowrap shadow-lg`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="px-6 pt-7 pb-6 flex flex-col flex-1">
                    {/* Plan Icon + Name */}
                    <div className="flex flex-col items-center mb-2">
                      <div className={`w-12 h-12 rounded-2xl ${plan.accentBg} flex items-center justify-center mb-3 shadow-sm`}>
                        <PlanIcon size={22} className={plan.accentCheck} />
                      </div>
                      <h3 className="font-extrabold text-lg text-gray-900">
                        {plan.name}
                      </h3>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline justify-center gap-1 mt-1 mb-4">
                      <span className={`text-4xl font-black tracking-tight leading-none bg-gradient-to-r ${plan.accent} bg-clip-text text-transparent`}>{plan.price}</span>
                      <span className="text-sm text-gray-400 font-medium">{plan.period}</span>
                    </div>

                    {/* Divider */}
                    <div className={`h-px bg-gradient-to-r ${plan.accent} opacity-20 mb-4`} />

                    {/* Features */}
                    <ul className="space-y-3 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <div className={`w-5 h-5 rounded-full ${plan.accentBg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Check size={11} className={plan.accentCheck} strokeWidth={3} />
                          </div>
                          <span className="text-sm text-gray-700 leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleCheckout(plan.key)}
                      disabled={loadingPlan !== null}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 mt-5 bg-gradient-to-r ${plan.accentBtn} text-white shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {loadingPlan === plan.key ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          {plan.cta}
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative px-10 pt-2 pb-6 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium"
          >
            Maybe later — continue to dashboard
          </button>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Shield size={12} className="text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">Secure Payment · Cancel Anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscribeDialog;
