import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Trophy, Sparkles, Send, Trash2, Building2, Briefcase,
  PartyPopper, Star, Quote, X, Users, TrendingUp, Award,
  CheckCircle2, Zap, GraduationCap, Crown, ArrowRight, Shield, Target, Rocket,
  Heart, BookOpen, Headphones, BarChart3, MessageCircle, BadgeCheck
} from 'lucide-react';
import Logo from '../../components/Logo';
import SubscribeDialog from '../../components/SubscribeDialog';

const CONFETTI_COLORS = [
  'bg-amber-400', 'bg-rose-400', 'bg-violet-400', 'bg-sky-400',
  'bg-emerald-400', 'bg-orange-400', 'bg-pink-400', 'bg-indigo-400'
];

const ConfettiDot = ({ className }) => (
  <div className={`absolute w-2 h-2 rounded-full opacity-60 ${className}`} />
);

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-purple-600',
  'from-lime-500 to-green-600',
];

const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const AchieversPage = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ jobTitle: '', company: '', story: '' });
  const [showSubscribe, setShowSubscribe] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await api.get('/achievers');
      setStories(res.data);
    } catch {
      toast.error('Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.jobTitle.trim() || !form.company.trim() || !form.story.trim()) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/achievers', form);
      setStories((prev) => [res.data, ...prev]);
      setForm({ jobTitle: '', company: '', story: '' });
      setShowForm(false);
      toast.success('Your success story has been shared! 🎉');
    } catch {
      toast.error('Failed to post story');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this story?')) return;
    try {
      await api.delete(`/achievers/${id}`);
      setStories((prev) => prev.filter((s) => s.id !== id));
      toast.success('Story deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ═══ Post Story Modal ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <PartyPopper size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Share Your Success</h2>
                  <p className="text-xs text-gray-400">Inspire others with your journey</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Job Title</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
                  <Briefcase size={16} className="text-gray-300 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. Backend Developer Intern"
                    className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-800"
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
                  <Building2 size={16} className="text-gray-300 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. Google, Microsoft"
                    className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-800"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Story</label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your journey — how you prepared, what helped you, and any tips for others..."
                  className="w-full text-sm bg-transparent border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none placeholder-gray-400 text-gray-800 resize-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                  value={form.story}
                  onChange={(e) => setForm({ ...form, story: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-60 shadow-sm"
                >
                  <Send size={15} />
                  {submitting ? 'Posting...' : 'Post Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 py-5 mb-6">
          <div className="absolute top-0 right-0 w-52 h-52 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-4 right-8 text-white/10"><Trophy size={60} /></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="max-w-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-[11px] font-semibold tracking-wide">
                  <Star size={11} fill="currentColor" />
                  Community Wall
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Our Achievers
              </h1>
              <p className="text-violet-200 text-sm mt-2 leading-relaxed">
                Real stories from real people. See how our community members landed their dream jobs
                and transformed their careers.
              </p>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-violet-700 font-bold text-sm hover:bg-violet-50 transition-colors shadow-lg shadow-violet-900/20 shrink-0 self-start md:self-center"
            >
              <PartyPopper size={16} />
              Share Your Story
            </button>
          </div>

          <div className="relative z-10 flex items-center gap-6 mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Users size={15} className="text-violet-300" />
              <span className="text-lg font-bold text-white">{stories.length}</span>
              <span className="text-violet-300 text-xs">Stories</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={15} className="text-emerald-300" />
              <span className="text-lg font-bold text-white">100%</span>
              <span className="text-violet-300 text-xs">Placement</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award size={15} className="text-amber-300" />
              <span className="text-lg font-bold text-white">Top</span>
              <span className="text-violet-300 text-xs">Companies</span>
            </div>
          </div>
        </div>

      {/* ═══ Split Layout: 70% Stories + 30% Banner ═══ */}
      <div className="flex gap-6 items-start">

      {/* ═══ Left — Stories Feed (70%) ═══ */}
      <div className="flex-[7] min-w-0">

        {/* Stories */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto rounded-full bg-violet-50 flex items-center justify-center mb-5">
            <Trophy size={36} className="text-violet-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-700">No stories yet</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
            Be the first to share your success story and inspire the community!
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            <PartyPopper size={16} />
            Share Your Story
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {stories.map((story) => {
            const initial = story.user?.fullName?.charAt(0)?.toUpperCase() || '?';
            const isOwn = story.userId === user?.id;
            const avatarGradient = getAvatarColor(story.user?.fullName);

            return (
              <div key={story.id} className="group">
                {/* Story Card */}
                <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">

                  {/* Top accent gradient bar */}
                  <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />

                  {/* Subtle background decoration */}
                  <div className="absolute top-6 right-6 opacity-[0.04]">
                    <Trophy size={80} />
                  </div>

                  {/* Delete button for own stories */}
                  {isOwn && (
                    <button
                      onClick={() => handleDelete(story.id)}
                      className="absolute top-6 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 p-1 z-20"
                      title="Delete story"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  {/* Card content */}
                  <div className="relative z-10 p-5 md:p-6">
                    {/* Header row: Avatar + Info */}
                    <div className="flex items-start gap-4">
                      {/* User avatar with initial */}
                      <div className={`shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center shadow-md ring-2 ring-white`}>
                        <span className="text-white font-bold text-lg">{initial}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name + Badge */}
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-gray-900 truncate">
                            {story.user?.fullName}
                          </h3>
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200/60">
                            <BadgeCheck size={12} className="text-amber-500" />
                            <span className="text-[10px] font-semibold text-amber-600">Placed</span>
                          </div>
                        </div>

                        {/* Date */}
                        {story.createdAt && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {formatDate(story.createdAt)} · {formatTime(story.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Role & Company pills */}
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-100">
                        <Briefcase size={13} className="text-violet-500" />
                        <span className="text-xs font-semibold text-violet-700">{story.jobTitle}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100">
                        <Building2 size={13} className="text-blue-500" />
                        <span className="text-xs font-semibold text-blue-700">{story.company}</span>
                      </div>
                    </div>

                    {/* Story text */}
                    {story.story && (
                      <div className="mt-4 pl-1">
                        <div className="flex gap-2.5">
                          <Quote size={16} className="text-gray-200 shrink-0 mt-0.5 rotate-180" />
                          <p className="text-[13px] text-gray-600 leading-relaxed italic">
                            {story.story}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Bottom row: celebration */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                      <PartyPopper size={14} className="text-amber-400" />
                      <span className="text-[11px] font-medium text-gray-400">Congratulations on the placement!</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* ═══ Right — Consultancy Banner (30%) ═══ */}
      <div className="hidden lg:block flex-[3] min-w-0">
        <div className="sticky top-0 relative overflow-hidden rounded-2xl border border-white/60 shadow-[0_8px_30px_rgba(139,92,246,0.12)]" style={{ background: 'linear-gradient(160deg, #ede9fe 0%, #e8e0fb 15%, #f0e6ff 30%, #eef0ff 50%, #e4ecff 70%, #dce6ff 85%, #d4dfff 100%)' }}>

          {/* Decorative blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-300/15 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-300/15 rounded-full blur-2xl" />

          <div className="relative z-10 px-6 pt-6 pb-7">
            {/* Heading */}
            <h3 className="text-xl font-extrabold text-gray-900 leading-snug tracking-tight">
              Transform Your Career{' '}
              With{' '}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                get.hired
              </span>
            </h3>

            <p className="text-gray-500 text-[13px] mt-2 leading-relaxed">
              Your all-in-one career companion — matching you with the right jobs, building your resume, and preparing you for interviews.
            </p>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200/80 to-transparent my-4" />

            {/* Feature list */}
            <div className="space-y-1.5">
              {[
                { icon: Target, title: 'AI-Powered Job Matching', color: 'text-violet-600', bg: 'bg-violet-50', accent: 'border-violet-100' },
                { icon: GraduationCap, title: 'Dedicated Mentor Support', color: 'text-emerald-600', bg: 'bg-emerald-50', accent: 'border-emerald-100' },
                { icon: Zap, title: 'Tailored Resume Builder', color: 'text-amber-600', bg: 'bg-amber-50', accent: 'border-amber-100' },
                { icon: Headphones, title: 'Interview Preparation', color: 'text-sky-600', bg: 'bg-sky-50', accent: 'border-sky-100' },
                { icon: BarChart3, title: 'Career Growth Tracking', color: 'text-rose-600', bg: 'bg-rose-50', accent: 'border-rose-100' },
              ].map(({ icon: Icon, title, bg, color, accent }) => (
                <div key={title} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/50 border border-white/70 hover:bg-white/80 transition-colors group cursor-default">
                  <div className={`w-9 h-9 rounded-lg ${bg} border ${accent} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon size={16} className={color} />
                  </div>
                  <p className="text-[13px] font-semibold text-gray-700">{title}</p>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200/80 to-transparent my-4" />

            {/* Upgrade Button */}
            <button
              onClick={() => setShowSubscribe(true)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-violet-400/25 hover:shadow-violet-400/40 hover:-translate-y-0.5">
              <Crown size={16} className="text-amber-300" />
              Upgrade
            </button>
          </div>
        </div>
      </div>

      </div>

      {/* ═══ Footer ═══ */}
      <footer className="mt-0 text-gray-600 py-10 border-t border-gray-100 -mx-5 lg:-mx-7 px-5 lg:px-7">
        <div className="max-w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <Logo size="md" />
              <p className="mt-4 text-sm leading-relaxed text-gray-500">
                Your AI-powered career copilot. Build resumes, apply to jobs, connect with mentors — all in one platform.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">✉ support@gethired.app</span>
              </div>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wider">Platform</h4>
              <ul className="space-y-2.5 text-sm">
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Job Discovery</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Resume Builder</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Mentorship</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Training Hub</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4 text-sm uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Smart Matching</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Quick Apply</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Skill Insights</span></li>
                <li><span className="hover:text-gray-900 transition-colors cursor-default">Tailored Resumes</span></li>
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
          <div className="border-t border-gray-200 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} get.hired &mdash; All rights reserved.</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Zap size={14} className="text-amber-400" />
              <span>Built with passion for job seekers everywhere.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Subscribe Dialog */}
      <SubscribeDialog isOpen={showSubscribe} onClose={() => setShowSubscribe(false)} />
    </div>
  );
};

export default AchieversPage;
