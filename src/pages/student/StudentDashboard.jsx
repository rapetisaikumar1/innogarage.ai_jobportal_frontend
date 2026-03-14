import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  Briefcase, FileText, Calendar, Clock,
  CheckCircle2, XCircle, Search, ArrowRight
} from 'lucide-react';

const DonutChart = ({ value, max, color, trackColor = '#e0e7ff', size = 80, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - percentage * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
    </svg>
  );
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, appsRes] = await Promise.all([
          api.get('/jobs/stats'),
          api.get('/jobs/applications/mine?limit=5'),
        ]);
        setStats(statsRes.data);
        setRecentApps(appsRes.data.applications || []);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.fullName?.split(' ')[0] || 'User';
  const totalApplied = stats?.totalApplied || 0;
  const interviewCount = stats?.interviewScheduled || 0;
  const offerCount = stats?.offerReceived || 0;
  const rejectedCount = stats?.rejected || 0;
  const totalAll = totalApplied + interviewCount + offerCount + rejectedCount;

  const statCards = [
    { label: 'Applied', value: totalApplied, icon: FileText, light: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Interviews', value: interviewCount, icon: Calendar, light: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'Offers', value: offerCount, icon: CheckCircle2, light: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Rejected', value: rejectedCount, icon: XCircle, light: 'bg-red-50', text: 'text-red-600' },
  ];

  const getStatusBadge = (status) => {
    const map = {
      APPLIED: 'bg-blue-50 text-blue-700 ring-blue-600/10',
      INTERVIEW_SCHEDULED: 'bg-violet-50 text-violet-700 ring-violet-600/10',
      REJECTED: 'bg-red-50 text-red-700 ring-red-600/10',
      OFFER_RECEIVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    };
    return map[status] || 'bg-gray-50 text-gray-700 ring-gray-600/10';
  };

  const getStatusLabel = (status) => {
    const map = {
      APPLIED: 'Applied',
      INTERVIEW_SCHEDULED: 'Interview',
      REJECTED: 'Rejected',
      OFFER_RECEIVED: 'Offer',
    };
    return map[status] || status;
  };

  return (
    <div className="space-y-5">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50/40 border border-gray-200/60 px-6 py-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-indigo-100/30 to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              {greeting}, <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">{firstName}</span>
            </h1>
            <p className="text-gray-500 text-[13px] mt-1">Here's your career progress at a glance</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/jobs')}
            className="hidden sm:inline-flex items-center gap-2.5 px-4 py-2.5 bg-white border border-gray-200/60 rounded-xl hover:shadow-md hover:border-gray-300 transition-all duration-300 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
              <Search size={15} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-[12px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">Find Jobs</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Row with Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Applications Overview */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-[13px] font-bold text-gray-800 mb-4">Applications Overview</h3>
          <div className="flex items-center gap-5">
            <div className="relative">
              <DonutChart value={offerCount} max={totalAll || 1} color="#15803d" trackColor="#1e40af" size={90} strokeWidth={10} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-extrabold text-gray-900 leading-none">{totalAll}</span>
                <span className="text-[9px] text-gray-400 font-medium mt-0.5">Total</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-700" />
                  <span className="text-[12px] text-gray-600">Offers</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{offerCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-800" />
                  <span className="text-[12px] text-gray-600">Applied</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{totalApplied}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 hover:shadow-lg transition-shadow duration-300">
          <h3 className="text-[13px] font-bold text-gray-800 mb-4">Progress</h3>
          <div className="flex items-center gap-5">
            <div className="relative">
              <DonutChart value={interviewCount} max={totalAll || 1} color="#0e7490" trackColor="#be185d" size={90} strokeWidth={10} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-extrabold text-gray-900 leading-none">{interviewCount + rejectedCount}</span>
                <span className="text-[9px] text-gray-400 font-medium mt-0.5">Updates</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-700" />
                  <span className="text-[12px] text-gray-600">Interviews</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{interviewCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-700" />
                  <span className="text-[12px] text-gray-600">Rejected</span>
                </div>
                <span className="text-[13px] font-bold text-gray-900">{rejectedCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, light, text }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200/60 p-4 hover:shadow-lg transition-all duration-300 group">
            <div className={`w-10 h-10 ${light} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
              <Icon size={18} className={text} strokeWidth={2} />
            </div>
            <p className="text-[22px] font-extrabold text-gray-900 leading-none">{value}</p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-[13px] font-bold text-gray-800 flex items-center gap-2">
            <Briefcase size={14} className="text-gray-400" />
            Recent Applications
          </h2>
          {recentApps.length > 0 && (
            <Link to="/dashboard/applications" className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
              View All <ArrowRight size={11} />
            </Link>
          )}
        </div>
        {recentApps.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Briefcase size={24} className="text-gray-300" />
            </div>
            <p className="text-[14px] text-gray-600 font-semibold">No applications yet</p>
            <p className="text-[12px] text-gray-400 mt-1 mb-5 max-w-xs mx-auto">Start exploring job listings and apply to track your progress here</p>
            <Link
              to="/dashboard/jobs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-[12px] font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Search size={13} /> Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-2.5 font-semibold">Position</th>
                  <th className="px-5 py-2.5 font-semibold">Company</th>
                  <th className="px-5 py-2.5 font-semibold">Applied</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentApps.map((app) => (
                  <tr key={app.id} className="border-t border-gray-50 hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-semibold text-gray-800">{app.job?.title}</p>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-gray-500">{app.job?.company}</td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] text-gray-400 flex items-center gap-1.5">
                        <Clock size={11} className="text-gray-300" />
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold ring-1 ring-inset ${getStatusBadge(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
