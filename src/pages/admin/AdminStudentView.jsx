import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Briefcase, FileText, Search, Clock, Calendar,
  CheckCircle2, XCircle, ExternalLink, MapPin, Building2, Zap,
  TrendingUp, Eye, Star, ChevronLeft, ChevronRight, Sparkles,
  RefreshCw, Info, X
} from 'lucide-react';

const AVATAR_BG = [
  'bg-blue-600','bg-violet-600','bg-emerald-600','bg-rose-600','bg-orange-600',
  'bg-amber-600','bg-cyan-600','bg-fuchsia-600','bg-teal-600',
  'bg-indigo-600','bg-pink-600','bg-sky-600','bg-lime-600',
];
const avatarBg = (name) => AVATAR_BG[Math.abs([...(name||'')].reduce((a,c)=>a+c.charCodeAt(0),0)) % AVATAR_BG.length];

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
  if (job.job_title && job.job_title.trim().length > 3) return job.job_title.trim().slice(0, 80);
  return job.employer_name || 'View Details';
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - date) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day ago';
    if (diff < 30) return `${diff} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
};

const statusBadge = (status) => {
  const map = {
    APPLIED: { bg: 'bg-blue-50 text-blue-700 ring-blue-600/20', icon: <Clock size={12} /> },
    INTERVIEW_SCHEDULED: { bg: 'bg-amber-50 text-amber-700 ring-amber-600/20', icon: <Calendar size={12} /> },
    OFFER_RECEIVED: { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: <CheckCircle2 size={12} /> },
    REJECTED: { bg: 'bg-red-50 text-red-700 ring-red-600/20', icon: <XCircle size={12} /> },
  };
  const s = map[status] || { bg: 'bg-gray-50 text-gray-600 ring-gray-500/20', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${s.bg}`}>
      {s.icon} {status?.replace(/_/g, ' ')}
    </span>
  );
};

/* ── parse resume text into structured sections ── */
const parseResumeSections = (text, candidateName, sheetCandidateName) => {
  if (!text) return { contact: '', roleTitle: '', sections: [] };
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
    if (!/^[A-Z][a-zA-Z\-']+(\s+[A-Z][a-zA-Z\-']+){0,3}$/.test(t) && !/^[A-Z\-']+(\s+[A-Z\-']+){0,3}$/.test(t)) return false;
    if (/\b(engineer|developer|manager|analyst|designer|architect|consultant|specialist|coordinator|director|lead|admin|officer|scientist|intern|assistant|associate|senior|junior|staff|principal|head|chief|vp|cto|ceo|cfo|coo)\b/i.test(t)) return false;
    return true;
  };
  const stripName = (line) => {
    if (!nameVariants.size) return line;
    let result = line;
    for (const v of nameVariants) {
      const idx = result.toLowerCase().indexOf(v);
      if (idx === 0) result = result.slice(v.length).trim();
    }
    return result;
  };
  const isContactInfoLine = (line) => {
    const l = line.trim();
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(l);
    const hasPhone = /(\+?\(?\d[\d\s\-().]{6,}\d)/i.test(l);
    if (hasEmail || hasPhone) {
      const rest = l.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '').replace(/\(?\+?\d[\d\s\-().]{6,}\d/g, '').replace(/https?:\/\/\S+/gi, '').replace(/[|,;\s]/g, '').trim();
      if (rest.length < 5) return true;
      if (/^[A-Za-z\s]+,?\s*[A-Z]{2}$/.test(rest) || /^[A-Za-z\s]+$/.test(rest) && rest.length < 20) return true;
    }
    return false;
  };
  const isLocationLine = (line) => {
    if (/^\s*(remote|on-?site|hybrid)?\s*\(?.*(usa|india|uk|canada|germany|australia|arizona|california|texas|new york|florida|illinois|ohio|georgia|north carolina|virginia|washington|massachusetts|colorado|oregon|utah|nevada|michigan|minnesota|maryland|wisconsin|tennessee|missouri|connecticut|iowa|kansas|arkansas|nebraska|idaho|hawaii|alabama|louisiana|oklahoma|kentucky|south carolina|mississippi|pennsylvania|new jersey)[^a-z]*\)?\s*$/i.test(line)) return true;
    if (/^\s*[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\s*$/.test(line.trim())) return true;
    return false;
  };

  const lines = text.split('\n');
  const sectionHeaders = /^\s*(PROFESSIONAL\s*SUMMARY|SUMMARY|OBJECTIVE|PROFESSIONAL\s*EXPERIENCE|EXPERIENCE|WORK\s*EXPERIENCE|EDUCATION|SKILLS|KEY\s*SKILLS|TECHNICAL\s*SKILLS|CERTIFICATIONS|PROJECTS|ACHIEVEMENTS|AWARDS|LANGUAGES|INTERESTS|REFERENCES|CONTACT\s*INFORMATION|PROFESSIONAL\s*PROFILE|PROFILE|QUALIFICATIONS|CORE\s*COMPETENCIES)\s*:?\s*$/i;
  const sections = [];
  let currentSection = null;
  const contactLines = [];
  let roleTitle = '';
  let foundFirstSection = false;

  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed) { if (currentSection) currentSection.lines.push(''); continue; }
    if (isNameLine(trimmed)) continue;
    if (!foundFirstSection && looksLikePersonName(trimmed)) continue;
    if (!foundFirstSection && isLocationLine(trimmed)) continue;
    if (!foundFirstSection && isContactInfoLine(trimmed)) continue;
    trimmed = stripName(trimmed);
    if (!trimmed) continue;
    if (sectionHeaders.test(trimmed)) {
      foundFirstSection = true;
      if (currentSection) sections.push(currentSection);
      currentSection = { heading: trimmed.replace(/:$/, '').trim().toUpperCase(), lines: [] };
    } else if (!foundFirstSection) {
      if (!roleTitle) {
        const titleMatch = trimmed.match(/^\(?\s*(?:job\s*title\s*[:–\-]?)\s*(.+?)\s*\)?$/i);
        if (titleMatch) { roleTitle = titleMatch[1].trim(); continue; }
        if (trimmed.length <= 80 && !/@/.test(trimmed) && !/^\(?\+/.test(trimmed)) { roleTitle = trimmed; continue; }
      }
      contactLines.push(trimmed);
    } else {
      if (!currentSection) currentSection = { heading: 'DETAILS', lines: [] };
      currentSection.lines.push(trimmed);
    }
  }
  if (currentSection) sections.push(currentSection);

  // Post-process: strip leading header-like lines from section content
  for (const section of sections) {
    let cut = 0;
    for (let i = 0; i < Math.min(section.lines.length, 8); i++) {
      const t = section.lines[i].trim();
      if (!t) { cut = i + 1; continue; }
      if (isNameLine(t) || looksLikePersonName(t) || isContactInfoLine(t) || isLocationLine(t)) { cut = i + 1; continue; }
      if (/^[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}$/.test(t)) { cut = i + 1; continue; }
      if (roleTitle && t.toLowerCase() === roleTitle.toLowerCase()) { cut = i + 1; continue; }
      if (/(\+?\(?\d[\d\s\-().]{6,}\d)/.test(t) && t.split(/\s+/).length <= 8) { cut = i + 1; continue; }
      if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(t) && t.split(/\s+/).length <= 8) { cut = i + 1; continue; }
      // Standalone job role/title line
      if (t.length <= 100 && !/[.!?]$/.test(t) && t.split(/\s+/).length <= 12 && !/\b\d{4}\b/.test(t) && /\b(engineer|developer|manager|analyst|designer|architect|consultant|specialist|coordinator|director|lead|administrator|officer|scientist|intern|assistant|associate|programmer|advisor|strategist|optimizer)\b/i.test(t)) { cut = i + 1; continue; }
      if (/^(https?:\/\/|www\.|linkedin\.com|github\.com)/i.test(t)) { cut = i + 1; continue; }
      // Pipe-separated header line
      if (/\|/.test(t)) {
        const hasPhoneInLine = /(\+?\(?\d[\d\s\-().]{6,}\d)/.test(t);
        const hasEmailInLine = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(t);
        if (hasPhoneInLine || hasEmailInLine) { cut = i + 1; continue; }
        const parts = t.split(/\s*\|\s*/);
        const allHeader = parts.every(p => {
          const pt = p.trim();
          return !pt || /^[A-Z][a-zA-Z\s]+,?\s*[A-Z]{2}$/.test(pt) || /linkedin|github|http/i.test(pt) || pt.length < 3;
        });
        if (allHeader) { cut = i + 1; continue; }
      }
      break;
    }
    if (cut > 0) section.lines = section.lines.slice(cut);
  }

  const filteredSections = sections.filter(s => !/^NOTES?/i.test(s.heading) && !/^ADDITIONAL\s*NOTES?/i.test(s.heading) && !/^ADDRESSED\s*GAPS?/i.test(s.heading) && !/^CONTACT\s*INFORMATION$/i.test(s.heading));
  return { contact: contactLines.join('\n'), roleTitle, sections: filteredSections };
};

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={15} /> },
  { key: 'jobs', label: 'Job Listings', icon: <Briefcase size={15} /> },
  { key: 'applications', label: 'My Applications', icon: <FileText size={15} /> },
];

const PAGE_SIZE = 10;

const hasCompleteGeneratedResume = (text) => {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim();
  if (clean.length < 1200) return false;
  return /PROFESSIONAL\s+SUMMARY/i.test(clean) && /(?:PROFESSIONAL\s+EXPERIENCE|WORK\s+EXPERIENCE|EXPERIENCE)/i.test(clean);
};

const AdminStudentView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dashboard state
  const [dashData, setDashData] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  // Jobs state
  const [sheetJobs, setSheetJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobSearch, setJobSearch] = useState('');
  const [jobPage, setJobPage] = useState(1);
  const [appliedLinks, setAppliedLinks] = useState(new Set());
  const [triggeringSearch, setTriggeringSearch] = useState(false);
  const [waitingForJobs, setWaitingForJobs] = useState(false);
  const [showDaysPopup, setShowDaysPopup] = useState(false);
  const [daysInput, setDaysInput] = useState('1');
  const [applyingJob, setApplyingJob] = useState(null);
  const [detailJob, setDetailJob] = useState(null);
  const [resumeJob, setResumeJob] = useState(null);
  const [resumeConfirmJob, setResumeConfirmJob] = useState(null);
  const [generatingResume, setGeneratingResume] = useState(false);
  const resumeRef = useRef(null);
  const [filterType, setFilterType] = useState('all');

  // Applications state
  const [applications, setApplications] = useState([]);
  const [sheetApps, setSheetApps] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appSearch, setAppSearch] = useState('');

  // Fetch student info
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/admin/students/${studentId}`);
        setStudent(res.data);
      } catch {
        toast.error('Failed to load student');
        navigate('/admin/students');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId]);

  // Fetch tab data
  useEffect(() => {
    if (!studentId) return;
    if (activeTab === 'dashboard') fetchDashboard();
    else if (activeTab === 'jobs') { fetchJobs(); fetchAppliedStatus(); }
    else if (activeTab === 'applications') fetchApplications();
  }, [activeTab, studentId]);

  // Re-fetch when user returns to this browser tab (catches student applying in another tab)
  useEffect(() => {
    const onVisible = () => {
      if (!studentId || document.visibilityState !== 'visible') return;
      if (activeTab === 'dashboard') fetchDashboard();
      else if (activeTab === 'applications') fetchApplications();
      else if (activeTab === 'jobs') fetchAppliedStatus();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [activeTab, studentId]);

  const fetchDashboard = async () => {
    setDashLoading(true);
    try {
      // Cache-bust with timestamp so browser never serves a stale 304
      const res = await api.get(`/admin/students/${studentId}/dashboard-data?t=${Date.now()}`);
      setDashData(res.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setDashLoading(false);
    }
  };

  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await api.get(`/admin/students/${studentId}/matched-jobs`);
      setSheetJobs(res.data.jobs || []);
    } catch {
      toast.error('Failed to load job listings');
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchAppliedStatus = async () => {
    try {
      const { data } = await api.get(`/admin/students/${studentId}/external-applied-status?t=${Date.now()}`);
      setAppliedLinks(new Set((data.applications || []).map(a => a.jobLink)));
    } catch { /* ignore */ }
  };

  const fetchApplications = async () => {
    setAppsLoading(true);
    try {
      const res = await api.get(`/admin/students/${studentId}/applications?t=${Date.now()}`);
      setApplications(res.data.applications || []);
      setSheetApps(res.data.sheetApplications || []);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setAppsLoading(false);
    }
  };

  // Trigger job search for student
  const handleTriggerJobSearch = async (days) => {
    setShowDaysPopup(false);
    setTriggeringSearch(true);
    setWaitingForJobs(true);
    try {
      const { data } = await api.post(`/admin/students/${studentId}/trigger-job-search`, { days: String(days) });
      toast.success(data.message || 'Job search triggered!');

      if (Array.isArray(data.jobs)) {
        setSheetJobs(data.jobs);
        await fetchAppliedStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to trigger job search');
    } finally {
      setTriggeringSearch(false);
      setWaitingForJobs(false);
    }
  };

  // Mark an external saved job as applied on behalf of student
  const handleMarkApplied = async (job) => {
    if (!job.job_apply_link) return;
    const jobLink = job.job_apply_link;
    setApplyingJob(jobLink);
    // Optimistically mark
    setAppliedLinks(prev => { const next = new Set(prev); next.add(jobLink); return next; });
    // Open the apply link in new tab
    window.open(jobLink, '_blank', 'noopener,noreferrer');
    try {
      await api.post(`/admin/students/${studentId}/mark-external-applied`, {
        jobLink,
        employerName: job.employer_name,
        matchScore: job.match_score,
        jobTitle: extractRole(job),
      });
      toast.success(`Applied on behalf of ${student?.fullName}`);
      // Refresh applied links set AND dashboard counts
      fetchAppliedStatus();
      fetchDashboard();
    } catch (error) {
      // Revert on failure
      setAppliedLinks(prev => { const next = new Set(prev); next.delete(jobLink); return next; });
      toast.error(error.response?.data?.message || 'Failed to apply');
    } finally {
      setApplyingJob(null);
    }
  };

  // Open resume: show existing if complete, else ask to generate
  const handleResumeClick = (job, options = {}) => {
    if (!job) return;
    if (options.closeDetails) setDetailJob(null);
    if (hasCompleteGeneratedResume(job.resume_text)) {
      setResumeJob(job);
    } else {
      setResumeConfirmJob(job);
    }
  };

  // Generate tailored resume for student via admin endpoint
  const handleGenerateResume = async () => {
    if (!resumeConfirmJob || generatingResume) return;
    setGeneratingResume(true);
    try {
      const { data } = await api.post(`/admin/students/${studentId}/resume/generate`, resumeConfirmJob);
      const updatedJob = data.job;
      if (updatedJob) {
        // Update the jobs list so the generated resume is reflected
        setSheetJobs(prev => prev.map(j => {
          const sameLink = updatedJob.job_apply_link && j.job_apply_link === updatedJob.job_apply_link;
          return sameLink ? { ...j, ...updatedJob } : j;
        }));
        setResumeJob(updatedJob);
      }
      toast.success(data.message || 'Resume generated successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate resume');
    } finally {
      setGeneratingResume(false);
      setResumeConfirmJob(null);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([fetchJobs(), fetchAppliedStatus()]);
    toast.success('Job listings refreshed!');
  };

  // Update application status (interview/offer/rejection)
  const handleStatusChange = async (app, newStatus) => {
    if (app.status === newStatus) return;
    const prevStatus = app.status;
    // Optimistic update
    if (app.source === 'sheet') {
      setSheetApps(prev => prev.map(a => a.jobLink === app.id ? { ...a, status: newStatus } : a));
    } else {
      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
    }
    try {
      await api.patch(`/admin/students/${studentId}/application-status`, {
        applicationId: app.id,
        status: newStatus,
        source: app.source,
      });
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      // Refresh dashboard data if on dashboard tab
      fetchDashboard();
    } catch (error) {
      // Revert on failure
      if (app.source === 'sheet') {
        setSheetApps(prev => prev.map(a => a.jobLink === app.id ? { ...a, status: prevStatus } : a));
      } else {
        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: prevStatus } : a));
      }
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  // Jobs filtering/pagination
  const filteredJobs = useMemo(() => {
    let filtered = sheetJobs;
    if (jobSearch.trim()) {
      const q = jobSearch.toLowerCase();
      filtered = filtered.filter(j =>
        (j.employer_name || '').toLowerCase().includes(q) ||
        (j.job_title || '').toLowerCase().includes(q) ||
        (j.jd || '').toLowerCase().includes(q) ||
        (j.match_summary || '').toLowerCase().includes(q) ||
        (j.job_city || '').toLowerCase().includes(q)
      );
    }
    if (filterType === 'applied') filtered = filtered.filter(j => !!(j.job_apply_link && appliedLinks.has(j.job_apply_link)));
    if (filterType === 'not_applied') filtered = filtered.filter(j => j.job_apply_link && !appliedLinks.has(j.job_apply_link));
    // Sort by score, then push applied to bottom
    const sorted = [...filtered].sort((a, b) => (parseInt(b.match_score) || 0) - (parseInt(a.match_score) || 0));
    const notApplied = sorted.filter(j => !(j.job_apply_link && appliedLinks.has(j.job_apply_link)));
    const applied = sorted.filter(j => !!(j.job_apply_link && appliedLinks.has(j.job_apply_link)));
    return [...notApplied, ...applied];
  }, [sheetJobs, jobSearch, filterType, appliedLinks]);

  const paginatedJobs = useMemo(() => {
    const start = (jobPage - 1) * PAGE_SIZE;
    return filteredJobs.slice(start, start + PAGE_SIZE);
  }, [filteredJobs, jobPage]);

  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));

  useEffect(() => { setJobPage(1); }, [jobSearch, filterType]);

  // Applications: merge DB + Sheet
  const mergedApps = useMemo(() => {
    const dbApps = applications.map(app => ({
      id: app.id,
      title: app.job?.title || 'Untitled',
      company: app.job?.company || '—',
      location: app.job?.location || '',
      status: app.status,
      appliedAt: app.appliedAt,
      source: 'db',
      appliedByAdmin: !!(app.appliedById || (app.notes && app.notes.includes('admin'))),
      jobLink: null,
      notes: app.notes || '',
    }));
    const sheetAppsMapped = sheetApps.map(app => ({
      id: app.jobLink,
      title: app.jobTitle || app.employerName || 'Job Application',
      company: app.employerName || '—',
      location: '',
      status: app.status || 'APPLIED',
      appliedAt: app.createdAt,
      source: 'sheet',
      appliedByAdmin: false,
      jobLink: app.jobLink,
      matchScore: app.matchScore,
      notes: '',
    }));
    const seenLinks = new Set(dbApps.map(a => a.jobLink).filter(Boolean));
    const uniqueSheet = sheetAppsMapped.filter(a => !seenLinks.has(a.jobLink));
    const all = [...dbApps, ...uniqueSheet].sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
    if (!appSearch.trim()) return all;
    const q = appSearch.toLowerCase();
    return all.filter(a =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.company || '').toLowerCase().includes(q)
    );
  }, [applications, sheetApps, appSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Back + Header */}
      <button onClick={() => navigate('/admin/students')} className="group inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Students
      </button>

      {/* Student Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="relative flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl ${student?.avatarUrl ? '' : avatarBg(student?.fullName)} flex items-center justify-center text-white text-lg font-bold ring-2 ring-white/20 flex-shrink-0 overflow-hidden`}>
            {student?.avatarUrl ? (
              <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials(student?.fullName)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white">{student?.fullName}</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white/90">
                <Eye size={11} /> Candidate Portal View
              </span>
            </div>
            <p className="text-[13px] text-blue-100 mt-0.5">{student?.email}</p>
            {adminUser?.fullName && (
              <p className="text-[11px] text-blue-200/70 mt-0.5">Managing as: {adminUser.fullName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Days Popup */}
      {showDaysPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border p-6 w-[340px] space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Search Jobs for {student?.fullName}</h3>
            <p className="text-sm text-gray-500">How many days of job listings to search?</p>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="30" value={daysInput} onChange={(e) => setDaysInput(e.target.value)}
                className="border border-gray-300 rounded-lg text-center text-lg font-semibold w-20 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
              <span className="text-sm text-gray-500">day{daysInput !== '1' ? 's' : ''}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowDaysPopup(false)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => handleTriggerJobSearch(daysInput || '1')} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors flex items-center justify-center gap-2">
                <Sparkles size={14} /> Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting for Jobs Overlay */}
      {waitingForJobs && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl shadow-2xl border px-8 py-8 w-[420px] text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Sparkles size={28} className="text-violet-500 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Searching jobs for {student?.fullName}...</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Finding the best job matches. This page will update automatically once new jobs are ready.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Generate Resume Confirmation Modal */}
      {resumeConfirmJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !generatingResume && setResumeConfirmJob(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border w-[380px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Sparkles size={20} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Generate ATS Resume</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">For {student?.fullName}</p>
              </div>
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed">
              Create a tailored ATS resume for <strong>{extractRole(resumeConfirmJob)}</strong> at <strong>{resumeConfirmJob.employer_name}</strong>.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setResumeConfirmJob(null)}
                disabled={generatingResume}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >Cancel</button>
              <button
                onClick={handleGenerateResume}
                disabled={generatingResume}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {generatingResume ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles size={14} /> Generate</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Modal */}
      {resumeJob && (() => {
        const resumeText = resumeJob.resume_text || '';
        const candidateName = student?.fullName || resumeJob.candidate_name || '';
        const { roleTitle, sections } = parseResumeSections(resumeText, candidateName, resumeJob.candidate_name);
        const SECTION_COLORS = [
          { border: '#1e40af', bg: '#eff6ff', text: '#1e40af' },
          { border: '#7c3aed', bg: '#f5f3ff', text: '#7c3aed' },
          { border: '#059669', bg: '#ecfdf5', text: '#059669' },
          { border: '#dc2626', bg: '#fef2f2', text: '#dc2626' },
          { border: '#d97706', bg: '#fffbeb', text: '#d97706' },
          { border: '#0891b2', bg: '#ecfeff', text: '#0891b2' },
        ];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setResumeJob(null)}>
            <div className="bg-white rounded-2xl shadow-2xl border w-[660px] max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center px-6 pt-4 pb-2 shrink-0">
                <h3 className="text-sm font-semibold text-gray-700">Resume — {candidateName}</h3>
                <button onClick={() => setResumeJob(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-8 pb-6">
                {resumeText ? (
                  <div ref={resumeRef} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                    {/* Gradient Header */}
                    <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '28px 40px 24px' }}>
                      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', textAlign: 'center', textTransform: 'capitalize', fontFamily: 'Georgia, serif', margin: 0 }}>
                        {candidateName || 'Resume'}
                      </h1>

                      {(student?.phone || student?.email) && (
                        <p style={{ textAlign: 'center', fontSize: '11px', color: '#93c5fd', marginTop: '8px', lineHeight: '1.6' }}>
                          {[student?.phone, student?.email].filter(Boolean).join('  •  ')}
                        </p>
                      )}
                    </div>
                    {/* Content with colored sections */}
                    <div style={{ padding: '20px 40px 32px', fontFamily: 'Georgia, serif' }}>
                      {sections.map((section, si) => {
                        const color = SECTION_COLORS[si % SECTION_COLORS.length];
                        return (
                          <div key={si} style={{ marginBottom: '16px' }}>
                            <div style={{ borderLeft: `4px solid ${color.border}`, background: color.bg, padding: '6px 12px', marginBottom: '8px', borderRadius: '0 5px 5px 0' }}>
                              <h2 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.1em', color: color.text, margin: 0, textTransform: 'uppercase' }}>
                                {section.heading}
                              </h2>
                            </div>
                            <div style={{ color: '#333', fontSize: '12px', lineHeight: '1.7', paddingLeft: '4px' }}>
                              {section.lines.map((line, li) => {
                                const t = line.trim();
                                if (!t) return <div key={li} style={{ height: '6px' }} />;
                                const isBullet = /^[-•*○◦▪●]/.test(t) || /^(\d+[.)])/.test(t);
                                if (isBullet) {
                                  const text = t.replace(/^[-•*○◦▪●]\s*/, '').replace(/^(\d+[.)])\s*/, '');
                                  return (
                                    <div key={li} style={{ display: 'flex', gap: '8px', paddingLeft: '12px', paddingTop: '2px', paddingBottom: '2px' }}>
                                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color.border, display: 'inline-block', flexShrink: 0, marginTop: '7px' }} />
                                      <span>{text}</span>
                                    </div>
                                  );
                                }
                                const isBoldLine = /^[A-Z].*\d{4}/.test(t) || /–\s*(Present|Current)/i.test(t);
                                if (isBoldLine) return <p key={li} style={{ fontWeight: '600', marginTop: '4px', color: '#1e3a5f', margin: 0 }}>{t}</p>;
                                return <p key={li} style={{ paddingTop: '1px', paddingBottom: '1px', margin: 0 }}>{t}</p>;
                              })}
                            </div>
                            {si < sections.length - 1 && (
                              <div style={{ borderBottom: '1px solid #e5e7eb', marginTop: '12px' }} />
                            )}
                          </div>
                        );
                      })}
                      {sections.length === 0 && (
                        <div style={{ fontSize: '12px', lineHeight: '1.7', color: '#333', whiteSpace: 'pre-line' }}>{resumeText}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FileText className="text-gray-300 mb-3" size={32} />
                    <h3 className="text-base font-semibold text-gray-600">No resume data available</h3>
                    <p className="text-sm text-gray-400 mt-1">Resume data will appear after the job search workflow processes this listing</p>
                  </div>
                )}
              </div>
              {/* Footer with Apply + Regenerate */}
              {resumeJob.job_apply_link && (
                <div className="flex items-center justify-center gap-3 px-8 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
                  {resumeJob.pdf_link ? (
                    <a href={resumeJob.pdf_link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-gray-800 hover:bg-gray-900 text-white transition-colors shadow-sm">
                      <Eye size={15} /> View PDF
                    </a>
                  ) : null}
                  <button
                    onClick={() => { setResumeConfirmJob({ ...resumeJob, forceRegenerate: true }); setResumeJob(null); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                    <Sparkles size={15} /> Regenerate
                  </button>
                  {appliedLinks.has(resumeJob.job_apply_link) ? (
                    <span className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-lg border border-violet-200 text-violet-700 bg-violet-50">
                      <CheckCircle2 size={15} /> Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => { handleMarkApplied(resumeJob); setResumeJob(null); }}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors shadow-sm">
                      <Briefcase size={15} /> Apply for Student
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Detail Modal */}
      {detailJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailJob(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border w-[700px] max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{extractRole(detailJob)}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{detailJob.employer_name}</p>
                {(detailJob.job_city || detailJob.job_state || detailJob.job_employment_type) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {[detailJob.job_city, detailJob.job_state, detailJob.job_country].filter(Boolean).join(', ')}
                    {detailJob.job_employment_type && <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-medium">{detailJob.job_employment_type}</span>}
                  </p>
                )}
              </div>
              <button onClick={() => setDetailJob(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Match Score */}
              {parseInt(detailJob.match_score) > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Match Score</h3>
                    <span className={`text-sm font-bold ${parseInt(detailJob.match_score) >= 80 ? 'text-emerald-600' : parseInt(detailJob.match_score) >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
                      {detailJob.match_score}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${parseInt(detailJob.match_score) >= 80 ? 'bg-emerald-500' : parseInt(detailJob.match_score) >= 60 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(parseInt(detailJob.match_score) || 0, 100)}%` }} />
                  </div>
                </div>
              )}
              {/* Strong Matches */}
              {detailJob.strong_matches && (() => {
                let items = [];
                try { items = JSON.parse(detailJob.strong_matches); } catch { items = String(detailJob.strong_matches).split(',').map(s => s.trim()).filter(Boolean); }
                return items.length > 0 ? (
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Strong Matches</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded border border-emerald-200">{t}</span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              {/* Missing Skills */}
              {detailJob.missing_skills && (() => {
                let items = [];
                try { items = JSON.parse(detailJob.missing_skills); } catch { items = String(detailJob.missing_skills).split(',').map(s => s.trim()).filter(Boolean); }
                return items.length > 0 ? (
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Missing Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 text-[11px] font-medium rounded border border-red-200">{t}</span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              {/* Summary */}
              {detailJob.match_summary && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Summary</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{detailJob.match_summary}</p>
                </div>
              )}
              {/* JD */}
              {detailJob.jd && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Job Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{detailJob.jd}</p>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50">
              {detailJob.resume_text && (
                <button
                  onClick={() => handleResumeClick(detailJob, { closeDetails: true })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors">
                  <FileText size={15} /> Resume
                </button>
              )}
              {/* When no resume yet, offer to generate */}
              {!detailJob.resume_text && detailJob.jd && (
                <button
                  onClick={() => { setResumeConfirmJob(detailJob); setDetailJob(null); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors">
                  <FileText size={15} /> Generate Resume
                </button>
              )}
              {detailJob.job_apply_link && (
                <>
                  <a href={detailJob.job_apply_link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
                    <ExternalLink size={15} /> View Job
                  </a>
                  {appliedLinks.has(detailJob.job_apply_link) ? (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-violet-200 text-violet-700 bg-violet-50">
                      <CheckCircle2 size={15} /> Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => { handleMarkApplied(detailJob); setDetailJob(null); }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 border border-violet-600 transition-colors"
                    >
                      <Briefcase size={15} /> Apply for Student
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab data={dashData} loading={dashLoading} onRefresh={fetchDashboard} />}
      {activeTab === 'jobs' && (
        <JobsTab
          jobs={paginatedJobs}
          allJobs={sheetJobs}
          loading={jobsLoading}
          search={jobSearch}
          onSearch={setJobSearch}
          page={jobPage}
          totalPages={totalJobPages}
          onPageChange={setJobPage}
          totalCount={filteredJobs.length}
          appliedLinks={appliedLinks}
          onMarkApplied={handleMarkApplied}
          onTriggerSearch={() => setShowDaysPopup(true)}
          onRefresh={handleRefresh}
          triggeringSearch={triggeringSearch}
          applyingJob={applyingJob}
          studentName={student?.fullName}
          filterType={filterType}
          onFilterChange={setFilterType}
          onViewDetail={setDetailJob}
          onViewResume={handleResumeClick}
        />
      )}
      {activeTab === 'applications' && (
        <ApplicationsTab
          apps={mergedApps}
          loading={appsLoading}
          search={appSearch}
          onSearch={setAppSearch}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

/* ═══ Dashboard Tab ═══ */
const DashboardTab = ({ data, loading, onRefresh }) => {
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { stats, recentApplications, sheetApplications } = data;
  const sheetAppliedCount = stats.sheetAppliedCount || 0;
  const totalApplied = (stats.totalApplied || 0) + sheetAppliedCount;
  const interviewCount = stats.interviewScheduled || 0;
  const rejectedCount = stats.rejected || 0;
  const offerCount = stats.offerReceived || 0;
  const adminApplyCount = stats.adminApplyCount || 0;
  const candidateApplyCount = stats.candidateApplyCount || 0;
  // totalSheetJobs = student's matched jobs (savedJobResult count); fall back to totalJobs for compat
  const totalSheetJobs = stats.totalSheetJobs || stats.totalJobs || 0;
  const jobsToApply = Math.max(totalSheetJobs - sheetAppliedCount, 0);

  const statCards = [
    { label: 'Applied', value: totalApplied, color: 'bg-blue-50 text-blue-700 ring-blue-200', icon: <FileText size={18} className="text-blue-600" /> },
    { label: 'Interviews', value: interviewCount, color: 'bg-amber-50 text-amber-700 ring-amber-200', icon: <Calendar size={18} className="text-amber-600" /> },
    { label: 'Offers', value: offerCount, color: 'bg-violet-50 text-violet-700 ring-violet-200', icon: <CheckCircle2 size={18} className="text-violet-600" /> },
    { label: 'Rejected', value: rejectedCount, color: 'bg-red-50 text-red-700 ring-red-200', icon: <XCircle size={18} className="text-red-600" /> },
    { label: 'Jobs to Apply', value: jobsToApply, color: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: <Briefcase size={18} className="text-emerald-600" /> },
  ];

  /* Donut chart helper */
  const Donut = ({ value, max, color = '#1e40af', size = 80 }) => {
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    const r = 30, c = 2 * Math.PI * r;
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" transform="rotate(-90 40 40)" />
          <text x="40" y="44" textAnchor="middle" className="text-[14px] font-bold" fill="#111827">{value}</text>
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header row with Refresh button */}
      {onRefresh && (
        <div className="flex justify-end">
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors bg-white shadow-sm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s, i) => (
          <div key={i} className={`rounded-xl border p-4 ring-1 ${s.color}`}>
            <div className="mb-2">{s.icon}</div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-[11px] mt-0.5 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Applications Overview */}
        <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 p-5">
          <h3 className="text-[13px] font-bold text-gray-800 mb-4">Applications Overview</h3>
          <div className="flex items-center gap-5">
            <Donut value={totalApplied} max={totalSheetJobs || 1} color="#1e40af" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">Applied</span>
                <span className="text-[13px] font-bold text-gray-900">{totalApplied}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">Candidate Apply</span>
                <span className="text-[13px] font-bold text-gray-900">{candidateApplyCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">Admin Apply</span>
                <span className="text-[13px] font-bold text-gray-900">{adminApplyCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">Jobs to Apply</span>
                <span className="text-[13px] font-bold text-gray-900">{jobsToApply}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white/50 backdrop-blur-xl rounded-xl border border-white/50 p-5">
          <h3 className="text-[13px] font-bold text-gray-800 mb-4">Progress</h3>
          <div className="flex items-center gap-5">
            <Donut value={interviewCount} max={(totalApplied + interviewCount + rejectedCount) || 1} color="#7c3aed" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">Interviews</span>
                <span className="text-[13px] font-bold text-gray-900">{interviewCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">Offers</span>
                <span className="text-[13px] font-bold text-gray-900">{offerCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-600">Rejected</span>
                <span className="text-[13px] font-bold text-gray-900">{rejectedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Applications — merge DB + sheet, sorted newest first */}
      {(() => {
        const dbApps = (recentApplications || []).map(app => ({
          key: app.id,
          title: app.job?.title || 'Untitled',
          company: app.job?.company || '',
          location: app.job?.location || '',
          status: app.status,
          date: app.appliedAt,
          via: null,
        }));
        const sheetApps = (sheetApplications || []).map(sa => ({
          key: sa.jobLink,
          title: sa.jobTitle || sa.employerName || 'Job Application',
          company: sa.employerName || '',
          location: '',
          status: sa.status,
          date: sa.createdAt,
          via: sa.appliedMethod === 'BOT' ? 'Bot' : 'Manual',
        }));
        const seenTitles = new Set(dbApps.map(a => a.title));
        const uniqueSheet = sheetApps.filter(a => !seenTitles.has(a.title));
        const combined = [...dbApps, ...uniqueSheet].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase size={15} className="text-blue-600" /> Recent Applications
              </h3>
              <span className="text-[11px] font-medium text-gray-400">{combined.length} latest</span>
            </div>
            <div className="divide-y divide-gray-50">
              {combined.length > 0 ? combined.map(app => (
                <div key={app.key} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{app.title}</p>
                      <p className="text-[12px] text-gray-500 mt-0.5">
                        {app.company}{app.location ? ` · ${app.location}` : ''}{app.via ? ` · via ${app.via}` : ''}
                      </p>
                    </div>
                    {statusBadge(app.status)}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">{formatDate(app.date)}</p>
                </div>
              )) : (
                <div className="px-5 py-8 text-center">
                  <Briefcase size={20} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-[13px] text-gray-400">No applications yet</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

/* ═══ Jobs Tab ═══ */
const JobsTab = ({ jobs, allJobs, loading, search, onSearch, page, totalPages, onPageChange, totalCount,
  appliedLinks, onMarkApplied, onTriggerSearch, onRefresh, triggeringSearch, applyingJob, studentName,
  filterType, onFilterChange, onViewDetail, onViewResume }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const appliedCount = allJobs.filter(j => j.job_apply_link && appliedLinks.has(j.job_apply_link)).length;

  return (
    <div className="space-y-4">
      {/* Header Row with Search Trigger + Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Job Listings</h3>
          <p className="text-[12px] text-gray-400 mt-0.5">
            {totalCount} job{totalCount !== 1 ? 's' : ''} · {appliedCount} applied
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onTriggerSearch}
            disabled={triggeringSearch}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
          >
            <Sparkles size={14} className={triggeringSearch ? 'animate-pulse' : ''} />
            {triggeringSearch ? 'Searching...' : 'Search Jobs'}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search + Filter Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search company, skills, location..."
            value={search}
            onChange={(e) => { onSearch(e.target.value); onPageChange(1); }}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
          {search && (
            <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={filterType}
          onChange={(e) => onFilterChange(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-600 font-medium outline-none cursor-pointer hover:border-gray-300 transition-all"
        >
          <option value="all">All Jobs</option>
          <option value="applied">Applied</option>
          <option value="not_applied">Not Applied</option>
        </select>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Briefcase size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No matched jobs found</p>
          <p className="text-[12px] text-gray-400 mt-1">Click "Search Jobs" to find jobs for this student</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => {
            const isApplied = job.job_apply_link && appliedLinks.has(job.job_apply_link);
            const isApplying = applyingJob === job.job_apply_link;
            const globalIdx = (page - 1) * PAGE_SIZE + i + 1;

            return (
              <div key={job.id || i} className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow ${isApplied ? 'border-violet-200 bg-violet-50/30' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-gray-400 font-medium w-5 text-right">{globalIdx}</span>
                      <div className={`w-10 h-10 rounded-lg ${avatarBg(job.employer_name)} flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0`}>
                        {job.employer_name?.charAt(0) || '?'}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{extractRole(job)}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[12px] text-gray-500">
                          <Building2 size={11} /> {job.employer_name}
                        </span>
                        {job.job_city && (
                          <span className="inline-flex items-center gap-1 text-[12px] text-gray-500">
                            <MapPin size={11} /> {job.job_city}{job.job_state ? `, ${job.job_state}` : ''}
                          </span>
                        )}
                        {job.job_employment_type && (
                          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {job.job_employment_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {job.match_score && parseInt(job.match_score) > 0 && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ${
                        parseInt(job.match_score) >= 80 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                        parseInt(job.match_score) >= 60 ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                        'bg-amber-50 text-amber-700 ring-amber-200'
                      }`}>
                        <Star size={11} /> {job.match_score}%
                      </span>
                    )}
                    <button
                      onClick={() => onViewResume(job)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                    >
                      <FileText size={13} /> {hasCompleteGeneratedResume(job.resume_text) ? 'Resume' : 'Gen Resume'}
                    </button>
                    <button
                      onClick={() => onViewDetail(job)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    >
                      <Info size={13} /> Details
                    </button>
                    {isApplied ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-violet-200 text-violet-700 bg-violet-50">
                        <CheckCircle2 size={13} /> Applied
                      </span>
                    ) : job.job_apply_link ? (
                      <button
                        onClick={() => onMarkApplied(job)}
                        disabled={isApplying}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
                      >
                        {isApplying ? (
                          <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Applying...</>
                        ) : (
                          <><Briefcase size={13} /> Apply</>
                        )}
                      </button>
                    ) : null}
                    {job.job_apply_link && (
                      <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
                {job.match_summary && (
                  <p className="text-[12px] text-gray-500 mt-2 ml-[4.5rem] line-clamp-2">{job.match_summary}</p>
                )}
                {(job.strong_matches || job.missing_skills) && (
                  <div className="flex flex-wrap gap-1.5 mt-2 ml-[4.5rem]">
                    {job.strong_matches?.split(',').filter(Boolean).slice(0, 4).map((s, j) => (
                      <span key={j} className="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded-full">{s.trim()}</span>
                    ))}
                    {job.missing_skills?.split(',').filter(Boolean).slice(0, 3).map((s, j) => (
                      <span key={`m${j}`} className="px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-600 rounded-full">{s.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[13px] font-medium text-gray-600 px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

/* ═══ Applications Tab ═══ */
const ApplicationsTab = ({ apps, loading, search, onSearch, onStatusChange }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = useMemo(() => {
    const total = apps.length;
    const interviews = apps.filter(a => a.status === 'INTERVIEW_SCHEDULED').length;
    const offers = apps.filter(a => a.status === 'OFFER_RECEIVED').length;
    const rejected = apps.filter(a => a.status === 'REJECTED').length;
    const mentorApplied = apps.filter(a => a.appliedByAdmin).length;
    return { total, interviews, offers, rejected, mentorApplied };
  }, [apps]);

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-[11px] text-gray-500">Total Applied</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-amber-600">{stats.interviews}</p>
          <p className="text-[11px] text-gray-500">Interviews</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-emerald-600">{stats.offers}</p>
          <p className="text-[11px] text-gray-500">Offers</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          <p className="text-[11px] text-gray-500">Rejected</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-2xl font-bold text-violet-600">{stats.mentorApplied}</p>
          <p className="text-[11px] text-gray-500">Applied by Mentor</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search applications..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {/* Applications List */}
      {apps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No applications found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {apps.map((app, i) => (
              <div key={app.id || i} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg ${avatarBg(app.company)} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}>
                      {app.company?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{app.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[12px] text-gray-500">{app.company}</span>
                        {app.location && <span className="text-[12px] text-gray-400">· {app.location}</span>}
                        {app.source === 'sheet' && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Sheet</span>
                        )}
                        {app.appliedByAdmin && (
                          <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Mentor Applied</span>
                        )}
                        {app.matchScore != null && (
                          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            Match: {app.matchScore}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={app.status}
                      onChange={(e) => onStatusChange(app, e.target.value)}
                      className="text-[11px] font-medium rounded-lg border border-gray-200 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="APPLIED">Applied</option>
                      <option value="INTERVIEW_SCHEDULED">Interview</option>
                      <option value="OFFER_RECEIVED">Offer</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5 ml-12">
                  <p className="text-[11px] text-gray-400">{formatDate(app.appliedAt)}</p>
                  {app.notes && app.notes.includes('admin') && (
                    <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                      Mentor Applied
                    </span>
                  )}
                  {app.jobLink && (
                    <a href={app.jobLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                      View Job <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudentView;
