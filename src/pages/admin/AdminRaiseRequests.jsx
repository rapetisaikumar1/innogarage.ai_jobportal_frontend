import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ClipboardList,
  Plus,
  Send,
  User,
  Hash,
  Cpu,
  Clock3,
  CheckCircle2,
  XCircle,
  X,
  ChevronDown,
  Check,
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

const AdminRaiseRequests = () => {
  const [requests, setRequests] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [technologyDropdownOpen, setTechnologyDropdownOpen] = useState(false);
  const [form, setForm] = useState({
    title: 'ASSIGN',
    studentFullName: '',
    registrationNumber: '',
    technology: '',
  });
  const technologyDropdownRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Poll every 30s so super-admin accept/reject is visible without page reload (paused when tab hidden)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!technologyDropdownOpen) return undefined;

    const handleClickOutside = (event) => {
      if (!technologyDropdownRef.current?.contains(event.target)) {
        setTechnologyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [technologyDropdownOpen]);

  const fetchData = async () => {
    try {
      const [requestsRes, technologiesRes] = await Promise.allSettled([
        api.get('/admin/requests'),
        api.get('/admin/available-technologies', { params: { usage: 'false' } }),
      ]);

      if (requestsRes.status === 'fulfilled') {
        setRequests(requestsRes.value.data || []);
      } else {
        toast.error('Failed to load raise requests');
      }

      if (technologiesRes.status === 'fulfilled') {
        setTechnologies(technologiesRes.value.data || []);
      } else {
        toast.error('Failed to load available technologies');
      }
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setTechnologyDropdownOpen(false);
    setForm({
      title: 'ASSIGN',
      studentFullName: '',
      registrationNumber: '',
      technology: '',
    });
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

  const groupedTechnologies = useMemo(() => {
    const groups = [];
    const lookup = new Map();

    technologies.forEach((technology) => {
      const category = technology.category || 'Other';

      if (!lookup.has(category)) {
        const group = { category, items: [] };
        lookup.set(category, group);
        groups.push(group);
      }

      lookup.get(category).items.push(technology);
    });

    return groups;
  }, [technologies]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.studentFullName.trim() || !form.registrationNumber.trim() || !form.technology) {
      toast.error('Fill all request details');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/admin/requests', {
        title: form.title,
        studentFullName: form.studentFullName,
        registrationNumber: form.registrationNumber,
        technology: form.technology,
      });

      setRequests((prev) => [res.data, ...prev]);
      toast.success('Request sent to super admin');
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
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
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Raise Requests</h1>
          <p className="mt-1 text-xs text-gray-500">Track requests sent to the super admin and their latest status.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus size={15} />
          Raise Request To Super Admin
        </button>
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
          <h2 className="mt-4 text-base font-semibold text-gray-900">No requests raised yet</h2>
          <p className="mt-1 text-sm text-gray-500">Send a request to super admin when you need an assignment review.</p>
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
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
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
                      {request.reviewedAt ? ` · Reviewed ${new Date(request.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gray-400">Raise Request</p>
                <h2 className="mt-1 text-lg font-bold text-gray-900">Raise Request To Super Admin</h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Title</label>
                <select
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="ASSIGN">Assign</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Technology</label>
                <div className="relative" ref={technologyDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setTechnologyDropdownOpen((prev) => !prev)}
                    className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 text-left text-sm outline-none transition-all ${technologyDropdownOpen ? 'border-blue-300 ring-4 ring-blue-100' : 'border-gray-200'} ${form.technology ? 'text-gray-900' : 'text-gray-400'}`}
                  >
                    <span className="truncate">{form.technology || 'Select technology'}</span>
                    <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${technologyDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {technologyDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-2 shadow-xl">
                      {groupedTechnologies.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No available technologies found</div>
                      ) : (
                        groupedTechnologies.map((group) => (
                          <div key={group.category}>
                            <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">
                              {group.category}
                            </div>
                            {group.items.map((technology) => {
                              const isSelected = form.technology === technology.name;

                              return (
                                <button
                                  key={technology.id}
                                  type="button"
                                  onClick={() => {
                                    setForm((prev) => ({ ...prev, technology: technology.name }));
                                    setTechnologyDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${isSelected ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                  <span className="truncate pr-3">{technology.name}</span>
                                  {isSelected && <Check size={14} className="shrink-0 text-blue-600" />}
                                </button>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Full Name Of The Student</label>
                <input
                  type="text"
                  value={form.studentFullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, studentFullName: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter student full name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Registration Number</label>
                <input
                  type="text"
                  value={form.registrationNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, registrationNumber: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  placeholder="Enter registration number"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Send size={14} />
                {submitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminRaiseRequests;