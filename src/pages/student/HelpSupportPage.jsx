import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  HelpCircle, MessageCircle, Mail, ChevronDown, ChevronUp,
  Search, Plus, Send, X, Clock, CheckCircle2, AlertCircle, MessageSquareMore, UserCheck
} from 'lucide-react';

const FAQ_DATA = [
  {
    question: 'How do I apply for a job?',
    answer: 'Navigate to the Jobs page from the sidebar, browse available listings, and click "Apply" on any job that interests you. Fill in the required details and submit your application.'
  },
  {
    question: 'How does mentor matching work?',
    answer: 'Our platform automatically assigns you a mentor based on your profile and career goals. You can view your assigned mentor on the Mentoring page and book sessions with them.'
  },
  {
    question: 'Can I edit my profile after registration?',
    answer: 'Yes, go to the Profile page from the sidebar. You can update your personal information, skills, and change your password at any time.'
  },
  {
    question: 'How do I track my job applications?',
    answer: 'Visit the Applications page to see all your submitted applications along with their current status — whether they are pending, reviewed, or accepted.'
  },
  {
    question: 'What is the Shoutboard?',
    answer: 'The Shoutboard is a community space where students can post updates, ask questions, and interact with peers. Think of it as a campus bulletin board.'
  },
  {
    question: 'How do I upgrade my plan?',
    answer: 'Click the "Upgrade Plan" button in the sidebar to view available subscription tiers. Choose the plan that fits your needs and follow the checkout process.'
  },
];

const STATUS_CONFIG = {
  OPEN: { label: 'Open', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  CLOSED: { label: 'Closed', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

const CATEGORY_OPTIONS = ['General', 'Account', 'Jobs', 'Mentoring', 'Technical', 'Billing'];

const HelpSupportPage = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('faq');

  // Query state
  const [queries, setQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'General', assignedToId: '' });
  const [expandedQuery, setExpandedQuery] = useState(null);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    fetchStaff();
  }, []);

  useEffect(() => {
    if (tab === 'my-queries') fetchQueries();
  }, [tab]);

  const fetchStaff = async () => {
    try {
      const { data } = await api.get('/queries/staff');
      setStaffList(data);
    } catch {
      // Staff list not critical
    }
  };

  const fetchQueries = async () => {
    setLoadingQueries(true);
    try {
      const { data } = await api.get('/queries/mine');
      setQueries(data);
    } catch {
      toast.error('Failed to load queries');
    } finally {
      setLoadingQueries(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      const payload = { subject: form.subject, description: form.description, category: form.category };
      if (form.assignedToId) payload.assignedToId = form.assignedToId;
      await api.post('/queries', payload);
      toast.success('Query submitted successfully');
      setForm({ subject: '', description: '', category: 'General', assignedToId: '' });
      setShowForm(false);
      fetchQueries();
      setTab('my-queries');
    } catch {
      toast.error('Failed to submit query');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = FAQ_DATA.filter(
    (f) =>
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle size={20} className="text-violet-600" />
            <h1 className="text-[18px] font-bold text-gray-900">Help & Support</h1>
          </div>
          <p className="text-[12px] text-gray-500">
            Find answers to common questions or raise a support query.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-[12px]"
        >
          <Plus size={14} /> Raise a Query
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 p-0.5 rounded-lg w-fit mb-5">
        <button
          onClick={() => setTab('faq')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
            tab === 'faq' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <HelpCircle size={12} /> FAQs
        </button>
        <button
          onClick={() => setTab('my-queries')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
            tab === 'my-queries' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquareMore size={12} /> My Queries {queries.length > 0 && `(${queries.length})`}
        </button>
      </div>

      {/* ═══ Raise Query Modal ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <MessageSquareMore size={15} className="text-violet-600" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900">Raise a Query</h2>
                  <p className="text-[11px] text-gray-400">Describe your issue and we'll get back to you</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-300 hover:text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Brief summary of your issue"
                  className="w-full text-[12px] bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-300 placeholder-gray-400 text-gray-800 transition-all"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1">Category</label>
                <select
                  className="w-full text-[12px] bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-300 text-gray-700 transition-all"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1">Assign To</label>
                <select
                  className="w-full text-[12px] bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-300 text-gray-700 transition-all"
                  value={form.assignedToId}
                  onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                >
                  <option value="">-- Select Admin / Super Admin --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe your issue in detail..."
                  className="w-full text-[12px] bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-300 placeholder-gray-400 text-gray-800 resize-none transition-all"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-[12px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-semibold transition-all disabled:opacity-60"
                >
                  <Send size={13} />
                  {submitting ? 'Submitting...' : 'Submit Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ FAQ Tab ═══ */}
      {tab === 'faq' && (
        <div className="flex gap-5 items-start">
          {/* Left — FAQ */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 mb-4 bg-white focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
              <Search size={14} className="text-gray-300" />
              <input
                type="text"
                placeholder="Search FAQs..."
                className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-[13px] font-bold text-gray-900">Frequently Asked Questions</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[12px] text-gray-400">No matching questions found.</p>
                  </div>
                ) : (
                  filtered.map((faq, idx) => (
                    <div key={idx}>
                      <button
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-[12px] font-medium text-gray-800 pr-4">{faq.question}</span>
                        {openFaq === idx ? (
                          <ChevronUp size={14} className="text-gray-400 shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-400 shrink-0" />
                        )}
                      </button>
                      {openFaq === idx && (
                        <div className="px-4 pb-3">
                          <p className="text-[11px] text-gray-500 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right — Contact Cards */}
          <div className="w-[260px] shrink-0 space-y-3">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Mail size={14} className="text-violet-600" />
                </div>
                <h3 className="text-[13px] font-bold text-gray-900">Email Support</h3>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Reach out to our support team and we'll get back to you within 24 hours.
              </p>
              <p className="text-[11px] font-semibold text-violet-600 mt-2">support@innogarage.ai</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ My Queries Tab ═══ */}
      {tab === 'my-queries' && (
        <div>
          {loadingQueries ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : queries.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg text-center py-16">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <MessageSquareMore size={20} className="text-gray-300" />
              </div>
              <h3 className="text-[13px] font-semibold text-gray-600">No queries yet</h3>
              <p className="text-[11px] text-gray-400 mt-1">Click "Raise a Query" to submit your first support request</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {queries.map((query) => {
                const sc = STATUS_CONFIG[query.status] || STATUS_CONFIG.OPEN;
                const isExpanded = expandedQuery === query.id;
                const dateStr = new Date(query.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <div key={query.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedQuery(isExpanded ? null : query.id)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[13px] font-semibold text-gray-900 truncate">{query.subject}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-500">{query.category}</span>
                          <span>{dateStr}</span>
                          {query.assignedTo && (
                            <span className="flex items-center gap-1 text-violet-600">
                              <UserCheck size={10} />
                              {query.assignedTo.fullName}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
                        <div className="mt-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Your Description</p>
                          <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                            {query.description}
                          </p>
                        </div>

                        {query.adminReply && (
                          <div>
                            <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1">Admin Response</p>
                            <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap bg-violet-50 rounded-lg px-3 py-2.5 border border-violet-100">
                              {query.adminReply}
                            </p>
                          </div>
                        )}

                        {!query.adminReply && query.status === 'OPEN' && (
                          <div className="flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <Clock size={12} />
                            <span>Awaiting admin response</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HelpSupportPage;
