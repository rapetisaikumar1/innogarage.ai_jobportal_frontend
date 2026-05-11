import axios from 'axios';

// Detect which role's session to use based on current URL path
const getRolePrefix = () => {
  const path = window.location.pathname;
  if (path.startsWith('/superadmin')) return 'SUPER_ADMIN';
  if (path.startsWith('/admin')) return 'ADMIN';
  return 'STUDENT';
};

export const getTokenForRole = (role) => localStorage.getItem(`${role}_accessToken`);
export const getRefreshTokenForRole = (role) => localStorage.getItem(`${role}_refreshToken`);
export const getUserForRole = (role) => {
  const u = localStorage.getItem(`${role}_user`);
  return u ? JSON.parse(u) : null;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const inFlightGetRequests = new Map();

const stableStringify = (value) => {
  if (!value || typeof value !== 'object') return String(value || '');
  const sorted = Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = value[key];
      return acc;
    }, {});
  return JSON.stringify(sorted);
};

const AUTH_REFRESH_SKIP_PATHS = [
  '/auth/login',
  '/auth/verify-login-otp',
  '/auth/resend-login-otp',
  '/auth/google-login',
  '/auth/refresh-token',
  '/auth/forgot-password',
  '/auth/reset-password',
];

const shouldSkipTokenRefresh = (url = '') => AUTH_REFRESH_SKIP_PATHS.some(path => url.includes(path));

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    // Use role from custom header if set, else detect from URL
    const role = config._rolePrefix || getRolePrefix();
    const token = getTokenForRole(role);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let axios set the correct Content-Type for FormData (multipart/form-data with boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || shouldSkipTokenRefresh(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const role = originalRequest._rolePrefix || getRolePrefix();
      const refreshToken = getRefreshTokenForRole(role);

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/auth/refresh-token`, { refreshToken });
          localStorage.setItem(`${role}_accessToken`, data.accessToken);
          localStorage.setItem(`${role}_refreshToken`, data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem(`${role}_accessToken`);
          localStorage.removeItem(`${role}_refreshToken`);
          localStorage.removeItem(`${role}_user`);
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem(`${role}_accessToken`);
        localStorage.removeItem(`${role}_user`);
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

const rawGet = api.get.bind(api);
api.get = (url, config = {}) => {
  if (config.dedupe === false) {
    return rawGet(url, config);
  }

  const role = config._rolePrefix || getRolePrefix();
  const token = getTokenForRole(role) || '';
  const key = `${role}:${token}:${url}:${stableStringify(config.params)}`;
  const existing = inFlightGetRequests.get(key);

  if (existing) return existing;

  const request = rawGet(url, config).finally(() => {
    inFlightGetRequests.delete(key);
  });
  inFlightGetRequests.set(key, request);
  return request;
};

export default api;
