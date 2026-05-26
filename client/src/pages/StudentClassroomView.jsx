import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { classroomJoinAPI, studentStatusAPI } from '../services/api';
import ClassroomChat from '../components/ClassroomChat';
import ThemeToggle from '../components/ThemeToggle';

const categoryLabels = {
  quiz: 'Quiz',
  long_quiz: 'Long Quiz',
  midterm: 'Midterm',
  final: 'Final Exam',
};

export default function StudentClassroomView({ user, onLogout }) {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classroom, setClassroom] = useState(null);
  const [members, setMembers] = useState([]);
  const [exams, setExams] = useState([]);
  const [activeTab, setActiveTab] = useState('exams');
  const [sessionId, setSessionId] = useState('');

  // Register student as online when component mounts
  useEffect(() => {
    if (!user?.id || !classroomId) return;

    const studentSessionId = `${user.id}-${classroomId}-${Date.now()}`;
    setSessionId(studentSessionId);

    // Register as online
    const registerOnline = async () => {
      try {
        await studentStatusAPI.joinClassroom(parseInt(classroomId), studentSessionId);
        console.log('Student registered as online');

        // Emit Socket.IO event
        const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const { io } = await import('socket.io-client');
        const socket = io(socketUrl);
        
        socket.on('connect', () => {
          socket.emit('student-online', {
            classroomId: parseInt(classroomId),
            studentId: user.id,
            username: user.username,
            sessionId: studentSessionId
          });
        });

        // Heartbeat every 30 seconds
        const heartbeatInterval = setInterval(async () => {
          try {
            await studentStatusAPI.heartbeat(studentSessionId);
            socket.emit('student-online', {
              classroomId: parseInt(classroomId),
              studentId: user.id,
              username: user.username,
              sessionId: studentSessionId
            });
          } catch (err) {
            console.error('Heartbeat error:', err);
          }
        }, 30000);

        return () => {
          clearInterval(heartbeatInterval);
          socket.disconnect();
        };
      } catch (err) {
        console.error('Failed to register online:', err);
      }
    };

    registerOnline();

    // Leave when component unmounts
    return async () => {
      try {
        await studentStatusAPI.leaveClassroom(studentSessionId);
        console.log('Student registered as offline');
      } catch (err) {
        console.error('Failed to leave:', err);
      }
    };
  }, [user?.id, classroomId]);

  useEffect(() => {
    fetchClassroom();
    fetchMembers();
    fetchExams();
  }, [classroomId]);

  const fetchClassroom = async () => {
    try {
      const response = await classroomJoinAPI.getMyClassrooms();
      const found = response.data.classrooms.find(c => c.id == classroomId);
      if (found) setClassroom(found);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await classroomJoinAPI.getClassroomMembers(classroomId);
      setMembers(response.data.members);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await classroomJoinAPI.getClassroomExams(classroomId);
      setExams(response.data.exams);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (examId) => {
    navigate(`/exam/${examId}`);
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />

      <div className="relative z-20 border-b border-border-subtle bg-bg-primary/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/exams')}
              className="text-sm text-accent hover:text-accent-hover transition-colors mb-2 flex items-center gap-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Back to Classrooms
            </button>
            <h1 className="text-2xl font-display font-bold text-text-primary">{classroom?.name || 'Classroom'}</h1>
            {classroom?.teacher_name && (
              <p className="text-sm text-text-secondary mt-1">Teacher: {classroom.teacher_name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="relative z-10 border-b border-border-subtle bg-bg-primary/50 backdrop-blur sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
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
          <button
            onClick={() => setActiveTab('classmates')}
            className={`py-4 text-sm font-display font-semibold transition-colors border-b-2 ${
              activeTab === 'classmates'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            👥 Classmates
          </button>
           <button
             onClick={() => setActiveTab('chat')}
             className={`py-4 text-sm font-display font-semibold transition-colors border-b-2 ${
               activeTab === 'chat'
                 ? 'border-accent text-accent'
                 : 'border-transparent text-text-secondary hover:text-text-primary'
             }`}
           >
             💬 Chat
           </button>
         </div>
       </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="alert alert-error mb-6 animate-scaleIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'exams' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : exams.length === 0 ? (
              <div className="card-elevated text-center py-20 animate-scaleIn">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <p className="text-text-primary font-display font-bold mb-1">No exams yet</p>
                <p className="text-text-tertiary text-sm">The teacher hasn't added any exams to this classroom yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {exams.map((exam, index) => (
                  <div key={exam.id} className="group cursor-pointer animate-fadeInUp" style={{ animationDelay: `${index * 0.08}s` }}>
                    <div
                      className="card-accent card relative overflow-hidden h-full"
                      onClick={() => handleStartExam(exam.id)}
                      onMouseMove={(e) => {
                        const card = e.currentTarget;
                        const rect = card.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        const centerX = rect.width / 2;
                        const centerY = rect.height / 2;
                        const rotateX = (y - centerY) * 0.018;
                        const rotateY = (centerX - x) * 0.018;
                        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                      }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'; }}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <div className="p-7">
                        <div className="flex items-start justify-between mb-5">
                          <div className="w-11 h-11 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20 transition-all duration-300">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                          </div>
                          <span className={`text-xs font-display font-bold px-2.5 py-1 rounded-full ${
                            exam.category === 'quiz' ? 'bg-teal/20 text-teal' :
                            exam.category === 'long_quiz' ? 'bg-blue-500/20 text-blue-400' :
                            exam.category === 'midterm' ? 'bg-gold/20 text-gold' :
                            exam.category === 'final' ? 'bg-accent/20 text-accent' :
                            'bg-text-secondary/20 text-text-secondary'
                          }`}>
                            {categoryLabels[exam.category] || exam.category || 'Quiz'}
                          </span>
                        </div>
                        <h3 className="text-xl font-display font-bold text-text-primary mb-3 group-hover:text-accent transition-colors duration-300">{exam.title}</h3>
                        {exam.description && (
                          <p className="text-text-secondary text-sm leading-relaxed mb-6">{exam.description}</p>
                        )}
                        <div className="flex items-center justify-between pt-5 border-t border-border-subtle">
                          <div className="flex items-center gap-4 text-sm text-text-tertiary">
                            <div className="flex items-center gap-1.5">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                              </svg>
                              {Math.floor(exam.duration_seconds / 60)} min
                            </div>
                            <div className="flex items-center gap-1.5">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                              </svg>
                              {exam.question_count} questions
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-accent font-display font-bold text-sm group-hover:gap-3 transition-all duration-300">
                            Start
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'classmates' && (
          <div className="max-w-2xl">
            <div className="space-y-2">
              {members.length === 0 ? (
                <div className="card-elevated text-center py-20 animate-scaleIn">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  <p className="text-text-primary font-display font-bold mb-1">No classmates yet</p>
                </div>
              ) : (
                members.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl animate-scaleIn" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-display font-bold text-sm">
                      {m.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-text-primary">{m.username}</p>
                      <p className="text-xs text-text-tertiary">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
                    </div>
                    {m.username === user?.username && (
                      <span className="badge badge-accent text-[10px]">You</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-[600px] animate-scaleIn">
            <ClassroomChat 
              classroomId={classroomId} 
              userId={user?.id} 
              username={user?.username}
              userType={user?.userType}
            />
          </div>
        )}
      </div>
    </div>
  );
}