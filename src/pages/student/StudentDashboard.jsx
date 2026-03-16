import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
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

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentApps, setRecentApps] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, appsRes, jobsRes, sheetAppliedRes] = await Promise.all([
          api.get('/jobs/stats'),
          api.get('/jobs/applications/mine?limit=5'),
          api.get('/jobs/sheet'),
          api.get('/jobs/sheet/applied-status'),
        ]);
        const allJobs = jobsRes.data.jobs || [];
        const sheetApplied = sheetAppliedRes.data.applications || [];
        setStats({ ...statsRes.data, sheetAppliedCount: sheetApplied.length, totalSheetJobs: allJobs.length });

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

        // Show last 5 jobs (newest first)
        setRecentJobs([...allJobs].reverse().slice(0, 5));
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
  const totalApplied = sheetAppliedCount || stats?.totalApplied || 0;
  const interviewCount = stats?.interviewScheduled || 0;
  const rejectedCount = stats?.rejected || 0;
  const totalSheetJobs = stats?.totalSheetJobs || 0;
  const jobsToApply = Math.max(totalSheetJobs - sheetAppliedCount, 0);

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

  return (
    <div className="space-y-5">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-lg shadow-indigo-100/30 px-6 py-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-100/30 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              {greeting}, <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">{firstName}</span>
            </h1>
            <p className="text-gray-500 text-[13px] mt-1">Here's your career progress at a glance</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/jobs')}
            className="hidden sm:inline-flex items-center gap-2.5 px-4 py-2.5 bg-white/60 backdrop-blur-md border border-white/50 rounded-xl hover:shadow-md hover:bg-white/80 transition-all duration-300 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
              <Search size={15} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[12px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">Find Jobs</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Row with Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Applications Overview */}
        <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 p-5 hover:shadow-lg shadow-md shadow-blue-100/20 transition-all duration-300">
          <h3 className="text-[13px] font-bold text-gray-800 mb-4">Applications Overview</h3>
          <div className="flex items-center gap-5">
            <div className="relative">
              <DonutChart value={totalApplied} max={totalSheetJobs || 1} color="#1e40af" trackColor="#d1fae5" size={90} strokeWidth={10} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-extrabold text-gray-900 leading-none">{totalSheetJobs}</span>
                <span className="text-[9px] text-gray-400 font-medium mt-0.5">Total</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-800" />
                  <span className="text-[12px] text-gray-600">Applied</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{totalApplied}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-[12px] text-gray-600">Jobs to Apply</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{jobsToApply}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 p-5 hover:shadow-lg shadow-md shadow-violet-100/20 transition-all duration-300">
          <h3 className="text-[13px] font-bold text-gray-800 mb-4">Progress</h3>
          <div className="flex items-center gap-5">
            <div className="relative">
              <DonutChart value={interviewCount} max={(totalApplied + interviewCount + rejectedCount) || 1} color="#0e7490" trackColor="#be185d" size={90} strokeWidth={10} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-extrabold text-gray-900 leading-none">{interviewCount + rejectedCount}</span>
                <span className="text-[9px] text-gray-400 font-medium mt-0.5">Updates</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-700" />
                  <span className="text-[12px] text-gray-600">Interviews</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{interviewCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-700" />
                  <span className="text-[12px] text-gray-600">Rejected</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{rejectedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 p-5 hover:shadow-lg shadow-md shadow-emerald-100/20 transition-all duration-300">
          <h3 className="text-[13px] font-bold text-gray-800 mb-4">Summary</h3>
          <div className="space-y-3">
            {statCards.map(({ label, value, icon: Icon, light, text }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 ${light} rounded-lg flex items-center justify-center`}>
                    <Icon size={14} className={text} strokeWidth={2} />
                  </div>
                  <span className="text-[12px] text-gray-600">{label}</span>
                </div>
                <span className="text-[14px] font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 overflow-hidden hover:shadow-lg shadow-md shadow-blue-100/20 transition-all duration-300">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/40">
          <h2 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
            <Briefcase size={14} className="text-gray-400" />
            Recent Applications
          </h2>
          {recentApps.length > 0 && (
            <Link to="/dashboard/applications" className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
              View All <ArrowRight size={11} />
            </Link>
          )}
        </div>
        {recentApps.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Briefcase size={24} className="text-gray-300" />
            </div>
            <p className="text-[14px] text-gray-600 font-semibold">No applications yet</p>
            <p className="text-[12px] text-gray-400 mt-1 mb-5 max-w-xs mx-auto">Start exploring job listings and apply to track your progress here</p>
            <Link
              to="/dashboard/jobs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-[12px] font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Search size={13} /> Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-2">
            {recentApps.map((app) => {
              const dateStr = new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const score = parseInt(app.matchScore) || 0;
              // Derive role title from resume if available
              const fullJob = app.fullJob;
              const resumeRole = fullJob ? extractResumeRoleTitle(fullJob.resume_text, user?.fullName, fullJob.candidate_name) : '';
              const roleTitle = resumeRole || (fullJob ? extractRole(fullJob) : app.title);
              return (
                <div key={app.id} className="border border-gray-100 rounded-lg px-3.5 py-3 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${avatarBg(app.company)} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
                      {app.company?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-semibold text-gray-900 truncate">{app.company || '—'}</h3>
                      <p className="text-[11px] text-violet-600 truncate mt-0.5">{roleTitle}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock size={9} />
                          {dateStr}
                        </span>
                        {score > 0 && (
                          <span className={`text-[10px] font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-violet-600' : 'text-amber-600'}`}>
                            {score}% match
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      {getStatusLabel(app.status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Job Listings */}
      <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 overflow-hidden hover:shadow-lg shadow-md shadow-indigo-100/20 transition-all duration-300">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/40">
          <h2 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
            <Search size={14} className="text-gray-400" />
            Recent Job Listings
          </h2>
          {recentJobs.length > 0 && (
            <Link to="/dashboard/jobs" className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
              View All <ArrowRight size={11} />
            </Link>
          )}
        </div>
        {recentJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-gray-300" />
            </div>
            <p className="text-[14px] text-gray-600 font-semibold">No job listings yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Use "My Jobs" to trigger a job search</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-2.5 font-semibold">Role</th>
                  <th className="px-5 py-2.5 font-semibold">Company</th>
                  <th className="px-5 py-2.5 font-semibold">Score</th>
                  <th className="px-5 py-2.5 font-semibold">Type</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map((job) => {
                  const resumeRole = extractResumeRoleTitle(job.resume_text, user?.fullName, job.candidate_name);
                  const title = resumeRole || extractRole(job);
                  const score = parseInt(job.match_score) || 0;
                  return (
                    <tr key={job.id} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors cursor-pointer" onClick={() => navigate('/dashboard/jobs')}>
                      <td className="px-5 py-3">
                        <p className="text-[13px] font-semibold text-gray-800 truncate max-w-[200px]">{title}</p>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-gray-500">{job.employer_name || '—'}</td>
                      <td className="px-5 py-3">
                        {score > 0 ? (
                          <span className={`text-[13px] font-bold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>{score}%</span>
                        ) : (
                          <span className="text-[12px] text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {job.job_employment_type ? (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded">{job.job_employment_type}</span>
                        ) : (
                          <span className="text-[12px] text-gray-400">—</span>
                        )}
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
  );
};

export default StudentDashboard;
