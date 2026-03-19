import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FileText, Search, Mail, Phone, ChevronLeft, ChevronRight,
  Edit3, X, Calendar, MapPin, MessageSquare, CheckCircle2, XCircle, Clock
} from 'lucide-react';

const STATUS_CONFIG = {
  APPLIED: { label: 'Applied', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <Clock size={12} /> },
  INTERVIEW_SCHEDULED: { label: 'Interview', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Calendar size={12} /> },
  OFFER_RECEIVED: { label: 'Offer', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 size={12} /> },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <XCircle size={12} /> },
};

const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [editApp, setEditApp] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '', interviewDate: '', interviewLocation: '', interviewNotes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchApplications(); }, [page, filterStatus]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterStatus) params.append('status', filterStatus);
      if (search.trim()) params.append('search', search.trim());
      const { data } = await api.get('/jobs/applications/all?' + params);
      setApplications(data.applications);
      setPagination(data.pagination);
    } catch (error) { toast.error('Failed to fetch applications'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchApplications(); };

  const openEdit = (app) => {
    setEditApp(app);
    setEditForm({
      status: app._quickInterview ? 'INTERVIEW_SCHEDULED' : app.status,
      notes: app.notes || '',
      interviewDate: app.interviewDate ? new Date(app.interviewDate).toISOString().slice(0, 16) : '',
      interviewLocation: app.interviewLocation || '',
      interviewNotes: app.interviewNotes || '',
    });
  };

  const closeEdit = () => { setEditApp(null); };

  const saveEdit = async () => {
    if (!editApp) return;
    setSaving(true);
    try {
      await api.patch('/jobs/applications/' + editApp.id + '/status', {
        status: editForm.status,
        notes: editForm.notes,
        interviewDate: editForm.interviewDate || null,
        interviewLocation: editForm.interviewLocation,
        interviewNotes: editForm.interviewNotes,
      });
      toast.success('Application updated');
      closeEdit();
      fetchApplications();
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const quickStatus = async (app, newStatus) => {
    try {
      await api.patch('/jobs/applications/' + app.id + '/status', { status: newStatus });
      toast.success('Status updated to ' + newStatus.replace(/_/g, ' '));
      fetchApplications();
    } catch (error) { toast.error('Failed to update status'); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '\u2014';
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014';

  const stats = {
    total: pagination.total,
    applied: applications.filter(a => a.status === 'APPLIED').length,
    interview: applications.filter(a => a.status === 'INTERVIEW_SCHEDULED').length,
    offers: applications.filter(a => a.status === 'OFFER_RECEIVED').length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[16px] font-bold text-gray-900">Student Applications</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Manage job applications \u2014 edit interview details, approve, or reject</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Applied', value: stats.applied, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Interviews', value: stats.interview, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Offers', value: stats.offers, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className={s.bg + ' w-8 h-8 rounded-lg flex items-center justify-center'}>
              <FileText size={15} className={s.color} />
            </div>
            <div>
              <p className="text-[18px] font-bold text-gray-900 leading-none">{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-2 flex-1 sm:max-w-xs">
          <Search size={13} className="text-gray-400 shrink-0" />
          <input type="text" className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-700" placeholder="Search by student, job, company..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <div className="flex items-center gap-1 bg-gray-100/80 rounded-lg p-0.5">
          <button onClick={() => { setFilterStatus(''); setPage(1); }} className={'px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ' + (!filterStatus ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>All</button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => { setFilterStatus(filterStatus === key ? '' : key); setPage(1); }} className={'px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ' + (filterStatus === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{cfg.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : applications.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-16">
          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3"><FileText size={20} className="text-gray-300" /></div>
          <h3 className="text-[13px] font-semibold text-gray-600">No applications found</h3>
          <p className="text-[11px] text-gray-400 mt-1">Try a different search or filter</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Job</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Applied</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => {
                  const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG.APPLIED;
                  return (
                    <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold shrink-0">
                            {app.user?.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-gray-900 truncate">{app.user?.fullName}</p>
                            <p className="text-[10px] text-gray-400 truncate flex items-center gap-1"><Mail size={9} /> {app.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[12px] font-medium text-gray-800 truncate max-w-[200px]">{app.job?.title}</p>
                      </td>
                      <td className="px-4 py-3"><p className="text-[12px] text-gray-700">{app.job?.company}</p></td>
                      <td className="px-4 py-3"><p className="text-[11px] text-gray-500">{fmtDate(app.appliedAt)}</p></td>
                      <td className="px-4 py-3">
                        <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ' + sc.bg + ' ' + sc.text + ' ' + sc.border}>
                          {sc.icon} {sc.label}
                        </span>
                        {app.interviewDate && app.status === 'INTERVIEW_SCHEDULED' && (
                          <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1"><Calendar size={9} /> {fmtDateTime(app.interviewDate)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button onClick={() => openEdit(app)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors ring-1 ring-blue-200" title="Edit"><Edit3 size={11} /> Edit</button>
                          {app.status === 'APPLIED' && (
                            <>
                              <button onClick={() => openEdit({ ...app, _quickInterview: true })} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors ring-1 ring-amber-200" title="Schedule Interview"><Calendar size={11} /> Interview</button>
                              <button onClick={() => quickStatus(app, 'REJECTED')} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ring-1 ring-red-200" title="Reject"><XCircle size={11} /> Reject</button>
                            </>
                          )}
                          {app.status === 'INTERVIEW_SCHEDULED' && (
                            <>
                              <button onClick={() => quickStatus(app, 'OFFER_RECEIVED')} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors ring-1 ring-emerald-200" title="Mark Offer"><CheckCircle2 size={11} /> Offer</button>
                              <button onClick={() => quickStatus(app, 'REJECTED')} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ring-1 ring-red-200" title="Reject"><XCircle size={11} /> Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400">Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, pagination.total)} of {pagination.total}</p>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronLeft size={14} /></button>
                <span className="text-[11px] font-medium text-gray-600">{page} / {pagination.totalPages}</span>
                <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {editApp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">Edit Application</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{editApp.user?.fullName} \u2014 {editApp.job?.title} at {editApp.job?.company}</p>
              </div>
              <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => setEditForm({ ...editForm, status: key })} className={'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[12px] font-medium transition-all ' + (editForm.status === key ? cfg.bg + ' ' + cfg.text + ' ' + cfg.border + ' ring-2 ring-offset-1 ring-blue-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                      {cfg.icon} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              {editForm.status === 'INTERVIEW_SCHEDULED' && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-[12px] font-semibold text-amber-800 flex items-center gap-1.5"><Calendar size={13} /> Interview Details</p>
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 mb-1 block">Interview Date and Time</label>
                    <input type="datetime-local" value={editForm.interviewDate} onChange={(e) => setEditForm({ ...editForm, interviewDate: e.target.value })} className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 mb-1 block flex items-center gap-1"><MapPin size={11} /> Location / Link</label>
                    <input type="text" value={editForm.interviewLocation} onChange={(e) => setEditForm({ ...editForm, interviewLocation: e.target.value })} placeholder="e.g. Office Room 3B or meeting link" className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 mb-1 block">Interview Notes</label>
                    <textarea value={editForm.interviewNotes} onChange={(e) => setEditForm({ ...editForm, interviewNotes: e.target.value })} placeholder="Instructions for the interview..." rows={2} className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none resize-none" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  <span className="flex items-center gap-1"><MessageSquare size={11} /> Admin Notes</span>
                </label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Add notes about this application..." rows={3} className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button onClick={closeEdit} className="px-4 py-2 text-[12px] font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 text-[12px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;
