import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Search, Mail, Phone, GraduationCap, Briefcase,
  Calendar, MapPin, Clock, User, FileText, BookOpen, ExternalLink,
  Shield, Hash, CheckCircle2, XCircle, AlertCircle, TrendingUp, Zap, Users
} from 'lucide-react';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/my-students');
      setStudents(res.data);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const viewStudent = async (id) => {
    setSelectedStudent(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/students/${id}`);
      setDetail(res.data);
    } catch (err) {
      toast.error('Failed to load student details');
      setSelectedStudent(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const goBack = () => {
    setSelectedStudent(null);
    setDetail(null);
  };

  const filtered = students.filter(s =>
    s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const statusBadge = (status) => {
    const map = {
      APPLIED: { bg: 'bg-blue-50 text-blue-700 ring-blue-600/20', icon: <Clock size={12} /> },
      INTERVIEW_SCHEDULED: { bg: 'bg-amber-50 text-amber-700 ring-amber-600/20', icon: <Calendar size={12} /> },
      OFFER_RECEIVED: { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: <CheckCircle2 size={12} /> },
      REJECTED: { bg: 'bg-red-50 text-red-700 ring-red-600/20', icon: <XCircle size={12} /> },
      PENDING: { bg: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20', icon: <Clock size={12} /> },
      CONFIRMED: { bg: 'bg-blue-50 text-blue-700 ring-blue-600/20', icon: <CheckCircle2 size={12} /> },
      COMPLETED: { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', icon: <CheckCircle2 size={12} /> },
      CANCELLED: { bg: 'bg-gray-50 text-gray-600 ring-gray-500/20', icon: <XCircle size={12} /> },
      FAILED: { bg: 'bg-red-50 text-red-700 ring-red-600/20', icon: <XCircle size={12} /> },
    };
    const s = map[status] || { bg: 'bg-gray-50 text-gray-600 ring-gray-500/20', icon: null };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${s.bg}`}>
        {s.icon} {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  // ─── Loading ───
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ─── Detail Loading ───
  if (detailLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ─── Detail View ───
  if (selectedStudent && detail) {
    const skills = detail.keySkills
      ? (typeof detail.keySkills === 'string' ? detail.keySkills.split(',').map(s => s.trim()).filter(Boolean) : detail.keySkills)
      : [];

    const stats = [
      { label: 'Job Applications', value: detail._count?.jobApplications || 0, icon: <Briefcase size={18} />, color: 'text-blue-600', bgColor: 'bg-blue-50', ringColor: 'ring-blue-100' },
      { label: 'Mentor Sessions', value: detail._count?.bookings || 0, icon: <BookOpen size={18} />, color: 'text-violet-600', bgColor: 'bg-violet-50', ringColor: 'ring-violet-100' },
      { label: 'Sheet Applications', value: detail._count?.sheetApplications || 0, icon: <Zap size={18} />, color: 'text-amber-600', bgColor: 'bg-amber-50', ringColor: 'ring-amber-100' },
      { label: 'Training Notes', value: detail._count?.trainingNotes || 0, icon: <FileText size={18} />, color: 'text-emerald-600', bgColor: 'bg-emerald-50', ringColor: 'ring-emerald-100' },
    ];

    return (
      <div className="space-y-5 max-w-6xl mx-auto">
        {/* Back */}
        <button onClick={goBack} className="group inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 transition-colors font-medium">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Students
        </button>

        {/* Profile Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent"></div>
          <div className="relative flex items-start gap-5">
            <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold ring-1 ring-white/20 flex-shrink-0">
              {getInitials(detail.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{detail.fullName}</h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${detail.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30' : 'bg-red-500/20 text-red-300 ring-1 ring-red-400/30'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${detail.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  {detail.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[13px] text-gray-300"><Mail size={13} className="text-gray-400" />{detail.email}</span>
                {detail.phone && <span className="inline-flex items-center gap-1.5 text-[13px] text-gray-300"><Phone size={13} className="text-gray-400" />{detail.phone}</span>}
                {detail.location && <span className="inline-flex items-center gap-1.5 text-[13px] text-gray-300"><MapPin size={13} className="text-gray-400" />{detail.location}</span>}
              </div>
              {detail.registrationNumber && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 mt-2"><Hash size={12} />Reg: {detail.registrationNumber}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div key={i} className={`rounded-xl border border-gray-100 bg-white p-4 ring-1 ${s.ringColor}`}>
              <div className={`w-9 h-9 rounded-lg ${s.bgColor} flex items-center justify-center ${s.color} mb-2.5`}>{s.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[12px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Education & Skills */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2"><GraduationCap size={15} className="text-blue-600" />Education & Skills</h3>
              </div>
              <div className="p-5 space-y-4">
                {detail.education && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Education</p>
                    <p className="text-[13px] text-gray-800">{detail.education}</p>
                  </div>
                )}
                {detail.experience && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Experience</p>
                    <p className="text-[13px] text-gray-800">{detail.experience}</p>
                  </div>
                )}
                {detail.jobRole && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">Target Role</p>
                    <p className="text-[13px] text-gray-800">{detail.jobRole}</p>
                  </div>
                )}
                {skills.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((sk, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-700 text-[11px] font-medium rounded-md ring-1 ring-slate-200">{sk}</span>
                      ))}
                    </div>
                  </div>
                )}
                {!detail.education && !detail.experience && !detail.jobRole && skills.length === 0 && (
                  <p className="text-[13px] text-gray-400 italic">No education or skills info available</p>
                )}
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2"><Shield size={15} className="text-slate-600" />Account Details</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Email Verified</span>
                  <span className={`font-medium ${detail.isEmailVerified ? 'text-emerald-600' : 'text-red-500'}`}>{detail.isEmailVerified ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Joined</span>
                  <span className="text-gray-800 font-medium">{formatDate(detail.createdAt)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="text-gray-800 font-medium">{formatDate(detail.updatedAt)}</span>
                </div>
                {detail.linkedinProfile && (
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-gray-500">LinkedIn</span>
                    <a href={detail.linkedinProfile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-medium">
                      Profile <ExternalLink size={11} />
                    </a>
                  </div>
                )}
                {detail.resumeUrl && (
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-gray-500">Resume</span>
                    <a href={detail.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-medium">
                      View <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Mentor */}
            {detail.assignedMentor && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2"><User size={15} className="text-violet-600" />Assigned Mentor</h3>
                </div>
                <div className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 text-sm font-bold ring-1 ring-violet-100">
                    {getInitials(detail.assignedMentor.fullName)}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{detail.assignedMentor.fullName}</p>
                    <p className="text-[12px] text-gray-500">{detail.assignedMentor.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3 space-y-5">
            {/* Job Applications */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2"><Briefcase size={15} className="text-blue-600" />Job Applications</h3>
                <span className="text-[11px] font-medium text-gray-400">{detail.jobApplications?.length || 0} total</span>
              </div>
              <div className="divide-y divide-gray-50">
                {detail.jobApplications?.length > 0 ? detail.jobApplications.map(app => (
                  <div key={app.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{app.job?.title || 'Untitled'}</p>
                        <p className="text-[12px] text-gray-500 mt-0.5">{app.job?.company}{app.job?.location ? ` · ${app.job.location}` : ''}</p>
                      </div>
                      {statusBadge(app.status)}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">{formatDate(app.appliedAt)}</p>
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center">
                    <Briefcase size={20} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-[13px] text-gray-400">No job applications yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mentor Sessions */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2"><BookOpen size={15} className="text-violet-600" />Mentor Sessions</h3>
                <span className="text-[11px] font-medium text-gray-400">{detail.bookings?.length || 0} total</span>
              </div>
              <div className="divide-y divide-gray-50">
                {detail.bookings?.length > 0 ? detail.bookings.map(b => (
                  <div key={b.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900">Session with {b.slot?.mentor?.fullName || 'Mentor'}</p>
                        <p className="text-[12px] text-gray-500 mt-0.5">
                          {formatDate(b.slot?.startTime)} · {formatTime(b.slot?.startTime)} – {formatTime(b.slot?.endTime)}
                        </p>
                      </div>
                      {statusBadge(b.status)}
                    </div>
                    {b.meetLink && (
                      <a href={b.meetLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 mt-1.5 font-medium">
                        Join Meeting <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center">
                    <BookOpen size={20} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-[13px] text-gray-400">No mentor sessions booked</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sheet Applications */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2"><Zap size={15} className="text-amber-600" />Sheet Applications</h3>
                <span className="text-[11px] font-medium text-gray-400">{detail.sheetApplications?.length || 0} total</span>
              </div>
              <div className="divide-y divide-gray-50">
                {detail.sheetApplications?.length > 0 ? detail.sheetApplications.map(sa => (
                  <div key={sa.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{sa.employerName}</p>
                        <p className="text-[12px] text-gray-500 mt-0.5">via {sa.appliedMethod === 'BOT' ? 'Bot' : 'Manual'}{sa.matchScore != null ? ` · Match: ${sa.matchScore}%` : ''}</p>
                      </div>
                      {statusBadge(sa.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-[11px] text-gray-400">{formatDate(sa.createdAt)}</p>
                      {sa.jobLink && (
                        <a href={sa.jobLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                          View Job <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center">
                    <Zap size={20} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-[13px] text-gray-400">No sheet applications</p>
                  </div>
                )}
              </div>
            </div>

            {/* Training Notes */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2"><FileText size={15} className="text-emerald-600" />Training Notes</h3>
                <span className="text-[11px] font-medium text-gray-400">{detail.trainingNotes?.length || 0} total</span>
              </div>
              <div className="divide-y divide-gray-50">
                {detail.trainingNotes?.length > 0 ? detail.trainingNotes.map(tn => (
                  <div key={tn.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <p className="text-[13px] font-semibold text-gray-900">{tn.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {tn.category && <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{tn.category}</span>}
                      <p className="text-[11px] text-gray-400">{formatDate(tn.createdAt)}</p>
                    </div>
                  </div>
                )) : (
                  <div className="px-5 py-8 text-center">
                    <FileText size={20} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-[13px] text-gray-400">No training notes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── List View ───
  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">My Students</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Track and manage your assigned students</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-64 transition-all"
            />
          </div>
          <span className="text-[12px] font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full whitespace-nowrap">
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Student List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {search ? 'No students match your search' : 'No students assigned yet'}
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            {search ? 'Try a different search term' : 'Students will appear here once assigned to you'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Education</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Applications</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(student => (
                <tr
                  key={student.id}
                  onClick={() => viewStudent(student.id)}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 ring-1 ring-slate-600/20">
                        {getInitials(student.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">{student.fullName}</p>
                        <p className="text-[12px] text-gray-500 truncate md:hidden">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div>
                      <p className="text-[12px] text-gray-600 truncate max-w-[200px]">{student.email}</p>
                      {student.phone && <p className="text-[11px] text-gray-400 mt-0.5">{student.phone}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <p className="text-[12px] text-gray-600 truncate max-w-[180px]">{student.education || '—'}</p>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 bg-blue-50 text-blue-700 text-[12px] font-bold rounded-full ring-1 ring-blue-100">
                      {student._count?.jobApplications || 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${student.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                      {student.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <p className="text-[12px] text-gray-500">{formatDate(student.createdAt)}</p>
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

export default AdminStudents;
