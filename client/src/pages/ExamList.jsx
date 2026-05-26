import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI, classroomJoinAPI } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function ExamList({ user, onLogout }) {
  const [exams, setExams] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nodes, setNodes] = useState([]);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.userType === 'student') {
      fetchMyClassrooms();
    } else {
      fetchExams();
    }
    checkNodes();
    const interval = setInterval(checkNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await examsAPI.getList();
      setExams(response.data.exams);
    } catch (err) {
      setError('Failed to load exams');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClassrooms = async () => {
    try {
      setLoading(true);
      const response = await classroomJoinAPI.getMyClassrooms();
      setClassrooms(response.data.classrooms);
    } catch (err) {
      setError('Failed to load classrooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkNodes = async () => {
    const nodePorts = [3001, 3002, 3003];
    const results = await Promise.allSettled(
      nodePorts.map(async (port) => {
        const res = await fetch(`http://localhost:${port}/health`);
        return res.json();
      })
    );

    const nodeStatus = results.map((r, i) => ({
      id: i + 1,
      status: r.status === 'fulfilled' ? 'online' : 'offline',
      nodeId: r.status === 'fulfilled' ? r.value.nodeId : 'N/A',
      uptime: r.status === 'fulfilled' ? r.value.uptime : 0,
    }));

    setNodes(nodeStatus);
  };

  const formatUptime = (seconds) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const onlineNodes = nodes.filter(n => n.status === 'online').length;

  const isTeacher = user?.userType === 'teacher';
  const isStudent = user?.userType === 'student';

  return (
    <div className="min-h-screen bg-bg-primary relative">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="fixed orb w-[600px] h-[600px] bg-accent/5 -top-40 -right-40 animate-drift" />
      <div className="fixed orb w-[500px] h-[500px] bg-teal/4 -bottom-32 -left-32 animate-drift" style={{ animationDelay: '-10s' }} />

      <header className="sticky top-0 z-40 border-b border-border-subtle backdrop-filter backdrop-blur-xl bg-bg-secondary/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-accent rounded-lg blur-md opacity-40" />
              <div className="relative w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-text-primary">Aegis</h1>
              <div className="text-[9px] text-accent font-display font-semibold tracking-[0.15em] uppercase">Distributed Examination</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArchitecture(!showArchitecture)}
              className="btn-ghost text-xs font-display font-semibold tracking-wider uppercase"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span className="hidden sm:inline">Arch</span>
            </button>
            {user?.isAdmin && (
              <button
                onClick={() => navigate('/exams/create')}
                className="btn-primary text-xs !py-2 !px-4"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span className="hidden sm:inline">New Exam</span>
              </button>
            )}
            {isTeacher && (
              <button
                onClick={() => navigate('/teacher-dashboard')}
                className="btn-primary text-xs !py-2 !px-4"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}
            {isStudent && (
              <button
                onClick={() => navigate('/join-classroom')}
                className="btn-primary text-xs !py-2 !px-4"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span className="hidden sm:inline">Join Class</span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-sm text-text-secondary pl-3 border-l border-border-subtle">
              <ThemeToggle />
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs font-medium">{user?.username}</span>
              {user?.userType === 'teacher' ? (
                <span className="badge badge-accent text-[9px] !px-2 !py-0.5">Teacher</span>
              ) : user?.isAdmin ? (
                <span className="badge badge-accent text-[9px] !px-2 !py-0.5">Admin</span>
              ) : (
                <span className="badge text-[9px] !px-2 !py-0.5 bg-bg-tertiary text-text-secondary">Student</span>
              )}
            </div>
            <button onClick={onLogout} className="btn-ghost">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        {isStudent ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10">
              <div className="animate-fadeInUp">
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary mb-2">
                  My Classrooms
                </h2>
                <p className="text-text-secondary">Select a classroom to view exams and classmates</p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center gap-3 animate-fadeInUp stagger-1">
                <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary/50 rounded-lg border border-border-subtle">
                  <div className="flex -space-x-1">
                    {nodes.slice(0, 3).map((node) => (
                      <div key={node.id} className={`w-2.5 h-2.5 rounded-full border border-bg-primary ${
                        node.status === 'online' ? 'bg-success' : 'bg-error'
                      }`} />
                    ))}
                  </div>
                  <span className="text-xs font-display font-semibold text-text-tertiary tracking-wider uppercase">
                    {onlineNodes}/3 Nodes
                  </span>
                </div>
                <span className="text-xs text-text-tertiary font-display font-semibold">
                  {classrooms.length} room{classrooms.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {showArchitecture && (
              <div className="card-elevated p-8 mb-10 animate-scaleIn">
                <h3 className="font-display font-bold text-lg text-text-primary mb-8">System Architecture</h3>
                <div className="flex flex-col items-center gap-5 mb-10">
                  <div className="w-full max-w-md bg-bg-tertiary/50 border border-accent/20 rounded-xl p-5 text-center backdrop-filter backdrop-blur-xl">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      <span className="font-display font-bold text-sm text-text-primary">Nginx Load Balancer</span>
                    </div>
                    <span className="text-xs text-text-tertiary font-medium">Least-Connection Algorithm</span>
                  </div>
                  <svg width="20" height="28" viewBox="0 0 24 32" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="0" x2="12" y2="24"/>
                    <polyline points="19 18 12 24 5 18"/>
                  </svg>
                  <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                    {nodes.map((node) => (
                      <div key={node.id} className={`rounded-xl p-5 text-center border-2 backdrop-filter backdrop-blur-xl transition-all duration-300 ${
                        node.status === 'online' ? 'bg-success/5 border-success/40' : 'bg-error/5 border-error/40'
                      }`}>
                        <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-3 ${node.status === 'online' ? 'bg-success animate-pulse' : 'bg-error'}`} />
                        <p className="font-display font-bold text-sm text-text-primary">Node {node.id}</p>
                        <p className="text-xs text-text-tertiary mt-1">{node.status === 'online' ? `:${3000 + node.id}` : 'Offline'}</p>
                        {node.status === 'online' && <p className="text-[10px] text-text-tertiary mt-1">Up {formatUptime(node.uptime)}</p>}
                      </div>
                    ))}
                  </div>
                  <svg width="20" height="28" viewBox="0 0 24 32" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="0" x2="12" y2="24"/>
                    <polyline points="19 18 12 24 5 18"/>
                  </svg>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 text-center backdrop-filter backdrop-blur-xl">
                      <p className="font-display font-bold text-sm text-text-primary">Redis</p>
                      <p className="text-xs text-text-tertiary mt-1">Sessions &amp; Timers</p>
                    </div>
                    <div className="bg-teal/5 border border-teal/20 rounded-xl p-5 text-center backdrop-filter backdrop-blur-xl">
                      <p className="font-display font-bold text-sm text-text-primary">PostgreSQL</p>
                      <p className="text-xs text-text-tertiary mt-1">Exams &amp; Results</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="card-elevated p-5 mb-8 animate-fadeInUp">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-text-primary uppercase tracking-widest text-xs">Cluster Status</h3>
                <span className={`badge ${onlineNodes === 3 ? 'badge-success' : onlineNodes > 0 ? 'badge-warning' : 'badge-error'}`}>
                  {onlineNodes}/3 Online
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {nodes.map((node) => (
                  <div key={node.id} className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all ${
                    node.status === 'online' ? 'bg-success/5 border-success/20 hover:border-success/40' : 'bg-error/5 border-error/20'
                  }`}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${node.status === 'online' ? 'bg-success animate-pulse' : 'bg-error'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-display font-bold text-text-primary">Node {node.id}</p>
                      <p className="text-xs text-text-tertiary truncate">{node.status === 'online' ? `Up ${formatUptime(node.uptime)}` : 'Offline'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="alert alert-error mb-8 animate-scaleIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 animate-fadeIn">
                <div className="spinner !w-9 !h-9"></div>
                <p className="text-text-secondary mt-4 text-sm font-medium">Loading classrooms...</p>
              </div>
            ) : classrooms.length === 0 ? (
              <div className="card-elevated text-center py-20 animate-scaleIn">
                <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </div>
                <p className="text-text-primary font-display font-bold mb-1">No classrooms yet</p>
                <p className="text-text-tertiary text-sm">
                  Join a classroom using a join code to see exams.<br/>
                  <button onClick={() => navigate('/join-classroom')} className="text-accent hover:text-accent-hover font-semibold mt-2">Join a Classroom</button>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {classrooms.map((c, index) => (
                  <div key={c.id} className="group cursor-pointer animate-fadeInUp" style={{ animationDelay: `${(index + 2) * 0.08}s` }}>
                    <div
                      className="card-accent card relative overflow-hidden h-full"
                      onClick={() => navigate(`/classroom-room/${c.id}`)}
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
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                              <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                          </div>
                          <span className="badge badge-accent">{c.exam_count || 0} exams</span>
                        </div>
                        <h3 className="text-xl font-display font-bold text-text-primary mb-3 group-hover:text-accent transition-colors duration-300">{c.name}</h3>
                        {c.description && (
                          <p className="text-text-secondary text-sm leading-relaxed mb-6">{c.description}</p>
                        )}
                        <div className="flex items-center justify-between pt-5 border-t border-border-subtle">
                          <div className="flex items-center gap-4 text-sm text-text-tertiary">
                            <div className="flex items-center gap-1.5">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                              </svg>
                              {c.teacher_name || 'Teacher'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-accent font-display font-bold text-sm group-hover:gap-3 transition-all duration-300">
                            Enter Room
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
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10">
              <div className="animate-fadeInUp">
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary mb-2">
                  Examinations
                </h2>
                <p className="text-text-secondary">Select an assessment to begin</p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center gap-3 animate-fadeInUp stagger-1">
                <div className="flex items-center gap-2 px-3 py-2 bg-bg-tertiary/50 rounded-lg border border-border-subtle">
                  <div className="flex -space-x-1">
                    {nodes.slice(0, 3).map((node) => (
                      <div key={node.id} className={`w-2.5 h-2.5 rounded-full border border-bg-primary ${
                        node.status === 'online' ? 'bg-success' : 'bg-error'
                      }`} />
                    ))}
                  </div>
                  <span className="text-xs font-display font-semibold text-text-tertiary tracking-wider uppercase">
                    {onlineNodes}/3 Nodes
                  </span>
                </div>
                <span className="text-xs text-text-tertiary font-display font-semibold">
                  {exams.length} exam{exams.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {showArchitecture && (
              <div className="card-elevated p-8 mb-10 animate-scaleIn">
                <h3 className="font-display font-bold text-lg text-text-primary mb-8">System Architecture</h3>
                <div className="flex flex-col items-center gap-5 mb-10">
                  <div className="w-full max-w-md bg-bg-tertiary/50 border border-accent/20 rounded-xl p-5 text-center backdrop-filter backdrop-blur-xl">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      </svg>
                      <span className="font-display font-bold text-sm text-text-primary">Nginx Load Balancer</span>
                    </div>
                    <span className="text-xs text-text-tertiary font-medium">Least-Connection Algorithm</span>
                  </div>
                  <svg width="20" height="28" viewBox="0 0 24 32" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="0" x2="12" y2="24"/>
                    <polyline points="19 18 12 24 5 18"/>
                  </svg>
                  <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                    {nodes.map((node) => (
                      <div key={node.id} className={`rounded-xl p-5 text-center border-2 backdrop-filter backdrop-blur-xl transition-all duration-300 ${
                        node.status === 'online' ? 'bg-success/5 border-success/40' : 'bg-error/5 border-error/40'
                      }`}>
                        <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-3 ${node.status === 'online' ? 'bg-success animate-pulse' : 'bg-error'}`} />
                        <p className="font-display font-bold text-sm text-text-primary">Node {node.id}</p>
                        <p className="text-xs text-text-tertiary mt-1">{node.status === 'online' ? `:${3000 + node.id}` : 'Offline'}</p>
                        {node.status === 'online' && <p className="text-[10px] text-text-tertiary mt-1">Up {formatUptime(node.uptime)}</p>}
                      </div>
                    ))}
                  </div>
                  <svg width="20" height="28" viewBox="0 0 24 32" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="0" x2="12" y2="24"/>
                    <polyline points="19 18 12 24 5 18"/>
                  </svg>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 text-center backdrop-filter backdrop-blur-xl">
                      <p className="font-display font-bold text-sm text-text-primary">Redis</p>
                      <p className="text-xs text-text-tertiary mt-1">Sessions &amp; Timers</p>
                    </div>
                    <div className="bg-teal/5 border border-teal/20 rounded-xl p-5 text-center backdrop-filter backdrop-blur-xl">
                      <p className="font-display font-bold text-sm text-text-primary">PostgreSQL</p>
                      <p className="text-xs text-text-tertiary mt-1">Exams &amp; Results</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="card-elevated p-5 mb-8 animate-fadeInUp">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-text-primary uppercase tracking-widest text-xs">Cluster Status</h3>
                <span className={`badge ${onlineNodes === 3 ? 'badge-success' : onlineNodes > 0 ? 'badge-warning' : 'badge-error'}`}>
                  {onlineNodes}/3 Online
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {nodes.map((node) => (
                  <div key={node.id} className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all ${
                    node.status === 'online' ? 'bg-success/5 border-success/20 hover:border-success/40' : 'bg-error/5 border-error/20'
                  }`}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${node.status === 'online' ? 'bg-success animate-pulse' : 'bg-error'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-display font-bold text-text-primary">Node {node.id}</p>
                      <p className="text-xs text-text-tertiary truncate">{node.status === 'online' ? `Up ${formatUptime(node.uptime)}` : 'Offline'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="alert alert-error mb-8 animate-scaleIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 animate-fadeIn">
                <div className="spinner !w-9 !h-9"></div>
                <p className="text-text-secondary mt-4 text-sm font-medium">Loading examinations...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="card-elevated text-center py-20 animate-scaleIn">
                <p className="text-text-primary font-display font-bold mb-1">No examinations available</p>
                <p className="text-text-tertiary text-sm">Check back later for new assessments</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {exams.map((exam, index) => (
                  <div key={exam.id} className="group cursor-pointer animate-fadeInUp" style={{ animationDelay: `${(index + 2) * 0.08}s` }}>
                    <div
                      className="card-accent card relative overflow-hidden h-full"
                      onClick={() => navigate(`/exam/${exam.id}`)}
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
                          <span className="badge badge-accent">Ready</span>
                        </div>
                        <h3 className="text-xl font-display font-bold text-text-primary mb-3 group-hover:text-accent transition-colors duration-300">{exam.title}</h3>
                        <p className="text-text-secondary text-sm leading-relaxed mb-6">{exam.description}</p>
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
      </main>
    </div>
  );
}