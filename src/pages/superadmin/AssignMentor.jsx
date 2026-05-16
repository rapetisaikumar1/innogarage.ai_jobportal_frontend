import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { UserCheck, Users, ArrowRight } from 'lucide-react';

const hasAssignedAdmin = (student) => {
  if (student?.assignedMentorId) return true;
  return Array.isArray(student?.adminAssignments) && student.adminAssignments.length > 0;
};

const AssignMentor = () => {
  const [admins, setAdmins] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [adminsRes, studentsRes] = await Promise.all([
        api.get('/admin/admins', { params: { summary: true } }),
        api.get('/admin/students', { params: { summary: true, limit: 500 } }),
      ]);
      setAdmins(adminsRes.data.filter(a => a.isActive));
      setStudents(studentsRes.data.students || studentsRes.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const unassigned = students.filter(s => !hasAssignedAdmin(s)).map(s => s.id);
    setSelectedStudents(prev => prev.length === unassigned.length ? [] : unassigned);
  };

  const handleAssign = async () => {
    if (!selectedMentor) { toast.error('Select a mentor'); return; }
    if (selectedStudents.length === 0) { toast.error('Select at least one student'); return; }
    setAssigning(true);
    try {
      await api.post('/admin/assign-mentor', { mentorId: selectedMentor, studentIds: selectedStudents });
      toast.success(`${selectedStudents.length} student(s) assigned successfully`);
      setSelectedStudents([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign mentor');
    } finally {
      setAssigning(false);
    }
  };

  const unassigned = students.filter((student) => !hasAssignedAdmin(student));
  const assigned = students.filter((student) => hasAssignedAdmin(student));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Assign Mentors</h1>
        <p className="text-gray-500 mt-1">Assign students to mentors</p>
      </div>

      {/* Assignment Panel */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Assign Students to Mentor</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Mentor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Mentor</label>
            <div className="space-y-2">
              {admins.length === 0 ? (
                <p className="text-sm text-gray-500">No active mentors available</p>
              ) : (
                admins.map((admin) => (
                  <label key={admin.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedMentor === admin.id ? 'border-primary-600 bg-primary-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="mentor" value={admin.id} checked={selectedMentor === admin.id}
                      onChange={(e) => setSelectedMentor(e.target.value)} className="text-primary-600" />
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{admin.fullName}</p>
                      <p className="text-xs text-gray-500">{assigned.filter((student) => student.assignedMentorId === admin.id || student.adminAssignments?.some((assignment) => assignment.adminId === admin.id)).length} students</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden lg:flex items-center justify-center pt-8">
            <ArrowRight size={32} className="text-gray-300" />
          </div>

          {/* Student Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Unassigned Students ({unassigned.length})</label>
              {unassigned.length > 0 && (
                <button onClick={selectAll} className="text-xs text-primary-600 font-medium">
                  {selectedStudents.length === unassigned.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {unassigned.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">All students are assigned</p>
              ) : (
                unassigned.map((student) => (
                  <label key={student.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedStudents.includes(student.id) ? 'border-primary-600 bg-primary-50' : 'hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)}
                      className="text-primary-600 rounded" />
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{student.fullName}</p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={handleAssign} disabled={assigning || !selectedMentor || selectedStudents.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <UserCheck size={16} /> {assigning ? 'Assigning...' : `Assign ${selectedStudents.length} Student(s)`}
          </button>
        </div>
      </div>

      {/* Current Assignments */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Current Assignments</h2>
        {admins.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No mentors available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map((admin) => {
              const mentees = assigned.filter((student) => student.assignedMentorId === admin.id || student.adminAssignments?.some((assignment) => assignment.adminId === admin.id));
              return (
                <div key={admin.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                      {admin.fullName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{admin.fullName}</p>
                      <p className="text-xs text-gray-500">{mentees.length} students</p>
                    </div>
                  </div>
                  {mentees.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">No students assigned</p>
                  ) : (
                    <div className="space-y-1">
                      {mentees.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 text-sm">
                          <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                            {s.fullName?.charAt(0)}
                          </div>
                          <span className="text-gray-700">{s.fullName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignMentor;
