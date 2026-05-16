import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Search, Mail, Phone, GraduationCap,
  MapPin, ExternalLink, Shield, Hash, Users, Eye, Zap
} from 'lucide-react';

const isStudentActive = (student) => {
  if (!student) return false;
  if (typeof student.status === 'string') return student.status === 'ACTIVE';
  if (typeof student.isActive === 'boolean') return student.isActive;
  return false;
};

const AdminStudents = () => {
  const navigate = useNavigate();
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
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.assignedTechnology?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
    const displayName = detail.fullName?.replace(/\s+/g, ' ').trim() || 'Student';
    const isActive = isStudentActive(detail);
    const assignedAdmins = detail.adminAssignments?.length > 0
      ? detail.adminAssignments
      : detail.assignedMentor
        ? [{
            id: `legacy-${detail.assignedMentor.id}`,
            admin: detail.assignedMentor,
          }]
        : [];
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
        {/* Back + View as Student */}
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
            <ArrowLeft size={15} />
            Back to Students
          </button>
          <button
            onClick={() => navigate(`/admin/students/${detail.id}/view`)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-1.5 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <Eye size={15} />
            View as Student
          </button>
        </div>

        {/* Profile Header */}
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
            {/* Education & Skills */}
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
                      {skills.map((sk, i) => (
                        <span key={i} className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">{sk}</span>
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
            {/* Account Details */}
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
                    <a href={detail.linkedinProfile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700">
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

            {/* Assigned Admins */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900"><Users size={15} className="text-violet-600" />Assigned Mentors</h3>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{assignedAdmins.length}</span>
                </div>
              </div>
              <div className="space-y-2.5 p-4">
                {assignedAdmins.length > 0 ? assignedAdmins.map((assignment) => {
                  return (
                    <div key={assignment.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                        {getInitials(assignment.admin?.fullName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-slate-900">{assignment.admin?.fullName}</p>
                        <p className="truncate text-[12px] text-slate-500">{assignment.admin?.email}</p>
                      </div>
                    </div>
                  );
                }) : (
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
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Reg No</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Applications</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Technology</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(student => (
                <tr key={student.id} className="transition-colors hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-medium text-gray-700">{student.registrationNumber || '—'}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-gray-900">{student.fullName}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 bg-blue-50 text-blue-700 text-[12px] font-bold rounded-full ring-1 ring-blue-100">
                      {student._count?.jobApplications || 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex max-w-[190px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${student.assignedTechnology ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'bg-gray-50 text-gray-400 ring-1 ring-gray-200'}`}>
                      <Zap size={12} className="shrink-0" />
                      <span className="truncate">{student.assignedTechnology?.name || 'Unassigned'}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${isStudentActive(student) ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50 text-red-600 ring-1 ring-red-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isStudentActive(student) ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                      {isStudentActive(student) ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <p className="text-[12px] text-gray-500">{formatDate(student.createdAt)}</p>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => viewStudent(student.id)}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => navigate(`/admin/students/${student.id}/view`)}
                        className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        Apply Jobs
                      </button>
                    </div>
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
