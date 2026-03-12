import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Users, Search, Trash2, Info, Plus, ChevronLeft, ChevronRight, ArrowLeft, Mail, Phone, MapPin, Calendar, GraduationCap, Briefcase, Award, X, ExternalLink, Shield, Hash, Clock, User, FileText, BookOpen, Zap, TrendingUp, CheckCircle2, XCircle, AlertCircle, Star, ChevronDown, Check } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];

const avatarStyle = (name) => {
  const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mentorFilter, setMentorFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', phone: '', education: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [openMentorDropdown, setOpenMentorDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenMentorDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const PER_PAGE = 15;

  useEffect(() => {
    fetchStudents();
    fetchMentors();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students', { params: { limit: 500 } });
      const data = res.data;
      setStudents(data.students || data || []);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchMentors = async () => {
    try {
      const res = await api.get('/admin/admins');
      setMentors(res.data || []);
    } catch {
      // silent
    }
  };

  const viewStudent = async (id) => {
    try {
      const res = await api.get(`/admin/students/${id}`);
      setDetail(res.data);
      setSelectedStudent(id);
    } catch (error) {
      toast.error('Failed to load student details');
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/students/${id}`);
      toast.success('Student deleted');
      setSelectedStudent(null);
      setDetail(null);
      fetchStudents();
    } catch (error) {
      toast.error('Failed to delete student');
    }
  };

  const toggleStatus = async (id) => {
    try {
      const res = await api.patch(`/admin/students/${id}/toggle-status`);
      toast.success(`Student ${res.data.isActive ? 'activated' : 'deactivated'}`);
      fetchStudents();
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const changeMentor = async (studentId, mentorId) => {
    try {
      await api.post('/admin/assign-mentor', {
        mentorId: mentorId || null,
        studentIds: [studentId],
      });
      toast.success(mentorId ? 'Mentor assigned' : 'Mentor unassigned');
      fetchStudents();
    } catch (error) {
      toast.error('Failed to update mentor');
    }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await api.post('/admin/register-student', addForm);
      toast.success(`Student registered! Temp password: ${res.data.tempPassword}`);
      setShowAddModal(false);
      setAddForm({ fullName: '', email: '', phone: '', education: '' });
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register student');
    } finally {
      setAddLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = !search ||
        s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.registrationNumber?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && s.isActive) ||
        (statusFilter === 'inactive' && !s.isActive);
      const matchesMentor = mentorFilter === 'all' ||
        (mentorFilter === 'unassigned' && !s.assignedMentorId) ||
        s.assignedMentorId === mentorFilter;
      return matchesSearch && matchesStatus && matchesMentor;
    });
  }, [students, search, statusFilter, mentorFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, statusFilter, mentorFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ─── Inline Detail View (Full Page) ───
  if (selectedStudent && detail) {
    const statusColors = {
      APPLIED: 'bg-blue-50 text-blue-700 ring-blue-200',
      INTERVIEW_SCHEDULED: 'bg-amber-50 text-amber-700 ring-amber-200',
      OFFER_RECEIVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      REJECTED: 'bg-red-50 text-red-700 ring-red-200',
    };
    const statusIcons = {
      APPLIED: <FileText size={12} />,
      INTERVIEW_SCHEDULED: <Calendar size={12} />,
      OFFER_RECEIVED: <CheckCircle2 size={12} />,
      REJECTED: <XCircle size={12} />,
    };
    const bookingColors = {
      PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
      CONFIRMED: 'bg-blue-50 text-blue-700 ring-blue-200',
      COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      CANCELLED: 'bg-red-50 text-red-700 ring-red-200',
    };
    const stats = [
      { label: 'Job Applications', value: detail._count?.jobApplications || 0, icon: Briefcase, color: 'bg-blue-50 text-blue-600' },
      { label: 'Mentor Sessions', value: detail._count?.bookings || 0, icon: BookOpen, color: 'bg-violet-50 text-violet-600' },
      { label: 'Issues Raised', value: detail._count?.issues || 0, icon: AlertCircle, color: 'bg-orange-50 text-orange-600' },
    ];

    return (
      <div className="space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectedStudent(null); setDetail(null); }}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Students
          </button>
          <div className="flex items-center gap-2">
            {detail.resumeUrl && (
              <a
                href={detail.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <ExternalLink size={14} />
                View Resume
              </a>
            )}
            <button
              onClick={() => toggleStatus(detail.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border shadow-sm ${detail.isActive ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
            >
              {detail.isActive ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
              {detail.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => deleteStudent(detail.id)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="rounded-2xl overflow-hidden shadow-sm bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900">
          <div className="px-8 py-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold capitalize text-white tracking-tight">{detail.fullName}</h1>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${detail.isActive ? 'bg-emerald-400 text-emerald-950' : 'bg-red-400 text-red-950'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${detail.isActive ? 'bg-emerald-700' : 'bg-red-700'}`}></span>
                  {detail.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${detail.isEmailVerified ? 'bg-sky-400 text-sky-950' : 'bg-slate-400 text-slate-900'}`}>
                  <Shield size={11} />
                  {detail.isEmailVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-3 flex-wrap text-sm font-medium text-white">
                {detail.registrationNumber && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg">
                    <Hash size={13} className="text-sky-300" />
                    <span className="font-mono font-bold">{detail.registrationNumber}</span>
                  </span>
                )}
                {detail.email && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg">
                    <Mail size={13} className="text-sky-300" />
                    {detail.email}
                  </span>
                )}
                {detail.phone && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg">
                    <Phone size={13} className="text-sky-300" />
                    {detail.phone}
                  </span>
                )}
                {detail.location && (
                  <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg">
                    <MapPin size={13} className="text-sky-300" />
                    {detail.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg">
                  <Calendar size={13} className="text-sky-300" />
                  Joined {new Date(detail.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 px-4 py-3.5 hover:border-gray-200 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center`}>
                  <s.icon size={16} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 leading-tight">{s.value}</p>
                  <p className="text-[11px] text-gray-400 font-medium leading-tight">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Two-Column Layout: Profile + Mentor | Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — Profile Details */}
          <div className="space-y-6">
            {/* Education & Skills Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <GraduationCap size={14} className="text-amber-600" />
                </div>
                Education & Skills
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Education</p>
                  <p className="text-sm text-gray-800 font-medium">{detail.education || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Experience</p>
                  <p className="text-sm text-gray-800 font-medium">{detail.experience || '—'}</p>
                </div>
                {detail.jobRole && (
                  <div>
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Job Role</p>
                    <p className="text-sm text-gray-800 font-medium">{detail.jobRole}</p>
                  </div>
                )}
                {detail.linkedinProfile && (
                  <div>
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">LinkedIn</p>
                    <a href={detail.linkedinProfile.startsWith('http') ? detail.linkedinProfile : `https://${detail.linkedinProfile}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 truncate">
                      {detail.linkedinProfile} <ExternalLink size={11} />
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Key Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.keySkills?.length > 0
                      ? (Array.isArray(detail.keySkills) ? detail.keySkills : detail.keySkills.split(',')).map((skill, i) => (
                          <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100">{typeof skill === 'string' ? skill.trim() : skill}</span>
                        ))
                      : <span className="text-sm text-gray-400">—</span>
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Mentor Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <User size={14} className="text-violet-600" />
                </div>
                Assigned Mentor
              </h3>
              {detail.assignedMentor ? (
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow ${avatarStyle(detail.assignedMentor.fullName)}`}>
                    {detail.assignedMentor.fullName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{detail.assignedMentor.fullName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{detail.assignedMentor.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100 text-gray-400">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium">No mentor assigned</p>
                </div>
              )}
            </div>

            {/* Account Info Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                  <Shield size={14} className="text-sky-600" />
                </div>
                Account Details
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Account Status', value: detail.isActive ? 'Active' : 'Inactive', color: detail.isActive ? 'text-emerald-600' : 'text-red-600' },
                  { label: 'Email Verified', value: detail.isEmailVerified ? 'Yes' : 'No', color: detail.isEmailVerified ? 'text-blue-600' : 'text-gray-400' },
                  { label: 'Registration No.', value: detail.registrationNumber || '—', mono: true },
                  { label: 'Member Since', value: new Date(detail.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
                  { label: 'Last Updated', value: detail.updatedAt ? new Date(detail.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                    <span className={`text-xs font-semibold ${item.color || 'text-gray-700'} ${item.mono ? 'font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded' : ''}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column — Activities (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Job Applications */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Briefcase size={14} className="text-blue-600" />
                  </div>
                  Job Applications
                </h3>
                <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">{detail.jobApplications?.length || 0}</span>
              </div>
              {detail.jobApplications?.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {detail.jobApplications.slice(0, 10).map((app) => (
                    <div key={app.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0 border border-blue-100">
                        {app.job?.company?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{app.job?.title || 'Unknown Position'}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {app.job?.company}{app.job?.location ? ` · ${app.job.location}` : ''}{app.job?.source ? ` · via ${app.job.source}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${statusColors[app.status] || 'bg-gray-50 text-gray-600 ring-gray-200'}`}>
                          {statusIcons[app.status]}
                          {app.status?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">{new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  ))}
                  {detail.jobApplications.length > 10 && (
                    <div className="px-6 py-3 text-center text-xs text-gray-400 bg-gray-50/50">
                      +{detail.jobApplications.length - 10} more applications
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <Briefcase size={28} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No job applications yet</p>
                </div>
              )}
            </div>

            {/* Mentor Sessions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                    <BookOpen size={14} className="text-violet-600" />
                  </div>
                  Mentor Sessions
                </h3>
                <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">{detail.bookings?.length || 0}</span>
              </div>
              {detail.bookings?.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {detail.bookings.slice(0, 8).map((booking) => (
                    <div key={booking.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 text-sm font-bold flex-shrink-0 border border-violet-100">
                        {booking.slot?.mentor?.fullName?.charAt(0) || 'M'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{booking.slot?.mentor?.fullName || 'Mentor'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {booking.slot ? `${new Date(booking.slot.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(booking.slot.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — ${new Date(booking.slot.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'Time not available'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${bookingColors[booking.status] || 'bg-gray-50 text-gray-600 ring-gray-200'}`}>
                          {booking.status}
                        </span>
                        {booking.meetLink && (
                          <a href={booking.meetLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <BookOpen size={28} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No mentor sessions booked</p>
                </div>
              )}
            </div>

            {/* Sheet Applications */}
            {detail.sheetApplications?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Zap size={14} className="text-amber-600" />
                    </div>
                    Sheet Applications
                  </h3>
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">{detail.sheetApplications.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {detail.sheetApplications.slice(0, 8).map((app) => (
                    <div key={app.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 border border-amber-100">
                        <Zap size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{app.employerName || 'Unknown Employer'}</p>
                        <a href={app.jobLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-600 truncate block mt-0.5 max-w-xs">
                          {app.jobLink}
                        </a>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {app.matchScore && (
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full ring-1 ring-indigo-100">
                            {app.matchScore}% match
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${app.status === 'APPLIED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : app.status === 'FAILED' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                          {app.appliedMethod === 'BOT' && <Zap size={10} />}
                          {app.status}
                        </span>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">{new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  ))}
                  {detail.sheetApplications.length > 8 && (
                    <div className="px-6 py-3 text-center text-xs text-gray-400 bg-gray-50/50">
                      +{detail.sheetApplications.length - 8} more sheet applications
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Training Notes */}
            {detail.trainingNotes?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <FileText size={14} className="text-emerald-600" />
                    </div>
                    Recent Notes
                  </h3>
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">{detail.trainingNotes.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {detail.trainingNotes.map((note) => (
                    <div key={note.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <FileText size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{note.title}</p>
                      </div>
                      {note.category && (
                        <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full flex-shrink-0">{note.category}</span>
                      )}
                      <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">{new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── List View ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manage Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage all student accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">{students.length} total</span>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={14} /> Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or reg no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={mentorFilter}
          onChange={(e) => setMentorFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
        >
          <option value="all">All Mentors</option>
          <option value="unassigned">Unassigned</option>
          {mentors.map(m => (
            <option key={m.id} value={m.id}>{m.fullName}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Users size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No students found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reg No.</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mentor</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="text-sm font-mono font-semibold text-slate-700">{student.registrationNumber || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm font-medium text-gray-900">{student.fullName}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleStatus(student.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${student.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${student.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="relative" ref={openMentorDropdown === student.id ? dropdownRef : null}>
                        <button
                          onClick={() => setOpenMentorDropdown(openMentorDropdown === student.id ? null : student.id)}
                          className="inline-flex items-center justify-between gap-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors w-[170px] text-left"
                        >
                          <span className={student.assignedMentorId ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                            {student.assignedMentorId ? mentors.find(m => m.id === student.assignedMentorId)?.fullName || 'Unassigned' : 'Unassigned'}
                          </span>
                          <ChevronDown size={14} className={`text-gray-400 transition-transform ${openMentorDropdown === student.id ? 'rotate-180' : ''}`} />
                        </button>
                        {openMentorDropdown === student.id && (
                          <div className="absolute z-50 mt-1 w-[200px] bg-white rounded-xl border border-gray-200 shadow-lg py-1 max-h-[200px] overflow-y-auto">
                            <button
                              onClick={() => { changeMentor(student.id, ''); setOpenMentorDropdown(null); }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                !student.assignedMentorId ? 'text-blue-600 font-medium bg-blue-50/50' : 'text-gray-600'
                              }`}
                            >
                              Unassigned
                              {!student.assignedMentorId && <Check size={14} className="text-blue-500" />}
                            </button>
                            {mentors.map(m => (
                              <button
                                key={m.id}
                                onClick={() => { changeMentor(student.id, m.id); setOpenMentorDropdown(null); }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                  student.assignedMentorId === m.id ? 'text-blue-600 font-medium bg-blue-50/50' : 'text-gray-700'
                                }`}
                              >
                                {m.fullName}
                                {student.assignedMentorId === m.id && <Check size={14} className="text-blue-500" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{new Date(student.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => viewStudent(student.id)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View details">
                          <Info size={16} />
                        </button>
                        <button onClick={() => deleteStudent(student.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete student">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${page === pageNum ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add New Student</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={addStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={addForm.fullName}
                  onChange={(e) => setAddForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={addForm.phone}
                  onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Education</label>
                <input
                  type="text"
                  value={addForm.education}
                  onChange={(e) => setAddForm(f => ({ ...f, education: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Enter education background"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {addLoading ? 'Registering...' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStudents;
