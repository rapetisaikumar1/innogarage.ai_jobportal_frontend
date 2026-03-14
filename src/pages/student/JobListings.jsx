import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Search, ExternalLink, Briefcase, RefreshCw, X, FileText, AlertTriangle,
  Clock, Sparkles, MapPin, Building2, Bookmark
} from 'lucide-react';

/* ── score label helper ── */
const scoreLabel = (s) => {
  const n = parseInt(s) || 0;
  if (n >= 80) return { text: 'Excellent', color: 'text-emerald-600' };
  if (n >= 60) return { text: 'Good', color: 'text-blue-600' };
  if (n >= 40) return { text: 'Fair', color: 'text-amber-600' };
  return { text: 'Low', color: 'text-red-500' };
};

/* ── avatar bg palette ── */
const AVATAR_BG = [
  'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-rose-600',
  'bg-amber-600', 'bg-cyan-600', 'bg-fuchsia-600', 'bg-teal-600',
  'bg-indigo-600', 'bg-pink-600', 'bg-sky-600', 'bg-lime-600',
];
const avatarBg = (name) => AVATAR_BG[Math.abs([...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_BG.length];

/* ── parse comma-separated skills ── */
const parseTags = (str) => {
  if (!str) return [];
  return str.split(/[,;]+/).map((s) => s.replace(/^[\s\-•]+/, '').trim()).filter(Boolean).slice(0, 5);
};

/* ── extract role/title from JD text ── */
const extractRole = (job) => {
  if (job.job_title) return job.job_title;
  const jd = job.jd || '';
  // Try common patterns: "Role: ...", "Position: ...", "Job Title: ..."
  const roleMatch = jd.match(/(?:Role|Position|Job\s*Title|Title)\s*[:–\-]\s*(.+)/i);
  if (roleMatch) return roleMatch[1].split(/[\n.]/)[0].trim().slice(0, 80);
  // Try "hiring a <role>" or "seeking a <role>"
  const hiringMatch = jd.match(/(?:hiring|seeking|looking for)\s+(?:a|an)?\s*(.+?)(?:\.|\n|$)/i);
  if (hiringMatch) return hiringMatch[1].trim().slice(0, 80);
  // Fallback: first meaningful sentence
  const firstLine = jd.split(/[\n.]/).find(l => l.trim().length > 10);
  return firstLine ? firstLine.trim().slice(0, 80) : 'View Details';
};

/* ── extract location from JD text ── */
const extractLocation = (job) => {
  const parts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
  if (parts.length) return parts.join(', ');
  const jd = job.jd || '';
  const locMatch = jd.match(/(?:Location|Based in|Office|Headquartered in)\s*[:–\-]?\s*([^\n.]{3,50})/i);
  if (locMatch) return locMatch[1].trim();
  // Try city, state pattern
  const cityState = jd.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),\s*([A-Z]{2})\b/);
  if (cityState) return `${cityState[1]}, ${cityState[2]}`;
  return '';
};

/* ── parse JD into structured sections ── */
const parseJDSections = (jdText) => {
  if (!jdText) return [];
  const sectionPatterns = /^\s*(About\b|Company\s*Overview|Overview|Position\s*Description|Job\s*Description|Description|Responsibilities|Key\s*Responsibilities|What\s*You|What\s*We|Who\s*You|Your\s*Role|Role\s*Overview|Requirements|Qualifications|Required|Preferred|Desired|Minimum|Nice\s*to\s*Have|Skills|Technical\s*Skills|Key\s*Skills|Experience|Education|Benefits|Compensation|Salary|How\s*to\s*Apply|Summary|In\s*this|Our\s*Team|The\s*Role|The\s*Position|We\s*are|Location|Job\s*Type|Employment)[^\n]*$/im;
  
  const lines = jdText.split('\n');
  const sections = [];
  let currentSection = { heading: 'Overview', lines: [] };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection.lines.length > 0) currentSection.lines.push('');
      continue;
    }
    // Check if this line is a section heading
    const isHeading = sectionPatterns.test(trimmed) ||
      (/^[A-Z][^.!?]{2,60}:$/.test(trimmed)) ||
      (/^[A-Z][^.!?]{2,40}:(?:\s*\*)?$/.test(trimmed));
    
    if (isHeading && currentSection.lines.length > 0) {
      sections.push({ ...currentSection, lines: [...currentSection.lines] });
      currentSection = { heading: trimmed.replace(/:+\s*\*?$/, '').trim(), lines: [] };
    } else if (isHeading && currentSection.lines.length === 0 && sections.length === 0) {
      currentSection.heading = trimmed.replace(/:+\s*\*?$/, '').trim();
    } else {
      currentSection.lines.push(trimmed);
    }
  }
  if (currentSection.lines.length > 0) sections.push(currentSection);
  
  // Clean trailing empty lines from each section
  return sections.map(s => ({
    ...s,
    lines: s.lines.join('\n').trim().split('\n'),
  })).filter(s => s.lines.some(l => l.trim()));
};

/* ── extract skills from JD ── */
const extractSkillsFromJD = (jdText) => {
  if (!jdText) return [];
  const techPatterns = /\b(Java|Python|JavaScript|TypeScript|React|Angular|Vue|Node\.?js|Express|Spring|Django|Flask|AWS|Azure|GCP|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|GraphQL|REST|API|Git|CI\/CD|Agile|Scrum|HTML|CSS|Tailwind|Bootstrap|C\+\+|C#|\.NET|Go|Rust|Swift|Kotlin|PHP|Ruby|Rails|Laravel|TensorFlow|PyTorch|Machine Learning|AI|Data Science|DevOps|Linux|Terraform|Jenkins|Elasticsearch|Kafka|RabbitMQ|Microservices)\b/gi;
  const matches = jdText.match(techPatterns) || [];
  const unique = [...new Set(matches.map(m => m.trim()))];
  return unique.slice(0, 12);
};

const formatDate = (ts) => {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day ago';
    if (diff < 30) return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
};

const JobListings = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringN8n, setTriggeringN8n] = useState(false);
  const [appliedLinks, setAppliedLinks] = useState(new Set());
  const [showDaysPopup, setShowDaysPopup] = useState(false);
  const [daysInput, setDaysInput] = useState('1');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [savedJobs, setSavedJobs] = useState(new Set());


  // Fetch applied status from DB
  const fetchAppliedStatus = async () => {
    try {
      const { data } = await api.get('/jobs/sheet/applied-status');
      setAppliedLinks(new Set((data.applications || []).map(a => a.jobLink)));
    } catch { /* ignore */ }
  };

  const fetchSheetJobs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/jobs/sheet');
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      toast.error('Failed to load job listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSheetJobs(); fetchAppliedStatus(); }, []);

  // Auto-select first job when jobs load
  useEffect(() => {
    if (jobs.length > 0 && !selectedJob) {
      setSelectedJob(jobs[0]);
    }
  }, [jobs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSheetJobs(), fetchAppliedStatus()]);
    setRefreshing(false);
    toast.success('Job listings refreshed!');
  };

  const handleTriggerN8n = async (days) => {
    setShowDaysPopup(false);
    setTriggeringN8n(true);
    try {
      const { data } = await api.post('/jobs/trigger-n8n', { days: String(days) });
      toast.success(data.message || 'Job search triggered! Refreshing in a moment...');
      setTimeout(async () => {
        await fetchSheetJobs();
        toast.success('Jobs refreshed with new results!');
      }, 15000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to trigger job search');
    } finally {
      setTriggeringN8n(false);
    }
  };

  const filteredJobs = useMemo(() => {
    let filtered = jobs;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((j) =>
        j.employer_name?.toLowerCase().includes(q) ||
        j.jd?.toLowerCase().includes(q) ||
        j.job_title?.toLowerCase().includes(q) ||
        j.match_summary?.toLowerCase().includes(q) ||
        j.strong_matches?.toLowerCase().includes(q)
      );
    }

    // Type filter
    if (filterType === 'applied') filtered = filtered.filter((j) => !!(j.job_apply_link && appliedLinks.has(j.job_apply_link)));
    if (filterType === 'bot') filtered = filtered.filter((j) => !!j.pdf_link);
    if (filterType === 'quick') filtered = filtered.filter((j) => !!j.job_apply_link && !j.pdf_link);
    if (filterType === 'manual') filtered = filtered.filter((j) => !j.job_apply_link && !j.pdf_link);

    // Date filter
    if (filterDate !== 'all') {
      const now = new Date();
      filtered = filtered.filter((j) => {
        if (!j.timestamp) return false;
        const d = new Date(j.timestamp);
        const diff = Math.floor((now - d) / 86400000);
        if (filterDate === 'today') return diff === 0;
        if (filterDate === 'week') return diff <= 7;
        if (filterDate === 'month') return diff <= 30;
        return true;
      });
    }

    return filtered;
  }, [jobs, search, filterType, filterDate, appliedLinks]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">

      {/* Days Popup */}
      {showDaysPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[340px] space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Search Jobs</h3>
            <p className="text-sm text-gray-500">How many days of job listings do you want?</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="30"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                className="input-field text-center text-lg font-semibold w-20"
              />
              <span className="text-sm text-gray-500">day{daysInput !== '1' ? 's' : ''}</span>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDaysPopup(false)}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTriggerN8n(daysInput || '1')}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                Search
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h1 className="text-[16px] font-bold text-gray-900">Job Listings</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {filteredJobs.length} of {jobs.length} jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDaysPopup(true)}
            disabled={triggeringN8n}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <Sparkles size={13} className={triggeringN8n ? 'animate-pulse text-violet-500' : 'text-violet-500'} />
            {triggeringN8n ? 'Searching...' : 'My Jobs'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
          >
            <RefreshCw size={13} className={(loading || refreshing) ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Split Panels */}
      <div className="flex gap-4 flex-1 min-h-0">

      {/* Left Panel — Compact Job List */}
      <div className="w-[340px] shrink-0 flex flex-col min-h-0">
        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2 mb-2 shrink-0">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-800"
            placeholder="Search company, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Job List */}
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 text-center py-14 flex-1">
            <Briefcase className="mx-auto text-gray-300 mb-3" size={28} />
            <h3 className="text-[13px] font-semibold text-gray-600">No jobs found</h3>
            <p className="text-[11px] text-gray-400 mt-1">Try adjusting your search</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
            {filteredJobs.map((job) => {
              const dateLabel = formatDate(job.timestamp);
              const isSelected = selectedJob?.id === job.id;
              const role = extractRole(job);
              const score = parseInt(job.match_score) || 0;

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`px-3.5 py-3 cursor-pointer rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-300'
                      : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-md ${avatarBg(job.employer_name)} text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5`}>
                      {job.employer_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-[12px] text-gray-800 truncate">
                          {job.employer_name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSavedJobs(prev => {
                              const next = new Set(prev);
                              if (next.has(job.id)) next.delete(job.id);
                              else next.add(job.id);
                              return next;
                            });
                          }}
                          className="p-0.5 shrink-0 transition-colors"
                        >
                          <Bookmark
                            size={14}
                            className={savedJobs.has(job.id) ? 'fill-amber-500 text-amber-500' : 'text-gray-300 hover:text-gray-400'}
                          />
                        </button>
                      </div>
                      {role && role !== job.employer_name && (
                        <p className="text-[11px] text-gray-500 truncate mt-0.5 leading-tight">{role}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        {dateLabel && (
                          <span className="text-[10px] text-gray-400">
                            {dateLabel}
                          </span>
                        )}
                        {score > 0 && (
                          <span className={`text-[10px] font-semibold ${score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-blue-600' : score >= 40 ? 'text-amber-600' : 'text-gray-400'}`}>
                            {score}% match
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}


      </div>

      {/* Right Panel — Job Details */}
      <div className="hidden lg:flex lg:flex-col flex-1 min-w-0">
        {selectedJob ? (() => {
          const job = selectedJob;
          const score = parseInt(job.match_score) || 0;
          const sl = scoreLabel(score);
          const strongTags = parseTags(job.strong_matches);
          const missingTags = parseTags(job.missing_skills);
          const dateLabel = formatDate(job.timestamp);
          const jobLocation = extractLocation(job);
          const jobType = job.job_employment_type || '';
          const role = extractRole(job);
          const jdSections = parseJDSections(job.jd);
          const jdSkills = extractSkillsFromJD(job.jd);

          return (
            <div className="bg-white rounded-lg border border-gray-200 flex flex-col flex-1 overflow-hidden">
              {/* Job Header */}
              <div className="px-5 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[15px] font-bold text-gray-900 leading-snug">{role}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] text-gray-500 font-medium">{job.employer_name}</span>
                      {jobLocation && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <MapPin size={10} />
                            {jobLocation}
                          </span>
                        </>
                      )}
                      {dateLabel && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-[11px] text-gray-400">{dateLabel}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="p-1 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <a
                    href={job.job_apply_link || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { if (!job.job_apply_link) e.preventDefault(); }}
                    className={`inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-[12px] ${!job.job_apply_link ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <ExternalLink size={13} /> Apply Now
                  </a>
                  <button
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg transition-colors text-[12px]"
                  >
                    <FileText size={13} className="text-blue-500" /> Resume
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 px-5 py-4">

                {/* Technologies & Skills */}
                {jdSkills.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Technologies & Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {jdSkills.map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-50 text-gray-600 text-[11px] font-medium rounded border border-gray-200">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Match Score */}
                {score > 0 && (
                  <div className="border-t border-gray-100 pt-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Match Score</h3>
                      <span className={`text-[12px] font-bold ${sl.color}`}>{score}% · {sl.text}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-blue-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(score, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Full Job Description — structured sections */}
                {jdSections.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Job Description</h3>
                    <div className="space-y-3">
                      {jdSections.map((section, si) => (
                        <div key={si}>
                          {si > 0 && (
                            <h4 className="text-[12px] font-bold text-gray-700 mb-1.5">
                              {section.heading}
                            </h4>
                          )}
                          <div className="text-[12px] text-gray-600 leading-[1.7]">
                            {section.lines.map((line, li) => {
                              const trimmed = line.trim();
                              if (!trimmed) return <div key={li} className="h-1.5" />;
                              const isBullet = /^[-•*○◦▪]/.test(trimmed) || /^(\d+[\.\)])/.test(trimmed);
                              const isLink = /https?:\/\/\S+/.test(trimmed);

                              if (isBullet) {
                                const text = trimmed.replace(/^[-•*○◦▪]\s*/, '').replace(/^(\d+[\.\)])\s*/, '');
                                return (
                                  <div key={li} className="flex gap-2 pl-2 py-0.5">
                                    <span className="text-gray-300 shrink-0 mt-[3px] text-[8px]">●</span>
                                    <span>{text}</span>
                                  </div>
                                );
                              }
                              if (isLink) {
                                return (
                                  <p key={li} className="py-0.5">
                                    {trimmed.split(/(https?:\/\/\S+)/).map((part, j) =>
                                      /^https?:\/\//.test(part)
                                        ? <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{part}</a>
                                        : part
                                    )}
                                  </p>
                                );
                              }
                              return <p key={li} className="py-0.5">{trimmed}</p>;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback if no JD sections parsed but raw JD exists */}
                {jdSections.length === 0 && job.jd && (
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Job Description</h3>
                    <p className="text-[12px] text-gray-600 leading-[1.7] whitespace-pre-line">{job.jd}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          /* Default — Select a job */
          <div className="bg-white rounded-lg border border-gray-200 flex flex-col items-center justify-center flex-1 text-center p-10">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-3">
              <Briefcase size={22} className="text-gray-300" />
            </div>
            <h3 className="text-[14px] font-semibold text-gray-600">Select a job to view details</h3>
            <p className="text-[11px] text-gray-400 mt-1 max-w-xs">
              Click on any listing from the left panel to see details
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default JobListings;
