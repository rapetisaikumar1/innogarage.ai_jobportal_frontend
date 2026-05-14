import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getTokenForRole } from '../services/api';
import {
  STUDENT_PORTAL_MODE,
  buildPortalRequestConfig,
  getPortalEndpoint,
} from '../utils/studentPortalView';
import { FindJobsContext } from './FindJobsContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

const YOUR_JOBS_REFRESH_KEY = 'yourJobsRefreshNeeded';

const normalizeApplicationStatus = (status, appliedById = null) => {
  const normalized = String(status || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (normalized === 'mentor applied') return 'mentor applied';
  if (normalized === 'student applied') return 'student applied';
  if (normalized === 'student action required') return 'student action required';
  if (normalized === 'applied') return appliedById ? 'mentor applied' : 'student applied';
  if (!normalized && !appliedById) return null;
  return appliedById ? 'mentor applied' : 'student applied';
};

const normalizeJob = (job) => {
  const applicationStatus = normalizeApplicationStatus(
    job.applicationStatus || job.status,
    job.appliedById
  );
  const requiresStudentAction = applicationStatus === 'student action required';
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
    matchProvider: job.matchProvider || 'gemini',
    matchModel: job.matchModel || null,
    matchSummary: job.matchSummary || null,
    matchWarning: job.matchWarning || null,
    appliedAt: job.appliedAt || null,
    strongMatches: Array.isArray(job.strongMatches) ? job.strongMatches : [],
    missingSkills: Array.isArray(job.missingSkills) ? job.missingSkills : [],
  };
};

const sortJobsByScore = (items) => [...items].sort((a, b) => {
  if (b.matchingScore !== a.matchingScore) return b.matchingScore - a.matchingScore;
  return (
    new Date(b.matchedAt || b.updatedAt || 0).getTime() -
    new Date(a.matchedAt || a.updatedAt || 0).getTime()
  );
});

const mergeJobsByScore = (items, nextJob) => {
  const key = nextJob.sourceListingId || nextJob.applyLink || nextJob.id;
  return sortJobsByScore([
    ...items.filter((j) => (j.sourceListingId || j.applyLink || j.id) !== key),
    nextJob,
  ]);
};

const buildApiUrl = (path) => {
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${base}${normalizedPath}`, window.location.origin).toString();
};

const parseSseBlock = (block) => {
  const lines = block.split('\n');
  let event = 'message';
  const dataLines = [];
  lines.forEach((line) => {
    const t = line.replace(/\r$/, '');
    if (t.startsWith('event:')) event = t.slice(6).trim();
    if (t.startsWith('data:')) dataLines.push(t.slice(5).trim());
  });
  if (dataLines.length === 0) return null;
  return { event, payload: JSON.parse(dataLines.join('\n')) };
};

const parseErrorResponse = async (response) => {
  try {
    const text = await response.text();
    if (!text) return 'Failed to load your jobs';
    try {
      const d = JSON.parse(text);
      return d.error || d.message || 'Failed to load your jobs';
    } catch {
      return text;
    }
  } catch {
    return 'Failed to load your jobs';
  }
};

// ── Context ────────────────────────────────────────────────────────────────────

export const YourJobsContext = createContext(null);

export const YourJobsProvider = ({ children }) => {
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [scoringProvider, setScoringProvider] = useState('gemini');
  const [totalSavedJobs, setTotalSavedJobs] = useState(0);
  const [pendingSourceCount, setPendingSourceCount] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshNeeded, setRefreshNeeded] = useState(false);

  // Stream AbortController lives in a ref — NOT tied to any component lifecycle.
  const streamAbortRef = useRef(null);

  // Subscribe to FindJobsContext (available because YourJobsProvider is nested inside FindJobsProvider).
  const findJobsCtx = useContext(FindJobsContext);

  const requestConfig = useCallback(
    (config = {}) => buildPortalRequestConfig(STUDENT_PORTAL_MODE.STUDENT, { ...config, dedupe: false }),
    []
  );

  const loadPersistedYourJobs = useCallback(async () => {
    const { data } = await api.get(
      getPortalEndpoint('yourJobs', { portalMode: STUDENT_PORTAL_MODE.STUDENT }),
      requestConfig({ params: { fast: 1 } })
    );
    const normalizedJobs = sortJobsByScore((data.jobs || []).map(normalizeJob));
    const nextPending = data.pendingSourceCount || 0;
    const nextRefresh = Boolean(data.refreshNeeded);
    setJobs(normalizedJobs);
    setProfile(data.profile || null);
    setScoringProvider(data.scoringProvider || 'gemini');
    setTotalSavedJobs(data.totalSavedJobs || 0);
    setPendingSourceCount(nextPending);
    setRefreshNeeded(nextRefresh);
    setMatchedCount(data.totalMatchedJobs || normalizedJobs.length);
    setProcessedCount(0);
    return { jobs: normalizedJobs, refreshNeeded: nextRefresh, pendingSourceCount: nextPending };
  }, [requestConfig]);

  const runStream = useCallback(
    async ({ blockUi, hasStoredJobs, abortController }) => {
      if (blockUi) {
        setLoading(true);
        setStatusMessage('Preparing your fresh shortlist...');
      } else {
        setSyncing(true);
        setStatusMessage('Refreshing only the new Find Jobs records...');
      }

      try {
        const token = getTokenForRole('STUDENT');
        const response = await fetch(
          buildApiUrl(
            getPortalEndpoint('yourJobsStream', { portalMode: STUDENT_PORTAL_MODE.STUDENT })
          ),
          {
            method: 'GET',
            headers: {
              Accept: 'text/event-stream',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: abortController.signal,
          }
        );

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
              setScoringProvider(parsed.payload.scoringProvider || 'gemini');
              setTotalSavedJobs(parsed.payload.sourceCount || 0);
              setPendingSourceCount(parsed.payload.pendingSourceCount || 0);
              setRefreshNeeded(Boolean(parsed.payload.refreshNeeded));
              setMatchedCount((c) => Math.max(c, parsed.payload.persistedCount || 0));
              continue;
            }

            if (parsed.event === 'status') {
              setStatusMessage(parsed.payload.message || 'Refreshing...');
              setProcessedCount(parsed.payload.processedCount || 0);
              if (typeof parsed.payload.total === 'number') setPendingSourceCount(parsed.payload.total);
              if (typeof parsed.payload.matchedCount === 'number') setMatchedCount(parsed.payload.matchedCount);
              continue;
            }

            if (parsed.event === 'job') {
              const nextJob = normalizeJob(parsed.payload.job);
              setJobs((current) => mergeJobsByScore(current, nextJob));
              setProcessedCount(parsed.payload.processedCount || 0);
              if (typeof parsed.payload.total === 'number') setPendingSourceCount(parsed.payload.total);
              setMatchedCount(parsed.payload.matchedCount || 0);
              continue;
            }

            if (parsed.event === 'removed') {
              setJobs((current) =>
                current.filter((j) => {
                  if (parsed.payload.sourceListingId && j.sourceListingId === parsed.payload.sourceListingId) return false;
                  if (parsed.payload.applyLink && j.applyLink === parsed.payload.applyLink) return false;
                  return true;
                })
              );
              setProcessedCount(parsed.payload.processedCount || 0);
              if (typeof parsed.payload.total === 'number') setPendingSourceCount(parsed.payload.total);
              if (typeof parsed.payload.matchedCount === 'number') setMatchedCount(parsed.payload.matchedCount);
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

        setStatusMessage('Could not refresh. Showing stored Your Jobs.');
        try {
          await loadPersistedYourJobs();
        } catch (fallbackError) {
          toast.error(
            fallbackError.response?.data?.message || error.message || 'Failed to load your jobs'
          );
        }
      } finally {
        if (streamAbortRef.current === abortController) streamAbortRef.current = null;
        setSyncing(false);
        setLoading(false);
      }
    },
    [loadPersistedYourJobs]
  );

  /**
   * Idempotent — safe to call on every YourJobs page mount.
   * Does nothing if a stream is already in flight.
   * Re-streams only when refreshNeeded or Find Jobs queued a refresh.
   */
  const initialize = useCallback(async () => {
    // Already streaming — let the current run finish.
    if (streamAbortRef.current) return;

    setLoading(true);
    setStatusMessage('Loading your saved matched jobs...');

    let persistedState = { jobs: [], refreshNeeded: true, pendingSourceCount: 0 };
    try {
      persistedState = await loadPersistedYourJobs();
    } catch {
      /* use defaults */
    }

    const hasStoredJobs = persistedState.jobs.length > 0;
    if (hasStoredJobs) setLoading(false);

    let hasQueuedRefresh = false;
    try {
      hasQueuedRefresh = sessionStorage.getItem(YOUR_JOBS_REFRESH_KEY) === '1';
    } catch {
      /* ignore */
    }

    if (!persistedState.refreshNeeded && !hasQueuedRefresh) {
      setLoading(false);
      if (hasStoredJobs) {
        setStatusMessage(
          `Your matched jobs are up to date. ${persistedState.jobs.length} jobs are saved here.`
        );
      }
      return;
    }

    try {
      sessionStorage.removeItem(YOUR_JOBS_REFRESH_KEY);
    } catch {
      /* ignore */
    }

    const abortController = new AbortController();
    streamAbortRef.current = abortController;
    await runStream({ blockUi: !hasStoredJobs, hasStoredJobs, abortController });
  }, [loadPersistedYourJobs, runStream]);

  /**
   * Patch one job in the list by its key (used by apply / status / resume actions).
   */
  const updateJob = useCallback((jobKey, patch) => {
    setJobs((current) =>
      current.map((j) =>
        (j.sourceListingId || j.applyLink || j.id) === jobKey ? { ...j, ...patch } : j
      )
    );
  }, []);

  // Auto-start pipeline the moment the dashboard mounts — no need to visit the Your Jobs page.
  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-trigger whenever Find Jobs completes a search with new listings.
  useEffect(() => {
    if (!findJobsCtx?.jobsFoundAt) return;
    initialize();
  }, [findJobsCtx?.jobsFoundAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Silently reload persisted jobs when user returns to tab/window so admin status
  // changes (applied, interview scheduled, etc.) appear without a full stream restart.
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      if (streamAbortRef.current) return; // stream is running — skip
      try { await loadPersistedYourJobs(); } catch { /* ignore */ }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [loadPersistedYourJobs]);

  const value = {
    jobs,
    profile,
    scoringProvider,
    totalSavedJobs,
    pendingSourceCount,
    matchedCount,
    processedCount,
    statusMessage,
    loading,
    syncing,
    refreshNeeded,
    initialize,
    updateJob,
  };

  return <YourJobsContext.Provider value={value}>{children}</YourJobsContext.Provider>;
};

export const useYourJobs = () => {
  const ctx = useContext(YourJobsContext);
  if (!ctx) throw new Error('useYourJobs must be used inside YourJobsProvider');
  return ctx;
};
