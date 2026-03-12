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

  const overviewStats = [
    { label: 'Total Students', value: analytics.totalStudents, icon: Users, color: 'blue' },
    { label: 'Total Admins', value: analytics.totalAdmins, icon: Users, color: 'purple' },
    { label: 'Total Jobs', value: analytics.totalJobs, icon: Briefcase, color: 'emerald' },
    { label: 'Total Applications', value: analytics.totalApplications, icon: TrendingUp, color: 'amber' },
    { label: 'Training Materials', value: analytics.totalMaterials, icon: BookOpen, color: 'rose' },
    { label: 'Total Bookings', value: analytics.totalBookings, icon: Calendar, color: 'cyan' },
  ];

  const statusColors = {
    APPLIED: 'bg-blue-100 text-blue-700',
    INTERVIEW: 'bg-purple-100 text-purple-700',
    OFFER: 'bg-green-100 text-green-700',
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
              <div className={`w-12 h-12 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl flex items-center justify-center`}>
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
      {analytics.applicationsByStatus && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Application Status Distribution</h2>
          <div className="space-y-3">
            {Object.entries(analytics.applicationsByStatus).map(([status, count]) => {
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
                1:{analytics.totalAdmins ? Math.round(analytics.totalStudents / analytics.totalAdmins) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Interview Rate</span>
              <span className="font-bold text-gray-800">
                {analytics.totalApplications ? Math.round(((analytics.applicationsByStatus?.INTERVIEW || 0) / analytics.totalApplications) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600">Offer Rate</span>
              <span className="font-bold text-green-600">
                {analytics.totalApplications ? Math.round(((analytics.applicationsByStatus?.OFFER || 0) / analytics.totalApplications) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Platform Health</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Active Admins</span>
              <span className="font-bold text-gray-800">{analytics.totalAdmins}</span>
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
