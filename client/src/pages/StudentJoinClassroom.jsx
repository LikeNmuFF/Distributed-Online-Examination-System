import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { classroomJoinAPI } from '../services/api';

export default function StudentJoinClassroom() {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myRequests, setMyRequests] = useState({ pending: [], approved: [], rejected: [] });
  const [loadingRequests, setLoadingRequests] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await classroomJoinAPI.getMyRequests();
      setMyRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleJoinClassroom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await classroomJoinAPI.requestToJoin(joinCode);
      setSuccess(response.data.message);
      setJoinCode('');
      setTimeout(() => {
        fetchMyRequests();
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join classroom');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveClassroom = async (classroomId) => {
    if (window.confirm('Are you sure you want to leave this classroom?')) {
      try {
        await classroomJoinAPI.leaveClassroom(classroomId);
        await fetchMyRequests();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to leave classroom');
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />

      {/* Header */}
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
              Back to Exams
            </button>
            <h1 className="text-2xl font-display font-bold text-text-primary">Join Classroom</h1>
            <p className="text-sm text-text-secondary mt-1">Use a join code to join a teacher's classroom</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {success && (
          <div className="alert alert-success mb-6 animate-scaleIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Join Form */}
        <div className="mb-12 p-8 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl">
          <h2 className="text-xl font-display font-bold text-text-primary mb-6">Enter Join Code</h2>
          <form onSubmit={handleJoinClassroom} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Join Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="input w-full text-center tracking-widest"
                placeholder="e.g., DB101"
                maxLength="20"
                disabled={loading}
              />
              <p className="text-xs text-text-tertiary mt-2">Ask your teacher for the classroom join code</p>
            </div>
            <button
              type="submit"
              disabled={loading || !joinCode.trim()}
              className="btn-primary w-full py-3.5 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                'Request to Join'
              )}
            </button>
          </form>
        </div>

        {/* My Classrooms Section */}
        <div>
          <h2 className="text-xl font-display font-bold text-text-primary mb-6">My Classrooms</h2>

          {loadingRequests ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : myRequests.pending.length === 0 && myRequests.approved.length === 0 && myRequests.rejected.length === 0 ? (
            <div className="p-8 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-text-tertiary opacity-50">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <p className="text-text-secondary">Join your first classroom using a join code above</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pending Requests */}
              {myRequests.pending.length > 0 && (
                <div>
                  <h3 className="text-lg font-display font-bold text-text-primary mb-4 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
                    Pending Approval ({myRequests.pending.length})
                  </h3>
                  <div className="space-y-3">
                    {myRequests.pending.map((req) => (
                      <div key={req.id} className="p-4 rounded-lg border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-display font-semibold text-text-primary">{req.classroom_name}</h4>
                            <p className="text-sm text-text-secondary mt-1">Teacher: {req.teacher_name}</p>
                            {req.description && (
                              <p className="text-sm text-text-tertiary mt-2 line-clamp-2">{req.description}</p>
                            )}
                            <p className="text-xs text-text-tertiary mt-2">Requested: {new Date(req.joined_at).toLocaleDateString()}</p>
                          </div>
                          <div className="ml-4 inline-block px-3 py-1 rounded-full text-xs font-display font-bold bg-yellow-500/20 text-yellow-400">
                            Waiting...
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Classrooms */}
              {myRequests.approved.length > 0 && (
                <div>
                  <h3 className="text-lg font-display font-bold text-text-primary mb-4 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                    Active Classrooms ({myRequests.approved.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myRequests.approved.map((req) => (
                      <div key={req.id} className="p-6 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl hover:border-accent/50 transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="font-display font-semibold text-text-primary">{req.classroom_name}</h4>
                            <p className="text-sm text-text-secondary">Teacher: {req.teacher_name}</p>
                          </div>
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-display font-bold bg-green-500/20 text-green-400">
                            Approved
                          </span>
                        </div>
                        {req.description && (
                          <p className="text-sm text-text-tertiary mb-4 line-clamp-2">{req.description}</p>
                        )}
                        <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-text-secondary">Exams: </span>
                            <span className="font-display font-semibold text-text-primary">{req.exam_count || 0}</span>
                          </div>
                          <button
                            onClick={() => handleLeaveClassroom(req.id)}
                            className="px-3 py-1 text-xs font-display font-semibold rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          >
                            Leave
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejected Requests */}
              {myRequests.rejected.length > 0 && (
                <div>
                  <h3 className="text-lg font-display font-bold text-text-primary mb-4 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                    Rejected Requests ({myRequests.rejected.length})
                  </h3>
                  <div className="space-y-3">
                    {myRequests.rejected.map((req) => (
                      <div key={req.id} className="p-4 rounded-lg border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl opacity-75">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-display font-semibold text-text-primary">{req.classroom_name}</h4>
                            <p className="text-sm text-text-secondary">Teacher: {req.teacher_name}</p>
                            <p className="text-xs text-red-400 mt-2">Your request was rejected</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
