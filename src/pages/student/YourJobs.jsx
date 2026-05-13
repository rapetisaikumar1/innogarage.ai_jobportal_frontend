import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react';
import api, { getTokenForRole } from '../../services/api';
import TailoredResumeModal from '../../components/resume/TailoredResumeModal';
import {
  STUDENT_PORTAL_MODE,
  buildPortalRequestConfig,
  getPortalEndpoint,
  getPortalRolePrefix,
  getPortalStorageKey,
  isAdminPortalView,
} from '../../utils/studentPortalView';

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getScoreTone = (score) => {
  if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 75) return 'text-blue-700 bg-blue-50 border-blue-200';
  return 'text-amber-700 bg-amber-50 border-amber-200';
};

const APPLICATION_STATUS_MENTOR_APPLIED = 'mentor applied';
const APPLICATION_STATUS_STUDENT_APPLIED = 'student applied';
const APPLICATION_STATUS_STUDENT_ACTION_REQUIRED = 'student action required';
const YOUR_JOBS_PAGE_SIZE = 8;
const YOUR_JOBS_FILTER_ALL = 'all';
const YOUR_JOBS_FILTER_APPLY = 'apply';
const ADMIN_APPLICATION_STATUS_OPTIONS = [
  APPLICATION_STATUS_MENTOR_APPLIED,
  APPLICATION_STATUS_STUDENT_ACTION_REQUIRED,
];
const YOUR_JOBS_STATUS_FILTER_OPTIONS = [
  { value: YOUR_JOBS_FILTER_ALL, label: 'All Jobs' },
  { value: YOUR_JOBS_FILTER_APPLY, label: 'Apply' },
  { value: APPLICATION_STATUS_STUDENT_APPLIED, label: 'Student Applied' },
  { value: APPLICATION_STATUS_MENTOR_APPLIED, label: 'Mentor Applied' },
  { value: APPLICATION_STATUS_STUDENT_ACTION_REQUIRED, label: 'Student Action Required' },
];

const normalizeApplicationStatus = (status, appliedById = null) => {
  const normalized = String(status || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  if (normalized === APPLICATION_STATUS_MENTOR_APPLIED) return APPLICATION_STATUS_MENTOR_APPLIED;
  if (normalized === APPLICATION_STATUS_STUDENT_APPLIED) return APPLICATION_STATUS_STUDENT_APPLIED;
  if (normalized === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED) return APPLICATION_STATUS_STUDENT_ACTION_REQUIRED;
  if (normalized === 'applied') return appliedById ? APPLICATION_STATUS_MENTOR_APPLIED : APPLICATION_STATUS_STUDENT_APPLIED;
  if (!normalized && !appliedById) return null;
  return appliedById ? APPLICATION_STATUS_MENTOR_APPLIED : APPLICATION_STATUS_STUDENT_APPLIED;
};

const formatApplicationStatus = (status) => String(status || '')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getApplicationStatusTone = (status) => {
  if (status === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED) return 'border-orange-500 bg-orange-500 text-white';
  if (status === APPLICATION_STATUS_MENTOR_APPLIED || status === APPLICATION_STATUS_STUDENT_APPLIED) return 'border-emerald-600 bg-emerald-600 text-white';
  return 'border-slate-200 bg-white text-slate-700';
};

const normalizeJob = (job) => {
  const applicationStatus = normalizeApplicationStatus(job.applicationStatus || job.status, job.appliedById);
  const requiresStudentAction = applicationStatus === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED;

  return {
    ...job,
    isApplied: Boolean(job.isApplied) && !requiresStudentAction,
    applicationId: job.applicationId || job.application?.id || null,
    applicationStatus,
    requiresStudentAction,
    tailoredResume: {
      ...(job.tailoredResume || {}),
      generated: Boolean(job.tailoredResume?.generated),
    },
    matchingScore: Number(job.matchingScore || job.matchScore || job.match_score || 0),
    matchProvider: job.matchProvider || 'fallback',
    matchModel: job.matchModel || null,
    matchSummary: job.matchSummary || null,
    matchWarning: job.matchWarning || null,
    appliedAt: job.appliedAt || null,
    strongMatches: Array.isArray(job.strongMatches) ? job.strongMatches : [],
    missingSkills: Array.isArray(job.missingSkills) ? job.missingSkills : [],
  };
};

const buildApiUrl = (path) => {
  const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${baseUrl}${normalizedPath}`, window.location.origin).toString();
};

const parseSseBlock = (block) => {
  const lines = block.split('\n');
  let event = 'message';
  const dataLines = [];

  lines.forEach((line) => {
    const trimmedLine = line.replace(/\r$/, '');
    if (trimmedLine.startsWith('event:')) {
      event = trimmedLine.slice(6).trim();
    }
    if (trimmedLine.startsWith('data:')) {
      dataLines.push(trimmedLine.slice(5).trim());
    }
  });

  if (dataLines.length === 0) return null;

  return {
    event,
    payload: JSON.parse(dataLines.join('\n')),
  };
};

const parseErrorResponse = async (response) => {
  try {
    const text = await response.text();
    if (!text) return 'Failed to load your jobs';

    try {
      const data = JSON.parse(text);
      return data.error || data.message || 'Failed to load your jobs';
    } catch {
      return text;
    }
  } catch {
    return 'Failed to load your jobs';
  }
};

const sortJobsByScore = (items) => [...items].sort((left, right) => {
  if (right.matchingScore !== left.matchingScore) return right.matchingScore - left.matchingScore;
  return new Date(right.matchedAt || right.updatedAt || 0).getTime() - new Date(left.matchedAt || left.updatedAt || 0).getTime();
});

const mergeJobsByScore = (items, nextJob) => {
  const nextKey = nextJob.sourceListingId || nextJob.applyLink || nextJob.id;
  return sortJobsByScore([
    ...items.filter((job) => (job.sourceListingId || job.applyLink || job.id) !== nextKey),
    nextJob,
  ]);
};

const removeJobByKey = (items, { sourceListingId, applyLink }) => items.filter((job) => {
  if (sourceListingId && job.sourceListingId === sourceListingId) return false;
  if (applyLink && job.applyLink === applyLink) return false;
  return true;
});

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

const readPendingAppliedJobs = (storageKey) => {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey) || '[]');
  } catch {
    return [];
  }
};

const writePendingAppliedJobs = (storageKey, items) => {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // ignore session storage failures
  }
};

const upsertPendingAppliedJob = (storageKey, job, appliedAt, status) => {
  const pendingJobs = readPendingAppliedJobs(storageKey).filter((item) => item.jobLink !== job.applyLink);
  writePendingAppliedJobs(storageKey, [
    {
      jobLink: job.applyLink,
      employerName: job.company,
      jobTitle: job.title,
      matchScore: job.matchingScore,
      appliedAt,
      status,
    },
    ...pendingJobs,
  ].slice(0, 20));
};

const removePendingAppliedJob = (storageKey, jobLink) => {
  if (!jobLink) return;
  writePendingAppliedJobs(storageKey, readPendingAppliedJobs(storageKey).filter((item) => item.jobLink !== jobLink));
};

const getResumeErrorMessage = (error) => {
  const responseData = error?.response?.data;
  if (typeof responseData === 'string' && responseData.trim()) return responseData.trim();
  return responseData?.error
    || responseData?.message
    || error?.message
    || 'Failed to generate resume';
};

const YourJobsLoader = ({ statusMessage, processedCount, totalCount, scoringProvider }) => {
  const hasProgress = totalCount > 0;
  const progress = hasProgress
    ? Math.max(10, Math.min(100, Math.round((processedCount / totalCount) * 100)))
    : 18;

  return (
    <div className="flex flex-1 items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-6 py-10">
      <div className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white/92 p-6 shadow-[0_28px_65px_rgba(79,70,229,0.12)] backdrop-blur sm:p-7">
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner shadow-indigo-100">
            <span className="absolute inset-0 rounded-2xl border border-indigo-100" />
            <Loader2 size={22} className="animate-spin" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black tracking-tight text-slate-900">Refreshing Your Jobs</h2>
            <p className="mt-1 text-sm text-slate-500">
              {statusMessage || (scoringProvider === 'gemini' ? 'Checking new matches with Gemini.' : 'Checking new matches from Find Jobs.')}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{hasProgress ? `Processed ${processedCount} of ${totalCount}` : 'Preparing saved matches'}</span>
            <span>{hasProgress ? `${progress}%` : 'Starting'}</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#4f46e5_0%,#2563eb_55%,#38bdf8_100%)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const YourJobs = ({
  portalMode = STUDENT_PORTAL_MODE.STUDENT,
  studentId = null,
  embedded = false,
}) => {
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [scoringProvider, setScoringProvider] = useState('fallback');
  const [totalSavedJobs, setTotalSavedJobs] = useState(0);
  const [pendingSourceCount, setPendingSourceCount] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshNeeded, setRefreshNeeded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(YOUR_JOBS_FILTER_ALL);
  const [page, setPage] = useState(1);
  const [applyingJobKey, setApplyingJobKey] = useState(null);
  const [updatingStatusKey, setUpdatingStatusKey] = useState(null);
  const [generatingResumeKey, setGeneratingResumeKey] = useState(null);
  const [resumeModal, setResumeModal] = useState(null);
  const [expandedJobKeys, setExpandedJobKeys] = useState({});
  const streamAbortRef = useRef(null);
  const pendingAppliedKey = useMemo(
    () => getPortalStorageKey('pendingApplied', { portalMode, studentId }),
    [portalMode, studentId]
  );
  const yourJobsRefreshKey = useMemo(
    () => getPortalStorageKey('yourJobsRefreshNeeded', { portalMode, studentId }),
    [portalMode, studentId]
  );
  const getPortalUrl = useCallback(
    (endpointKey, extraOptions = {}) => getPortalEndpoint(endpointKey, { portalMode, studentId, ...extraOptions }),
    [portalMode, studentId]
  );
  const requestConfig = useCallback(
    (config = {}) => buildPortalRequestConfig(portalMode, { ...config, dedupe: false }),
    [portalMode]
  );
  const isAdminView = isAdminPortalView(portalMode);

  useEffect(() => {
    const abortController = new AbortController();
    let isActive = true;
    streamAbortRef.current = abortController;

    const hydratePersistedJobs = (data) => {
      const normalizedJobs = sortJobsByScore((data.jobs || []).map(normalizeJob));
      const nextPendingSourceCount = data.pendingSourceCount || 0;
      const nextRefreshNeeded = Boolean(data.refreshNeeded);

      if (!isActive) return normalizedJobs;

      setJobs(normalizedJobs);
      setProfile(data.profile || null);
      setScoringProvider(data.scoringProvider || 'fallback');
      setTotalSavedJobs(data.totalSavedJobs || 0);
      setPendingSourceCount(nextPendingSourceCount);
      setRefreshNeeded(nextRefreshNeeded);
      setMatchedCount(data.totalMatchedJobs || normalizedJobs.length);
      setProcessedCount(0);

      return {
        jobs: normalizedJobs,
        refreshNeeded: nextRefreshNeeded,
        pendingSourceCount: nextPendingSourceCount,
      };
    };

    const loadPersistedYourJobs = async () => {
      const { data } = await api.get(
        getPortalUrl('yourJobs'),
        requestConfig({ params: { fast: 1 } })
      );
      return hydratePersistedJobs(data);
    };

    const streamYourJobs = async ({ blockUi, hasStoredJobs }) => {
      if (!isActive) return;

      if (blockUi) {
        setLoading(true);
        setStatusMessage('Preparing your fresh shortlist...');
      } else {
        setSyncing(true);
        setStatusMessage('Refreshing only the new Find Jobs records...');
      }

      try {
        const token = getTokenForRole(getPortalRolePrefix(portalMode));
        const response = await fetch(buildApiUrl(getPortalUrl('yourJobsStream')), {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(await parseErrorResponse(response));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamEnded = false;

        while (!streamEnded) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const parsed = parseSseBlock(block);
            if (!parsed) continue;

            if (parsed.event === 'meta') {
              setProfile(parsed.payload.profile || null);
              setScoringProvider(parsed.payload.scoringProvider || 'fallback');
              setTotalSavedJobs(parsed.payload.sourceCount || 0);
              setPendingSourceCount(parsed.payload.pendingSourceCount || 0);
              setRefreshNeeded(Boolean(parsed.payload.refreshNeeded));
              setMatchedCount((currentMatchedCount) => Math.max(currentMatchedCount, parsed.payload.persistedCount || 0));
              continue;
            }

            if (parsed.event === 'status') {
              setStatusMessage(parsed.payload.message || 'Refreshing only the new Find Jobs records...');
              setProcessedCount(parsed.payload.processedCount || 0);
              if (typeof parsed.payload.total === 'number') {
                setPendingSourceCount(parsed.payload.total);
              }
              if (typeof parsed.payload.matchedCount === 'number') {
                setMatchedCount(parsed.payload.matchedCount);
              }
              continue;
            }

            if (parsed.event === 'job') {
              const nextJob = normalizeJob(parsed.payload.job);
              setJobs((currentJobs) => mergeJobsByScore(currentJobs, nextJob));
              setProcessedCount(parsed.payload.processedCount || 0);
               if (typeof parsed.payload.total === 'number') {
                setPendingSourceCount(parsed.payload.total);
              }
              setMatchedCount(parsed.payload.matchedCount || 0);
              continue;
            }

            if (parsed.event === 'removed') {
              setJobs((currentJobs) => removeJobByKey(currentJobs, parsed.payload));
              setProcessedCount(parsed.payload.processedCount || 0);
              if (typeof parsed.payload.total === 'number') {
                setPendingSourceCount(parsed.payload.total);
              }
              if (typeof parsed.payload.matchedCount === 'number') {
                setMatchedCount(parsed.payload.matchedCount);
              }
              continue;
            }

            if (parsed.event === 'end') {
              streamEnded = true;
              setMatchedCount(parsed.payload.count || 0);
              setProcessedCount(parsed.payload.processedCount || 0);
              setPendingSourceCount(0);
              setRefreshNeeded(false);
              setStatusMessage(
                parsed.payload.count
                  ? `Your matched jobs are up to date. ${parsed.payload.count} jobs are saved here.`
                  : 'No jobs scored 60% or above from Find Jobs yet.'
              );
              break;
            }

            if (parsed.event === 'error') {
              throw new Error(parsed.payload.message || 'Failed to stream your jobs');
            }
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') return;

        if (hasStoredJobs) {
          setStatusMessage('Showing saved Your Jobs. Could not refresh new matches right now.');
          return;
        }

        setStatusMessage('Could not refresh dynamically. Showing stored Your Jobs results.');
        try {
          await loadPersistedYourJobs();
        } catch (fallbackError) {
          toast.error(fallbackError.response?.data?.message || error.message || 'Failed to load your jobs');
          return;
        }
      } finally {
        if (streamAbortRef.current === abortController) {
          streamAbortRef.current = null;
        }
        if (isActive) {
          setSyncing(false);
          setLoading(false);
        }
      }
    };

    const initializeJobs = async () => {
      setLoading(true);
      setStatusMessage('Loading your saved matched jobs...');

      let persistedState = {
        jobs: [],
        refreshNeeded: true,
        pendingSourceCount: 0,
      };

      try {
        persistedState = await loadPersistedYourJobs();
      } catch {
        persistedState = {
          jobs: [],
          refreshNeeded: true,
          pendingSourceCount: 0,
        };
      }

      if (!isActive) return;

      const hasStoredJobs = persistedState.jobs.length > 0;

      if (hasStoredJobs) {
        setLoading(false);
      }

      let hasQueuedRefresh = false;
      try {
        hasQueuedRefresh = sessionStorage.getItem(yourJobsRefreshKey) === '1';
      } catch {
        hasQueuedRefresh = false;
      }

      if (!persistedState.refreshNeeded && !hasQueuedRefresh) {
        setLoading(false);
        if (persistedState.jobs.length > 0) {
          setStatusMessage(`Your matched jobs are up to date. ${persistedState.jobs.length} jobs are saved here.`);
        }
        return;
      }

      try { sessionStorage.removeItem(yourJobsRefreshKey); } catch { /* ignore */ }
      await streamYourJobs({ blockUi: !hasStoredJobs, hasStoredJobs });
    };

    initializeJobs();

    return () => {
      isActive = false;
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null;
      }
      abortController.abort();
    };
  }, [getPortalUrl, portalMode, requestConfig, yourJobsRefreshKey]);

  const filteredJobs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const matchesStatusFilter = (job) => {
      if (statusFilter === YOUR_JOBS_FILTER_ALL) return true;

      const applicationStatus = normalizeApplicationStatus(job.applicationStatus, job.appliedById);
      if (statusFilter === YOUR_JOBS_FILTER_APPLY) {
        return !applicationStatus && !job.isApplied;
      }

      return applicationStatus === statusFilter;
    };

    const statusFilteredJobs = jobs.filter(matchesStatusFilter);
    if (!query) return statusFilteredJobs;

    return statusFilteredJobs.filter((job) => [
      job.title,
      job.company,
      job.location,
      job.matchLabel,
      job.matchSummary,
      job.jobDescription,
      job.strongMatches?.join(' '),
      job.missingSkills?.join(' '),
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
  }, [jobs, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / YOUR_JOBS_PAGE_SIZE));
  const paginatedJobs = useMemo(() => filteredJobs.slice(
    (page - 1) * YOUR_JOBS_PAGE_SIZE,
    page * YOUR_JOBS_PAGE_SIZE
  ), [filteredJobs, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const handleApply = async (job) => {
    const jobKey = job.applyLink || job.id;
    const canApply = isAdminView
      ? !job.applicationStatus && !job.isApplied
      : !job.isApplied || job.requiresStudentAction;
    if (!job.applyLink || !canApply || applyingJobKey === jobKey) return;

    const optimisticAppliedAt = new Date().toISOString();
    const optimisticStatus = isAdminView ? APPLICATION_STATUS_MENTOR_APPLIED : APPLICATION_STATUS_STUDENT_APPLIED;
    openApplyLink(job.applyLink);
    upsertPendingAppliedJob(pendingAppliedKey, job, optimisticAppliedAt, optimisticStatus);
    setApplyingJobKey(jobKey);
    setJobs((currentJobs) => currentJobs.map((currentJob) => (
      (currentJob.applyLink || currentJob.id) === jobKey
        ? {
            ...currentJob,
            isApplied: true,
            appliedAt: optimisticAppliedAt,
            applicationStatus: optimisticStatus,
            requiresStudentAction: false,
          }
        : currentJob
    )));

    try {
      const { data } = await api.post(
        getPortalUrl('markExternalApplied'),
        {
          yourJobId: job.id,
          sourceListingId: job.sourceListingId || null,
          jobLink: job.applyLink,
          jobTitle: job.title,
          employerName: job.company,
          location: job.location,
          datePosted: job.datePostedText || job.postedAt,
          externalId: job.sourceJobId || null,
        },
        requestConfig()
      );

      const nextStatus = normalizeApplicationStatus(
        data?.application?.status || data?.job?.applicationStatus || optimisticStatus,
        data?.application?.appliedById || data?.job?.appliedById
      );
      const persistedAppliedAt = data?.application?.appliedAt || data?.job?.appliedAt || optimisticAppliedAt;
      setJobs((currentJobs) => currentJobs.map((currentJob) => (
        (currentJob.applyLink || currentJob.id) === jobKey
          ? {
              ...currentJob,
              isApplied: nextStatus !== APPLICATION_STATUS_STUDENT_ACTION_REQUIRED,
              appliedAt: persistedAppliedAt,
              appliedById: data?.application?.appliedById || data?.job?.appliedById || null,
              applicationId: data?.application?.id || data?.job?.applicationId || currentJob.applicationId || null,
              applicationStatus: nextStatus,
              requiresStudentAction: nextStatus === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED,
            }
          : currentJob
      )));
      toast.success('Job marked as applied.');
    } catch (error) {
      removePendingAppliedJob(pendingAppliedKey, job.applyLink);
      setJobs((currentJobs) => currentJobs.map((currentJob) => (
        (currentJob.applyLink || currentJob.id) === jobKey
          ? { ...currentJob, isApplied: false, appliedAt: null }
          : currentJob
      )));
      toast.error(error.response?.data?.message || 'Failed to mark job as applied');
    } finally {
      setApplyingJobKey(null);
    }
  };

  const handleStatusChange = async (job, nextStatus) => {
    const jobKey = job.sourceListingId || job.applyLink || job.id;
    if (!isAdminView || !job.applicationId || updatingStatusKey === jobKey) return;

    const previousJob = job;
    const nextRequiresStudentAction = nextStatus === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED;
    setUpdatingStatusKey(jobKey);
    setJobs((currentJobs) => currentJobs.map((currentJob) => (
      (currentJob.sourceListingId || currentJob.applyLink || currentJob.id) === jobKey
        ? {
            ...currentJob,
            isApplied: !nextRequiresStudentAction,
            applicationStatus: nextStatus,
            requiresStudentAction: nextRequiresStudentAction,
          }
        : currentJob
    )));

    try {
      const { data } = await api.patch(
        getPortalUrl('applicationStatus', { applicationId: job.applicationId }),
        { status: nextStatus },
        requestConfig()
      );
      const updatedStatus = normalizeApplicationStatus(data?.application?.status, data?.application?.appliedById);
      const requiresStudentAction = updatedStatus === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED;

      setJobs((currentJobs) => currentJobs.map((currentJob) => (
        (currentJob.sourceListingId || currentJob.applyLink || currentJob.id) === jobKey
          ? {
              ...currentJob,
              isApplied: !requiresStudentAction,
              appliedAt: data?.application?.appliedAt || currentJob.appliedAt,
              appliedById: data?.application?.appliedById || currentJob.appliedById,
              applicationStatus: updatedStatus,
              requiresStudentAction,
            }
          : currentJob
      )));
      toast.success('Application status updated.');
    } catch (error) {
      setJobs((currentJobs) => currentJobs.map((currentJob) => (
        (currentJob.sourceListingId || currentJob.applyLink || currentJob.id) === jobKey
          ? previousJob
          : currentJob
      )));
      toast.error(error.response?.data?.message || 'Failed to update application status');
    } finally {
      setUpdatingStatusKey(null);
    }
  };

  const handleResume = async (job) => {
    const jobKey = job.sourceListingId || job.applyLink || job.id;
    if (!job.id || generatingResumeKey === jobKey) return;

    setGeneratingResumeKey(jobKey);
    try {
      const { data } = await api.post(
        getPortalUrl('yourJobResume', { yourJobId: job.id }),
        {},
        requestConfig()
      );
      const nextJob = data?.job ? normalizeJob(data.job) : job;

      if (data?.job) {
        setJobs((currentJobs) => mergeJobsByScore(currentJobs, nextJob));
      }

      if (!data?.resume?.resumeText) {
        throw new Error('Generated resume content was not returned');
      }

      setResumeModal({
        job: nextJob,
        resume: data.resume,
      });

      toast.success(data.cached ? 'Saved resume loaded.' : 'Tailored resume generated.');
      if (data.resume.warning) {
        toast(data.resume.warning, { icon: '!' });
      }
    } catch (error) {
      console.error('Resume generation failed', error);
      toast.error(getResumeErrorMessage(error));
    } finally {
      setGeneratingResumeKey(null);
    }
  };

  const toggleJobDetails = (jobKey) => {
    setExpandedJobKeys((current) => ({
      ...current,
      [jobKey]: !current[jobKey],
    }));
  };

  return (
    <div className={embedded ? 'flex h-full min-h-0 flex-col overflow-hidden' : 'flex h-[calc(100vh-4rem)] flex-col overflow-hidden'}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="shrink-0 border-b border-slate-100 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Sparkles size={19} />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-slate-900">Your Jobs</h1>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    {loading
                      ? statusMessage || 'Preparing your fresh shortlist...'
                      : syncing
                        ? statusMessage || 'Refreshing only the new Find Jobs records...'
                      : `${filteredJobs.length} matched jobs from ${totalSavedJobs} Find Jobs records${totalPages > 1 ? ` · Page ${page}/${totalPages}` : ''}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {syncing && !loading && (
                <span className="inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/90 px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm shadow-indigo-100">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  </span>
                  {pendingSourceCount > 0 ? `Refreshing ${Math.min(processedCount, pendingSourceCount)}/${pendingSourceCount}` : 'Syncing'}
                </span>
              )}
              <label className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-100 focus-within:border-indigo-300 focus-within:shadow-indigo-100">
                <Search size={14} className="shrink-0 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search jobs"
                  className="w-48 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-100 outline-none transition-colors hover:bg-slate-50 focus:border-indigo-300 focus:shadow-indigo-100"
              >
                {YOUR_JOBS_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {loading ? (
          <YourJobsLoader
            statusMessage={statusMessage}
            processedCount={processedCount}
            totalCount={pendingSourceCount}
            scoringProvider={scoringProvider}
          />
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/60 px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Briefcase size={24} />
            </div>
            <h2 className="text-base font-bold text-slate-800">
              {jobs.length === 0 ? 'No saved jobs to score yet' : 'No jobs match this search'}
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              {jobs.length === 0
                ? 'Find Jobs is scanned live here. Only jobs scoring 60% or above are saved into Your Jobs.'
                : 'Try a different search term to browse your scored jobs.'}
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto bg-slate-50/60 px-4 py-4">
            <div className="space-y-2.5">
              {paginatedJobs.map((job) => {
                const score = job.matchingScore;
                const jobKey = job.sourceListingId || job.applyLink || job.id;
                const isApplying = applyingJobKey === jobKey;
                const isUpdatingStatus = updatingStatusKey === jobKey;
                const isGeneratingResume = generatingResumeKey === jobKey;
                const isExpanded = Boolean(expandedJobKeys[jobKey]);
                const hasGeneratedResume = Boolean(job.tailoredResume?.generated);
                const applicationStatus = normalizeApplicationStatus(job.applicationStatus, job.appliedById);
                const requiresStudentAction = applicationStatus === APPLICATION_STATUS_STUDENT_ACTION_REQUIRED;
                const hasApplicationStatus = Boolean(applicationStatus || job.applicationId);
                const canApply = isAdminView
                  ? !hasApplicationStatus && !job.isApplied
                  : !job.isApplied || requiresStudentAction;
                const hasDetails = Boolean(
                  job.matchSummary
                  || job.matchWarning
                  || job.strongMatches.length > 0
                  || job.missingSkills.length > 0
                );

                return (
                  <article
                    key={job.id || job.applyLink}
                    className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(37,99,235,0.10)]"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <Briefcase size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h2 className="truncate text-sm font-bold text-slate-900 md:text-base">{job.title}</h2>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-600">
                              <span>{job.company}</span>
                              <span className="text-slate-300">•</span>
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <MapPin size={13} className="text-slate-400" />
                                {job.location || 'Location not specified'}
                              </span>
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getScoreTone(score)}`}>
                                {score}% {job.matchLabel || 'Match'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResume(job)}
                          disabled={isGeneratingResume}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-70 ${hasGeneratedResume
                            ? 'bg-slate-500 text-white shadow-slate-200 hover:bg-slate-600'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                        >
                          {isGeneratingResume ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                          Resume
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleJobDetails(jobKey)}
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

                        {isAdminView && hasApplicationStatus ? (
                          <select
                            value={ADMIN_APPLICATION_STATUS_OPTIONS.includes(applicationStatus) ? applicationStatus : ''}
                            onChange={(event) => handleStatusChange(job, event.target.value)}
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
                          <>
                            {requiresStudentAction && (
                              <span className={`inline-flex shrink-0 items-center justify-center rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm ${getApplicationStatusTone(applicationStatus)}`}>
                                {formatApplicationStatus(applicationStatus)}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleApply(job)}
                              disabled={!job.applyLink || !canApply || isApplying}
                              className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all ${!canApply || isApplying
                                ? requiresStudentAction
                                  ? 'bg-orange-500 shadow-orange-100'
                                  : 'bg-emerald-600 shadow-emerald-200'
                                : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200'} ${!job.applyLink ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                              {isApplying ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" /> Applying...
                                </>
                              ) : canApply ? (
                                <>
                                  {requiresStudentAction ? 'Re-apply' : 'Apply'} <ExternalLink size={14} />
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} /> {formatApplicationStatus(applicationStatus || APPLICATION_STATUS_STUDENT_APPLIED)}
                                </>
                              )}
                            </button>
                          </>
                        )}

                        {!isAdminView && job.isApplied && !requiresStudentAction && job.applyLink && (
                          <button
                            type="button"
                            onClick={() => openApplyLink(job.applyLink)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                          >
                            Re-apply <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        {(job.matchSummary || job.matchWarning) && (
                          <div className={`rounded-xl border px-3 py-3 ${job.matchProvider === 'gemini' ? 'border-indigo-100 bg-indigo-50/60' : 'border-amber-100 bg-amber-50/60'}`}>
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Match Summary</p>
                            {job.matchSummary && <p className="mt-1 text-sm leading-6 text-slate-700">{job.matchSummary}</p>}
                            {job.matchWarning && <p className="mt-2 text-xs font-semibold text-amber-700">{job.matchWarning}</p>}
                          </div>
                        )}

                        {(job.strongMatches.length > 0 || job.missingSkills.length > 0) && (
                          <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                              <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Strong Matches</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {job.strongMatches.length > 0 ? job.strongMatches.map((item) => (
                                  <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">{item}</span>
                                )) : <span className="text-xs font-medium text-emerald-700">Not available</span>}
                              </div>
                            </div>

                            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                              <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">Missing Skills</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {job.missingSkills.length > 0 ? job.missingSkills.map((item) => (
                                  <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">{item}</span>
                                )) : <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={12} /> None detected</span>}
                              </div>
                            </div>
                          </div>
                        )}

                        {!hasDetails && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                            Match details are not available for this job yet.
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-slate-500">
                  Showing {(page - 1) * YOUR_JOBS_PAGE_SIZE + 1}-{Math.min(page * YOUR_JOBS_PAGE_SIZE, filteredJobs.length)} of {filteredJobs.length} jobs
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                    disabled={page <= 1}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.min(currentPage + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <TailoredResumeModal resumeModal={resumeModal} onClose={() => setResumeModal(null)} />
    </div>
  );
};

export default YourJobs;