import { useState, useEffect } from 'react';
import { X, Check, Crown, Shield, Target, GraduationCap, Headphones, BarChart3, FileText, MessageSquare, ArrowRight } from 'lucide-react';

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
    badge: 'MOST POPULAR',
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
    badge: 'BEST VALUE',
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
  { icon: Target, label: 'AI Job Matching' },
  { icon: FileText, label: 'Smart Resumes' },
  { icon: Headphones, label: 'Mock Interviews' },
  { icon: GraduationCap, label: 'Mentor Support' },
  { icon: BarChart3, label: 'Career Tracking' },
  { icon: MessageSquare, label: '24/7 Support' },
];

const SubscribeDialog = ({ isOpen, onClose }) => {
  const [hoveredPlan, setHoveredPlan] = useState(null);

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-[980px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={16} strokeWidth={2} />
        </button>

        {/* Header */}
        <div className="px-8 pt-5 pb-3 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gray-900 mb-2.5">
            <Crown size={11} className="text-amber-400" />
            <span className="text-[9px] font-bold text-white tracking-widest uppercase">Upgrade Your Career</span>
          </div>
          <h2 className="text-[22px] font-extrabold text-gray-900 tracking-tight leading-tight">
            Unlock Your Full Potential with{' '}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">get.hired</span>
          </h2>
          <p className="text-[11px] text-gray-500 max-w-lg mx-auto leading-relaxed mt-1">
            Choose the plan that accelerates your career — from smart job matching to personal mentorship, we've got you covered.
          </p>

          {/* Feature Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2.5">
            {highlights.map(({ icon: Icon, label }) => (
              <div key={label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200">
                <Icon size={11} className="text-gray-500" />
                <span className="text-[9px] font-medium text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plans Grid — equal height cards */}
        <div className="px-8 pb-3">
          <div className="grid grid-cols-3 gap-3.5">
            {plans.map((plan, idx) => (
              <div
                key={plan.name}
                onMouseEnter={() => setHoveredPlan(idx)}
                onMouseLeave={() => setHoveredPlan(null)}
                className={`relative rounded-xl border border-gray-200 bg-white flex flex-col transition-all duration-200 ${
                  hoveredPlan === idx ? 'shadow-xl border-gray-900 scale-[1.02]' : 'hover:shadow-lg'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-[9px] font-bold tracking-wider text-white bg-gray-900 whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div className="px-5 pt-4 pb-4 flex flex-col flex-1">
                  {/* Plan Name */}
                  <h3 className="text-center font-extrabold text-[15px] text-gray-900">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="flex items-baseline justify-center gap-0.5 mt-1 mb-3">
                    <span className="text-[30px] font-black text-gray-900 tracking-tight leading-none">{plan.price}</span>
                    <span className="text-[12px] text-gray-400 font-medium">{plan.period}</span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-100 mb-3" />

                  {/* Features */}
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check size={13} className="text-gray-900 shrink-0" strokeWidth={2.5} />
                        <span className="text-[12px] text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-bold tracking-wide transition-all duration-200 mt-4 bg-gray-900 hover:bg-gray-800 text-white ${
                    hoveredPlan === idx ? 'scale-[1.02]' : ''
                  }`}>
                    {plan.cta}
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pt-1 pb-4 text-center">
          <button
            onClick={onClose}
            className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors font-medium"
          >
            Maybe later — continue to dashboard
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <Shield size={11} className="text-gray-400" />
            <span className="text-[10px] text-gray-400 font-medium">Secure Payment</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscribeDialog;
