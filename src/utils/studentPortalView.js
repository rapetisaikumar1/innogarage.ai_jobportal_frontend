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

export const getPortalEndpoint = (endpointKey, { portalMode = STUDENT_PORTAL_MODE.STUDENT, studentId } = {}) => {
  const adminBase = `/admin/students/${studentId}`;

  switch (endpointKey) {
    case 'applications':
      return isAdminPortalView(portalMode) ? `${adminBase}/applications` : '/jobs/applications/mine';
    case 'dashboardData':
      return `${adminBase}/dashboard-data`;
    case 'externalAppliedStatus':
      return isAdminPortalView(portalMode) ? `${adminBase}/external-applied-status` : '/jobs/external-applied-status';
    case 'markExternalApplied':
      return isAdminPortalView(portalMode) ? `${adminBase}/mark-external-applied` : '/jobs/external/mark-applied';
    case 'matchedJobs':
      return isAdminPortalView(portalMode) ? `${adminBase}/matched-jobs` : '/jobs/matched';
    case 'matchScore':
      return isAdminPortalView(portalMode) ? `${adminBase}/match-score` : '/jobs/match-score';
    case 'resumeGenerate':
      return isAdminPortalView(portalMode) ? `${adminBase}/resume/generate` : '/jobs/resume/generate';
    case 'resumeSave':
      return isAdminPortalView(portalMode) ? `${adminBase}/resume/save` : '/jobs/resume/save';
    case 'searchStream':
      return isAdminPortalView(portalMode) ? `${adminBase}/search/stream` : '/jobs/search/stream';
    case 'stats':
      return '/jobs/stats';
    case 'usage':
      return isAdminPortalView(portalMode) ? `${adminBase}/usage` : '/jobs/usage';
    default:
      throw new Error(`Unsupported student portal endpoint: ${endpointKey}`);
  }
};

const PORTAL_SECTION_ROUTES = {
  dashboard: '/dashboard',
  jobs: '/dashboard/jobs',
  applications: '/dashboard/applications',
};

export const getPortalSectionRoute = (section) => PORTAL_SECTION_ROUTES[section] || '/dashboard';

export const navigatePortalSection = ({ portalMode, section, navigate, onPortalNavigate }) => {
  if (isAdminPortalView(portalMode)) {
    onPortalNavigate?.(section);
    return;
  }

  navigate(getPortalSectionRoute(section));
};

export const getPortalResumeViewPath = ({ portalMode = STUDENT_PORTAL_MODE.STUDENT, studentId } = {}) => (
  isAdminPortalView(portalMode)
    ? `/admin/students/${studentId}/view/resume-view`
    : '/dashboard/resume-view'
);