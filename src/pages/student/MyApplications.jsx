import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import {
  Search, Briefcase, Calendar, Bot, Clock, FileText,
  X, ExternalLink, Eye, Download, AlertTriangle, Info
} from 'lucide-react';

/* ── helpers (shared with JobListings) ── */
const AVATAR_BG = [
  'bg-blue-600','bg-emerald-600','bg-violet-600','bg-rose-600',
  'bg-amber-600','bg-cyan-600','bg-fuchsia-600','bg-teal-600',
  'bg-indigo-600','bg-pink-600','bg-sky-600','bg-lime-600',
];
const avatarBg = (name) => AVATAR_BG[Math.abs([...(name||'')].reduce((a,c)=>a+c.charCodeAt(0),0)) % AVATAR_BG.length];

const extractSkillsFromJD = (jdText) => {
  if (!jdText) return [];
  const techPatterns = /\b(Java|Python|JavaScript|TypeScript|React|Angular|Vue|Node\.?js|Express|Spring|Django|Flask|AWS|Azure|GCP|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|GraphQL|REST|API|Git|CI\/CD|Agile|Scrum|HTML|CSS|Tailwind|Bootstrap|C\+\+|C#|\.NET|Go|Rust|Swift|Kotlin|PHP|Ruby|Rails|Laravel|TensorFlow|PyTorch|Machine Learning|AI|Data Science|DevOps|Linux|Terraform|Jenkins|Elasticsearch|Kafka|RabbitMQ|Microservices)\b/gi;
  const matches = jdText.match(techPatterns) || [];
  return [...new Set(matches.map(m => m.trim()))].slice(0, 12);
};

const parseTags = (str) => {
  if (!str) return [];
  return str.split(/[,;]+/).map(s => s.replace(/^[\s\-•]+/, '').trim()).filter(Boolean).slice(0, 5);
};

const parseJDSections = (jdText) => {
  if (!jdText) return [];
  const sectionPatterns = /^\s*(About\b|Company\s*Overview|Overview|Position\s*Description|Job\s*Description|Description|Responsibilities|Key\s*Responsibilities|What\s*You|What\s*We|Who\s*You|Your\s*Role|Role\s*Overview|Requirements|Qualifications|Required|Preferred|Desired|Minimum|Nice\s*to\s*Have|Skills|Technical\s*Skills|Key\s*Skills|Core\s*Competencies|Experience|Education|Benefits|Compensation|Salary|How\s*to\s*Apply|Summary|In\s*this|Our\s*Team|The\s*Role|The\s*Position|We\s*are|Location|Job\s*Type|Employment|Duties|Essential\s*Functions|Scope|Objectives?|Mission|Purpose|Why\s*Join|Perks|Culture|Team|About\s*Us|About\s*the|Day\s*to\s*Day|What\s*You.*Bring|What\s*You.*Do|What\s*You.*Need|You\s*Will|You\s*Should|Must\s*Have|Bonus|Additional|Tools|Technology|Tech\s*Stack|Stack|Platforms?|Certifications?|Clearance|Travel|Reports?\s*To|Work\s*Environment|Physical|EEO|Equal)[^\n]*$/im;
  const lines = jdText.split('\n');
  const sections = [];
  let cur = { heading: 'Overview', lines: [] };
  for (const line of lines) {
    const t = line.trim();
    if (!t) { if (cur.lines.length > 0) cur.lines.push(''); continue; }
    const isH = sectionPatterns.test(t) || /^[A-Z][A-Z\s&/,\-–]{2,60}:?\s*$/.test(t) || /^[A-Z][^.!?]{2,60}:$/.test(t);
    if (isH && cur.lines.length > 0) { sections.push({ ...cur, lines: [...cur.lines] }); cur = { heading: t.replace(/:+\s*\*?$/, '').trim(), lines: [] }; }
    else if (isH && cur.lines.length === 0) { cur.heading = t.replace(/:+\s*\*?$/, '').trim(); }
    else { cur.lines.push(t); }
  }
  if (cur.lines.length > 0) sections.push(cur);
  return sections.map(s => ({ ...s, lines: s.lines.join('\n').trim().split('\n') })).filter(s => s.lines.some(l => l.trim()));
};

const parseResumeSections = (text, candidateName, sheetCandidateName) => {
  if (!text) return { contact: '', roleTitle: '', sections: [] };
  const nameVariants = new Set();
  const nameParts = new Set();
  const addN = (raw) => {
    if (!raw) return;
    const n = raw.trim().toLowerCase(); if (!n) return;
    nameVariants.add(n);
    const parts = n.split(/\s+/);
    parts.forEach(p => { if (p.length >= 2) nameParts.add(p); });
    if (parts.length >= 2) { nameVariants.add(parts.join(' ')); nameVariants.add(parts[0]+' '+parts[parts.length-1]);
      for (let i=0;i<parts.length;i++) for (let j=i+1;j<parts.length;j++) nameVariants.add(parts[i]+' '+parts[j]);
    }
  };
  addN(candidateName);
  addN(sheetCandidateName);
  const isNameLine = (line) => {
    const lower = line.trim().toLowerCase().replace(/[.,\-]+$/,'').trim();
    if (!lower) return false;
    for (const v of nameVariants) if (lower===v) return true;
    if (nameParts.size>=2){const words=lower.split(/\s+/).filter(w=>w.length>=2);if(words.length>=1&&words.length<=4){const m=words.filter(w=>nameParts.has(w)).length;if(m>=Math.ceil(words.length*0.6))return true;}}
    return false;
  };
  const looksLikePersonName = (t) => {
    if (!/^[A-Z][a-zA-Z\-']+(\s+[A-Z][a-zA-Z\-']+){0,3}$/.test(t)&&!/^[A-Z\-']+(\s+[A-Z\-']+){0,3}$/.test(t)) return false;
    return !/\b(engineer|developer|manager|analyst|designer|architect|consultant|specialist|coordinator|director|lead|admin|officer|scientist|intern|assistant|associate|senior|junior|staff|principal|head|chief|vp|cto|ceo|cfo|coo)\b/i.test(t);
  };
  const isContact = (l) => {
    const hasEmail=/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(l);
    const hasPhone=/(\+?\(?\d[\d\s\-().]{6,}\d)/i.test(l);
    if(hasEmail||hasPhone){const r=l.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,'').replace(/\(?\+?\d[\d\s\-().]{6,}\d/g,'').replace(/[|,;\s]/g,'').trim();if(r.length<5)return true;}
    return false;
  };
  const isLoc = (l) => /^\s*(remote|on-?site|hybrid)?\s*\(?.*(?:usa|india|uk|canada|germany|australia|arizona|california|texas|new york|florida|illinois|ohio|georgia|north carolina|virginia|washington|massachusetts|colorado|oregon|utah|nevada|michigan|minnesota|maryland|wisconsin|tennessee|missouri|connecticut|iowa|kansas|arkansas|nebraska|idaho|hawaii|alabama|louisiana|oklahoma|kentucky|south carolina|mississippi|pennsylvania|new jersey)[^a-z]*\)?\s*$/i.test(l);
  const secH = /^\s*(PROFESSIONAL\s*SUMMARY|SUMMARY|OBJECTIVE|PROFESSIONAL\s*EXPERIENCE|EXPERIENCE|WORK\s*EXPERIENCE|EDUCATION|SKILLS|KEY\s*SKILLS|TECHNICAL\s*SKILLS|CERTIFICATIONS|PROJECTS|ACHIEVEMENTS|AWARDS|LANGUAGES|INTERESTS|REFERENCES|CONTACT\s*INFORMATION|PROFESSIONAL\s*PROFILE|PROFILE|QUALIFICATIONS|CORE\s*COMPETENCIES|NOTES?\s*(?:ON\s*)?ADDRESSED\s*GAPS?|ADDITIONAL\s*NOTES?|NOTES?)\s*:?\s*$/i;
  const sections=[]; let cur=null; let roleTitle=''; let foundFirst=false;
  for (const line of text.split('\n')) {
    let t=line.trim(); if(!t){if(cur)cur.lines.push('');continue;}
    if(isNameLine(t))continue;
    if(!foundFirst&&looksLikePersonName(t))continue;
    if(!foundFirst&&isLoc(t))continue;
    if(!foundFirst&&isContact(t))continue;
    if(secH.test(t)){foundFirst=true;if(cur)sections.push(cur);cur={heading:t.replace(/:$/,'').trim().toUpperCase(),lines:[]};}
    else if(!foundFirst){
      if(!roleTitle){const m=t.match(/^\(?\s*(?:job\s*title\s*[:–\-]?)\s*(.+?)\s*\)?$/i);if(m){roleTitle=m[1].trim();continue;}
      if(t.length<=80&&!/@/.test(t)&&!/^\(?\+/.test(t)){roleTitle=t;continue;}}
    } else {if(!cur)cur={heading:'DETAILS',lines:[]};cur.lines.push(t);}
  }
  if(cur)sections.push(cur);
  const filtered=sections.filter(s=>!/^NOTES?/i.test(s.heading)&&!/^ADDITIONAL\s*NOTES?/i.test(s.heading)&&!/^ADDRESSED\s*GAPS?/i.test(s.heading));
  return { contact:'', roleTitle, sections: filtered };
};

const extractRole = (job) => {
  if (!job) return 'View Details';
  if (job.job_title) {
    const t = job.job_title.trim();
    if (t.length > 3 && !/^(this is|we are|company desc)/i.test(t)) return t.slice(0, 80);
  }
  return job.employer_name || 'View Details';
};

const MyApplications = () => {
  const { user: authUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [sheetJobsMap, setSheetJobsMap] = useState({});  // jobLink -> full job data
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailJob, setDetailJob] = useState(null);
  const [resumeJob, setResumeJob] = useState(null);
  const resumeRef = useRef(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const [dbRes, sheetRes, sheetJobsRes] = await Promise.all([
        api.get('/jobs/applications/mine?status=APPLIED'),
        api.get('/jobs/sheet/applied-status'),
        api.get('/jobs/sheet'),
      ]);

      // Build a map of jobLink -> full sheet job object
      const jobsMap = {};
      (sheetJobsRes.data.jobs || []).forEach(j => {
        if (j.job_apply_link) jobsMap[j.job_apply_link] = j;
      });
      setSheetJobsMap(jobsMap);

      const dbApps = (dbRes.data.applications || []).map(app => ({
        id: app.id,
        title: app.job?.title || 'Untitled',
        company: app.job?.company || '—',
        status: app.status,
        isAutoApplied: app.isAutoApplied,
        appliedAt: app.appliedAt,
        jobLink: null,
        source: 'db',
        applicant: app.user || null,
      }));
      const sheetApps = (sheetRes.data.applications || []).map(app => {
        const fullJob = jobsMap[app.jobLink];
        return {
          id: app.jobLink,
          title: app.jobTitle || app.employerName || 'Job Application',
          company: app.employerName || '—',
          status: app.status || 'APPLIED',
          isAutoApplied: app.appliedMethod === 'BOT',
          appliedAt: app.createdAt,
          matchScore: app.matchScore,
          jobLink: app.jobLink,
          source: 'sheet',
          fullJob,
        };
      });
      const seenLinks = new Set(dbApps.map(a => a.jobLink).filter(Boolean));
      const uniqueSheetApps = sheetApps.filter(a => !seenLinks.has(a.jobLink));
      const all = [...dbApps, ...uniqueSheetApps].sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
      setApplications(all);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return applications;
    const q = search.toLowerCase();
    return applications.filter(app =>
      (app.title || '').toLowerCase().includes(q) ||
      (app.company || '').toLowerCase().includes(q)
    );
  }, [applications, search]);

  const stats = useMemo(() => {
    const total = applications.length;
    const interviews = applications.filter(a => a.status === 'INTERVIEW_SCHEDULED').length;
    const offers = applications.filter(a => a.status === 'OFFER_RECEIVED').length;
    const auto = applications.filter(a => a.isAutoApplied).length;
    return { total, interviews, offers, auto };
  }, [applications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[16px] font-bold text-gray-900">My Applications</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Track and manage your job applications</p>
      </div>

      {/* Stats Row */}
      {applications.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Applied', value: stats.total, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Interviews', value: stats.interviews, icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Offers', value: stats.offers, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Auto Applied', value: stats.auto, icon: Bot, color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-lg px-4 py-3 flex items-center gap-3 shadow-sm shadow-blue-100/20">
              <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon size={15} className={stat.color} />
              </div>
              <div>
                <p className="text-[18px] font-bold text-gray-900 leading-none">{stat.value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center justify-end">
        <div className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-lg px-3 py-1.5 flex items-center gap-2 w-full sm:w-64 shadow-sm">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input
            type="text"
            className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-700"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <div className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-lg text-center py-16 shadow-sm">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Briefcase size={20} className="text-gray-300" />
          </div>
          <h3 className="text-[13px] font-semibold text-gray-600">
            {applications.length === 0 ? 'No applications yet' : 'No matching applications'}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1">
            {applications.length === 0 ? 'Start browsing jobs and apply!' : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => {
            const dateStr = new Date(app.appliedAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric'
            });
            const fullJob = app.fullJob || (app.jobLink ? sheetJobsMap[app.jobLink] : null);
            return (
              <div
                key={app.id}
                className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-lg px-4 py-3.5 hover:border-white/70 hover:bg-white/70 transition-all shadow-sm shadow-blue-100/10"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-lg ${avatarBg(app.company)} text-white flex items-center justify-center font-bold text-sm shrink-0`}>
                    {app.company?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-semibold text-gray-900 truncate">
                      {app.company || '—'}
                    </h3>
                    <p className="text-[11px] text-violet-600 truncate mt-0.5">{app.title || 'Untitled Position'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock size={9} />
                        {dateStr}
                      </span>
                      {app.matchScore && parseInt(app.matchScore) > 0 && (
                        <span className={`text-[10px] font-bold ${parseInt(app.matchScore)>=80?'text-emerald-600':parseInt(app.matchScore)>=60?'text-violet-600':'text-amber-600'}`}>
                          {app.matchScore}% match
                        </span>
                      )}
                    </div>
                    {app.applicant && (
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                        <span className="font-medium text-gray-500">Applied by:</span>
                        <span>{app.applicant.fullName}</span>
                        <span>·</span>
                        <span>{app.applicant.email}</span>
                        {app.applicant.phone && <><span>·</span><span>{app.applicant.phone}</span></>}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {fullJob && (
                      <>
                        <button
                          onClick={() => setDetailJob(fullJob)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
                          title="View details"
                        >
                          <Info size={12} /> Details
                        </button>
                        <button
                          onClick={() => setResumeJob(fullJob)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors"
                          title="View resume"
                        >
                          <FileText size={12} /> Resume
                        </button>
                      </>
                    )}
                    {app.jobLink && (
                      <a
                        href={app.jobLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                        title="Open job posting"
                      >
                        <ExternalLink size={12} /> Apply
                      </a>
                    )}
                  </div>

                  {/* Applied Badge */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Applied
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Detail Modal ═══ */}
      {detailJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailJob(null)}>
          <div className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 w-[700px] max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{extractRole(detailJob)}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{detailJob.employer_name}</p>
                {(detailJob.job_city || detailJob.job_state || detailJob.job_country || detailJob.job_employment_type) && (
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
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {/* Technologies */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Technologies & Skills</h3>
                {extractSkillsFromJD(detailJob.jd).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {extractSkillsFromJD(detailJob.jd).map((skill, i) => (
                      <span key={i} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg border border-gray-200">{skill}</span>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400 italic">No specific technologies detected</p>}
              </div>
              {/* Match Score */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Match Score</h3>
                  <span className={`text-sm font-bold ${parseInt(detailJob.match_score)>=80?'text-emerald-600':parseInt(detailJob.match_score)>=60?'text-blue-600':parseInt(detailJob.match_score)>0?'text-amber-600':'text-gray-400'}`}>
                    {parseInt(detailJob.match_score)>0?`${detailJob.match_score}%`:'—'}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${parseInt(detailJob.match_score)>=80?'bg-emerald-500':parseInt(detailJob.match_score)>=60?'bg-blue-500':parseInt(detailJob.match_score)>0?'bg-amber-500':'bg-gray-200'}`}
                    style={{ width: `${Math.min(parseInt(detailJob.match_score)||0,100)}%` }} />
                </div>
              </div>
              {/* Strong Matches */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Strong Matches</h3>
                {parseTags(detailJob.strong_matches).length>0?(
                  <div className="flex flex-wrap gap-1.5">
                    {parseTags(detailJob.strong_matches).map((t,i)=>(
                      <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium rounded border border-emerald-200">{t}</span>
                    ))}
                  </div>
                ):<p className="text-sm text-gray-400 italic">—</p>}
              </div>
              {/* Missing Skills */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Missing Skills</h3>
                {parseTags(detailJob.missing_skills).length>0?(
                  <div className="flex flex-wrap gap-1.5">
                    {parseTags(detailJob.missing_skills).map((t,i)=>(
                      <span key={i} className="px-2 py-0.5 bg-red-50 text-red-600 text-[11px] font-medium rounded border border-red-200">{t}</span>
                    ))}
                  </div>
                ):<p className="text-sm text-gray-400 italic">None — great match!</p>}
              </div>
              {/* Summary */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Summary</h3>
                {detailJob.match_summary?<p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{detailJob.match_summary}</p>:<p className="text-sm text-gray-400 italic">—</p>}
              </div>
              {/* Job Description */}
              {parseJDSections(detailJob.jd).length > 0 ? (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Job Description</h3>
                  <div className="space-y-4">
                    {parseJDSections(detailJob.jd).map((section, si) => (
                      <div key={si}>
                        <h4 className="text-sm font-bold text-gray-800 mb-1.5 pb-1 border-b border-gray-100">{section.heading}</h4>
                        <div className="text-sm text-gray-600 leading-relaxed">
                          {section.lines.map((line, li) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <div key={li} className="h-1.5" />;
                            const isBullet = /^[-•*○◦▪]/.test(trimmed)||/^(\d+[\.\)])/.test(trimmed);
                            if (isBullet) { const text=trimmed.replace(/^[-•*○◦▪]\s*/,'').replace(/^(\d+[\.\)])\s*/,''); return <div key={li} className="flex gap-2 pl-2 py-0.5"><span className="text-gray-400 shrink-0 mt-[3px] text-[8px]">●</span><span>{text}</span></div>; }
                            const isSub = /^[A-Z].*:$/.test(trimmed)||(/^[A-Z]/.test(trimmed)&&trimmed.length<60&&!/[.!?]$/.test(trimmed)&&trimmed.split(' ').length<=6);
                            if (isSub) return <p key={li} className="font-semibold text-gray-700 mt-2 mb-0.5">{trimmed}</p>;
                            return <p key={li} className="py-0.5">{trimmed}</p>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : detailJob.jd ? (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Job Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{detailJob.jd}</p>
                </div>
              ) : null}
            </div>
            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-white">
              <button onClick={() => { setDetailJob(null); setResumeJob(detailJob); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors">
                <FileText size={15} /> Resume
              </button>
              {detailJob.job_apply_link && (
                <a href={detailJob.job_apply_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 border border-violet-600 transition-colors">
                  <ExternalLink size={15} /> Apply
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Resume Modal ═══ */}
      {resumeJob && (() => {
        const resumeText = resumeJob.resume_text || '';
        const candidateName = authUser?.fullName || '';
        const sheetCandidateName = resumeJob.candidate_name || '';
        const { roleTitle, sections } = parseResumeSections(resumeText, candidateName, sheetCandidateName);

        const handleDownloadPDF = () => {
          const el = resumeRef.current; if (!el) return;
          html2pdf().set({ margin: [10,10,10,10], filename: `${(candidateName||'Resume').replace(/\s+/g,'_')}_Resume.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} }).from(el).save();
        };
        const handleDownloadWord = () => {
          const el = resumeRef.current; if (!el) return;
          const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;margin:40px 50px;color:#333}h1{font-size:22px;color:#1e3a5f;text-align:center;margin:0}.contact{text-align:center;font-size:11px;color:#4a5568;margin:8px 0 20px}h2{font-size:14px;color:#1e3a5f;text-transform:uppercase;border-bottom:2px solid #1e3a5f;padding-bottom:4px;margin:18px 0 8px}p,li{font-size:12px;line-height:1.6}ul{margin:4px 0;padding-left:20px}</style></head><body>${el.innerHTML}</body></html>`;
          const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
          saveAs(blob, `${(candidateName||'Resume').replace(/\s+/g,'_')}_Resume.doc`);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setResumeJob(null)}>
            <div className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/50 w-[660px] max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-end px-4 pt-3 pb-0 shrink-0">
                <button onClick={() => setResumeJob(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={18} /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-8 pb-4">
                {resumeText ? (
                  <div ref={resumeRef} className="border border-gray-200 rounded-xl bg-white shadow-sm">
                    <div className="px-10 py-8" style={{ fontFamily: 'Georgia, serif' }}>
                      <h1 className="text-2xl font-bold text-center" style={{ color: '#1e3a5f', textTransform: 'capitalize' }}>{authUser?.fullName || 'Resume'}</h1>
                      {(roleTitle || extractRole(resumeJob) !== 'View Details') && (
                        <p className="text-center text-sm font-medium mt-1" style={{ color: '#2d3748' }}>{roleTitle || extractRole(resumeJob)}</p>
                      )}
                      {(authUser?.phone || authUser?.email) && (
                        <p className="text-center text-xs mt-2 leading-relaxed" style={{ color: '#4a5568' }}>{[authUser?.phone, authUser?.email].filter(Boolean).join(' | ')}</p>
                      )}
                      {authUser?.linkedinProfile && <p className="text-center text-xs mt-1" style={{ color: '#4a5568' }}>{authUser.linkedinProfile}</p>}
                      <div className="mt-5 mb-4" style={{ borderBottom: '2px solid #cbd5e0' }} />
                      {sections.map((section, si) => (
                        <div key={si} className="mb-4">
                          <h2 className="text-sm font-bold tracking-wider pb-1 mb-2" style={{ color: '#1e3a5f', borderBottom: '1.5px solid #1e3a5f', letterSpacing: '0.08em' }}>{section.heading}</h2>
                          <div className="text-sm leading-relaxed" style={{ color: '#333', fontSize: '12.5px', lineHeight: '1.7' }}>
                            {section.lines.map((line, li) => {
                              const t = line.trim();
                              if (!t) return <div key={li} className="h-2" />;
                              const isBullet = /^[-•*○◦▪●]/.test(t)||/^(\d+[\.\)])/.test(t);
                              if (isBullet) { const text=t.replace(/^[-•*○◦▪●]\s*/,'').replace(/^(\d+[\.\)])\s*/,''); return <div key={li} className="flex gap-2 pl-3 py-0.5"><span className="shrink-0 mt-[7px]" style={{width:'5px',height:'5px',borderRadius:'50%',background:'#1e3a5f',display:'inline-block'}}/><span>{text}</span></div>; }
                              const isBold = /^[A-Z].*\d{4}/.test(t)||/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s/i.test(t)||/–\s*(Present|Current)/i.test(t);
                              if (isBold) return <p key={li} className="font-semibold mt-1" style={{ color: '#1e3a5f' }}>{t}</p>;
                              return <p key={li} className="py-0.5">{t}</p>;
                            })}
                          </div>
                        </div>
                      ))}
                      {sections.length === 0 && <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#333', lineHeight: '1.7' }}>{resumeText}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertTriangle className="text-gray-300 mb-3" size={32} />
                    <h3 className="text-base font-semibold text-gray-600">No resume data available</h3>
                    <p className="text-sm text-gray-400 mt-1">Resume data will appear after the job search workflow processes this listing</p>
                  </div>
                )}
              </div>
              {resumeText && (
                <div className="flex items-center justify-center gap-3 px-8 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
                  {resumeJob.pdf_link ? (
                    <a href={resumeJob.pdf_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-gray-800 hover:bg-gray-900 text-white transition-colors shadow-sm"><Eye size={15}/> View</a>
                  ) : (
                    <button onClick={() => { if(resumeRef.current)resumeRef.current.scrollIntoView({behavior:'smooth'}); }} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-gray-800 hover:bg-gray-900 text-white transition-colors shadow-sm"><Eye size={15}/> View</button>
                  )}
                  <button onClick={handleDownloadPDF} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors shadow-sm" style={{background:'#dc2626'}} onMouseEnter={e=>e.currentTarget.style.background='#b91c1c'} onMouseLeave={e=>e.currentTarget.style.background='#dc2626'}><Download size={15}/> PDF</button>
                  <button onClick={handleDownloadWord} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors shadow-sm" style={{background:'#2563eb'}} onMouseEnter={e=>e.currentTarget.style.background='#1d4ed8'} onMouseLeave={e=>e.currentTarget.style.background='#2563eb'}><Download size={15}/> Word</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default MyApplications;
