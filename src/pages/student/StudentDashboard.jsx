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
  XCircle, Search, ArrowRight
} from 'lucide-react';

const AVATAR_BG = [
  'bg-blue-600','bg-violet-600','bg-emerald-600','bg-rose-600','bg-orange-600',
  'bg-amber-600','bg-cyan-600','bg-fuchsia-600','bg-teal-600',
  'bg-indigo-600','bg-pink-600','bg-sky-600','bg-lime-600',
];
const avatarBg = (name) => AVATAR_BG[Math.abs([...(name||'')].reduce((a,c)=>a+c.charCodeAt(0),0)) % AVATAR_BG.length];

const DonutChart = ({ value, max, color, trackColor = '#e0e7ff', size = 80, strokeWidth = 8 }) => {
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

const extractResumeRoleTitle = (resumeText, candidateName, sheetCandidateName) => {
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
  addName(sheetCandidateName);
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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      if (isAdminView) {
        if (!studentId) {
          setStats(null);
          setRecentApps([]);
          setRecentJobs([]);
          return;
        }

        const [dashboardRes, jobsRes] = await Promise.all([
          api.get(
            getPortalEndpoint('dashboardData', { portalMode, studentId }),
            buildPortalRequestConfig(portalMode, { params: { t: Date.now() } })
          ),
          api.get(
            getPortalEndpoint('matchedJobs', { portalMode, studentId }),
            buildPortalRequestConfig(portalMode)
          ),
        ]);

        const allJobs = jobsRes.data.jobs || [];
        const sheetApplied = dashboardRes.data.sheetApplications || [];
        const dashboardStats = dashboardRes.data.stats || {};

        setStats({
          ...dashboardStats,
          totalSheetJobs: dashboardStats.totalSheetJobs ?? allJobs.length,
          sheetAppliedCount: dashboardStats.sheetAppliedCount ?? sheetApplied.length,
        });

        const jobsMap = {};
        allJobs.forEach(j => { if (j.job_apply_link) jobsMap[j.job_apply_link] = j; });

        const dbApps = (dashboardRes.data.recentApplications || []).map(app => ({
          id: app.id,
          title: app.job?.title || 'Untitled',
          company: app.job?.company || '—',
          status: app.status,
          appliedAt: app.appliedAt,
          jobLink: null,
          matchScore: null,
          source: 'db',
          fullJob: null,
        }));

        const sheetApps = sheetApplied.map(app => {
          const fullJob = jobsMap[app.jobLink];
          return {
            id: app.jobLink,
            title: app.jobTitle || app.employerName || 'Job Application',
            company: app.employerName || '—',
            status: app.status || 'APPLIED',
            appliedAt: app.createdAt,
            matchScore: app.matchScore,
            jobLink: app.jobLink,
            source: 'sheet',
            fullJob,
          };
        });

        const seenLinks = new Set(dbApps.map(a => a.jobLink).filter(Boolean));
        const uniqueSheet = sheetApps.filter(a => !seenLinks.has(a.jobLink));
        const allApps = [...dbApps, ...uniqueSheet].sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        setRecentApps(allApps.slice(0, 5));
        setRecentJobs(
          [...allJobs]
            .sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0))
            .slice(0, 5)
        );
      } else {
        const [statsRes, appsRes, jobsRes, sheetAppliedRes] = await Promise.all([
          api.get('/jobs/stats?refresh=1'),
          api.get('/jobs/applications/mine?limit=5'),
          api.get('/jobs/matched'),
          api.get('/jobs/external-applied-status'),
        ]);
        const allJobs = jobsRes.data.jobs || [];
        const sheetApplied = sheetAppliedRes.data.applications || [];

        // Merge pending applies from sessionStorage (covers race condition: user
        // navigated to Dashboard before the mark-applied API call completed)
        const PENDING_TTL_MS = 10 * 60 * 1000; // 10 minutes
        const now = Date.now();
        const pendingApplied = (() => {
          try { return JSON.parse(sessionStorage.getItem(pendingAppliedKey) || '[]'); } catch { return []; }
        })().filter(p => p.appliedAt && (now - new Date(p.appliedAt).getTime()) < PENDING_TTL_MS);
        const apiJobLinks = new Set(sheetApplied.map(a => a.jobLink));
        const stillPending = pendingApplied.filter(p => !apiJobLinks.has(p.jobLink));
        if (stillPending.length !== pendingApplied.length) {
          try { sessionStorage.setItem(pendingAppliedKey, JSON.stringify(stillPending)); } catch { /* ignore */ }
        }
        const combinedSheetApplied = [
          ...sheetApplied,
          ...stillPending.map(p => ({
            jobLink: p.jobLink,
            employerName: p.employerName,
            jobTitle: p.jobTitle,
            status: 'APPLIED',
            appliedMethod: 'MANUAL',
            matchScore: p.matchScore,
            createdAt: p.appliedAt,
          })),
        ];

        // candidateApplyCount from backend only reflects saved DB records;
        // add any still-pending (not yet confirmed) applies — they're always candidate-initiated
        const updatedCandidateCount = (statsRes.data.candidateApplyCount || 0) + stillPending.length;
        setStats({
          ...statsRes.data,
          sheetAppliedCount: combinedSheetApplied.length,
          totalSheetJobs: allJobs.length,
          candidateApplyCount: updatedCandidateCount,
        });

        // Build jobLink -> full job map
        const jobsMap = {};
        allJobs.forEach(j => { if (j.job_apply_link) jobsMap[j.job_apply_link] = j; });

        // Merge DB + sheet apps (same as MyApplications)
        const dbApps = (appsRes.data.applications || []).map(app => ({
          id: app.id,
          title: app.job?.title || 'Untitled',
          company: app.job?.company || '—',
          status: app.status,
          appliedAt: app.appliedAt,
          jobLink: null,
          matchScore: null,
          source: 'db',
          fullJob: null,
        }));
        const sheetApps = combinedSheetApplied.map(app => {
          const fullJob = jobsMap[app.jobLink];
          return {
            id: app.jobLink,
            title: app.jobTitle || app.employerName || 'Job Application',
            company: app.employerName || '—',
            status: app.status || 'APPLIED',
            appliedAt: app.createdAt,
            matchScore: app.matchScore,
            jobLink: app.jobLink,
            source: 'sheet',
            fullJob,
          };
        });
        const seenLinks = new Set(dbApps.map(a => a.jobLink).filter(Boolean));
        const uniqueSheet = sheetApps.filter(a => !seenLinks.has(a.jobLink));
        const allApps = [...dbApps, ...uniqueSheet].sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        setRecentApps(allApps.slice(0, 5));

        // Show newest 5 jobs (by saved_at descending)
        setRecentJobs(
          [...allJobs]
            .sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0))
            .slice(0, 5)
        );
      }
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
    window.addEventListener('focus', fetchData);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', fetchData);
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
  const sheetAppliedCount = stats?.sheetAppliedCount || 0;
  const dbAppliedCount = stats?.totalApplied || 0;
  const totalApplied = sheetAppliedCount + dbAppliedCount;
  const interviewCount = stats?.interviewScheduled || 0;
  const rejectedCount = stats?.rejected || 0;
  const totalSheetJobs = stats?.totalSheetJobs || 0;
  const jobsToApply = Math.max(totalSheetJobs - sheetAppliedCount, 0);
  const adminApplyCount = stats?.adminApplyCount || 0;
  const candidateApplyCount = stats?.candidateApplyCount || 0;
  const totalCount = totalApplied;

  const statCards = [
    { label: 'Applied', value: totalApplied, icon: FileText, light: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Interviews', value: interviewCount, icon: Calendar, light: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'Jobs to Apply', value: jobsToApply, icon: Briefcase, light: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Rejected', value: rejectedCount, icon: XCircle, light: 'bg-red-50', text: 'text-red-600' },
  ];

  const getStatusLabel = (status) => {
    const map = {
      APPLIED: 'Applied',
      INTERVIEW_SCHEDULED: 'Interview',
      REJECTED: 'Rejected',
      OFFER_RECEIVED: 'Offer',
    };
    return map[status] || status;
  };

  const statusStyle = (status) => {
    if (status === 'INTERVIEW_SCHEDULED') return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (status === 'REJECTED') return 'bg-red-50 text-red-600 border-red-200';
    if (status === 'OFFER_RECEIVED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between bg-white/40 backdrop-blur-xl border border-white/50 rounded-xl shadow shadow-indigo-50/30 px-4 py-3">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {statCards.map(({ label, value, icon: Icon, light, text }) => (
          <div key={label} className="bg-white/60 backdrop-blur-md border border-white/50 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-sm">
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">

        {/* Left: Recent Apps + Recent Jobs */}
        <div className="space-y-3 min-w-0">

          {/* Recent Applications */}
          <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 overflow-hidden shadow shadow-blue-50/20">
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

          {/* Recent Job Listings */}
          <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 overflow-hidden shadow shadow-indigo-50/20">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/40">
              <h2 className="text-[14px] font-bold text-gray-700 flex items-center gap-1.5">
                <Search size={14} className="text-gray-400" />
                Recent Job Listings
              </h2>
              {recentJobs.length > 0 && (
                <PortalLink portalMode={portalMode} section="jobs" navigate={navigate} onPortalNavigate={onPortalNavigate} className="text-[12px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5">
                  View All <ArrowRight size={10} />
                </PortalLink>
              )}
            </div>
            {recentJobs.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-4">
                <Search size={20} className="text-gray-200 shrink-0" />
                <p className="text-[13px] font-medium text-gray-600">No matched jobs yet — use <span className="font-semibold text-gray-800">My Jobs</span> to load roles.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-2 font-semibold">Role</th>
                      <th className="px-4 py-2 font-semibold">Company</th>
                      <th className="px-4 py-2 font-semibold">Score</th>
                      <th className="px-4 py-2 font-semibold">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.map((job) => {
                      const resumeRole = extractResumeRoleTitle(job.resume_text, user?.fullName, job.candidate_name);
                      const title = resumeRole || extractRole(job);
                      const score = parseInt(job.match_score) || 0;
                      return (
                        <tr
                          key={job.id}
                          className="border-t border-gray-50/80 hover:bg-gray-50/40 cursor-pointer transition-colors"
                          onClick={() => navigatePortalSection({ portalMode, section: 'jobs', navigate, onPortalNavigate })}
                        >
                          <td className="px-4 py-2">
                            <p className="text-[13px] font-semibold text-gray-800 truncate max-w-[180px]">{title}</p>
                          </td>
                          <td className="px-4 py-2 text-[13px] font-medium text-gray-600 truncate max-w-[140px]">{job.employer_name || '—'}</td>
                          <td className="px-4 py-2">
                            {score > 0
                              ? <span className={`text-[13px] font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>{score}%</span>
                              : <span className="text-gray-300 text-[12px]">—</span>}
                          </td>
                          <td className="px-4 py-2">
                            {job.job_employment_type
                              ? <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-medium rounded">{job.job_employment_type}</span>
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

          {/* Applications Overview */}
          <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 p-5 shadow shadow-blue-50/20">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4">Applications</h3>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <DonutChart value={totalApplied} max={totalSheetJobs || 1} color="#1e40af" trackColor="#d1fae5" size={88} strokeWidth={9} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[17px] font-extrabold text-gray-900 leading-none">{totalCount}</span>
                  <span className="text-[9px] font-medium text-gray-500">Total</span>
                </div>
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                {[
                  { dot: 'bg-blue-800',    label: 'Applied',    val: totalApplied },
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
