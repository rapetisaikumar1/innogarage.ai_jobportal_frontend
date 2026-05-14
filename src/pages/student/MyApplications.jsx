import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Search,
  X,
} from 'lucide-react';
import api from '../../services/api';
import TailoredResumeModal from '../../components/resume/TailoredResumeModal';
import {
  STUDENT_PORTAL_MODE,
  buildPortalRequestConfig,
  getPortalEndpoint,
  getPortalStorageKey,
  isAdminPortalView,
} from '../../utils/studentPortalView';

const PENDING_TTL_MS = 10 * 60 * 1000;

const getScoreTone = (score) => {
  if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 75) return 'text-blue-700 bg-blue-50 border-blue-200';
  return 'text-amber-700 bg-amber-50 border-amber-200';
};

const APPLICATION_STATUS_MENTOR_APPLIED = 'mentor applied';
const APPLICATION_STATUS_STUDENT_APPLIED = 'student applied';
const APPLICATION_STATUS_STUDENT_ACTION_REQUIRED = 'student action required';
const ADMIN_APPLICATION_STATUS_OPTIONS = [
  APPLICATION_STATUS_MENTOR_APPLIED,
  APPLICATION_STATUS_STUDENT_ACTION_REQUIRED,
];

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

const getApplicationStatusTone = (status) => {
  if (status === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED) return 'border-orange-500 bg-orange-500 text-white';
  if (status === APPLICATION_STATUS_MENTOR_APPLIED || status === APPLICATION_STATUS_STUDENT_APPLIED) return 'border-emerald-600 bg-emerald-600 text-white';
  return 'border-slate-200 bg-white text-slate-700';
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const normalizeList = (value) => (
  Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : []
);

const normalizeApplication = (application) => ({
  ...application,
  id: application.id || application.applyLink || application.jobLink,
  title: application.title || application.job?.title || application.jobTitle || 'Untitled role',
  company: application.company || application.job?.company || application.employerName || 'Unknown company',
  location: application.location || application.job?.location || '',
  applyLink: application.applyLink || application.job?.applyLink || application.jobLink || null,
  appliedAt: application.appliedAt || application.createdAt || null,
  status: normalizeApplicationStatus(application.status, application.appliedById),
  matchingScore: Number(application.matchingScore || application.matchScore || application.match_score || 0),
  matchProvider: application.matchProvider || null,
  matchSummary: application.matchSummary || null,
  matchWarning: application.matchWarning || null,
  matchLabel: application.matchLabel || 'Match',
  tailoredResume: {
    ...(application.tailoredResume || {}),
    generated: Boolean(application.tailoredResume?.generated),
  },
  strongMatches: normalizeList(application.strongMatches),
  missingSkills: normalizeList(application.missingSkills),
});

const getResumeErrorMessage = (error) => {
  const responseData = error?.response?.data;
  if (typeof responseData === 'string' && responseData.trim()) return responseData.trim();
  return responseData?.error
    || responseData?.message
    || error?.message
    || 'Failed to generate resume';
};

const readPendingApplications = (storageKey) => {
  try {
    const now = Date.now();
    return JSON.parse(sessionStorage.getItem(storageKey) || '[]')
      .filter((item) => item.appliedAt && (now - new Date(item.appliedAt).getTime()) < PENDING_TTL_MS)
      .map((item) => normalizeApplication({
        id: item.jobLink,
        title: item.jobTitle,
        company: item.employerName,
        applyLink: item.jobLink,
        appliedAt: item.appliedAt,
        matchingScore: item.matchScore,
        status: normalizeApplicationStatus(item.status),
      }));
  } catch {
    return [];
  }
};

const sortApplications = (items) => [...items].sort((left, right) => (
  new Date(right.appliedAt || right.updatedAt || 0).getTime()
  - new Date(left.appliedAt || left.updatedAt || 0).getTime()
));

const mergePendingApplications = (applications, pendingApplications) => {
  const seenLinks = new Set(applications.map((item) => item.applyLink).filter(Boolean));
  return sortApplications([
    ...applications,
    ...pendingApplications.filter((item) => !item.applyLink || !seenLinks.has(item.applyLink)),
  ]);
};

const openApplyLink = (applyLink) => {
  const openedWindow = window.open(applyLink, '_blank', 'noopener,noreferrer');
  if (openedWindow) return;

  const anchor = document.createElement('a');
  anchor.href = applyLink;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const ApplicationsLoader = () => (
  <div className="flex flex-1 items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-6 py-10">
    <div className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_28px_65px_rgba(79,70,229,0.12)] backdrop-blur sm:p-7">
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner shadow-indigo-100">
          <span className="absolute inset-0 rounded-2xl border border-indigo-100" />
          <Loader2 size={22} className="animate-spin" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black tracking-tight text-slate-900">Loading My Applications</h2>
          <p className="mt-1 text-sm text-slate-500">Fetching applied jobs saved from Your Jobs.</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>Preparing application cards</span>
          <span>Starting</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[42%] animate-pulse rounded-full bg-[linear-gradient(90deg,#4f46e5_0%,#2563eb_55%,#38bdf8_100%)]" />
        </div>
      </div>
    </div>
  </div>
);

const MyApplications = ({
  portalMode = STUDENT_PORTAL_MODE.STUDENT,
  studentId = null,
  embedded = false,
}) => {
  const getPortalUrl = useCallback(
    (endpointKey, extraOptions = {}) => getPortalEndpoint(endpointKey, { portalMode, studentId, ...extraOptions }),
    [portalMode, studentId]
  );
  const requestConfig = useCallback(
    (config = {}) => buildPortalRequestConfig(portalMode, config),
    [portalMode]
  );
  const pendingAppliedKey = useMemo(
    () => getPortalStorageKey('pendingApplied', { portalMode, studentId }),
    [portalMode, studentId]
  );

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedKeys, setExpandedKeys] = useState({});
  const [updatingStatusKey, setUpdatingStatusKey] = useState(null);
  const [generatingResumeKey, setGeneratingResumeKey] = useState(null);
  const [resumeModal, setResumeModal] = useState(null);
  const isAdminView = isAdminPortalView(portalMode);
  const lastRefreshAtRef = useRef(0);

  const fetchApplications = useCallback(async () => {
    lastRefreshAtRef.current = Date.now();
    setLoading(true);
    try {
      const { data } = await api.get(
        getPortalUrl('applications'),
        requestConfig({ params: { limit: 100, t: Date.now() } })
      );
      const savedApplications = sortApplications((data.applications || []).map(normalizeApplication));
      const pendingApplications = readPendingApplications(pendingAppliedKey);
      setApplications(mergePendingApplications(savedApplications, pendingApplications));
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error(error.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [getPortalUrl, pendingAppliedKey, requestConfig]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Re-fetch when the user returns to the tab/window so admin status changes appear immediately
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefreshAtRef.current > 15000)
        fetchApplications();
    };
    const onFocus = () => {
      if (Date.now() - lastRefreshAtRef.current > 15000) fetchApplications();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchApplications]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return applications;

    return applications.filter((application) => [
      application.title,
      application.company,
      application.location,
      application.matchLabel,
      application.matchSummary,
      application.strongMatches?.join(' '),
      application.missingSkills?.join(' '),
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [applications, search]);

  const toggleApplicationDetails = (applicationKey) => {
    setExpandedKeys((current) => ({
      ...current,
      [applicationKey]: !current[applicationKey],
    }));
  };

  const handleStatusChange = async (application, nextStatus) => {
    const applicationKey = application.yourJobId || application.applyLink || application.id;
    if (!isAdminView || !application.id || updatingStatusKey === applicationKey) return;

    const previousApplications = applications;
    setUpdatingStatusKey(applicationKey);
    setApplications((currentApplications) => currentApplications.map((currentApplication) => (
      (currentApplication.yourJobId || currentApplication.applyLink || currentApplication.id) === applicationKey
        ? { ...currentApplication, status: nextStatus }
        : currentApplication
    )));

    try {
      const { data } = await api.patch(
        getPortalUrl('applicationStatus', { applicationId: application.id }),
        { status: nextStatus },
        requestConfig()
      );
      const updatedStatus = normalizeApplicationStatus(data?.application?.status, data?.application?.appliedById);
      if (updatedStatus === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED) {
        setApplications((currentApplications) => currentApplications.filter((currentApplication) => (
          (currentApplication.yourJobId || currentApplication.applyLink || currentApplication.id) !== applicationKey
        )));
      } else {
        setApplications((currentApplications) => currentApplications.map((currentApplication) => (
          (currentApplication.yourJobId || currentApplication.applyLink || currentApplication.id) === applicationKey
            ? normalizeApplication({ ...currentApplication, ...(data?.application || {}), status: updatedStatus })
            : currentApplication
        )));
      }
      toast.success('Application status updated.');
    } catch (error) {
      setApplications(previousApplications);
      toast.error(error.response?.data?.message || 'Failed to update application status');
    } finally {
      setUpdatingStatusKey(null);
    }
  };

  const handleResume = async (application) => {
    const applicationKey = application.yourJobId || application.applyLink || application.id;
    if (!application.yourJobId || generatingResumeKey === applicationKey) return;

    setGeneratingResumeKey(applicationKey);
    try {
      const { data } = await api.post(
        getPortalUrl('yourJobResume', { yourJobId: application.yourJobId }),
        {},
        requestConfig()
      );

      if (!data?.resume?.resumeText) {
        throw new Error('Generated resume content was not returned');
      }

      const nextTailoredResume = {
        ...(data.job?.tailoredResume || {}),
        ...data.resume,
        generated: true,
      };

      setApplications((currentApplications) => currentApplications.map((currentApplication) => (
        (currentApplication.yourJobId || currentApplication.applyLink || currentApplication.id) === applicationKey
          ? { ...currentApplication, tailoredResume: nextTailoredResume }
          : currentApplication
      )));
      setResumeModal({
        job: {
          ...application,
          ...(data.job || {}),
        },
        resume: data.resume,
      });

      toast.success(data.cached ? 'Saved resume loaded.' : 'Tailored resume generated.');
      if (data.resume.warning) {
        toast(data.resume.warning, { icon: '!' });
      }
    } catch (error) {
      console.error('Application resume generation failed', error);
      toast.error(getResumeErrorMessage(error));
    } finally {
      setGeneratingResumeKey(null);
    }
  };

  return (
    <div className={embedded ? 'flex h-full min-h-0 flex-col' : 'flex h-[calc(100vh-4rem)] flex-col overflow-hidden'}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="shrink-0 border-b border-slate-100 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Briefcase size={19} />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-slate-900">My Applications</h1>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    {loading ? 'Loading applied jobs from Your Jobs...' : `${filteredApplications.length} applied job${filteredApplications.length === 1 ? '' : 's'} from Your Jobs`}
                  </p>
                </div>
              </div>
            </div>

            <label className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-100 focus-within:border-indigo-300 focus-within:shadow-indigo-100">
              <Search size={14} className="shrink-0 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search applications"
                className="w-48 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-slate-300 transition-colors hover:text-slate-500">
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </div>

        {loading ? (
          <ApplicationsLoader />
        ) : filteredApplications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/60 px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Briefcase size={24} />
            </div>
            <h2 className="text-base font-bold text-slate-800">
              {applications.length === 0 ? 'No applications yet' : 'No applications match this search'}
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              {applications.length === 0
                ? 'Jobs applied from Your Jobs will appear here.'
                : 'Try a different search term to browse your applied jobs.'}
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto bg-slate-50/60 px-4 py-4">
            <div className="space-y-2.5">
              {filteredApplications.map((application) => {
                const score = application.matchingScore;
                const applicationKey = application.yourJobId || application.applyLink || application.id;
                const isExpanded = Boolean(expandedKeys[applicationKey]);
                const isUpdatingStatus = updatingStatusKey === applicationKey;
                const isGeneratingResume = generatingResumeKey === applicationKey;
                const hasGeneratedResume = Boolean(application.tailoredResume?.generated);
                const applicationStatus = normalizeApplicationStatus(application.status, application.appliedById);
                const hasDetails = Boolean(
                  application.matchSummary
                  || application.matchWarning
                  || application.strongMatches.length > 0
                  || application.missingSkills.length > 0
                );

                return (
                  <article
                    key={application.id || application.applyLink}
                    className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(37,99,235,0.10)]"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <Briefcase size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h2 className="truncate text-sm font-bold text-slate-900 md:text-base">{application.title}</h2>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-600">
                              <span>{application.company}</span>
                              <span className="text-slate-300">•</span>
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <MapPin size={13} className="text-slate-400" />
                                {application.location || 'Location not specified'}
                              </span>
                              {score > 0 && (
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getScoreTone(score)}`}>
                                  {score}% {application.matchLabel || 'Match'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResume(application)}
                          disabled={!application.yourJobId || isGeneratingResume}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-70 ${hasGeneratedResume
                            ? 'bg-slate-500 text-white shadow-slate-200 hover:bg-slate-600'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                        >
                          {isGeneratingResume ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                          Resume
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleApplicationDetails(applicationKey)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                        >
                          {isExpanded ? (
                            <>
                              Hide Details <ChevronUp size={14} />
                            </>
                          ) : (
                            <>
                              Details <ChevronDown size={14} />
                            </>
                          )}
                        </button>

                        {isAdminView ? (
                          <select
                            value={ADMIN_APPLICATION_STATUS_OPTIONS.includes(applicationStatus) ? applicationStatus : ''}
                            onChange={(event) => handleStatusChange(application, event.target.value)}
                            disabled={isUpdatingStatus}
                            className={`h-9 rounded-xl border px-3 text-xs font-semibold outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${getApplicationStatusTone(applicationStatus)}`}
                          >
                            {!ADMIN_APPLICATION_STATUS_OPTIONS.includes(applicationStatus) && (
                              <option value="" disabled hidden>{formatApplicationStatus(applicationStatus)}</option>
                            )}
                            {ADMIN_APPLICATION_STATUS_OPTIONS.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>{formatApplicationStatus(statusOption)}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm ${getApplicationStatusTone(applicationStatus)}`}>
                            <CheckCircle2 size={14} /> {formatApplicationStatus(applicationStatus)}
                          </span>
                        )}

                        {application.applyLink && (
                          <button
                            type="button"
                            onClick={() => openApplyLink(application.applyLink)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                          >
                            Re-apply <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        {(application.matchSummary || application.matchWarning) && (
                          <div className={`rounded-xl border px-3 py-3 ${application.matchProvider === 'gemini' ? 'border-indigo-100 bg-indigo-50/60' : 'border-amber-100 bg-amber-50/60'}`}>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Match Summary</p>
                            {application.matchSummary && <p className="mt-1 text-sm leading-6 text-slate-700">{application.matchSummary}</p>}
                            {application.matchWarning && <p className="mt-2 text-xs font-semibold text-amber-700">{application.matchWarning}</p>}
                          </div>
                        )}

                        {(application.strongMatches.length > 0 || application.missingSkills.length > 0) && (
                          <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                              <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Strong Matches</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {application.strongMatches.length > 0 ? application.strongMatches.map((item) => (
                                  <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">{item}</span>
                                )) : <span className="text-xs font-medium text-emerald-700">Not available</span>}
                              </div>
                            </div>

                            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                              <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">Missing Skills</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {application.missingSkills.length > 0 ? application.missingSkills.map((item) => (
                                  <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">{item}</span>
                                )) : <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={12} /> None detected</span>}
                              </div>
                            </div>
                          </div>
                        )}

                        {!hasDetails && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                            Match details are not available for this application yet.
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <TailoredResumeModal resumeModal={resumeModal} onClose={() => setResumeModal(null)} />
    </div>
  );
};

export default MyApplications;