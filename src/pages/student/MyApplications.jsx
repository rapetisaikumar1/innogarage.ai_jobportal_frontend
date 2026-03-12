import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      const params = filter ? `?status=${filter}` : '';
      const { data } = await api.get(`/jobs/applications/mine${params}`);
      setApplications(data.applications || []);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/jobs/applications/${id}/status`, { status });
      toast.success('Status updated');
      fetchApplications();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      APPLIED: 'badge-blue',
      INTERVIEW_SCHEDULED: 'badge-purple',
      REJECTED: 'badge-red',
      OFFER_RECEIVED: 'badge-green',
    };
    return map[status] || 'badge-blue';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Applications</h1>
          <p className="text-gray-500 mt-1">Track your job application progress</p>
        </div>
        <select className="input-field w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="APPLIED">Applied</option>
          <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
          <option value="REJECTED">Rejected</option>
          <option value="OFFER_RECEIVED">Offer Received</option>
        </select>
      </div>

      {applications.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-600">No applications yet</h3>
          <p className="text-gray-400 mt-1">Start browsing jobs and apply!</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Job Title</th>
                <th className="pb-3 font-medium">Company</th>
                <th className="pb-3 font-medium">Applied Date</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-800">{app.job?.title}</td>
                  <td className="py-3 text-gray-600">{app.job?.company}</td>
                  <td className="py-3 text-gray-500">{new Date(app.appliedAt).toLocaleDateString()}</td>
                  <td className="py-3">
                    <span className={app.isAutoApplied ? 'badge-green' : 'badge-yellow'}>
                      {app.isAutoApplied ? 'Auto' : 'Manual'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={getStatusBadge(app.status)}>{app.status.replace('_', ' ')}</span>
                  </td>
                  <td className="py-3">
                    <select
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                    >
                      <option value="APPLIED">Applied</option>
                      <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="OFFER_RECEIVED">Offer Received</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyApplications;
