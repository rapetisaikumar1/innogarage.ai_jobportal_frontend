import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts
import DashboardLayout from './components/layouts/DashboardLayout';

// Auth Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import CompleteProfilePage from './pages/auth/CompleteProfilePage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import JobListings from './pages/student/JobListings';
import JobDetail from './pages/student/JobDetail';
import MyApplications from './pages/student/MyApplications';
import ProfilePage from './pages/student/ProfilePage';
import TrainingPage from './pages/student/TrainingPage';
import MentoringPage from './pages/student/MentoringPage';
import ChatPage from './pages/student/ChatPage';
import NotesPage from './pages/student/NotesPage';
import AchieversPage from './pages/student/AchieversPage';
import ShoutboardPage from './pages/student/ShoutboardPage';
import HelpSupportPage from './pages/student/HelpSupportPage';
import ResumeViewPage from './pages/student/ResumeViewPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminSlots from './pages/admin/AdminSlots';
import AdminBookings from './pages/admin/AdminBookings';
import AdminChat from './pages/admin/AdminChat';
import AdminProfile from './pages/admin/AdminProfile';
import AdminStudentView from './pages/admin/AdminStudentView';
import AdminTraining from './pages/admin/AdminTraining';

// Super Admin Pages
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import ManageAdmins from './pages/superadmin/ManageAdmins';
import ManageStudents from './pages/superadmin/ManageStudents';
import ManageTraining from './pages/superadmin/ManageTraining';
import Analytics from './pages/superadmin/Analytics';
import SuperAdminProfile from './pages/superadmin/SuperAdminProfile';
import QueriesPage from './pages/superadmin/QueriesPage';
import SuperAdminChat from './pages/superadmin/SuperAdminChat';

// Loading spinner
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-4 text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, roles, allowIncomplete }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'SUPER_ADMIN') return <Navigate to="/superadmin" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  // Redirect students with incomplete profiles to complete-profile page
  if (!allowIncomplete && user.role === 'STUDENT' && user.profileCompleted === false) {
    return <Navigate to="/complete-profile" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/complete-profile" element={<ProtectedRoute roles={['STUDENT']} allowIncomplete><CompleteProfilePage /></ProtectedRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Student Routes */}
      <Route path="/dashboard" element={<ProtectedRoute roles={['STUDENT']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="jobs" element={<JobListings />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="applications" element={<MyApplications />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="mentoring" element={<MentoringPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="achievers" element={<AchieversPage />} />
        <Route path="shoutboard" element={<ShoutboardPage />} />
        <Route path="help-support" element={<HelpSupportPage />} />
        <Route path="resume-view" element={<ResumeViewPage />} />
      </Route>

      {/* Admin/Mentor Routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="students/:studentId/view" element={<AdminStudentView />} />
        <Route path="training" element={<AdminTraining />} />
        <Route path="slots" element={<AdminSlots />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="chat" element={<AdminChat />} />
        <Route path="queries" element={<QueriesPage />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>

      {/* Super Admin Routes */}
      <Route path="/superadmin" element={<ProtectedRoute roles={['SUPER_ADMIN']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="admins" element={<ManageAdmins />} />
        <Route path="students" element={<ManageStudents />} />
        <Route path="training" element={<ManageTraining />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="queries" element={<QueriesPage />} />
        <Route path="chat" element={<SuperAdminChat />} />
        <Route path="profile" element={<SuperAdminProfile />} />
      </Route>

      {/* Landing & Default */}
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
