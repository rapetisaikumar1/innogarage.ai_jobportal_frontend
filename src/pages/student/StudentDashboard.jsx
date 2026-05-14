import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  STUDENT_PORTAL_MODE,
  buildPortalRequestConfig,
  getPortalEndpoint,
  getPortalSectionRoute,
  getPortalStorageKey,
  isAdminPortalView,
  navigatePortalSection,
} from '../../utils/studentPortalView';
import {
  Briefcase, FileText, Calendar, Clock,
  XCircle, Search, ArrowRight, MessageSquare
} from 'lucide-react';

const AVATAR_BG = [
  'bg-blue-600','bg-violet-600','bg-emerald-600','bg-rose-600','bg-orange-600',
  'bg-amber-600','bg-cyan-600','bg-fuchsia-600','bg-teal-600',
  'bg-indigo-600','bg-pink-600','bg-sky-600','bg-lime-600',
];
const avatarBg = (name) => AVATAR_BG[Math.abs([...(name||'')].reduce((a,c)=>a+c.charCodeAt(0),0)) % AVATAR_BG.length];

const APPLICATION_STATUS_MENTOR_APPLIED = 'mentor applied';
const APPLICATION_STATUS_STUDENT_APPLIED = 'student applied';
const APPLICATION_STATUS_STUDENT_ACTION_REQUIRED = 'student action required';

const normalizeApplicationStatus = (status, appliedById = null) => {
  const normalized = String(status || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (normalized === APPLICATION_STATUS_MENTOR_APPLIED) return APPLICATION_STATUS_MENTOR_APPLIED;
  if (normalized === APPLICATION_STATUS_STUDENT_APPLIED) return APPLICATION_STATUS_STUDENT_APPLIED;
  if (normalized === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED) return APPLICATION_STATUS_STUDENT_ACTION_REQUIRED;
  if (normalized === 'applied') return appliedById ? APPLICATION_STATUS_MENTOR_APPLIED : APPLICATION_STATUS_STUDENT_APPLIED;
  if (!normalized && !appliedById) return APPLICATION_STATUS_STUDENT_APPLIED;
  return appliedById ? APPLICATION_STATUS_MENTOR_APPLIED : APPLICATION_STATUS_STUDENT_APPLIED;
};

const formatApplicationStatus = (status) => String(status || '')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const DonutChart = ({ value, max, color, trackColor = '#e0e7ff', size = 88, strokeWidth = 9 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - percentage * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
    </svg>
  );
};

const isNotATitle = (s) => {
  if (!s || s.length < 3) return true;
  const lower = s.toLowerCase().trim();
  return /^(this is|we are|our |the company|company description|about |join |apply|click|please|note:|remote|hybrid|onsite|on-site|in-office)/i.test(lower)
    || /^(and |or |but |also |then )/i.test(lower)
    || lower.length < 4;
};

const cleanRoleTitle = (raw) => {
  if (!raw) return raw;
  let t = raw.trim();
  t = t.replace(/^(?:seeking|looking\s+for|hiring)\s+(?:a|an)\s+/i, '');
  t = t.replace(/^(?:an?|the)\s+/i, '');
  t = t.replace(/^(?:experienced|highly\s+skilled|skilled|seasoned|motivated|talented|dedicated|passionate|detail[- ]?oriented|results[- ]?driven|innovative|creative|dynamic|proactive|enthusiastic|driven|ambitious|proficient|certified|licensed|qualified|accomplished|senior|junior|mid[- ]?level|lead|principal|staff|entry[- ]?level|associate|and\s+(?:innovative|experienced|creative|dynamic|motivated|skilled))\s+/gi, '');
  t = t.replace(/^(?:experienced|highly\s+skilled|skilled|seasoned|motivated|talented|dedicated|passionate|detail[- ]?oriented|results[- ]?driven|innovative|creative|dynamic|proactive|enthusiastic|driven|senior|junior|mid[- ]?level|lead|principal|staff|entry[- ]?level|associate)\s+/gi, '');
  t = t.replace(/^(?:and|or|but|who|that|&)\s+/i, '');
  t = t.replace(/\s+(?:with\s+(?:strong|extensive|deep|expertise|experience|proficiency|knowledge|a\s+focus)|who\s+will|to\s+join|responsible\s+for|that\s+will|having|capable\s+of)\b.*/i, '');
  t = t.trim().slice(0, 80);
  return t || raw.trim().slice(0, 80);
};

const extractRole = (job) => {
  if (job.job_title && !isNotATitle(job.job_title)) {
    const cleaned = cleanRoleTitle(job.job_title);
    if (!isNotATitle(cleaned)) return cleaned;
  }
  const jd = job.jd || '';
  const roleMatch = jd.match(/(?:Role|Position|Job\s*Title|Title)\s*[:–\-]\s*(.+)/i);
  if (roleMatch) {
    const candidate = cleanRoleTitle(roleMatch[1].split(/[\n.]/)[0].trim());
    if (!isNotATitle(candidate)) return candidate;
  }
  const hiringMatch = jd.match(/(?:hiring|seeking|looking for)\s+(?:a|an)?\s*(.+?)(?:\.|\n|$)/i);
  if (hiringMatch) {
    const candidate = cleanRoleTitle(hiringMatch[1].trim());
    if (!isNotATitle(candidate)) return candidate;
  }
  const lines = jd.split(/[\n.]/).map(l => l.trim()).filter(l => l.length > 5);
  for (const line of lines) {
    if (!isNotATitle(line)) {
      const candidate = cleanRoleTitle(line);
      if (!isNotATitle(candidate) && candidate.length > 5) return candidate;
    }
  }
  if (job.job_title && job.job_title.trim().length > 3) return job.job_title.trim().slice(0, 80);
  return job.employer_name || 'View Details';
};

const extractResumeRoleTitle = (resumeText, candidateName, pipelineCandidateName) => {
  if (!resumeText) return '';
  const nameVariants = new Set();
  const nameParts = new Set();
  const addName = (raw) => {
    if (!raw) return;
    const n = raw.trim().toLowerCase();
    if (!n) return;
    nameVariants.add(n);
    const parts = n.split(/\s+/);
    parts.forEach(p => { if (p.length >= 2) nameParts.add(p); });
    if (parts.length >= 2) {
      nameVariants.add(parts.join(' '));
      nameVariants.add(parts[0] + ' ' + parts[parts.length - 1]);
      for (let i = 0; i < parts.length; i++)
        for (let j = i + 1; j < parts.length; j++)
          nameVariants.add(parts[i] + ' ' + parts[j]);
    }
  };
  addName(candidateName);
  addName(pipelineCandidateName);
  const isNameLine = (line) => {
    const lower = line.trim().toLowerCase().replace(/[.,\-]+$/, '').trim();
    if (!lower) return false;
    for (const v of nameVariants) if (lower === v) return true;
    if (nameParts.size >= 2) {
      const words = lower.split(/\s+/).filter(w => w.length >= 2);
      if (words.length >= 1 && words.length <= 4) {
        const matched = words.filter(w => nameParts.has(w)).length;
        if (matched >= Math.ceil(words.length * 0.6)) return true;
      }
    }
    return false;
  };
  const looksLikePersonName = (line) => {
    const t = line.trim();
    if (!/^[A-Z][a-zA-Z\-']+(?:\s+[A-Z][a-zA-Z\-']+){0,3}$/.test(t) && !/^[A-Z\-']+(?:\s+[A-Z\-']+){0,3}$/.test(t)) return false;
    if (/\b(engineer|developer|manager|analyst|designer|architect|consultant|specialist|coordinator|director|lead|admin|officer|scientist|intern|assistant|associate|senior|junior|staff|principal|head|chief|vp|cto|ceo|cfo|coo)\b/i.test(t)) return false;
    return true;
  };
  const isContactInfoLine = (line) => {
    const l = line.trim();
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(l);
    const hasPhone = /(\+?\(?\d[\d\s\-().]{6,}\d)/i.test(l);
    if (hasEmail || hasPhone) {
      const rest = l.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '').replace(/\(?\+?\d[\d\s\-().]{6,}\d/g, '').replace(/[|,;\s]/g, '').trim();
      if (rest.length < 5) return true;
    }
    return false;
  };
  const sectionHeaders = /^\s*(PROFESSIONAL\s*SUMMARY|SUMMARY|OBJECTIVE|PROFESSIONAL\s*EXPERIENCE|EXPERIENCE|WORK\s*EXPERIENCE|EDUCATION|SKILLS|KEY\s*SKILLS|TECHNICAL\s*SKILLS|CERTIFICATIONS|PROJECTS|ACHIEVEMENTS|AWARDS|LANGUAGES|INTERESTS|REFERENCES|CONTACT|PROFILE|QUALIFICATIONS|CORE\s*COMPETENCIES)\s*:?\s*$/i;
  const lines = resumeText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isNameLine(trimmed)) continue;
    if (looksLikePersonName(trimmed)) continue;
    if (isContactInfoLine(trimmed)) continue;
    if (/^\s*(remote|on-?site|hybrid)?\s*\(?.*(usa|india|uk|canada|germany|australia)/i.test(trimmed)) continue;
    if (sectionHeaders.test(trimmed)) break;
    if (trimmed.length <= 80 && !/@/.test(trimmed) && !/^\(?\+/.test(trimmed)) return trimmed;
  }
  return '';
};

const getRecentYourJobTime = (job) => new Date(job?.matchedAt || job?.updatedAt || job?.createdAt || 0).getTime();

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';
};

const formatShortDateTime = (value) => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PortalLink = ({ portalMode, section, navigate, onPortalNavigate, className, children }) => {
  if (isAdminPortalView(portalMode)) {
    return (
      <button
        type="button"
        onClick={() => navigatePortalSection({ portalMode, section, navigate, onPortalNavigate })}
        className={className}
      >
        {children}
      </button>
    );
  }

  return <Link to={getPortalSectionRoute(section)} className={className}>{children}</Link>;
};

const StudentDashboard = ({
  portalMode = STUDENT_PORTAL_MODE.STUDENT,
  studentId = null,
  viewerUser = null,
  onPortalNavigate = null,
}) => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const user = viewerUser || authUser;
  const isAdminView = isAdminPortalView(portalMode);
  const pendingAppliedKey = getPortalStorageKey('pendingApplied', { portalMode, studentId });
  const [stats, setStats] = useState(null);
  const [recentApps, setRecentApps] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      if (isAdminView) {
        if (!studentId) {
          setStats(null);
          setRecentApps([]);
          setRecentJobs([]);
          setUpcomingSessions([]);
          setRecentChats([]);
          return;
        }
      }

      const portalOptions = { portalMode, studentId };
      const baseConfig = buildPortalRequestConfig(portalMode);
      const [statsRes, appsRes, yourJobsRes, bookingsResult, chatsResult] = await Promise.all([
        api.get(getPortalEndpoint('stats', portalOptions), baseConfig),
        api.get(
          getPortalEndpoint('applications', portalOptions),
          buildPortalRequestConfig(portalMode, { params: { limit: 5, t: Date.now() } })
        ),
        api.get(
          getPortalEndpoint('yourJobs', portalOptions),
          buildPortalRequestConfig(portalMode, { params: { fast: 1 } })
        ),
        isAdminView ? Promise.resolve({ status: 'fulfilled', value: { data: [] } }) : api.get('/mentoring/my-bookings').then((value) => ({ status: 'fulfilled', value })).catch((reason) => ({ status: 'rejected', reason })),
        isAdminView ? Promise.resolve({ status: 'fulfilled', value: { data: [] } }) : api.get('/chat/contacts').then((value) => ({ status: 'fulfilled', value })).catch((reason) => ({ status: 'rejected', reason })),
      ]);

      const recentYourJobs = yourJobsRes.data.jobs || [];
      const savedApplications = appsRes.data.applications || [];
      const PENDING_TTL_MS = 10 * 60 * 1000;
      const now = Date.now();
      const pendingApplied = (() => {
        try { return JSON.parse(sessionStorage.getItem(pendingAppliedKey) || '[]'); } catch { return []; }
      })().filter(p => p.appliedAt && (now - new Date(p.appliedAt).getTime()) < PENDING_TTL_MS);
      const apiJobLinks = new Set(savedApplications.map(a => a.applyLink || a.jobLink));
      const stillPending = pendingApplied.filter(p => !apiJobLinks.has(p.jobLink));
      if (stillPending.length !== pendingApplied.length) {
        try { sessionStorage.setItem(pendingAppliedKey, JSON.stringify(stillPending)); } catch { /* ignore */ }
      }
      const combinedApplications = [
        ...savedApplications,
        ...stillPending.map(p => ({
          id: p.jobLink,
          applyLink: p.jobLink,
          company: p.employerName,
          title: p.jobTitle,
          status: normalizeApplicationStatus(p.status),
          matchingScore: p.matchScore,
          appliedAt: p.appliedAt,
        })),
      ];

      const getApplicationStatus = (application) => normalizeApplicationStatus(application.status, application.appliedById);

      setStats({
        ...statsRes.data,
        totalApplied: combinedApplications.length,
        externalAppliedCount: 0,
        totalApplications: combinedApplications.length,
        totalMatchedJobs: recentYourJobs.length,
        adminApplyCount: combinedApplications.filter(app => getApplicationStatus(app) === APPLICATION_STATUS_MENTOR_APPLIED).length,
        candidateApplyCount: combinedApplications.filter(app => getApplicationStatus(app) === APPLICATION_STATUS_STUDENT_APPLIED).length,
      });
      setRecentApps(combinedApplications.map(app => ({
        id: app.id || app.applyLink,
        title: app.title || app.job?.title || 'Job Application',
        company: app.company || app.job?.company || '-',
        status: getApplicationStatus(app),
        appliedAt: app.appliedAt || app.createdAt,
        jobLink: app.applyLink || app.jobLink || app.job?.applyLink || null,
        matchScore: app.matchingScore || app.matchScore || 0,
        fullJob: null,
      })).slice(0, 5));
      setRecentJobs(
        [...recentYourJobs]
          .sort((a, b) => getRecentYourJobTime(b) - getRecentYourJobTime(a))
          .slice(0, 5)
      );
      const currentDate = new Date();
      const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value.data || [] : [];
      const chats = chatsResult.status === 'fulfilled' ? chatsResult.value.data || [] : [];
      setUpcomingSessions(bookings
        .filter((booking) => booking?.slot?.startTime && new Date(booking.slot.startTime) > currentDate && ['PENDING', 'CONFIRMED'].includes(booking.status))
        .sort((left, right) => new Date(left.slot.startTime) - new Date(right.slot.startTime))
        .slice(0, 4));
      setRecentChats(chats
        .sort((left, right) => (right.unreadCount || 0) - (left.unreadCount || 0))
        .slice(0, 4));
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdminView, pendingAppliedKey, portalMode, studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, location.key]);

  // Silent re-fetch when user returns to this tab/window (handles race condition
  // where Apply is clicked then the user quickly navigates to Dashboard)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [fetchData]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.fullName?.split(' ')[0] || 'User';
  const totalApplied = stats?.totalApplications || stats?.totalApplied || 0;
  const interviewCount = stats?.interviewScheduled || 0;
  const rejectedCount = stats?.rejected || 0;
  const totalMatchedJobs = stats?.totalMatchedJobs || stats?.totalJobs || 0;
  const jobsToApply = Math.max(totalMatchedJobs - totalApplied, 0);
  const adminApplyCount = stats?.adminApplyCount || 0;
  const candidateApplyCount = stats?.candidateApplyCount || 0;
  const totalCount = totalApplied;

  const statCards = [
    { label: 'Applications', value: totalApplied, icon: FileText, light: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Interviews', value: interviewCount, icon: Calendar, light: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'Jobs to Apply', value: jobsToApply, icon: Briefcase, light: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Rejected', value: rejectedCount, icon: XCircle, light: 'bg-red-50', text: 'text-red-600' },
  ];

  const getStatusLabel = (status) => {
    const map = {
      INTERVIEW_SCHEDULED: 'Interview',
      REJECTED: 'Rejected',
      OFFER_RECEIVED: 'Offer',
    };
    return map[status] || formatApplicationStatus(status);
  };

  const statusStyle = (status) => {
    if (status === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (status === APPLICATION_STATUS_MENTOR_APPLIED) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (status === APPLICATION_STATUS_STUDENT_APPLIED) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'INTERVIEW_SCHEDULED') return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (status === 'REJECTED') return 'bg-red-50 text-red-600 border-red-200';
    if (status === 'OFFER_RECEIVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3">
        <div>
          <h1 className="text-[18px] font-bold text-gray-800 tracking-tight leading-none">
            {greeting}, <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">{firstName}</span>
          </h1>
          <p className="text-[13px] font-medium text-gray-500 mt-0.5">Here's your career progress at a glance</p>
        </div>
        <button
          onClick={() => navigatePortalSection({ portalMode, section: 'jobs', navigate, onPortalNavigate })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Search size={12} strokeWidth={2.5} />
          Find Jobs
        </button>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, light, text }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-sm">
            <div className={`w-8 h-8 ${light} rounded-lg flex items-center justify-center shrink-0`}>
              <Icon size={14} className={text} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[22px] font-extrabold text-gray-900 leading-none">{value}</p>
              <p className="text-[12px] font-medium text-gray-600 mt-0.5 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main two-column grid ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_300px]">

        {/* Left: Recent Apps + Recent Jobs */}
        <div className="space-y-3 min-w-0">

          {/* Recent Applications */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/40">
              <h2 className="text-[14px] font-bold text-gray-700 flex items-center gap-1.5">
                <Briefcase size={14} className="text-gray-400" />
                Recent Applications
              </h2>
              {recentApps.length > 0 && (
                <PortalLink portalMode={portalMode} section="applications" navigate={navigate} onPortalNavigate={onPortalNavigate} className="text-[12px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5">
                  View All <ArrowRight size={10} />
                </PortalLink>
              )}
            </div>
            {recentApps.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-4">
                <Briefcase size={20} className="text-gray-200 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium text-gray-500">No applications yet</p>
                  <PortalLink portalMode={portalMode} section="jobs" navigate={navigate} onPortalNavigate={onPortalNavigate} className="text-[12px] text-indigo-500 hover:underline">Browse jobs to get started →</PortalLink>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50/80 max-h-[280px] overflow-y-auto">
                {recentApps.map((app) => {
                  const dateStr = new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const score = parseInt(app.matchScore) || 0;
                  const fullJob = app.fullJob;
                  const resumeRole = fullJob ? extractResumeRoleTitle(fullJob.resume_text, user?.fullName, fullJob.candidate_name) : '';
                  const roleTitle = resumeRole || (fullJob ? extractRole(fullJob) : app.title);
                  return (
                    <div key={app.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 transition-colors">
                      <div className={`w-8 h-8 rounded-md ${avatarBg(app.company)} text-white flex items-center justify-center font-bold text-[12px] shrink-0`}>
                        {app.company?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <span className="text-[13px] font-semibold text-gray-900 truncate">{app.company || '—'}</span>
                          <span className="text-[11px] font-medium text-violet-600 truncate hidden sm:block">{roleTitle}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1"><Clock size={9} />{dateStr}</span>
                          {score > 0 && (
                            <span className={`text-[11px] font-semibold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>{score}% match</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${statusStyle(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/40">
              <h2 className="text-[14px] font-bold text-gray-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                Upcoming Sessions
              </h2>
              {!isAdminView && upcomingSessions.length > 0 && (
                <PortalLink portalMode={portalMode} section="mentoring" navigate={navigate} onPortalNavigate={onPortalNavigate} className="text-[12px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5">
                  View All <ArrowRight size={10} />
                </PortalLink>
              )}
            </div>
            {upcomingSessions.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-4">
                <Calendar size={20} className="text-gray-200 shrink-0" />
                <p className="text-[13px] font-medium text-gray-500">No upcoming mentoring sessions</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50/80 max-h-[250px] overflow-y-auto">
                {upcomingSessions.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 transition-colors">
                    <div className="w-8 h-8 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-[12px] shrink-0">
                      {getInitials(booking.slot?.mentor?.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{booking.slot?.mentor?.fullName || 'Mentor'}</p>
                      <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1"><Clock size={9} />{formatShortDateTime(booking.slot?.startTime)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${booking.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/40">
              <h2 className="text-[14px] font-bold text-gray-700 flex items-center gap-1.5">
                <Search size={14} className="text-gray-400" />
                Recent Jobs
              </h2>
              {recentJobs.length > 0 && (
                <PortalLink portalMode={portalMode} section="your-jobs" navigate={navigate} onPortalNavigate={onPortalNavigate} className="text-[12px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5">
                  View All <ArrowRight size={10} />
                </PortalLink>
              )}
            </div>
            {recentJobs.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-4">
                <Search size={20} className="text-gray-200 shrink-0" />
                <p className="text-[13px] font-medium text-gray-600">No Your Jobs matches yet — matched roles from <span className="font-semibold text-gray-800">Find Jobs</span> will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-2 font-semibold">Role</th>
                      <th className="px-4 py-2 font-semibold">Company</th>
                      <th className="px-4 py-2 font-semibold">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((job) => {
                      const rawJob = job.rawPayload || job;
                      const title = job.title || extractRole(rawJob);
                      const score = parseInt(job.matchingScore || job.matchScore || job.match_score) || 0;
                      return (
                        <tr
                          key={job.id}
                          className="border-t border-gray-50/80 hover:bg-gray-50/40 cursor-pointer transition-colors"
                          onClick={() => navigatePortalSection({ portalMode, section: 'your-jobs', navigate, onPortalNavigate })}
                        >
                          <td className="px-4 py-2">
                            <p className="text-[13px] font-semibold text-gray-800 truncate max-w-[180px]">{title}</p>
                          </td>
                          <td className="px-4 py-2 text-[13px] font-medium text-gray-600 truncate max-w-[140px]">{job.company || job.employer_name || '—'}</td>
                          <td className="px-4 py-2">
                            {score > 0
                              ? <span className={`text-[13px] font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>{score}%</span>
                              : <span className="text-gray-300 text-[12px]">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar: donut charts */}
        <div className="space-y-3">

          {/* Recent Chat */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/40">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <MessageSquare size={13} className="text-gray-400" />
                Recent Chat
              </h3>
              {!isAdminView && recentChats.length > 0 && (
                <PortalLink portalMode={portalMode} section="chat" navigate={navigate} onPortalNavigate={onPortalNavigate} className="text-[12px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5">
                  Open <ArrowRight size={10} />
                </PortalLink>
              )}
            </div>
            {recentChats.length === 0 ? (
              <div className="px-4 py-5 text-center">
                <MessageSquare size={24} className="mx-auto text-gray-200" />
                <p className="mt-2 text-[13px] font-medium text-gray-500">No recent chats</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50/80 max-h-[240px] overflow-y-auto">
                {recentChats.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/60 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {getInitials(contact.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-gray-900">{contact.fullName}</p>
                      <p className="text-[11px] font-medium text-gray-400">{contact.role?.replace('_', ' ') || 'Contact'}</p>
                    </div>
                    {contact.unreadCount > 0 && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">{contact.unreadCount}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applications Overview */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Applications</h3>
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <DonutChart value={totalApplied} max={totalMatchedJobs || 1} color="#1e40af" trackColor="#d1fae5" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[17px] font-extrabold text-gray-900 leading-none">{totalCount}</span>
                  <span className="text-[9px] font-medium text-gray-500">Total</span>
                </div>
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                {[
                  { dot: 'bg-blue-800',    label: 'Applications',    val: totalApplied },
                  { dot: 'bg-cyan-500',    label: 'Candidate',  val: candidateApplyCount },
                  { dot: 'bg-amber-500',   label: 'Admin',      val: adminApplyCount },
                  { dot: 'bg-emerald-400', label: 'To Apply',   val: jobsToApply },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${r.dot} shrink-0`} />
                      <span className="text-[12px] font-medium text-gray-600 truncate">{r.label}</span>
                    </div>
                    <span className="text-[13px] font-bold text-gray-800 ml-1">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
