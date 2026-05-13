import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Briefcase, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Eye, Loader2, MapPin, Search } from 'lucide-react';
import api, { getTokenForRole } from '../../services/api';
import {
  STUDENT_PORTAL_MODE,
  buildPortalRequestConfig,
  getPortalEndpoint,
  getPortalRolePrefix,
  getPortalStorageKey,
  isAdminPortalView,
} from '../../utils/studentPortalView';

const PAGE_SIZE = 8;
const DEFAULT_SEARCH_DAYS = 1;
const MAX_SEARCH_DAYS = 365;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

const normalizeSearchDays = (value) => {
  const parsedValue = parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(parsedValue)) return DEFAULT_SEARCH_DAYS;
  return Math.min(Math.max(parsedValue, 1), MAX_SEARCH_DAYS);
};

const formatSearchDays = (value) => `${value} day${value === 1 ? '' : 's'}`;

const normalizeClientJob = (job) => ({
  id: job.id || job.job_id || job.applyLink || job.job_apply_link,
  externalId: job.externalId || job.job_id || null,
  title: job.title || job.job_title || 'Untitled role',
  company: job.company || job.employer_name || 'Unknown company',
  location: job.location || job.job_location || '',
  datePosted: job.datePosted || job.job_posted_at || null,
  applyLink: job.applyLink || job.job_apply_link || '',
  isViewed: Boolean(job.isViewed),
  viewedAt: job.viewedAt || null,
  isApplied: Boolean(job.isApplied),
  appliedAt: job.appliedAt || null,
  savedAt: job.savedAt || job.saved_at || null,
});

const parsePostedDateTime = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 0;

  const directTime = new Date(value).getTime();
  if (Number.isFinite(directTime)) return directTime;

  if (normalized === 'today' || normalized === 'just now' || normalized === 'just posted') {
    return Date.now();
  }

  if (normalized === 'yesterday') {
    return Date.now() - DAY_MS;
  }

  const relativeMatch = normalized.match(/(\d+)\s*\+?\s*(minute|min|hour|hr|day|week|month)s?\s*ago/);
  if (!relativeMatch) return 0;

  const amount = Number(relativeMatch[1]);
  if (!Number.isFinite(amount)) return 0;

  const unit = relativeMatch[2];
  const unitMs = unit === 'minute' || unit === 'min'
    ? MINUTE_MS
    : unit === 'hour' || unit === 'hr'
      ? HOUR_MS
      : unit === 'day'
        ? DAY_MS
        : unit === 'week'
          ? 7 * DAY_MS
          : MONTH_MS;

  return Date.now() - (amount * unitMs);
};

const formatDate = (value) => {
  if (!value) return 'Recently posted';

  const time = parsePostedDateTime(value);
  if (!time) return String(value);

  const date = new Date(time);
  const diffMs = Math.max(0, Date.now() - time);
  if (diffMs < HOUR_MS) {
    const minutes = Math.max(1, Math.floor(diffMs / MINUTE_MS));
    return minutes <= 1 ? 'Just now' : `${minutes} min ago`;
  }

  if (diffMs < DAY_MS) {
    const hours = Math.max(1, Math.floor(diffMs / HOUR_MS));
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const diffDays = Math.floor(diffMs / DAY_MS);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDateTime = (value) => parsePostedDateTime(value);

const getSortTime = (job) => getDateTime(job.savedAt || job.datePosted);

const sortJobsByDate = (items) => [...items].sort((left, right) => getSortTime(right) - getSortTime(left));

const mergeJobsByDate = (items, nextJob) => {
  const nextKey = nextJob.applyLink || nextJob.id;
  return sortJobsByDate([
    ...items.filter((job) => (job.applyLink || job.id) !== nextKey),
    nextJob,
  ]);
};

const buildApiUrl = (path, params = {}) => {
  const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
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
    if (!text) return 'Failed to find jobs';

    try {
      const data = JSON.parse(text);
      return data.error || data.message || 'Failed to find jobs';
    } catch {
      return text;
    }
  } catch {
    return 'Failed to find jobs';
  }
};

const getPageItems = (items, page) => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

const JobListings = ({
  portalMode = STUDENT_PORTAL_MODE.STUDENT,
  studentId = null,
  embedded = false,
}) => {
  const [jobs, setJobs] = useState([]);
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [searchDaysInput, setSearchDaysInput] = useState(String(DEFAULT_SEARCH_DAYS));
  const [activeSearchDays, setActiveSearchDays] = useState(DEFAULT_SEARCH_DAYS);
  const [statusMessage, setStatusMessage] = useState('');
  const [applyingJobKey, setApplyingJobKey] = useState(null);
  const streamAbortRef = useRef(null);
  const panelRef = useRef(null);
  const resultsScrollRef = useRef(null);
  const autoPinnedRef = useRef(false);
  const yourJobsRefreshKey = useMemo(
    () => getPortalStorageKey('yourJobsRefreshNeeded', { portalMode, studentId }),
    [portalMode, studentId]
  );

  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const paginatedJobs = useMemo(() => getPageItems(jobs, page), [jobs, page]);
  const displayedJobs = paginatedJobs;
  const normalizedSearchDaysInput = normalizeSearchDays(searchDaysInput);
  const controlsDisabled = loading || loadingSavedJobs;

  const requestConfig = useCallback(
    (config = {}) => buildPortalRequestConfig(portalMode, { ...config, dedupe: false }),
    [portalMode]
  );

  const loadPersistedJobs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingSavedJobs(true);

    try {
      const { data } = await api.get(
        getPortalEndpoint('matchedJobs', { portalMode, studentId }),
        requestConfig({ params: { limit: 80 } })
      );
      const persistedJobs = sortJobsByDate((data.jobs || []).map(normalizeClientJob));
      setJobs(persistedJobs);
      return persistedJobs;
    } catch (error) {
      if (!silent) {
        toast.error(error.response?.data?.message || 'Failed to load saved jobs');
      }
      return [];
    } finally {
      if (!silent) setLoadingSavedJobs(false);
    }
  }, [portalMode, requestConfig, studentId]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    loadPersistedJobs();
  }, [loadPersistedJobs]);

  const pinResultsIntoView = (behavior = 'smooth') => {
    panelRef.current?.scrollIntoView({ block: 'start', behavior });
    resultsScrollRef.current?.scrollTo({ top: 0, behavior });
  };

  const runSearch = async ({ searchDays }) => {
    streamAbortRef.current?.abort();

    const abortController = new AbortController();
    streamAbortRef.current = abortController;
    const existingJobs = jobs;
    const existingJobCount = existingJobs.length;
    const receivedKeys = new Set(existingJobs.map((job) => job.applyLink || job.id));
    autoPinnedRef.current = false;
    const resolvedSearchDays = normalizeSearchDays(searchDays);

    setLoading(true);
    setSearched(true);
    setActiveSearchDays(resolvedSearchDays);
    setSearchDaysInput(String(resolvedSearchDays));
    setPage(1);
    setStatusMessage('Searching...');
    requestAnimationFrame(() => pinResultsIntoView());

    try {
      const params = {
        days: resolvedSearchDays,
      };
      if (isAdminPortalView(portalMode) && studentId) params.studentId = studentId;

      const streamUrl = buildApiUrl(
        getPortalEndpoint('searchStream', { portalMode, studentId }),
        params
      );
      const token = getTokenForRole(getPortalRolePrefix(portalMode));

      const response = await fetch(streamUrl, {
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

          if (parsed.event === 'status') {
            setStatusMessage(parsed.payload.message || 'Searching jobs...');
            continue;
          }

          if (parsed.event === 'warning') {
            setStatusMessage(parsed.payload.message || 'Continuing live search...');
            continue;
          }

          if (parsed.event === 'job') {
            const nextJob = normalizeClientJob(parsed.payload.job);
            const nextKey = nextJob.applyLink || nextJob.id;
            if (!receivedKeys.has(nextKey)) {
              if (receivedKeys.size === 0 && !autoPinnedRef.current) {
                autoPinnedRef.current = true;
                requestAnimationFrame(() => pinResultsIntoView());
              }
              receivedKeys.add(nextKey);
              setJobs((currentJobs) => mergeJobsByDate(currentJobs, nextJob));
            }
            continue;
          }

          if (parsed.event === 'end') {
            streamEnded = true;
            setStatusMessage(
              parsed.payload.count
                ? `Live search complete. ${parsed.payload.count} jobs found.`
                : 'No jobs found for this profile yet.'
            );
            break;
          }

          if (parsed.event === 'error') {
            throw new Error(parsed.payload.message || 'Failed to find jobs');
          }
        }
      }

      await loadPersistedJobs({ silent: true });

      const newJobCount = Math.max(receivedKeys.size - existingJobCount, 0);

      if (newJobCount > 0) {
        try { sessionStorage.setItem(yourJobsRefreshKey, '1'); } catch { /* ignore */ }
      }

      if (jobs.length === 0 && receivedKeys.size === 0) {
        toast('No jobs found for this profile yet.', { icon: 'i' });
      } else if (newJobCount === 0) {
        toast('No new jobs found. Your saved list is already up to date.', { icon: 'i' });
      } else {
        toast.success(`Added ${newJobCount} new jobs from the last ${formatSearchDays(resolvedSearchDays)}.`);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;

      if (receivedKeys.size === existingJobCount) {
        setStatusMessage('Could not append new jobs right now. Showing your saved list.');
      } else {
        setStatusMessage('Live search stopped early. Showing jobs found so far.');
      }
      toast.error(error.message || 'Failed to find jobs');
    } finally {
      if (streamAbortRef.current === abortController) {
        streamAbortRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleFindJobs = () => {
    const resolvedSearchDays = normalizeSearchDays(searchDaysInput);
    setSearchDaysInput(String(resolvedSearchDays));
    runSearch({ searchDays: resolvedSearchDays });
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

  const handleApply = async (job) => {
    const jobKey = job.applyLink || job.id;
    if (!job.applyLink || applyingJobKey === jobKey) return;

    const optimisticViewedAt = job.viewedAt || new Date().toISOString();
    const wasViewed = Boolean(job.isViewed);
    openApplyLink(job.applyLink);
    setApplyingJobKey(jobKey);
    setJobs((currentJobs) => currentJobs.map((currentJob) => (
      currentJob.applyLink === job.applyLink
        ? { ...currentJob, isViewed: true, viewedAt: optimisticViewedAt }
        : currentJob
    )));

    try {
      const { data } = await api.post(
        getPortalEndpoint('markExternalViewed', { portalMode, studentId }),
        {
          jobLink: job.applyLink,
          jobTitle: job.title,
          employerName: job.company,
          location: job.location,
          datePosted: job.datePosted,
          externalId: job.externalId,
        },
        requestConfig()
      );

      if (data?.job) {
        const persistedJob = normalizeClientJob(data.job);
        setJobs((currentJobs) => currentJobs.map((currentJob) => (
          currentJob.applyLink === persistedJob.applyLink
            ? { ...currentJob, ...persistedJob }
            : currentJob
        )));
      }

      if (!wasViewed) {
        toast.success('Job marked as viewed.');
      }
    } catch (error) {
      setJobs((currentJobs) => currentJobs.map((currentJob) => (
        currentJob.applyLink === job.applyLink
          ? { ...currentJob, isViewed: wasViewed, viewedAt: wasViewed ? optimisticViewedAt : null }
          : currentJob
      )));
      toast.error(error.response?.data?.message || 'Failed to mark job as viewed');
    } finally {
      setApplyingJobKey(null);
    }
  };

  return (
    <div
      ref={panelRef}
      className={embedded ? 'flex h-full min-h-0 scroll-mt-6 flex-col' : 'flex h-[calc(100vh-4rem)] scroll-mt-6 flex-col'}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900">
              {jobs.length > 0 ? `${jobs.length} jobs found` : 'Jobs'}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {loadingSavedJobs
                ? 'Loading your saved job list.'
                : loading
                ? statusMessage || `Searching jobs from the last ${formatSearchDays(activeSearchDays)}.`
                : jobs.length > 0 && !searched
                  ? 'Showing jobs saved from your previous searches. Run a new search to append more.'
                : searched
                  ? `Showing your saved jobs with new matches from the last ${formatSearchDays(activeSearchDays)}.`
                  : `Choose a date range and search jobs posted in the last ${formatSearchDays(activeSearchDays)}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-sm shadow-slate-100 transition-colors focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-blue-100">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Last</span>
              <input
                type="number"
                min="1"
                max={MAX_SEARCH_DAYS}
                inputMode="numeric"
                value={searchDaysInput}
                disabled={controlsDisabled}
                onChange={(event) => setSearchDaysInput(event.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                onBlur={() => setSearchDaysInput(String(normalizedSearchDaysInput))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleFindJobs();
                  }
                }}
                className="w-12 bg-transparent text-right text-sm font-bold text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span className="text-sm font-medium text-slate-500">
                {normalizedSearchDaysInput === 1 ? 'day' : 'days'}
              </span>
            </label>

            <button
              type="button"
              onClick={handleFindJobs}
              disabled={controlsDisabled}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {controlsDisabled ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? 'Searching...' : loadingSavedJobs ? 'Loading...' : 'Find Jobs'}
            </button>
          </div>
        </div>

        {(loading || loadingSavedJobs) && jobs.length === 0 ? (
          <div className="flex flex-1 flex-col gap-2.5 bg-slate-50/60 px-4 py-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                <div className="mt-2.5 h-3 w-28 animate-pulse rounded bg-gray-100" />
                <div className="mt-3 flex gap-3">
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Briefcase size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searched ? 'No jobs found' : 'Ready to find jobs'}
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              {searched
                ? 'Try updating your role, skills, experience, or location in your profile.'
                : 'Search once and every new match will be added to your saved job list.'}
            </p>
          </div>
        ) : (
          <>
            <div ref={resultsScrollRef} className="min-h-0 flex-1 overflow-auto bg-slate-50/60 px-4 py-4">
              <div className="space-y-2.5">
                {displayedJobs.map((job) => (
                  <article
                    key={job.id || job.applyLink}
                    className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(37,99,235,0.10)]"
                    style={{ animation: 'jobSlideIn 0.28s ease-out' }}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                            <Briefcase size={18} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-bold text-slate-900 md:text-base">
                              {job.title}
                            </h3>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-slate-600">
                              <span>{job.company}</span>
                              <span className="text-slate-300">•</span>
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <MapPin size={13} className="text-slate-400" />
                                {job.location || 'Location not specified'}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 self-start md:self-center">
                        {job.isViewed || job.isApplied ? (
                          <span className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-200">
                            <Eye size={13} className="text-white" />
                            Viewed
                          </span>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleApply(job)}
                          disabled={!job.applyLink || applyingJobKey === (job.applyLink || job.id)}
                          className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-100 transition-all hover:bg-blue-700 hover:shadow-blue-200 ${!job.applyLink || applyingJobKey === (job.applyLink || job.id) ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {applyingJobKey === (job.applyLink || job.id) ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                          Apply
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {loading && jobs.length < 4 && (
                  <div className="rounded-2xl border border-dashed border-blue-100 bg-white/90 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                    <div className="h-4 w-44 animate-pulse rounded bg-blue-100/70" />
                    <div className="mt-2.5 h-3 w-28 animate-pulse rounded bg-gray-100" />
                    <div className="mt-3 flex gap-3">
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                )}

              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={15} /> Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .filter((pageNumber) => pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - page) <= 1)
                    .map((pageNumber, index, visiblePages) => {
                      const previous = visiblePages[index - 1];
                      const showGap = previous && pageNumber - previous > 1;

                      return (
                        <div key={pageNumber} className="flex items-center gap-1">
                          {showGap && <span className="px-1 text-sm text-gray-400">...</span>}
                          <button
                            type="button"
                            onClick={() => setPage(pageNumber)}
                            className={`h-8 w-8 rounded-xl text-sm font-bold transition-colors ${
                              page === pageNumber
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JobListings;