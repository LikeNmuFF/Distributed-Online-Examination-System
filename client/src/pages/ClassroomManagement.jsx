import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teachersAPI, classroomsAPI, examManagementAPI } from '../services/api';

export default function ClassroomManagement() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classroom, setClassroom] = useState(null);
  const [members, setMembers] = useState([]);
  const [exams, setExams] = useState([]);
  const [teacherExams, setTeacherExams] = useState([]);
  const [activeTab, setActiveTab] = useState('members');
  const [showAddExamForm, setShowAddExamForm] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState('');

  useEffect(() => {
    fetchClassroomData();
    fetchTeacherExams();
  }, [classroomId]);

  const fetchClassroomData = async () => {
    try {
      setLoading(true);
      const response = await teachersAPI.getClassroomDetails(classroomId);
      setClassroom(response.data.classroom);
      setMembers(response.data.members);
      setExams(response.data.exams);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load classroom');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherExams = async () => {
    try {
      const response = await examManagementAPI.getTeacherExams();
      setTeacherExams(response.data.exams);
    } catch (err) {
      console.error('Failed to fetch teacher exams:', err);
    }
  };

  const handleApproveStudent = async (studentId) => {
    try {
      await classroomsAPI.approveMember(classroomId, studentId);
      await fetchClassroomData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve student');
    }
  };

  const handleRejectStudent = async (studentId) => {
    try {
      await classroomsAPI.rejectMember(classroomId, studentId);
      await fetchClassroomData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject student');
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to remove this student?')) {
      try {
        await classroomsAPI.removeMember(classroomId, studentId);
        await fetchClassroomData();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to remove student');
      }
    }
  };

  const examsByCategory = teacherExams.reduce((acc, exam) => {
    const cat = exam.category || 'quiz';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(exam);
    return acc;
  }, {});

  const categoryLabels = {
    quiz: 'Quiz',
    long_quiz: 'Long Quiz',
    midterm: 'Midterm',
    final: 'Final Exam',
  };

  const categoryOrder = ['quiz', 'long_quiz', 'midterm', 'final'];

  const handleAddExam = async (e) => {
    e.preventDefault();
    if (!selectedExamId) {
      setError('Please select an exam');
      return;
    }

    try {
      await examManagementAPI.addToClassroom(selectedExamId, classroomId);
      setSelectedExamId('');
      setShowAddExamForm(false);
      await fetchClassroomData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add exam');
    }
  };

  const handleRemoveExam = async (examId) => {
    if (window.confirm('Remove this exam from the classroom?')) {
      try {
        await examManagementAPI.removeFromClassroom(examId, classroomId);
        await fetchClassroomData();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to remove exam');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingMembers = members.filter(m => m.status === 'pending');
  const approvedMembers = members.filter(m => m.status === 'approved');
  const rejectedMembers = members.filter(m => m.status === 'rejected');

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />

      {/* Header */}
      <div className="relative z-20 border-b border-border-subtle bg-bg-primary/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/teacher-dashboard')}
              className="text-sm text-accent hover:text-accent-hover transition-colors mb-2 flex items-center gap-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-2xl font-display font-bold text-text-primary">{classroom?.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <code className="text-sm bg-bg-tertiary px-3 py-1 rounded text-accent font-mono font-bold">
                {classroom?.join_code}
              </code>
              <span className="text-xs text-text-secondary">Join Code</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 border-b border-border-subtle bg-bg-primary/50 backdrop-blur sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-4 text-sm font-display font-semibold transition-colors border-b-2 ${
              activeTab === 'members'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`py-4 text-sm font-display font-semibold transition-colors border-b-2 ${
              activeTab === 'exams'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Exams
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="alert alert-error mb-6 animate-scaleIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-8">
            {/* Pending Requests */}
            {pendingMembers.length > 0 && (
              <div>
                <h2 className="text-lg font-display font-bold text-text-primary mb-4 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
                  Pending Requests ({pendingMembers.length})
                </h2>
                <div className="space-y-2">
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="p-4 rounded-lg border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl flex items-center justify-between">
                      <div>
                        <p className="font-display font-semibold text-text-primary">{member.username}</p>
                        <p className="text-xs text-text-secondary">Requested: {new Date(member.joined_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveStudent(member.student_id)}
                          className="px-4 py-2 text-sm font-display font-semibold rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectStudent(member.student_id)}
                          className="px-4 py-2 text-sm font-display font-semibold rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Members */}
            {approvedMembers.length > 0 && (
              <div>
                <h2 className="text-lg font-display font-bold text-text-primary mb-4 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                  Approved Members ({approvedMembers.length})
                </h2>
                <div className="space-y-2">
                  {approvedMembers.map((member) => (
                    <div key={member.id} className="p-4 rounded-lg border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl flex items-center justify-between">
                      <div>
                        <p className="font-display font-semibold text-text-primary">{member.username}</p>
                        <p className="text-xs text-text-secondary">Approved: {new Date(member.approved_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(member.student_id)}
                        className="px-4 py-2 text-sm font-display font-semibold rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {members.length === 0 && (
              <div className="p-8 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl text-center">
                <p className="text-text-secondary">No members yet</p>
              </div>
            )}
          </div>
        )}

        {/* Exams Tab */}
        {activeTab === 'exams' && (
          <div className="space-y-6">
            <button
              onClick={() => setShowAddExamForm(!showAddExamForm)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Exam to Classroom
            </button>

            {showAddExamForm && (
              <div className="p-6 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl max-w-md">
                <h3 className="text-lg font-display font-bold text-text-primary mb-4">Add Exam</h3>
                <form onSubmit={handleAddExam} className="space-y-4">
                  <div>
                    <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Select Exam by Category</label>
                    <select
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      className="input w-full"
                    >
                      <option value="">Choose an exam...</option>
                      {categoryOrder.map((cat) => {
                        const exams = examsByCategory[cat];
                        if (!exams || exams.length === 0) return null;
                        return (
                          <optgroup key={cat} label={categoryLabels[cat] || cat}>
                            {exams.map((exam) => (
                              <option key={exam.id} value={exam.id}>
                                {exam.title} ({exam.question_count} questions)
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary flex-1">
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddExamForm(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {exams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map((exam) => (
                  <div key={exam.id} className="p-6 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-display font-bold px-2 py-0.5 rounded-full ${
                            exam.category === 'quiz' ? 'bg-teal/20 text-teal' :
                            exam.category === 'long_quiz' ? 'bg-blue-500/20 text-blue-400' :
                            exam.category === 'midterm' ? 'bg-gold/20 text-gold' :
                            exam.category === 'final' ? 'bg-accent/20 text-accent' :
                            'bg-text-secondary/20 text-text-secondary'
                          }`}>
                            {categoryLabels[exam.category] || exam.category || 'Quiz'}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-text-primary">{exam.title}</h3>
                        {exam.description && (
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2">{exam.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveExam(exam.id)}
                        className="ml-4 p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                    <div className="pt-4 border-t border-border-subtle flex gap-4 text-sm">
                      <div>
                        <span className="text-text-secondary">Questions:</span>
                        <span className="ml-2 font-display font-semibold text-text-primary">{exam.question_count || 0}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary">Duration:</span>
                        <span className="ml-2 font-display font-semibold text-text-primary">{exam.duration_seconds / 60}m</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl text-center">
                <p className="text-text-secondary">No exams in this classroom yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
