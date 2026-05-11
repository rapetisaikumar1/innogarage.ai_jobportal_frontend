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
  { key: 'jobs', label: 'Find Jobs', icon: Briefcase },
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
    <div className="flex h-full min-h-0 flex-col gap-3">
      <section className="rounded-2xl border border-gray-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/students')}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-slate-50 px-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-white hover:text-gray-900"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Students</span>
            </button>

            {student.avatarUrl ? (
              <img
                src={student.avatarUrl}
                alt={student.fullName}
                className="h-12 w-12 rounded-2xl border border-gray-200 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-blue-600 text-xl font-bold text-white shadow-sm">
                {getInitials(student.fullName)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight text-gray-900">{student.fullName}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                  <Eye size={11} /> Portal View
                </span>
              </div>
              <p className="truncate text-sm text-gray-600">{student.email}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
                Managed by {adminUser?.fullName || 'Admin'}
              </p>
            </div>
          </div>

          <div className="flex w-full items-center gap-1 rounded-xl bg-slate-100 p-1 xl:w-auto xl:justify-end">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all xl:flex-none ${
                    active
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:bg-white/70 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="min-h-0 flex-1">
        {activeTab === 'dashboard' && <StudentDashboard {...sharedProps} />}
        {activeTab === 'jobs' && <JobListings {...sharedProps} />}
        {activeTab === 'applications' && <MyApplications {...sharedProps} />}
      </div>
    </div>
  );
};

export default AdminStudentView;