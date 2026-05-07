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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

      {/* Dialog — 80vw × 80vh */}
      <div className="relative z-10 w-[80vw] h-[80vh] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all shadow-sm"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Header */}
        <div className="shrink-0 px-12 pt-8 pb-4 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 mb-3 shadow-lg shadow-violet-200/40">
            <Crown size={13} className="text-amber-300" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">Upgrade Your Career</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Unlock Your Full Potential with{' '}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">INNOGARAGE.ai</span>
          </h2>
          <p className="text-base text-gray-500 max-w-2xl mx-auto leading-relaxed mt-2">
            Choose the plan that accelerates your career — from smart job matching to personal mentorship, we've got you covered.
          </p>
          {/* Feature Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
            {highlights.map(({ icon: Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 shadow-sm">
                <Icon size={13} className="text-indigo-500" />
                <span className="text-sm font-semibold text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plans Grid — fills remaining height */}
        <div className="flex-1 px-10 pb-2 pt-2 min-h-0">
          <div className="grid grid-cols-3 gap-6 h-full">
            {plans.map((plan, idx) => {
              const PlanIcon = plan.icon;
              return (
                <div
                  key={plan.name}
                  onMouseEnter={() => setHoveredPlan(idx)}
                  onMouseLeave={() => setHoveredPlan(null)}
                  className={`relative rounded-2xl border flex flex-col transition-all duration-300 ${
                    idx === 1
                      ? 'border-violet-300 shadow-xl shadow-violet-100/50 scale-[1.02]'
                      : `${plan.accentBorder} shadow-md bg-white`
                  } ${hoveredPlan === idx ? 'shadow-2xl -translate-y-1' : ''}`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-bold tracking-wider text-white bg-gradient-to-r ${plan.accent} whitespace-nowrap shadow-lg`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="px-7 pt-8 pb-6 flex flex-col flex-1">
                    {/* Icon + Name */}
                    <div className="flex flex-col items-center mb-3">
                      <div className={`w-14 h-14 rounded-2xl ${plan.accentBg} flex items-center justify-center mb-3 shadow-sm`}>
                        <PlanIcon size={26} className={plan.accentCheck} />
                      </div>
                      <h3 className="font-extrabold text-xl text-gray-900">{plan.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline justify-center gap-1.5 mb-4">
                      <span className={`text-4xl font-black tracking-tight leading-none bg-gradient-to-r ${plan.accent} bg-clip-text text-transparent`}>{plan.price}</span>
                      <span className="text-base text-gray-400 font-medium">{plan.period}</span>
                    </div>

                    {/* Divider */}
                    <div className={`h-px bg-gradient-to-r ${plan.accent} opacity-25 mb-4`} />

                    {/* Features */}
                    <ul className="space-y-2.5 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full ${plan.accentBg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <Check size={11} className={plan.accentCheck} strokeWidth={3} />
                          </div>
                          <span className="text-sm text-gray-700 leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={() => handleCheckout(plan.key)}
                      disabled={loadingPlan !== null}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-bold tracking-wide transition-all duration-300 mt-5 bg-gradient-to-r ${plan.accentBtn} text-white shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {loadingPlan === plan.key ? (
                        <><Loader2 size={16} className="animate-spin" /> Redirecting...</>
                      ) : (
                        <>{plan.cta} <ArrowRight size={16} /></>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-12 pt-3 pb-5 text-center">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium">
            Maybe later — continue to dashboard
          </button>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <Shield size={12} className="text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">Secure Payment · Cancel Anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscribeDialog;
