export const STUDENT_PORTAL_MODE = {
  STUDENT: 'student',
  ADMIN_VIEW: 'admin-view',
};

export const isAdminPortalView = (portalMode) => portalMode === STUDENT_PORTAL_MODE.ADMIN_VIEW;

export const getPortalRolePrefix = (portalMode = STUDENT_PORTAL_MODE.STUDENT) => (
  isAdminPortalView(portalMode) ? 'ADMIN' : 'STUDENT'
);

export const buildPortalRequestConfig = (portalMode, config = {}) => ({
  ...config,
  _rolePrefix: getPortalRolePrefix(portalMode),
});

export const getPortalStorageKey = (baseKey, { portalMode = STUDENT_PORTAL_MODE.STUDENT, studentId } = {}) => {
  if (!isAdminPortalView(portalMode)) return baseKey;
  return `${baseKey}:student:${studentId || 'unknown'}`;
};

export const getPortalEndpoint = (endpointKey, { portalMode = STUDENT_PORTAL_MODE.STUDENT, studentId, yourJobId, applicationId } = {}) => {
  const adminBase = `/admin/students/${studentId}`;

  switch (endpointKey) {
    case 'applications':
      return isAdminPortalView(portalMode) ? `${adminBase}/applications` : '/jobs/applications/mine';
    case 'applicationStatus':
      if (!applicationId) throw new Error('applicationId is required for application status endpoint');
      return `${adminBase}/applications/${encodeURIComponent(applicationId)}/status`;
    case 'externalAppliedStatus':
      return isAdminPortalView(portalMode) ? `${adminBase}/external-applied-status` : '/jobs/external-applied-status';
    case 'markExternalViewed':
      return isAdminPortalView(portalMode) ? `${adminBase}/mark-external-viewed` : '/jobs/external/mark-viewed';
    case 'markExternalApplied':
      return isAdminPortalView(portalMode) ? `${adminBase}/mark-external-applied` : '/jobs/external/mark-applied';
    case 'matchedJobs':
      return isAdminPortalView(portalMode) ? `${adminBase}/matched-jobs` : '/jobs/matched';
    case 'yourJobs':
      return isAdminPortalView(portalMode) ? `${adminBase}/your-jobs` : '/jobs/your-jobs';
    case 'yourJobsStream':
      return isAdminPortalView(portalMode) ? `${adminBase}/your-jobs/stream` : '/jobs/your-jobs/stream';
    case 'yourJobResume':
      if (!yourJobId) throw new Error('yourJobId is required for resume generation endpoint');
      return isAdminPortalView(portalMode)
        ? `${adminBase}/your-jobs/${encodeURIComponent(yourJobId)}/resume-generate`
        : `/jobs/your-jobs/${encodeURIComponent(yourJobId)}/resume-generate`;
    case 'matchScore':
      return isAdminPortalView(portalMode) ? `${adminBase}/match-score` : '/jobs/match-score';
    case 'searchStream':
      return isAdminPortalView(portalMode) ? `${adminBase}/search/stream` : '/jobs/search/stream';
    case 'stats':
      return isAdminPortalView(portalMode) ? `${adminBase}/stats` : '/jobs/stats';
    case 'usage':
      return isAdminPortalView(portalMode) ? `${adminBase}/usage` : '/jobs/usage';
    default:
      throw new Error(`Unsupported student portal endpoint: ${endpointKey}`);
  }
};

const PORTAL_SECTION_ROUTES = {
  dashboard: '/dashboard',
  jobs: '/dashboard/jobs',
  'your-jobs': '/dashboard/your-jobs',
  applications: '/dashboard/applications',
  mentoring: '/dashboard/mentoring',
  chat: '/dashboard/chat',
};

export const getPortalSectionRoute = (section) => PORTAL_SECTION_ROUTES[section] || '/dashboard';

export const navigatePortalSection = ({ portalMode, section, navigate, onPortalNavigate }) => {
  if (isAdminPortalView(portalMode)) {
    onPortalNavigate?.(section);
    return;
  }

  navigate(getPortalSectionRoute(section));
};