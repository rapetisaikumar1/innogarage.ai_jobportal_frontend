import { useState, useEffect } from 'react';
import { X, Check, Crown, Zap, Rocket, Star, Shield, Target, GraduationCap, Headphones, BarChart3, FileText, MessageSquare, ArrowRight } from 'lucide-react';

const plans = [
  {
    name: 'Basic',
    price: '$49',
    period: '/month',
    badge: null,
    features: [
      'Smart Job Matching',
      'Basic Resume Builder',
      'Up to 10 Applications/month',
      'Email Support',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Pro',
    price: '$199',
    period: '/month',
    badge: 'Most Popular',
    features: [
      'AI-Powered Job Matching',
      'ATS-Optimized Resume Builder',
      'Unlimited Applications',
      'Mentor Connect (2 sessions/month)',
      'Priority Support',
    ],
    cta: 'Choose Pro',
  },
  {
    name: 'Ultra',
    price: '$2,500',
    period: '/month',
    badge: 'Best Value',
    features: [
      'Everything in Pro',
      'Unlimited Mentor Sessions',
      'Personal Career Roadmap',
      'Dedicated Career Advisor',
      'Guaranteed Interview Prep',
    ],
    cta: 'Go Ultra',
  },
];

const highlights = [
  { icon: Target, label: 'AI Job Matching', color: 'text-violet-600' },
  { icon: FileText, label: 'Smart Resumes', color: 'text-emerald-600' },
  { icon: Headphones, label: 'Mock Interviews', color: 'text-sky-600' },
  { icon: GraduationCap, label: 'Mentor Support', color: 'text-amber-600' },
  { icon: BarChart3, label: 'Career Tracking', color: 'text-rose-600' },
  { icon: MessageSquare, label: '24/7 Support', color: 'text-indigo-600' },
];

const SubscribeDialog = ({ isOpen, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState(1); // Pro by default

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Dialog — viewport-fitted, no scroll */}
      <div className="relative z-10 w-[95vw] max-w-[1100px] h-[94vh] flex flex-col bg-white rounded-[1.5vw] shadow-2xl border border-gray-100 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-[1.2vh] right-[1.2vw] z-20 w-[clamp(28px,2.5vw,36px)] h-[clamp(28px,2.5vw,36px)] flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        {/* Header Section */}
        <div className="px-[3vw] pt-[2.2vh] pb-[1.8vh] text-center border-b border-gray-100 shrink-0">
          <div className="inline-flex items-center gap-[0.5vw] px-[1.2vw] py-[0.6vh] rounded-full bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 mb-[1.2vh]">
            <Crown className="text-amber-500" style={{ width: 'clamp(12px, 1vw, 16px)', height: 'clamp(12px, 1vw, 16px)' }} />
            <span className="font-bold text-violet-700 tracking-wide uppercase" style={{ fontSize: 'clamp(9px, 0.85vw, 13px)' }}>Upgrade Your Career</span>
          </div>
          <h2 className="font-extrabold text-gray-900 tracking-tight" style={{ fontSize: 'clamp(18px, 2.2vw, 32px)', lineHeight: 1.2 }}>
            Unlock Your Full Potential with{' '}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">get.hired</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto leading-relaxed mt-[0.6vh]" style={{ fontSize: 'clamp(10px, 1vw, 14px)' }}>
            Choose the plan that accelerates your career — from smart job matching to personal mentorship, we've got you covered.
          </p>

          {/* Feature Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-[1.2vw] mt-[1.2vh]">
            {highlights.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-[0.3vw] font-medium text-gray-600" style={{ fontSize: 'clamp(9px, 0.85vw, 13px)' }}>
                <Icon className={color} style={{ width: 'clamp(11px, 1vw, 15px)', height: 'clamp(11px, 1vw, 15px)' }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Plans Grid — fills remaining space */}
        <div className="flex-1 min-h-0 px-[3vw] py-[2vh] flex flex-col">
          <div className="grid grid-cols-3 gap-[1.2vw] flex-1 min-h-0">
            {plans.map((plan, idx) => (
              <div
                key={plan.name}
                onClick={() => setSelectedPlan(idx)}
                className={`relative rounded-[1vw] border-2 flex flex-col cursor-pointer transition-all duration-200 ${
                  selectedPlan === idx
                    ? 'border-blue-500 bg-blue-50/20 shadow-lg shadow-blue-100/50 scale-[1.02]'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                }`}
                style={{ padding: 'clamp(12px, 1.8vh, 24px) clamp(12px, 1.2vw, 24px)' }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className="absolute -top-[1.2vh] left-1/2 -translate-x-1/2 rounded-full font-bold uppercase tracking-wider text-white bg-slate-700 whitespace-nowrap"
                    style={{ fontSize: 'clamp(7px, 0.7vw, 11px)', padding: 'clamp(2px, 0.4vh, 6px) clamp(8px, 0.8vw, 14px)' }}
                  >
                    {plan.badge}
                  </div>
                )}

                {/* Plan Name & Price */}
                <div className="text-center" style={{ marginTop: 'clamp(2px, 0.3vh, 6px)' }}>
                  <h3 className="font-extrabold text-slate-800" style={{ fontSize: 'clamp(14px, 1.3vw, 20px)' }}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-[0.3vw]" style={{ marginTop: 'clamp(4px, 0.8vh, 12px)' }}>
                    <span className="font-extrabold text-gray-900" style={{ fontSize: 'clamp(20px, 2.2vw, 34px)' }}>{plan.price}</span>
                    <span className="text-gray-400 font-medium" style={{ fontSize: 'clamp(10px, 0.9vw, 14px)' }}>{plan.period}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100" style={{ margin: 'clamp(6px, 1.2vh, 16px) 0' }} />

                {/* Features */}
                <ul className="flex-1 min-h-0" style={{ gap: 'clamp(4px, 0.8vh, 12px)', display: 'flex', flexDirection: 'column' }}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start" style={{ gap: 'clamp(4px, 0.5vw, 10px)' }}>
                      <Check className="text-emerald-500 shrink-0" style={{ width: 'clamp(11px, 1vw, 16px)', height: 'clamp(11px, 1vw, 16px)', marginTop: '1px' }} strokeWidth={3} />
                      <span className="text-gray-600 leading-snug" style={{ fontSize: 'clamp(10px, 0.9vw, 14px)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  className="w-full flex items-center justify-center gap-[0.4vw] rounded-[0.7vw] font-bold tracking-wide transition-all bg-slate-700 hover:bg-slate-800 text-white"
                  style={{ marginTop: 'clamp(8px, 1.2vh, 20px)', padding: 'clamp(8px, 1.2vh, 14px) clamp(12px, 1vw, 20px)', fontSize: 'clamp(11px, 0.9vw, 14px)' }}
                >
                  {plan.name === 'Ultra' && <Star className="text-amber-200" style={{ width: 'clamp(11px, 1vw, 15px)', height: 'clamp(11px, 1vw, 15px)' }} />}
                  {plan.cta}
                  <ArrowRight style={{ width: 'clamp(11px, 1vw, 15px)', height: 'clamp(11px, 1vw, 15px)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-[3vw] pb-[1.5vh] pt-[0.5vh] text-center shrink-0">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors font-medium"
            style={{ fontSize: 'clamp(10px, 0.9vw, 14px)' }}
          >
            Maybe later — continue to dashboard
          </button>
          <div className="flex items-center justify-center gap-[1vw] mt-[0.6vh] text-gray-400" style={{ fontSize: 'clamp(8px, 0.75vw, 12px)' }}>
            <div className="flex items-center gap-[0.3vw]">
              <Shield className="text-emerald-400" style={{ width: 'clamp(9px, 0.8vw, 13px)', height: 'clamp(9px, 0.8vw, 13px)' }} />
              Secure Payment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscribeDialog;
