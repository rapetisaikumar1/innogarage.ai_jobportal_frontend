import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { MessageSquareMore, Search, Clock, CheckCircle2, XCircle, AlertCircle, User, UserCheck, ArrowRightLeft } from 'lucide-react';

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'CLOSED'];

const STATUS_CONFIG = {
  OPEN: { label: 'Open', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  CLOSED: { label: 'Closed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

const QueriesPage = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [updating, setUpdating] = useState(false);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    fetchQueries();
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data } = await api.get('/queries/staff-admin');
      setStaffList(data);
    } catch {}
  };

  const fetchQueries = async () => {
    try {
      const [queriesRes, staffRes] = await Promise.allSettled([
        api.get('/queries/all'),
        api.get('/queries/staff-admin'),
      ]);
      if (queriesRes.status === 'fulfilled') setQueries(queriesRes.value.data);
      else toast.error('Failed to fetch queries');
      if (staffRes.status === 'fulfilled') setStaffList(staffRes.value.data);
    } catch (error) {
      toast.error('Failed to fetch queries');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status, adminReply) => {
    setUpdating(true);
    try {
      const { data } = await api.patch(`/queries/${id}`, { status, adminReply: adminReply || undefined });
      setQueries((prev) => prev.map((q) => (q.id === id ? data : q)));
      toast.success('Query updated');
      setReplyText('');
    } catch (error) {
      toast.error('Failed to update query');
    } finally {
      setUpdating(false);
    }
  };

  const handleReassign = async (queryId, newAssigneeId) => {
    setUpdating(true);
    try {
      const { data } = await api.patch(`/queries/${queryId}`, { assignedToId: newAssigneeId || null });
      setQueries((prev) => prev.map((q) => (q.id === queryId ? data : q)));
      toast.success(newAssigneeId ? 'Query reassigned' : 'Assignment removed');
    } catch (error) {
      toast.error('Failed to reassign query');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = queries.filter((q) => {
    const matchesSearch = !search.trim() ||
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      q.description.toLowerCase().includes(search.toLowerCase()) ||
      q.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      q.user?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: queries.length,
    open: queries.filter((q) => q.status === 'OPEN').length,
    inProgress: queries.filter((q) => q.status === 'IN_PROGRESS').length,
    closed: queries.filter((q) => q.status === 'CLOSED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-[16px] font-bold text-gray-900">Student Queries</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Manage and respond to student support requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: MessageSquareMore, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Open', value: stats.open, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Closed', value: stats.closed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white border ${stat.border} rounded-xl px-4 py-4`}>
            <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-2.5`}>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 flex-1 sm:max-w-xs">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-700"
            placeholder="Search by subject, student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${!filterStatus ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            All
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Queries List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl text-center py-16">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <MessageSquareMore size={20} className="text-gray-300" />
          </div>
          <h3 className="text-sm font-semibold text-gray-600">No queries found</h3>
          <p className="text-xs text-gray-400 mt-1">
            {queries.length === 0 ? 'No student queries yet' : 'Try a different search or filter'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map((query) => {
              const sc = STATUS_CONFIG[query.status] || STATUS_CONFIG.OPEN;
              const dateStr = new Date(query.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <button
                  key={query.id}
                  onClick={() => { setExpandedId(query.id); setReplyText(query.adminReply || ''); }}
                  className="w-full px-5 py-4 text-left hover:bg-gray-50/60 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${sc.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{query.subject}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                            {sc.label}
                          </span>
                          <span className="text-xs text-gray-400 hidden sm:inline">{dateStr}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mb-1.5">{query.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><User size={11} />{query.user?.fullName}</span>
                        <span className="hidden sm:inline truncate max-w-[160px]">{query.user?.email}</span>
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-500">{query.category}</span>
                        {query.assignedTo && (
                          <span className="flex items-center gap-1 text-violet-600"><UserCheck size={11} />{query.assignedTo.fullName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Panel Modal */}
      {expandedId && (() => {
        const query = queries.find(q => q.id === expandedId);
        if (!query) return null;
        const sc = STATUS_CONFIG[query.status] || STATUS_CONFIG.OPEN;
        const dateStr = new Date(query.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = new Date(query.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        return (
          <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setExpandedId(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto border border-gray-200">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3 rounded-t-2xl z-10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h2 className="text-base font-bold text-gray-900 truncate">{query.subject}</h2>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><User size={11} />{query.user?.fullName}</span>
                      <span>{query.user?.email}</span>
                      <span>{dateStr} · {timeStr}</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-500">{query.category}</span>
                      {query.assignedTo && (
                        <span className="flex items-center gap-1 text-violet-600 font-medium">
                          <UserCheck size={11} />
                          Assigned to: {query.assignedTo.fullName}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setExpandedId(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5">
                    <XCircle size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-5 py-4 space-y-4">
                  {/* Reassign */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <ArrowRightLeft size={11} /> Assign To
                    </p>
                    <select
                      value={query.assignedToId || ''}
                      onChange={(e) => handleReassign(query.id, e.target.value)}
                      disabled={updating}
                      className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all disabled:opacity-40"
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg px-3.5 py-3 border border-gray-100">
                      {query.description}
                    </p>
                  </div>

                  {query.status === 'CLOSED' ? (
                    query.adminReply && (
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Admin Reply</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-emerald-50 rounded-lg px-3.5 py-3 border border-emerald-100">
                          {query.adminReply}
                        </p>
                      </div>
                    )
                  ) : (
                    <>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Admin Reply</p>
                        <textarea
                          rows={3}
                          className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 resize-none placeholder-gray-400 transition-all"
                          placeholder="Write a response to the student..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Update Status</p>
                        <div className="flex gap-2">
                          {STATUS_OPTIONS.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusUpdate(query.id, s, replyText)}
                              disabled={updating}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all disabled:opacity-40 ${
                                query.status === s
                                  ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].text} ${STATUS_CONFIG[s].border} shadow-sm`
                                  : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default QueriesPage;
