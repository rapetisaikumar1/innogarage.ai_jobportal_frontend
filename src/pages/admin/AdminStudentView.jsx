import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Briefcase, Eye, FileText, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import StudentDashboard from '../student/StudentDashboard';
import JobListings from '../student/JobListings';
import MyApplications from '../student/MyApplications';
import { STUDENT_PORTAL_MODE } from '../../utils/studentPortalView';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { key: 'jobs', label: 'Job Listings', icon: Briefcase },
  { key: 'applications', label: 'My Applications', icon: FileText },
];

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || 'ST';
};

const AdminStudentView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchStudent = async () => {
      try {
        const res = await api.get(`/admin/students/${studentId}`);
        if (isMounted) setStudent(res.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load student');
        navigate('/admin/students');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStudent();

    return () => {
      isMounted = false;
    };
  }, [navigate, studentId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!student) return null;

  const sharedProps = {
    portalMode: STUDENT_PORTAL_MODE.ADMIN_VIEW,
    studentId,
    viewerUser: student,
    embedded: true,
    onPortalNavigate: setActiveTab,
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <button
        type="button"
        onClick={() => navigate('/admin/students')}
        className="inline-flex items-center gap-2 self-start text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Students
      </button>

      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 p-5 text-white shadow-lg shadow-blue-200/40">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_60%)]" />
        <div className="absolute -right-10 top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute left-20 top-[-40px] h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          {student.avatarUrl ? (
            <img
              src={student.avatarUrl}
              alt={student.fullName}
              className="h-16 w-16 rounded-2xl border border-white/20 object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-bold shadow-lg backdrop-blur-sm">
              {getInitials(student.fullName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-3xl font-bold tracking-tight">{student.fullName}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <Eye size={12} /> Candidate Portal View
              </span>
            </div>
            <p className="mt-1 truncate text-base text-blue-50/95">{student.email}</p>
            <p className="mt-2 text-sm text-blue-100/80">Managing as: {adminUser?.fullName || 'Admin'}</p>
          </div>
        </div>
      </section>

      <div className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-sm font-semibold transition-all ${
                active
                  ? 'border-blue-200 bg-white text-blue-700 shadow-sm shadow-blue-100'
                  : 'border-transparent bg-transparent text-gray-500 hover:border-gray-200 hover:bg-white/70 hover:text-gray-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === 'dashboard' && <StudentDashboard {...sharedProps} />}
        {activeTab === 'jobs' && <JobListings {...sharedProps} />}
        {activeTab === 'applications' && <MyApplications {...sharedProps} />}
      </div>
    </div>
  );
};

export default AdminStudentView;