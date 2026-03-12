import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Users, Search, Eye, Briefcase } from 'lucide-react';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/my-students');
      setStudents(res.data);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const viewProgress = async (studentId) => {
    try {
      const res = await api.get(`/admin/student-progress/${studentId}`);
      setProgress(res.data);
      setSelectedStudent(studentId);
    } catch (error) {
      toast.error('Failed to load student progress');
    }
  };

  const filtered = students.filter(s =>
    s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.registrationNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Students</h1>
          <p className="text-gray-500 mt-1">View and track your assigned students</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border">
          <Users size={16} />
          <span>{students.length} students</span>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No students found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student) => (
            <div key={student.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                    {student.fullName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{student.fullName}</p>
                    <p className="text-xs text-gray-500">{student.email}</p>
                    {student.registrationNumber && <p className="text-xs font-mono font-semibold text-primary-600 mt-0.5">{student.registrationNumber}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {student.phone && <p>Phone: {student.phone}</p>}
                {student.education && <p>Education: {student.education}</p>}
                {student.experience && <p>Experience: {student.experience}</p>}
                {student.keySkills && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {student.keySkills.split(',').slice(0, 4).map((sk, i) => (
                      <span key={i} className="badge-blue text-xs">{sk.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="badge-green">{student._count?.jobApplications || 0} applications</span>
                <button onClick={() => viewProgress(student.id)} className="ml-auto text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                  <Eye size={14} /> Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Progress Modal */}
      {selectedStudent && progress && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">{progress.student?.fullName} &mdash; Progress</h2>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {Object.entries(progress.applicationStats || {}).map(([key, val]) => (
                <div key={key} className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-gray-800">{val}</p>
                  <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Briefcase size={16} /> Recent Applications</h3>
            {progress.recentApplications?.length > 0 ? (
              <div className="space-y-2">
                {progress.recentApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{app.job?.title}</p>
                      <p className="text-xs text-gray-500">{app.job?.company}</p>
                    </div>
                    <span className={`badge-${app.status === 'APPLIED' ? 'blue' : app.status === 'INTERVIEW' ? 'purple' : app.status === 'OFFER' ? 'green' : app.status === 'REJECTED' ? 'red' : 'yellow'}`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No applications yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
