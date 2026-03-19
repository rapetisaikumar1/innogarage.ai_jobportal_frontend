import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { getTokenForRole, getUserForRole } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Detect role from current URL path
const getRoleFromPath = () => {
  const path = window.location.pathname;
  if (path.startsWith('/superadmin')) return 'SUPER_ADMIN';
  if (path.startsWith('/admin')) return 'ADMIN';
  return 'STUDENT';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = getRoleFromPath();
    const storedUser = getUserForRole(role);
    const token = getTokenForRole(role);
    
    if (storedUser && token) {
      setUser(storedUser);
      // Verify token is still valid
      api.get('/auth/me')
        .then(({ data }) => {
          setUser(data);
          localStorage.setItem(`${data.role}_user`, JSON.stringify(data));
        })
        .catch(() => {
          // Only clear this role's session
          localStorage.removeItem(`${role}_accessToken`);
          localStorage.removeItem(`${role}_refreshToken`);
          localStorage.removeItem(`${role}_user`);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Re-sync user when navigating between role paths
  const location = useLocation();
  useEffect(() => {
    const role = getRoleFromPath();
    const storedUser = getUserForRole(role);
    const token = getTokenForRole(role);
    if (storedUser && token) {
      setUser(storedUser);
    } else if (!['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/complete-profile', '/'].includes(location.pathname)) {
      setUser(null);
    }
  }, [location.pathname]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      // OTP required - return the response for the login page to handle
      if (data.requiresOtp) {
        toast.success('Verification code sent to your email!');
        return { requiresOtp: true, email: data.email };
      }

      // Direct login (fallback)
      const role = data.user.role;
      localStorage.setItem(`${role}_accessToken`, data.accessToken);
      localStorage.setItem(`${role}_refreshToken`, data.refreshToken);
      localStorage.setItem(`${role}_user`, JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Login successful!');
      return data.user;
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed';
      toast.error(msg);
      throw error;
    }
  };

  const verifyLoginOtp = async (email, otp) => {
    try {
      const { data } = await api.post('/auth/verify-login-otp', { email, otp });
      const role = data.user.role;
      localStorage.setItem(`${role}_accessToken`, data.accessToken);
      localStorage.setItem(`${role}_refreshToken`, data.refreshToken);
      localStorage.setItem(`${role}_user`, JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Login successful!');
      return { user: data.user, profileComplete: data.profileComplete };
    } catch (error) {
      const msg = error.response?.data?.message || 'Verification failed';
      toast.error(msg);
      throw error;
    }
  };

  const resendLoginOtp = async (email) => {
    try {
      const { data } = await api.post('/auth/resend-login-otp', { email });
      toast.success(data.message || 'New code sent!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to resend code';
      toast.error(msg);
      throw error;
    }
  };

  const signup = async (formData) => {
    try {
      const { data } = await api.post('/auth/signup', formData);
      const role = data.user.role;
      localStorage.setItem(`${role}_accessToken`, data.accessToken);
      localStorage.setItem(`${role}_refreshToken`, data.refreshToken);
      localStorage.setItem(`${role}_user`, JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Registration successful! Please verify your email.');
      return data.user;
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed';
      toast.error(msg);
      throw error;
    }
  };

  const googleLogin = async (credential, profile) => {
    try {
      const payload = {};
      if (credential) payload.credential = credential;
      if (profile) payload.profile = profile;
      const { data } = await api.post('/auth/google-login', payload);
      const role = data.user.role;
      localStorage.setItem(`${role}_accessToken`, data.accessToken);
      localStorage.setItem(`${role}_refreshToken`, data.refreshToken);
      localStorage.setItem(`${role}_user`, JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Login successful!');
      return { user: data.user, isNewUser: data.isNewUser, profileComplete: data.profileComplete };
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Google login failed';
      console.error('Google login error:', error.response?.data || error.message);
      toast.error(msg);
      throw error;
    }
  };

  const logout = async () => {
    const role = user?.role || getRoleFromPath();
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    localStorage.removeItem(`${role}_accessToken`);
    localStorage.removeItem(`${role}_refreshToken`);
    localStorage.removeItem(`${role}_user`);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    const role = updatedUser.role || getRoleFromPath();
    localStorage.setItem(`${role}_user`, JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyLoginOtp, resendLoginOtp, signup, googleLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
