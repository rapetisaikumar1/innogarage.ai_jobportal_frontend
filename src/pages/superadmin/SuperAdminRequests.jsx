import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Clock3,
  CheckCircle2,
  XCircle,
  User,
  Hash,
  Cpu,
  Contact,
  Check,
  X,
} from 'lucide-react';

const REQUEST_STATUS_CONFIG = {
  REQUEST_SENT: {
    label: 'Request Sent',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Clock3,
  },
  ACCEPTED: {
    label: 'Accepted',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
  },
};

const REQUEST_STATUS_ORDER = {
  REQUEST_SENT: 0,
  ACCEPTED: 1,
  REJECTED: 2,
};

const SuperAdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/admin/requests');
      setRequests(res.data || []);
    } catch (error) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const sortedRequests = useMemo(() => {
    return [...requests].sort((left, right) => {
      const statusDiff =
        (REQUEST_STATUS_ORDER[left.status] ?? Number.MAX_SAFE_INTEGER) -
        (REQUEST_STATUS_ORDER[right.status] ?? Number.MAX_SAFE_INTEGER);

      if (statusDiff !== 0) return statusDiff;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [requests]);

  const stats = useMemo(() => ({
    total: requests.length,
    sent: requests.filter((request) => request.status === 'REQUEST_SENT').length,
    accepted: requests.filter((request) => request.status === 'ACCEPTED').length,
    rejected: requests.filter((request) => request.status === 'REJECTED').length,
  }), [requests]);

  const handleStatusUpdate = async (requestId, status) => {
    setUpdatingId(requestId);
    try {
      const res = await api.patch(`/admin/requests/${requestId}/status`, { status });
      setRequests((prev) => prev.map((request) => (request.id === requestId ? res.data : request)));
      toast.success(`Request ${status === 'ACCEPTED' ? 'accepted' : 'rejected'}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update request');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">Requests</h1>
        <p className="mt-1 text-xs text-gray-500">Review requests sent by admins and decide whether to accept or reject them.</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-4 xl:max-w-[920px]">
        {[
          { label: 'Total', value: stats.total, icon: ClipboardList, bg: 'bg-slate-50', text: 'text-slate-700' },
          { label: 'Request Sent', value: stats.sent, icon: Clock3, bg: 'bg-blue-50', text: 'text-blue-700' },
          { label: 'Accepted', value: stats.accepted, icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-700' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, bg: 'bg-rose-50', text: 'text-rose-700' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <div className={`mb-1.5 flex h-6 w-6 items-center justify-center rounded-md ${item.bg}`}>
              <item.icon size={13} className={item.text} />
            </div>
            <p className={`text-lg font-bold leading-tight ${item.text}`}>{item.value}</p>
            <p className="mt-0.5 text-[10px] text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>

      {sortedRequests.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ClipboardList size={22} />
          </div>
          <h2 className="mt-4 text-base font-semibold text-gray-900">No requests available</h2>
          <p className="mt-1 text-sm text-gray-500">Admin requests will appear here once they are raised.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRequests.map((request) => {
            const statusConfig = REQUEST_STATUS_CONFIG[request.status] || REQUEST_STATUS_CONFIG.REQUEST_SENT;
            const StatusIcon = statusConfig.icon;
            const isResolved = request.status !== 'REQUEST_SENT';

            return (
              <div
                key={request.id}
                className={`rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition-opacity ${isResolved ? 'opacity-55' : 'opacity-100'}`}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                        {request.title}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-gray-400">
                      Sent {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Student</p>
                        <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <User size={14} className="text-gray-400" />
                          {request.studentFullName}
                        </p>
                      </div>

                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Registration Number</p>
                        <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <Hash size={14} className="text-gray-400" />
                          {request.registrationNumber}
                        </p>
                      </div>

                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Technology</p>
                        <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <Cpu size={14} className="text-gray-400" />
                          {request.technology}
                        </p>
                      </div>

                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Admin</p>
                        <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                          <Contact size={14} className="text-gray-400" />
                          {request.admin?.fullName || 'Unknown Admin'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {request.status === 'REQUEST_SENT' && (
                    <div className="flex items-center gap-2 xl:ml-4">
                      <button
                        onClick={() => handleStatusUpdate(request.id, 'ACCEPTED')}
                        disabled={updatingId === request.id}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(request.id, 'REJECTED')}
                        disabled={updatingId === request.id}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuperAdminRequests;