import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Users, Search, Trash2, Info, Plus, ChevronLeft, ChevronRight, ArrowLeft, Mail, Phone, MapPin, Calendar, GraduationCap, Briefcase, Award, X, ExternalLink, Shield, Hash, Clock, User } from 'lucide-react';

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
    return (
      <div className="min-h-[calc(100vh-120px)] flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
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
              onClick={() => deleteStudent(detail.id)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuNjU3IDAgMy0xLjM0MyAzLTNzLTEuMzQzLTMtMy0zLTMgMS4zNDMtMyAzIDEuMzQzIDMgMyAzem0tMjQgMTJjMS42NTcgMCAzLTEuMzQzIDMtM3MtMS4zNDMtMy0zLTMtMyAxLjM0My0zIDMgMS4zNDMgMyAzIDN6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
          </div>
          <div className="px-8 pb-6 -mt-12 relative">
            <div className="flex items-end gap-5">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-white ${avatarStyle(detail.fullName)}`}>
                {detail.fullName?.charAt(0)}
              </div>
              <div className="flex-1 pb-1">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{detail.fullName}</h1>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 font-mono">
                    <Hash size={13} className="text-gray-400" />
                    {detail.registrationNumber || '—'}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${detail.isActive ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${detail.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {detail.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${detail.isEmailVerified ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-gray-50 text-gray-500 ring-1 ring-gray-200'}`}>
                    <Shield size={11} />
                    {detail.isEmailVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid — fills remaining space */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

          {/* Contact Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Mail size={13} />
              Contact Information
            </h3>
            <div className="space-y-5 flex-1">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail size={15} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Email</p>
                  <p className="text-sm text-gray-800 font-medium truncate">{detail.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Phone size={15} className="text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Phone</p>
                  <p className="text-sm text-gray-800 font-medium">{detail.phone || '—'}</p>
                </div>
              </div>
              {detail.linkedinProfile && (
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                    <MapPin size={15} className="text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">LinkedIn</p>
                    <p className="text-sm text-blue-600 font-medium truncate">{detail.linkedinProfile}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Calendar size={15} className="text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Joined</p>
                  <p className="text-sm text-gray-800 font-medium">{new Date(detail.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Education & Skills */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <GraduationCap size={13} />
              Education & Skills
            </h3>
            <div className="space-y-5 flex-1">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <GraduationCap size={15} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Education</p>
                  <p className="text-sm text-gray-800 font-medium">{detail.education || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Briefcase size={15} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Experience</p>
                  <p className="text-sm text-gray-800 font-medium">{detail.experience || '—'}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                    <Award size={15} className="text-rose-600" />
                  </div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Key Skills</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-[52px]">
                  {detail.keySkills ? detail.keySkills.split(',').map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md text-xs font-medium border border-gray-100">{skill.trim()}</span>
                  )) : <span className="text-sm text-gray-400">—</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Mentor & Account */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={13} />
              Mentor & Account
            </h3>
            <div className="space-y-5 flex-1">
              {/* Assigned Mentor */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-3">Assigned Mentor</p>
                {detail.assignedMentor ? (
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${avatarStyle(detail.assignedMentor.fullName)}`}>
                      {detail.assignedMentor.fullName?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{detail.assignedMentor.fullName}</p>
                      <p className="text-xs text-gray-500">{detail.assignedMentor.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User size={16} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-medium">Not assigned</p>
                  </div>
                )}
              </div>

              {/* Account Status Details */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Account Status</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${detail.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${detail.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    {detail.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Email Verified</span>
                  <span className={`text-xs font-semibold ${detail.isEmailVerified ? 'text-blue-600' : 'text-gray-400'}`}>
                    {detail.isEmailVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Registration No.</span>
                  <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{detail.registrationNumber || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-gray-500 font-medium">Member Since</span>
                  <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" />
                    {new Date(detail.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
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
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Reg No.</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Mentor</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{student.registrationNumber || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarStyle(student.fullName)}`}>
                          {student.fullName?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{student.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(student.id)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${student.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${student.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={student.assignedMentorId || ''}
                        onChange={(e) => changeMentor(student.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-[140px]"
                      >
                        <option value="">Unassigned</option>
                        {mentors.map(m => (
                          <option key={m.id} value={m.id}>{m.fullName}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(student.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => viewStudent(student.id)} className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View details">
                          <Info size={15} />
                        </button>
                        <button onClick={() => deleteStudent(student.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete student">
                          <Trash2 size={15} />
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
