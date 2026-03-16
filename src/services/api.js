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

export default api;
