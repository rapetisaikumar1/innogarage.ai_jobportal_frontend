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
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <PartyPopper size={15} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900">Share Your Success</h2>
                  <p className="text-[11px] text-gray-400">Inspire others with your journey</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1">Job Title</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
                  <Briefcase size={14} className="text-gray-300 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. Backend Developer Intern"
                    className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-800"
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1">Company</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
                  <Building2 size={14} className="text-gray-300 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. Google, Microsoft"
                    className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-800"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1">Your Story</label>
                <textarea
                  rows={3}
                  placeholder="Tell us about your journey — how you prepared, what helped you, and any tips for others..."
                  className="w-full text-[12px] bg-transparent border border-gray-200 rounded-lg px-3 py-2 outline-none placeholder-gray-400 text-gray-800 resize-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                  value={form.story}
                  onChange={(e) => setForm({ ...form, story: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-[12px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[12px] font-semibold hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-60"
                >
                  <Send size={13} />
                  {submitting ? 'Posting...' : 'Post Story'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#6d28d9] px-6 py-5 mb-5">
          <div className="absolute top-0 right-0 w-44 h-44 bg-white/[0.03] rounded-full -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/[0.03] rounded-full translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-3 right-6 text-white/[0.06]"><Trophy size={56} /></div>

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="max-w-lg">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-semibold tracking-wide w-fit mb-2">
                <Star size={10} fill="currentColor" />
                Community Wall
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                Our Achievers
              </h1>
              <p className="text-violet-200/80 text-[12px] mt-1.5 leading-relaxed">
                Real stories from real people. See how our community members landed their dream jobs and transformed their careers.
              </p>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-violet-700 font-bold text-[12px] hover:bg-violet-50 transition-colors shadow-lg shadow-purple-900/30 shrink-0"
            >
              <PartyPopper size={14} />
              Share Your Story
            </button>
          </div>

          <div className="relative z-10 flex items-center gap-5 mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-violet-300" />
              <span className="text-[15px] font-bold text-white">{stories.length}</span>
              <span className="text-violet-300/70 text-[11px]">Stories</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} className="text-emerald-300" />
              <span className="text-[15px] font-bold text-white">100%</span>
              <span className="text-violet-300/70 text-[11px]">Placement</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award size={13} className="text-amber-300" />
              <span className="text-[15px] font-bold text-white">Top</span>
              <span className="text-violet-300/70 text-[11px]">Companies</span>
            </div>
          </div>
        </div>

      {/* ═══ Split Layout: Stories + Sidebar ═══ */}
      <div className="flex gap-5 items-start">

      {/* ═══ Left — Stories Feed ═══ */}
      <div className="flex-1 min-w-0">

        {/* Stories */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-[3px] border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-lg border border-gray-200">
          <div className="w-14 h-14 mx-auto rounded-full bg-violet-50 flex items-center justify-center mb-3">
            <Trophy size={24} className="text-violet-300" />
          </div>
          <h3 className="text-[14px] font-bold text-gray-700">No stories yet</h3>
          <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
            Be the first to share your success story and inspire the community!
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-[12px] font-semibold hover:bg-violet-700 transition-colors"
          >
            <PartyPopper size={13} />
            Share Your Story
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => {
            const initial = story.user?.fullName?.charAt(0)?.toUpperCase() || '?';
            const isOwn = story.userId === user?.id;
            const avatarGradient = getAvatarColor(story.user?.fullName);

            return (
              <div key={story.id} className="group relative bg-white rounded-lg border border-gray-200">

                {/* Trophy watermark */}
                <div className="absolute top-4 right-4 text-gray-100">
                  <Trophy size={52} />
                </div>

                {/* Delete button for own stories */}
                {isOwn && (
                  <button
                    onClick={() => handleDelete(story.id)}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 p-1 z-20"
                    title="Delete story"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                {/* Card content */}
                <div className="relative z-10 px-5 py-4">
                  {/* Header row: Avatar + Info */}
                  <div className="flex items-center gap-3">
                    <div className={`shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center`}>
                      <span className="text-white font-bold text-[14px]">{initial}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[13px] font-bold text-gray-900 truncate">
                          {story.user?.fullName}
                        </h3>
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60">
                          <BadgeCheck size={11} className="text-emerald-500" />
                          <span className="text-[9px] font-semibold text-emerald-600">Placed</span>
                        </div>
                      </div>
                      {story.createdAt && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {formatDate(story.createdAt)} · {formatTime(story.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Role & Company pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-50 border border-violet-100">
                      <Briefcase size={11} className="text-violet-500" />
                      <span className="text-[11px] font-semibold text-violet-700">{story.jobTitle}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100">
                      <Building2 size={11} className="text-blue-500" />
                      <span className="text-[11px] font-semibold text-blue-700">{story.company}</span>
                    </div>
                  </div>

                  {/* Story text */}
                  {story.story && (
                    <div className="mt-3 flex gap-2">
                      <Quote size={14} className="text-gray-200 shrink-0 mt-0.5 rotate-180" />
                      <p className="text-[12px] text-gray-600 leading-relaxed">
                        {story.story}
                      </p>
                    </div>
                  )}

                  {/* Bottom row: celebration */}
                  <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-dashed border-amber-200/60">
                    <PartyPopper size={12} className="text-amber-400" />
                    <span className="text-[10px] font-medium text-gray-400">Congratulations on the placement!</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* ═══ Right — Sidebar ═══ */}
      <div className="hidden lg:block w-[280px] shrink-0">
        <div className="sticky top-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 pt-5 pb-5">
            {/* Heading */}
            <h3 className="text-[15px] font-extrabold text-gray-900 leading-snug">
              Transform Your Career With{' '}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                INNOGARAGE.ai
              </span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              Your all-in-one career companion — matching you with the right jobs, building your resume, and preparing you for interviews.
            </p>

            {/* Feature list */}
            <div className="space-y-1.5 mt-4">
              {[
                { icon: Target, title: 'AI-Powered Job Matching', color: 'text-violet-600', bg: 'bg-violet-50' },
                { icon: GraduationCap, title: 'Dedicated Mentor Support', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { icon: Zap, title: 'Tailored Resume Builder', color: 'text-amber-600', bg: 'bg-amber-50' },
                { icon: Headphones, title: 'Interview Preparation', color: 'text-sky-600', bg: 'bg-sky-50' },
                { icon: BarChart3, title: 'Career Growth Tracking', color: 'text-rose-600', bg: 'bg-rose-50' },
              ].map(({ icon: Icon, title, bg, color }) => (
                <div key={title} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50/80 border border-gray-100 hover:bg-gray-50 transition-colors cursor-default">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={color} />
                  </div>
                  <p className="text-[11px] font-semibold text-gray-700">{title}</p>
                </div>
              ))}
            </div>

            {/* Upgrade Button */}
            <button
              onClick={() => setShowSubscribe(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-[12px] tracking-wide transition-all mt-4">
              <Crown size={14} className="text-amber-300" />
              Upgrade
            </button>
          </div>
        </div>
      </div>

      </div>

      {/* Subscribe Dialog */}
      <SubscribeDialog isOpen={showSubscribe} onClose={() => setShowSubscribe(false)} userEmail={user?.email} />
    </div>
  );
};

export default AchieversPage;
