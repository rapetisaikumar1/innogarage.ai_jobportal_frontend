import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getTokenForRole } from '../services/api';
import {
  STUDENT_PORTAL_MODE,
  buildPortalRequestConfig,
  getPortalEndpoint,
} from '../utils/studentPortalView';

// ─── Helpers (duplicated from JobListings to avoid circular import) ────────────

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

const parsePostedDateTime = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 0;

  const directTime = new Date(value).getTime();
  if (Number.isFinite(directTime)) return directTime;

  if (normalized === 'today' || normalized === 'just now' || normalized === 'just posted') {
    return Date.now();
  }
  if (normalized === 'yesterday') return Date.now() - DAY_MS;

  const relativeMatch = normalized.match(/(\d+)\s*\+?\s*(minute|min|hour|hr|day|week|month)s?\s*ago/);
  if (!relativeMatch) return 0;

  const amount = Number(relativeMatch[1]);
  if (!Number.isFinite(amount)) return 0;

  const unit = relativeMatch[2];
  const unitMs =
    unit === 'minute' || unit === 'min'
      ? MINUTE_MS
      : unit === 'hour' || unit === 'hr'
        ? HOUR_MS
        : unit === 'day'
          ? DAY_MS
          : unit === 'week'
            ? 7 * DAY_MS
            : MONTH_MS;

  return Date.now() - amount * unitMs;
};

const getSortTime = (job) => parsePostedDateTime(job.savedAt || job.datePosted);

const sortJobsByDate = (items) => [...items].sort((a, b) => getSortTime(b) - getSortTime(a));

const mergeJobsByDate = (items, nextJob) => {
  const key = nextJob.applyLink || nextJob.id;
  return sortJobsByDate([...items.filter((j) => (j.applyLink || j.id) !== key), nextJob]);
};

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
    const trimmed = line.replace(/\r$/, '');
    if (trimmed.startsWith('event:')) event = trimmed.slice(6).trim();
    if (trimmed.startsWith('data:')) dataLines.push(trimmed.slice(5).trim());
  });
  if (dataLines.length === 0) return null;
  return { event, payload: JSON.parse(dataLines.join('\n')) };
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

const YOUR_JOBS_REFRESH_KEY = 'yourJobsRefreshNeeded';

// ─── Context ──────────────────────────────────────────────────────────────────

export const FindJobsContext = createContext(null);

export const FindJobsProvider = ({ children }) => {
  const [jobs, setJobs] = useState([]);
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [searched, setSearched] = useState(false);
  const [activeSearchDays, setActiveSearchDays] = useState(1);
  // Timestamp bumped whenever a search completes with new listings.
  // YourJobsContext watches this to auto-trigger the scoring pipeline.
  const [jobsFoundAt, setJobsFoundAt] = useState(null);

  // Stream abort controller — lives in context, NOT tied to any component lifecycle.
  const streamAbortRef = useRef(null);

  const requestConfig = useCallback(
    (config = {}) => buildPortalRequestConfig(STUDENT_PORTAL_MODE.STUDENT, { ...config, dedupe: false }),
    []
  );

  const loadPersistedJobs = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoadingSavedJobs(true);
      try {
        const { data } = await api.get(
          getPortalEndpoint('matchedJobs', { portalMode: STUDENT_PORTAL_MODE.STUDENT }),
          requestConfig()
        );
        const persisted = sortJobsByDate((data.jobs || []).map(normalizeClientJob));
        setJobs(persisted);
        return persisted;
      } catch (error) {
        if (!silent) {
          toast.error(error.response?.data?.message || 'Failed to load saved jobs');
        }
        return [];
      } finally {
        if (!silent) setLoadingSavedJobs(false);
      }
    },
    [requestConfig]
  );

  // Load persisted jobs once on mount.
  useEffect(() => {
    loadPersistedJobs();
  }, [loadPersistedJobs]);

  const startSearch = useCallback(
    async ({ searchDays }) => {
      // Cancel any in-flight stream before starting a new one.
      streamAbortRef.current?.abort();

      const abortController = new AbortController();
      streamAbortRef.current = abortController;

      const existingJobs = jobs;
      const existingJobCount = existingJobs.length;
      const receivedKeys = new Set(existingJobs.map((job) => job.applyLink || job.id));

      setIsRunning(true);
      setIsComplete(false);
      setSearched(true);
      setActiveSearchDays(searchDays);
      setStatusMessage('Searching...');

      try {
        const streamUrl = buildApiUrl(
          getPortalEndpoint('searchStream', { portalMode: STUDENT_PORTAL_MODE.STUDENT }),
          { days: searchDays }
        );
        const token = getTokenForRole('STUDENT');

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
                receivedKeys.add(nextKey);
                setJobs((current) => mergeJobsByDate(current, nextJob));
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

        // Refresh from DB after stream ends to get latest persisted state.
        await loadPersistedJobs({ silent: true });

        const newJobCount = Math.max(receivedKeys.size - existingJobCount, 0);

        if (newJobCount > 0) {
          try { sessionStorage.setItem(YOUR_JOBS_REFRESH_KEY, '1'); } catch { /* ignore */ }
          setJobsFoundAt(Date.now());
        }

        if (jobs.length === 0 && receivedKeys.size === 0) {
          toast('No jobs found for this profile yet.', { icon: 'ℹ' });
        } else if (newJobCount === 0) {
          toast('No new jobs found. Your saved list is already up to date.', { icon: 'ℹ' });
        } else {
          toast.success(`Added ${newJobCount} new job${newJobCount !== 1 ? 's' : ''} from the last ${searchDays} day${searchDays !== 1 ? 's' : ''}.`);
        }

        setIsComplete(true);
      } catch (error) {
        if (error.name === 'AbortError') {
          // Stream was intentionally cancelled (e.g. new search started). Don't show error.
          return;
        }

        setStatusMessage('Live search stopped early. Showing jobs found so far.');
        toast.error(error.message || 'Failed to find jobs');
        setIsComplete(true);
      } finally {
        if (streamAbortRef.current === abortController) {
          streamAbortRef.current = null;
        }
        setIsRunning(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadPersistedJobs, requestConfig]
    // NOTE: `jobs` intentionally excluded — we capture it once per search call, not reactively.
  );

  const cancelSearch = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setIsRunning(false);
    setIsComplete(true);
    setStatusMessage('Search cancelled.');
  }, []);

  /** Merge a single updated job (e.g. after mark-viewed API) into the jobs list. */
  const updateJob = useCallback((updatedJob) => {
    setJobs((current) =>
      current.map((job) =>
        (job.applyLink || job.id) === (updatedJob.applyLink || updatedJob.id)
          ? { ...job, ...updatedJob }
          : job
      )
    );
  }, []);

  // Silently reload persisted Find Jobs when user returns to tab/window so
  // isViewed/isApplied flags stay current (e.g. after admin action on student's behalf).
  const lastSilentRefreshAtRef = useRef(0);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (streamAbortRef.current) return; // search in progress — skip
      if (Date.now() - lastSilentRefreshAtRef.current < 15000) return;
      lastSilentRefreshAtRef.current = Date.now();
      loadPersistedJobs({ silent: true });
    };
    const onFocus = () => {
      if (streamAbortRef.current) return;
      if (Date.now() - lastSilentRefreshAtRef.current < 15000) return;
      lastSilentRefreshAtRef.current = Date.now();
      loadPersistedJobs({ silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadPersistedJobs]);

  const value = {
    jobs,
    loadingSavedJobs,
    isRunning,
    isComplete,
    statusMessage,
    searched,
    activeSearchDays,
    jobsFoundAt,
    startSearch,
    cancelSearch,
    updateJob,
    loadPersistedJobs,
  };

  return <FindJobsContext.Provider value={value}>{children}</FindJobsContext.Provider>;
};

export const useFindJobs = () => {
  const ctx = useContext(FindJobsContext);
  if (!ctx) throw new Error('useFindJobs must be used inside FindJobsProvider');
  return ctx;
};
