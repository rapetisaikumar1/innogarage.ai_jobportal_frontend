import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { BarChart3, Users, Briefcase, TrendingUp, BookOpen, Calendar } from 'lucide-react';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/admin/analytics');
        setAnalytics(res.data);
      } catch (error) {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!analytics) {
    return <div className="card text-center py-12"><p className="text-gray-500">No analytics data available</p></div>;
  }

  const applicationsByStatus = analytics.applicationsByStatus || {};
  const totalAdmins = analytics.totalAdmins ?? analytics.totalMentors ?? 0;
  const interviewCount = applicationsByStatus.INTERVIEW_SCHEDULED ?? applicationsByStatus.INTERVIEW ?? 0;
  const offerCount = applicationsByStatus.OFFER_RECEIVED ?? applicationsByStatus.OFFER ?? 0;

  const overviewStats = [
    { label: 'Total Students', value: analytics.totalStudents ?? 0, icon: Users, accent: 'bg-blue-50 text-blue-600' },
    { label: 'Total Admins', value: totalAdmins, icon: Users, accent: 'bg-purple-50 text-purple-600' },
    { label: 'Total Jobs', value: analytics.totalJobs ?? 0, icon: Briefcase, accent: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Applications', value: analytics.totalApplications ?? 0, icon: TrendingUp, accent: 'bg-amber-50 text-amber-600' },
    { label: 'Training Materials', value: analytics.totalMaterials ?? 0, icon: BookOpen, accent: 'bg-rose-50 text-rose-600' },
    { label: 'Total Bookings', value: analytics.totalBookings ?? 0, icon: Calendar, accent: 'bg-cyan-50 text-cyan-600' },
  ];

  const statusColors = {
    APPLIED: 'bg-blue-100 text-blue-700',
    INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-700',
    OFFER_RECEIVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    WITHDRAWN: 'bg-gray-100 text-gray-700',
    MANUAL_APPLY_PENDING: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BarChart3 size={24} /> Platform Analytics</h1>
        <p className="text-gray-500 mt-1">Comprehensive overview of platform activity</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.accent} rounded-xl flex items-center justify-center`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Application Status Distribution */}
      {applicationsByStatus && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Application Status Distribution</h2>
          <div className="space-y-3">
            {Object.entries(applicationsByStatus).map(([status, count]) => {
              const total = analytics.totalApplications || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 capitalize">{status.replace(/_/g, ' ').toLowerCase()}</span>
                    <span className="text-gray-500">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className={`h-3 rounded-full ${statusColors[status]?.replace('text-', 'bg-').split(' ')[0] || 'bg-gray-300'}`}
                      style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Key Metrics</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Avg Applications per Student</span>
              <span className="font-bold text-gray-800">
                {analytics.totalStudents ? (analytics.totalApplications / analytics.totalStudents).toFixed(1) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Mentor-to-Student Ratio</span>
              <span className="font-bold text-gray-800">
                1:{totalAdmins ? Math.round((analytics.totalStudents || 0) / totalAdmins) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Interview Rate</span>
              <span className="font-bold text-gray-800">
                {analytics.totalApplications ? Math.round((interviewCount / analytics.totalApplications) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Offer Rate</span>
              <span className="font-bold text-green-600">
                {analytics.totalApplications ? Math.round((offerCount / analytics.totalApplications) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Platform Health</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Active Admins</span>
              <span className="font-bold text-gray-800">{totalAdmins}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Registered Students</span>
              <span className="font-bold text-gray-800">{analytics.totalStudents}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Total Training Resources</span>
              <span className="font-bold text-gray-800">{analytics.totalMaterials}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Mentoring Sessions</span>
              <span className="font-bold text-gray-800">{analytics.totalBookings}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
