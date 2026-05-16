import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Users, Search, Trash2, Plus, ChevronLeft, ChevronRight, ArrowLeft, Mail, Phone, MapPin, Calendar, GraduationCap, Briefcase, Award, X, ExternalLink, Shield, Hash, Clock, FileText, BookOpen, Zap, TrendingUp, CheckCircle2, XCircle, AlertCircle, Star, ChevronDown, Check, Crown } from 'lucide-react';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];

const avatarStyle = (name) => {
  const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const isStudentActive = (student) => {
  if (!student) return false;
  if (typeof student.status === 'string') return student.status === 'ACTIVE';
  if (typeof student.isActive === 'boolean') return student.isActive;
  return false;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getAssignedAdmins = (student) => {
  if (student?.adminAssignments?.length > 0) {
    return student.adminAssignments;
  }

  if (student?.assignedMentor) {
    return [{ id: `legacy-${student.assignedMentor.id}`, admin: student.assignedMentor }];
  }

  return [];
};

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mentorFilter, setMentorFilter] = useState('all');
  const [technologyFilter, setTechnologyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', phone: '', education: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [openMentorDropdown, setOpenMentorDropdown] = useState(null);
  const [openTechnologyDropdown, setOpenTechnologyDropdown] = useState(null);
  const [openPlanDropdown, setOpenPlanDropdown] = useState(null);
  const [technologySearch, setTechnologySearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const dropdownRef = useRef(null);
  const technologyDropdownRef = useRef(null);
  const planDropdownRef = useRef(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const debouncedTechnologySearch = useDebouncedValue(technologySearch.trim(), 250);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenMentorDropdown(null);
      }
      if (technologyDropdownRef.current && !technologyDropdownRef.current.contains(e.target)) {
        setOpenTechnologyDropdown(null);
      }
      if (planDropdownRef.current && !planDropdownRef.current.contains(e.target)) {
        setOpenPlanDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const PER_PAGE = 15;

  useEffect(() => {
    fetchStudents();
    fetchMentors();
    fetchTechnologies();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students', { params: { limit: 500, summary: true } });
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
      const res = await api.get('/admin/admins', { params: { summary: true } });
      setMentors(res.data || []);
    } catch {
      // silent
    }
  };

  const fetchTechnologies = async () => {
    try {
      const res = await api.get('/admin/available-technologies', { params: { usage: 'false' } });
      setTechnologies(res.data || []);
    } catch {
      toast.error('Failed to load technologies');
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
      toast.success(`Student ${res.data.status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
      fetchStudents();
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const PLAN_OPTIONS = ['FREE', 'BASIC', 'PRO', 'ULTRA'];
  const PLAN_COLORS = {
    FREE: 'bg-gray-50 text-gray-600 ring-gray-200',
    BASIC: 'bg-blue-50 text-blue-700 ring-blue-200',
    PRO: 'bg-violet-50 text-violet-700 ring-violet-200',
    ULTRA: 'bg-amber-50 text-amber-700 ring-amber-200',
  };
  const normalizePlanKey = (plan) => String(plan || '').toUpperCase();

  const changePlan = async (studentId, plan) => {
    try {
      await api.patch(`/admin/students/${studentId}/plan`, { plan });
      toast.success(`Plan updated to ${plan}`);
      fetchStudents();
      if (detail && detail.id === studentId) {
        setDetail(prev => ({ ...prev, subscriptionPlan: plan }));
      }
    } catch (error) {
      toast.error('Failed to update plan');
    }
  };

  const assignTechnology = async (studentId, technologyId) => {
    try {
      const { data } = await api.patch(`/admin/students/${studentId}/technology`, { technologyId: technologyId || null });
      setStudents((prev) => prev.map((student) => (
        student.id === studentId
          ? {
              ...student,
              assignedTechnologyId: data.assignedTechnologyId,
              assignedTechnology: data.assignedTechnology,
            }
          : student
      )));
      if (detail?.id === studentId) {
        setDetail((prev) => ({
          ...prev,
          assignedTechnologyId: data.assignedTechnologyId,
          assignedTechnology: data.assignedTechnology,
        }));
      }
      setOpenTechnologyDropdown(null);
      setTechnologySearch('');
      toast.success(data.assignedTechnology ? `Technology assigned: ${data.assignedTechnology.name}` : 'Technology unassigned');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign technology');
    }
  };

  const addAdmin = async (studentId, mentorId) => {
    try {
      const res = await api.post('/admin/assign-mentor', {
        mentorId,
        studentIds: [studentId],
      });
      const r = res.data?.results?.[0];
      if (r?.status === 'already_assigned') toast('Already assigned', { icon: '⚠️' });
      else if (r?.status === 'limit_reached') toast.error(r.message || 'Only one mentor can be assigned per student');
      else toast.success('Mentor assigned');
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign mentor');
    }
  };

  const removeAdmin = async (studentId, adminId) => {
    try {
      await api.post('/admin/unassign-admin', { studentId, adminId });
      toast.success('Mentor removed');
      fetchStudents();
    } catch (error) {
      toast.error('Failed to remove mentor');
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
    const query = debouncedSearch.toLowerCase();

    return students.filter(s => {
      const matchesSearch = !query ||
        s.fullName?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.registrationNumber?.toLowerCase().includes(query) ||
        s.assignedTechnology?.name?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && s.status === 'ACTIVE') ||
        (statusFilter === 'inactive' && s.status === 'INACTIVE');
      const assignedAdminIds = getAssignedAdmins(s).map((assignment) => assignment.admin?.id).filter(Boolean);
      const hasAdmins = assignedAdminIds.length > 0;
      const matchesMentor = mentorFilter === 'all' ||
        (mentorFilter === 'unassigned' && !hasAdmins) ||
        assignedAdminIds.includes(mentorFilter) ||
        s.assignedMentorId === mentorFilter;
      const matchesPlan = planFilter === 'all' ||
        (planFilter === 'none' && !s.subscriptionPlan) ||
        normalizePlanKey(s.subscriptionPlan) === planFilter;
      const matchesTechnology = technologyFilter === 'all' ||
        (technologyFilter === 'unassigned' && !s.assignedTechnologyId) ||
        s.assignedTechnologyId === technologyFilter;
      return matchesSearch && matchesStatus && matchesMentor && matchesPlan && matchesTechnology;
    });
  }, [students, debouncedSearch, statusFilter, mentorFilter, planFilter, technologyFilter]);

  const searchedTechnologies = useMemo(() => {
    const query = debouncedTechnologySearch.toLowerCase();
    if (!query) return technologies;
    return technologies.filter((technology) =>
      technology.name.toLowerCase().includes(query) ||
      technology.category.toLowerCase().includes(query)
    );
  }, [technologies, debouncedTechnologySearch]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, mentorFilter, planFilter, technologyFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ─── Inline Detail View (Full Page) ───
  if (selectedStudent && detail) {
    const skills = detail.keySkills
      ? (typeof detail.keySkills === 'string' ? detail.keySkills.split(',').map(s => s.trim()).filter(Boolean) : detail.keySkills)
      : [];
    const displayName = detail.fullName?.replace(/\s+/g, ' ').trim() || 'Student';
    const isActive = isStudentActive(detail);
    const assignedAdmins = getAssignedAdmins(detail);
    const profileMeta = [
      { icon: Mail, value: detail.email },
      { icon: Phone, value: detail.phone },
      { icon: MapPin, value: detail.location },
    ].filter((item) => item.value);
    const accountRows = [
      { label: 'Email Verified', value: detail.isEmailVerified ? 'Yes' : 'No', tone: detail.isEmailVerified ? 'text-emerald-600' : 'text-rose-500' },
      { label: 'Joined', value: formatDate(detail.createdAt), tone: 'text-slate-800' },
      { label: 'Last Updated', value: formatDate(detail.updatedAt), tone: 'text-slate-800' },
    ];

    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectedStudent(null); setDetail(null); }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft size={15} />
            Back to Students
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white shadow-sm">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[1.8rem] font-semibold tracking-tight text-slate-900">{displayName}</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-600 ring-rose-200'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-400'}`}></span>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-slate-600">
                {profileMeta.map(({ icon: Icon, value }) => (
                  <span key={`${Icon.displayName || Icon.name}-${value}`} className="inline-flex items-center gap-1.5">
                    <Icon size={14} className="text-slate-400" />
                    {value}
                  </span>
                ))}
              </div>
              {detail.registrationNumber && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] font-medium text-slate-700">
                  <Hash size={13} className="text-slate-400" />
                  Reg: {detail.registrationNumber}
                </div>
              )}
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[13px] font-semibold text-blue-700">
                <Zap size={13} className="text-blue-500" />
                Technology: {detail.assignedTechnology?.name || 'Unassigned'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
          <div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900"><GraduationCap size={15} className="text-blue-600" />Education & Skills</h3>
              </div>
              <div className="space-y-4 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.education && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Education</p>
                      <p className="text-[13px] leading-5 text-slate-800">{detail.education}</p>
                    </div>
                  )}
                  {detail.experience && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Experience</p>
                      <p className="text-[13px] leading-5 text-slate-800">{detail.experience}</p>
                    </div>
                  )}
                  {detail.jobRole && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5 sm:col-span-2">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Target Role</p>
                      <p className="text-[13px] leading-5 text-slate-800">{detail.jobRole}</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-blue-50 px-3 py-2.5 sm:col-span-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-400">Assigned Technology</p>
                    <p className="text-[13px] font-semibold leading-5 text-blue-800">{detail.assignedTechnology?.name || 'Unassigned'}</p>
                  </div>
                </div>
                {skills.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((skill, index) => (
                        <span key={index} className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
                {!detail.education && !detail.experience && !detail.jobRole && skills.length === 0 && (
                  <p className="text-[13px] italic text-slate-400">No education or skills info available</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900"><Shield size={15} className="text-slate-600" />Account Details</h3>
              </div>
              <div className="space-y-2.5 p-4">
                {accountRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-[12px]">
                    <span className="text-slate-500">{row.label}</span>
                    <span className={`font-semibold ${row.tone}`}>{row.value}</span>
                  </div>
                ))}
                {detail.linkedinProfile && (
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-[12px]">
                    <span className="text-slate-500">LinkedIn</span>
                    <a href={detail.linkedinProfile.startsWith('http') ? detail.linkedinProfile : `https://${detail.linkedinProfile}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700">
                      Profile <ExternalLink size={11} />
                    </a>
                  </div>
                )}
                {detail.resumeUrl && (
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-[12px]">
                    <span className="text-slate-500">Resume</span>
                    <a href={detail.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700">
                      View <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900"><Users size={15} className="text-violet-600" />Assigned Mentors</h3>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{assignedAdmins.length}</span>
                </div>
              </div>
              <div className="space-y-2.5 p-4">
                {assignedAdmins.length > 0 ? assignedAdmins.map((assignment) => (
                  <div key={assignment.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                      {getInitials(assignment.admin?.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-slate-900">{assignment.admin?.fullName}</p>
                      <p className="truncate text-[12px] text-slate-500">{assignment.admin?.email || 'No email available'}</p>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center">
                    <p className="text-[13px] font-medium text-slate-500">No mentors assigned yet</p>
                    <p className="mt-1 text-[12px] text-slate-400">Assigned mentors will appear here once linked to this student.</p>
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Manage Students</h1>
          <p className="text-[13px] text-gray-500 mt-1">View and manage all student accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">{students.length} total</span>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={15} /> Add Student
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or reg no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={mentorFilter}
          onChange={(e) => setMentorFilter(e.target.value)}
          className="px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
        >
          <option value="all">All Mentors</option>
          <option value="unassigned">Unassigned</option>
          {mentors.map(m => (
            <option key={m.id} value={m.id}>{m.fullName}</option>
          ))}
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
        >
          <option value="all">All Plans</option>
          <option value="none">No Plan</option>
          <option value="FREE">Free</option>
          <option value="BASIC">Basic</option>
          <option value="PRO">Pro</option>
          <option value="ULTRA">Ultra</option>
        </select>
        <select
          value={technologyFilter}
          onChange={(e) => setTechnologyFilter(e.target.value)}
          className="px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
        >
          <option value="all">All Technologies</option>
          <option value="unassigned">Unassigned</option>
          {technologies.map((technology) => (
            <option key={technology.id} value={technology.id}>{technology.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-14">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-[13px] text-gray-500">No students found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reg No.</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Technology</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mentors</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-5 py-3.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/60 transition-colors">
                    {(() => {
                      const assignedAdmins = getAssignedAdmins(student);
                      return (
                        <>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] font-mono font-semibold text-slate-700">{student.registrationNumber || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] font-semibold text-gray-900">{student.fullName}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleStatus(student.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${student.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {student.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="relative" ref={openPlanDropdown === student.id ? planDropdownRef : null}>
                        <button
                          onClick={() => setOpenPlanDropdown(openPlanDropdown === student.id ? null : student.id)}
                          className={`inline-flex items-center justify-between gap-2 text-[12px] font-semibold ring-1 rounded-full px-3 py-1 cursor-pointer transition-colors ${PLAN_COLORS[normalizePlanKey(student.subscriptionPlan)] || 'bg-gray-50 text-gray-500 ring-gray-200'}`}
                        >
                          <Crown size={11} />
                          {normalizePlanKey(student.subscriptionPlan) || 'None'}
                          <ChevronDown size={11} className={`transition-transform ${openPlanDropdown === student.id ? 'rotate-180' : ''}`} />
                        </button>
                        {openPlanDropdown === student.id && (
                          <div className="absolute z-50 mt-1.5 w-[130px] bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 max-h-[200px] overflow-y-auto">
                            {PLAN_OPTIONS.map(plan => (
                              <button
                                key={plan}
                                onClick={() => { changePlan(student.id, plan); setOpenPlanDropdown(null); }}
                                className={`w-full flex items-center justify-between px-3.5 py-2 text-[13px] hover:bg-gray-50 transition-colors ${
                                  normalizePlanKey(student.subscriptionPlan) === plan ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-gray-700'
                                }`}
                              >
                                {plan}
                                {normalizePlanKey(student.subscriptionPlan) === plan && <Check size={13} className="text-blue-500" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="relative min-w-[210px]" ref={openTechnologyDropdown === student.id ? technologyDropdownRef : null}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenTechnologyDropdown(openTechnologyDropdown === student.id ? null : student.id);
                            setTechnologySearch('');
                          }}
                          className={`inline-flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-left text-[12px] font-semibold transition-colors ${student.assignedTechnology ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-dashed border-gray-300 bg-white text-gray-400 hover:border-blue-300 hover:text-blue-600'}`}
                        >
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Zap size={12} className="shrink-0" />
                            <span className="truncate">{student.assignedTechnology?.name || 'Assign technology'}</span>
                          </span>
                          <ChevronDown size={12} className={`shrink-0 transition-transform ${openTechnologyDropdown === student.id ? 'rotate-180' : ''}`} />
                        </button>

                        {openTechnologyDropdown === student.id && (
                          <div className="absolute z-50 mt-1.5 w-[280px] rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                            <label className="relative mb-2 block">
                              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={technologySearch}
                                onChange={(event) => setTechnologySearch(event.target.value)}
                                placeholder="Search technology..."
                                className="h-8 w-full rounded-lg border border-gray-200 pl-8 pr-2 text-[12px] outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                autoFocus
                              />
                            </label>
                            <div className="max-h-[220px] overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => assignTechnology(student.id, '')}
                                className={`mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors hover:bg-gray-50 ${!student.assignedTechnologyId ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600'}`}
                              >
                                Unassigned
                                {!student.assignedTechnologyId && <Check size={13} className="text-blue-500" />}
                              </button>
                              {searchedTechnologies.length === 0 ? (
                                <p className="px-2.5 py-3 text-[12px] text-gray-400">No technologies found</p>
                              ) : searchedTechnologies.map((technology) => (
                                <button
                                  key={technology.id}
                                  type="button"
                                  onClick={() => assignTechnology(student.id, technology.id)}
                                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors hover:bg-gray-50 ${student.assignedTechnologyId === technology.id ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'}`}
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate">{technology.name}</span>
                                    <span className="block truncate text-[10px] font-medium text-gray-400">{technology.category}</span>
                                  </span>
                                  {student.assignedTechnologyId === technology.id && <Check size={13} className="shrink-0 text-blue-500" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="relative" ref={openMentorDropdown === student.id ? dropdownRef : null}>
                        <div className="flex flex-wrap items-center gap-1 max-w-[260px]">
                          {assignedAdmins.map((assignment) => {
                            return (
                              <span key={assignment.id} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 bg-gray-50 text-gray-600 ring-gray-200">
                                {assignment.admin?.fullName?.split(' ')[0]}
                                <button onClick={() => removeAdmin(student.id, assignment.admin?.id)} className="ml-0.5 opacity-60 hover:opacity-100 hover:text-red-500 transition-colors"><X size={10} /></button>
                              </span>
                            );
                          })}
                          {assignedAdmins.length === 0 && (
                            <button
                              onClick={() => setOpenMentorDropdown(openMentorDropdown === student.id ? null : student.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 hover:border-blue-400 rounded-full px-2 py-0.5 transition-colors"
                            >
                              <Plus size={10} /> Add
                            </button>
                          )}
                        </div>
                        {openMentorDropdown === student.id && (
                          <div className="absolute z-50 mt-1.5 w-[220px] bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 max-h-[240px] overflow-y-auto">
                            {(() => {
                              const available = mentors.filter(m => {
                                if (assignedAdmins.some((assignment) => assignment.admin?.id === m.id)) return false;
                                return true;
                              });

                              return available.length === 0 ? (
                                <p className="px-3.5 py-2 text-[12px] text-gray-400">No available mentors</p>
                              ) : (
                                available.map(m => (
                                  <button key={m.id} onClick={() => { addAdmin(student.id, m.id); setOpenMentorDropdown(null); }}
                                    className="w-full flex items-center gap-2 px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${avatarStyle(m.fullName)}`}>{m.fullName?.charAt(0)}</div>
                                    <span className="flex-1 text-left">{m.fullName}</span>
                                  </button>
                                ))
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-500">{new Date(student.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={() => viewStudent(student.id)} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50" title="View details">
                        Details
                      </button>
                    </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-[13px] text-gray-500">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
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
                      className={`w-8 h-8 rounded-lg text-[13px] font-semibold transition-colors ${page === pageNum ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Add New Student</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={addStudent} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={addForm.fullName}
                  onChange={(e) => setAddForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  type="text"
                  value={addForm.phone}
                  onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Education</label>
                <input
                  type="text"
                  value={addForm.education}
                  onChange={(e) => setAddForm(f => ({ ...f, education: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Enter education background"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
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
