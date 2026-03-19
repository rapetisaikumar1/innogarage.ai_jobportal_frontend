import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import {
  Briefcase, FileText, Sparkles, Target, MessageSquare,
  Calendar, GraduationCap, ArrowRight, CheckCircle2, Star,
  Zap, ChevronRight, ShieldCheck, Globe
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ─── Fixed Mesh Gradient Background ─── */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Top-left: light blue/sky */}
        <div className="absolute -top-20 -left-20 w-[600px] h-[500px] bg-gradient-to-br from-sky-200/70 via-cyan-100/50 to-transparent rounded-full blur-[100px]" />
        {/* Top-right: cyan/blue */}
        <div className="absolute -top-10 right-[5%] w-[500px] h-[450px] bg-gradient-to-bl from-cyan-300/60 via-sky-200/40 to-transparent rounded-full blur-[90px]" />
        {/* Center: warm cream/yellow tint */}
        <div className="absolute top-[15%] left-[30%] w-[450px] h-[400px] bg-gradient-to-br from-amber-50/40 via-yellow-50/20 to-transparent rounded-full blur-[80px]" />
        {/* Bottom-left: pink/fuchsia */}
        <div className="absolute bottom-[5%] -left-10 w-[400px] h-[350px] bg-gradient-to-tr from-pink-200/50 via-fuchsia-100/30 to-transparent rounded-full blur-[90px]" />
        {/* Bottom-center: violet/purple */}
        <div className="absolute bottom-0 left-[20%] w-[500px] h-[400px] bg-gradient-to-t from-violet-300/40 via-purple-200/25 to-transparent rounded-full blur-[100px]" />
      </div>

      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100/80 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg transition-colors">
              Log in
            </Link>
            <Link to="/signup" className="text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-700 hover:via-violet-700 hover:to-purple-700 px-5 py-2.5 rounded-xl shadow-md shadow-violet-200 hover:shadow-lg transition-all">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-1.5 mb-8">
            <Sparkles size={14} className="text-violet-500" />
            <span className="text-sm font-medium text-violet-700">AI-Powered Job Search & Mentorship</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Land Your Dream Job,{' '}
            <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Faster
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            From resume tailoring to one-click applications, mentorship scheduling to real-time chat — everything you need to land your dream job, in one platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-700 hover:via-violet-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg shadow-violet-200 hover:shadow-xl transition-all text-lg"
            >
              Start Your Journey
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold px-8 py-4 rounded-2xl border-2 border-gray-200 hover:border-gray-300 transition-all text-lg"
            >
              Explore Features
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-gray-400">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-800">500+</p>
              <p className="text-sm">Jobs Indexed</p>
            </div>
            <div className="w-px h-10 bg-gray-200 hidden sm:block" />
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-800">95%</p>
              <p className="text-sm">ATS Match Score</p>
            </div>
            <div className="w-px h-10 bg-gray-200 hidden sm:block" />
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-800">3x</p>
              <p className="text-sm">Faster Interviews</p>
            </div>
            <div className="w-px h-10 bg-gray-200 hidden sm:block" />
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-800">1:1</p>
              <p className="text-sm">Mentor Access</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-24 relative z-[1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-cyan-50 text-cyan-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Everything You Need</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
              Your Complete Career Toolkit
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Six powerful tools designed to transform your job search from stressful to streamlined.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Briefcase,
                title: 'Smart Job Discovery',
                desc: 'Browse curated job listings scraped from multiple sources. Filter by location, type, and skills — one-click easy apply for matching roles.',
                color: 'from-blue-500 to-indigo-600',
                bgLight: 'bg-blue-50',
                items: ['Multi-source aggregation', 'Smart filters', 'Easy Apply automation'],
              },
              {
                icon: FileText,
                title: 'AI Resume Tailor',
                desc: 'Generate ATS-optimized resumes tailored to each job description. Keywords, formatting, and bullet points — automatically refined.',
                color: 'from-violet-500 to-purple-600',
                bgLight: 'bg-violet-50',
                items: ['Keyword extraction', 'ATS score matching', 'PDF download'],
              },
              {
                icon: Target,
                title: 'Application Tracker',
                desc: 'Track every application from submission to offer. Know exactly where you stand with status updates and organized timeline.',
                color: 'from-emerald-500 to-teal-600',
                bgLight: 'bg-emerald-50',
                items: ['Status tracking', 'Application history', 'Progress analytics'],
              },
              {
                icon: Calendar,
                title: 'Mentorship & Scheduling',
                desc: 'Book 1:1 sessions with assigned mentors. Google Meet integration for seamless video calls. Get personalized career guidance.',
                color: 'from-amber-500 to-orange-600',
                bgLight: 'bg-amber-50',
                items: ['Slot booking', 'Google Meet links', 'Session management'],
              },
              {
                icon: MessageSquare,
                title: 'Real-time Chat',
                desc: 'Instant messaging with your mentor and peers. No more waiting for email replies — get answers when you need them.',
                color: 'from-pink-500 to-rose-600',
                bgLight: 'bg-pink-50',
                items: ['Instant messaging', 'Read receipts', 'Contact list'],
              },
              {
                icon: GraduationCap,
                title: 'Training Hub',
                desc: 'Access interview prep guides, resume templates, and career development resources. Take notes and revisit anytime.',
                color: 'from-cyan-500 to-sky-600',
                bgLight: 'bg-cyan-50',
                items: ['Video & PDF materials', 'Personal notes', 'Category browsing'],
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group relative bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-xl hover:shadow-gray-100/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bgLight} flex items-center justify-center mb-5`}>
                  <feature.icon size={24} className={`bg-gradient-to-br ${feature.color} bg-clip-text`} style={{ color: feature.color.includes('blue') ? '#3B82F6' : feature.color.includes('violet') ? '#8B5CF6' : feature.color.includes('emerald') ? '#10B981' : feature.color.includes('amber') ? '#F59E0B' : feature.color.includes('pink') ? '#EC4899' : '#06B6D4' }} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{feature.desc}</p>
                <ul className="space-y-2">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works Section ─── */}
      <section id="how-it-works" className="py-28 relative z-[1] overflow-hidden">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 text-violet-700 text-sm font-semibold px-5 py-2 rounded-full mb-5">
              <Zap size={14} />
              How It Works
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
              Your Journey from Aspiration{' '}
              <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">to Achievement</span>
            </h2>
            <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto">
              Six simple steps to transform your career. We guide you every step of the way.
            </p>
          </div>

          {/* Steps with animated connectors - 2 row snake layout */}
          <div className="relative">
            {(() => {
              const steps = [
                {
                  step: '01',
                  title: 'Create Your Profile',
                  desc: 'Sign up, upload your resume, add your skills and experience.',
                  gradient: 'from-blue-500 to-indigo-600',
                  shadow: 'shadow-blue-200/50',
                  dotColor: 'bg-blue-500',
                  icon: FileText,
                },
                {
                  step: '02',
                  title: 'Discover & Apply',
                  desc: 'Browse jobs, let AI tailor your resume, and apply with one click.',
                  gradient: 'from-violet-500 to-purple-600',
                  shadow: 'shadow-violet-200/50',
                  dotColor: 'bg-violet-500',
                  icon: Target,
                },
                {
                  step: '03',
                  title: 'Get Mentored',
                  desc: 'Connect with your assigned mentor, book sessions, and get coached.',
                  gradient: 'from-cyan-500 to-teal-500',
                  shadow: 'shadow-cyan-200/50',
                  dotColor: 'bg-cyan-500',
                  icon: MessageSquare,
                },
                {
                  step: '04',
                  title: 'Background Check',
                  desc: 'Your records, titles, and credentials aligned \u2014 so your BGC clears without a hitch.',
                  gradient: 'from-amber-500 to-orange-500',
                  shadow: 'shadow-amber-200/50',
                  dotColor: 'bg-amber-500',
                  icon: ShieldCheck,
                },
                {
                  step: '05',
                  title: 'Immigration Support',
                  desc: 'OPT & STEM OPT handled end-to-end \u2014 filings, deadlines, and compliance, sorted.',
                  gradient: 'from-purple-500 to-violet-500',
                  shadow: 'shadow-purple-200/50',
                  dotColor: 'bg-purple-500',
                  icon: Globe,
                },
                {
                  step: '06',
                  title: 'Land the Job',
                  desc: 'Track your progress, ace interviews, and receive your offer.',
                  gradient: 'from-teal-500 to-emerald-500',
                  shadow: 'shadow-emerald-200/50',
                  dotColor: 'bg-emerald-500',
                  icon: Briefcase,
                },
              ];

              const row1 = steps.slice(0, 3); // Steps 1, 2, 3
              const row2 = [steps[5], steps[4], steps[3]]; // Steps 6, 5, 4 (reversed visually)
              const row2AnimIndex = [5, 4, 3]; // Animation order indices

              // Delays synced to beam crossing each step in the 7s cycle
              // Row1 beam: 0-3.36s (L→R), Row2 beam: 3.5-6.86s (R→L)
              // Negative delay = animation starts that many seconds "into" the cycle
              const glowDelays = [-6.65, -5.32, -4.0, -3.16, -1.82, -0.48];

              const renderStep = (item, animIdx) => (
                <div key={item.step} className="relative text-center group">
                  <div className="relative mx-auto mb-5 w-[72px] h-[72px] flex items-center justify-center">
                    <div
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.gradient} hiw-step-glow`}
                      style={{ animationDelay: `${glowDelays[animIdx]}s` }}
                    />
                    <div className="absolute inset-[3px] rounded-[13px] bg-white/90 backdrop-blur-sm" />
                    <div className={`relative w-[52px] h-[52px] rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg ${item.shadow} group-hover:scale-110 transition-transform duration-500`}>
                      <item.icon size={26} className="text-white" />
                    </div>
                    <div className="hidden lg:block absolute -bottom-[18px] left-1/2 -translate-x-1/2 z-10">
                      <div
                        className={`w-2.5 h-2.5 ${item.dotColor} rounded-full ring-[3px] ring-white shadow-sm hiw-dot-seq`}
                        style={{ animationDelay: `${glowDelays[animIdx]}s` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-6">
                    <span className={`inline-block text-[11px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent mb-1.5`}>
                      Step {item.step}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors duration-300">{item.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed max-w-[220px] mx-auto">{item.desc}</p>
                  </div>
                </div>
              );

              return (
                <>
                  {/* ── Row 1: Steps 1 → 2 → 3 ── */}
                  <div className="relative">
                    {/* Connector line Row 1 */}
                    <div className="hidden lg:block absolute top-[36px] left-[16.67%] right-[16.67%] h-[2px] overflow-visible">
                      <div className="w-full h-full bg-gray-200/40 rounded-full" />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-[120px] h-[6px] rounded-full hiw-beam"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(129,140,248,0.5) 20%, rgba(56,189,248,0.8) 50%, rgba(52,211,153,0.5) 80%, transparent 100%)',
                          boxShadow: '0 0 20px 3px rgba(99,102,241,0.25)',
                          filter: 'blur(0.5px)',
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-10 lg:gap-6 max-w-4xl mx-auto">
                      {row1.map((item, i) => (
                        <div key={item.step}>
                          {renderStep(item, i)}
                          {/* Mobile connector */}
                          {i < 2 && (
                            <div className="sm:hidden flex justify-center my-2">
                              <div className="w-0.5 h-8 bg-gradient-to-b from-gray-200 to-gray-100 rounded-full" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Spacing between rows */}
                  <div className="h-10 lg:h-14" />
                  {/* Mobile vertical connector between rows */}
                  <div className="sm:hidden flex justify-center my-2">
                    <div className="w-0.5 h-8 bg-gradient-to-b from-gray-200 to-gray-100 rounded-full" />
                  </div>

                  {/* ── Row 2: Step 6 ← Step 5 ← Step 4 (visual), animation 4→5→6 ── */}
                  <div className="relative">
                    {/* Connector line Row 2 - beam flows right to left */}
                    <div className="hidden lg:block absolute top-[36px] left-[16.67%] right-[16.67%] h-[2px] overflow-visible">
                      <div className="w-full h-full bg-gray-200/40 rounded-full" />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-[120px] h-[6px] rounded-full hiw-beam-reverse"
                        style={{
                          background: 'linear-gradient(270deg, transparent 0%, rgba(245,158,11,0.5) 20%, rgba(168,85,247,0.8) 50%, rgba(52,211,153,0.5) 80%, transparent 100%)',
                          boxShadow: '0 0 20px 3px rgba(168,85,247,0.25)',
                          filter: 'blur(0.5px)',
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-10 lg:gap-6 max-w-4xl mx-auto">
                      {row2.map((item, i) => (
                        <div key={item.step}>
                          {renderStep(item, row2AnimIndex[i])}
                          {/* Mobile connector */}
                          {i < 2 && (
                            <div className="sm:hidden flex justify-center my-2">
                              <div className="w-0.5 h-8 bg-gradient-to-b from-gray-200 to-gray-100 rounded-full" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ─── Testimonials Section ─── */}
      <section id="testimonials" className="py-24 relative z-[1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block bg-amber-50 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">Success Stories</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
              Loved by Job Seekers
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Real stories from people who transformed their job search with INNOGARAGE.ai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                quote: "The AI resume tailor is a game-changer. My ATS match score went from 58% to 94%. I landed 3 interview calls in the first week itself.",
                name: 'Emily Chen',
                title: 'Frontend Developer at Hootsuite',
                avatar: 'EC',
                color: 'bg-indigo-100 text-indigo-700',
              },
              {
                quote: "Having a dedicated mentor through the platform made all the difference. The 1:1 sessions helped me prepare for technical rounds I'd been struggling with.",
                name: 'Marcus Johnson',
                title: 'Data Analyst at Freshbooks',
                avatar: 'MJ',
                color: 'bg-emerald-100 text-emerald-700',
              },
              {
                quote: "I applied to 50+ jobs using easy-apply in just 2 days. The application tracker kept me organized. Got my offer within a month of signing up.",
                name: 'Sofia Martinez',
                title: 'Software Engineer at Clio',
                avatar: 'SM',
                color: 'bg-violet-100 text-violet-700',
              },
              {
                quote: "The training materials and mock interview prep gave me the confidence I needed. Went from zero callbacks to multiple offers in 3 weeks.",
                name: 'James Wilson',
                title: 'Backend Developer at Twilio',
                avatar: 'JW',
                color: 'bg-sky-100 text-sky-700',
              },
              {
                quote: "As an international student in Canada, the mentorship feature was invaluable. My mentor helped me understand the local job market and tailor my approach.",
                name: 'Aisha Patel',
                title: 'Full Stack Developer at Lightspeed',
                avatar: 'AP',
                color: 'bg-rose-100 text-rose-700',
              },
              {
                quote: "The one-click easy apply saved me hours every day. Combined with the ATS-optimized resumes, my response rate tripled compared to applying manually.",
                name: 'Daniel Kim',
                title: 'DevOps Engineer at Datadog',
                avatar: 'DK',
                color: 'bg-amber-100 text-amber-700',
              },
            ].map((t, i) => (
              <div key={i} className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-gray-100 p-8 relative">
                {/* Quote mark */}
                <div className="absolute top-6 right-6 text-6xl leading-none text-gray-100 font-serif select-none">"</div>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={16} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 relative z-10">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center font-bold text-sm`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-24 relative z-[1] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700" />
        {/* Decorative shapes */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-white rounded-full" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
            Ready to Land Your Dream Job?
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-violet-100 max-w-2xl mx-auto leading-relaxed">
            Thousands of professionals have transformed their job search with <span className="text-white font-bold">INNOGARAGE.ai</span>. AI-powered resumes, smart applications, and expert mentorship — your unfair advantage in today's job market.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link
              to="/signup"
              className="group flex items-center gap-2.5 bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-10 py-4 rounded-2xl transition-all shadow-lg shadow-amber-500/25 text-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Create Free Account
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 text-white font-semibold px-10 py-4 rounded-2xl border-2 border-white/40 hover:border-white hover:bg-white/10 transition-all text-lg backdrop-blur-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="text-gray-800 py-16 relative z-[1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <Logo size="md" />
              <p className="mt-4 text-sm leading-relaxed">
                Your AI-powered career copilot. Build resumes, apply to jobs, connect with mentors — all in one platform.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">✉ support@innogarage.ai</span>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wider">Platform</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#features" className="hover:text-gray-900 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a></li>
                <li><a href="#testimonials" className="hover:text-gray-900 transition-colors">Testimonials</a></li>
                <li><Link to="/signup" className="hover:text-gray-900 transition-colors">Get Started</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Job Discovery</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Resume Builder</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Mentorship</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Training Hub</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><span className="hover:text-gray-900 transition-colors cursor-default">About</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Privacy Policy</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Terms of Service</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Contact</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">&copy; {new Date().getFullYear()} INNOGARAGE.ai &mdash; All rights reserved.</p>
            <div className="flex items-center gap-2 text-sm">
              <Zap size={14} className="text-amber-400" />
              <span>Built with passion for job seekers everywhere.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
