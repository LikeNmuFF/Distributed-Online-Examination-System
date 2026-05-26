import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teachersAPI, classroomsAPI } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function TeacherDashboard({ user, onLogout }) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const response = await teachersAPI.getClassrooms();
      setClassrooms(response.data.classrooms);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch classrooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Classroom name is required');
      return;
    }

    try {
      await classroomsAPI.create({
        name: formData.name,
        description: formData.description,
      });
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
      await fetchClassrooms();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create classroom');
    }
  };

  const handleClassroomClick = (classroomId) => {
    navigate(`/classroom/${classroomId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-20 border-b border-border-subtle bg-bg-primary/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-text-primary">Teacher Dashboard</h1>
            <p className="text-sm text-text-secondary">Welcome, {user?.username}!</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => navigate('/essay-grading')}
              className="px-4 py-2 text-sm font-display font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              Essay Grading
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-display font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
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

        {/* Create Classroom Section */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create New Classroom
            </button>
            <button
              onClick={() => navigate('/exams/create')}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              Create Exam
            </button>
          </div>

          {showCreateForm && (
            <div className="mt-4 p-6 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl max-w-md">
              <h3 className="text-lg font-display font-bold text-text-primary mb-4">Create Classroom</h3>
              <form onSubmit={handleCreateClassroom} className="space-y-4">
                <div>
                  <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Classroom Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., Introduction to Databases"
                  />
                </div>
                <div>
                  <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input w-full"
                    placeholder="Describe what this classroom is about"
                    rows="3"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1">
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Classrooms Grid */}
        <div>
          <h2 className="text-xl font-display font-bold text-text-primary mb-6">Your Classrooms</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : classrooms.length === 0 ? (
            <div className="p-8 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-text-tertiary opacity-50">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <p className="text-text-secondary">No classrooms yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classrooms.map((classroom) => (
                <div
                  key={classroom.id}
                  onClick={() => handleClassroomClick(classroom.id)}
                  className="p-6 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl hover:border-accent/50 hover:bg-bg-tertiary/20 transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-display font-bold text-text-primary group-hover:text-accent transition-colors">
                        {classroom.name}
                      </h3>
                      {classroom.description && (
                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                          {classroom.description}
                        </p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 ml-4">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 pt-4 border-t border-border-subtle">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Join Code</span>
                      <code className="bg-bg-tertiary px-2.5 py-1 rounded text-accent font-mono font-bold">
                        {classroom.join_code}
                      </code>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Members</span>
                      <span className="font-display font-semibold text-text-primary">
                        {classroom.approved_count || 0} approved
                      </span>
                    </div>
                    {classroom.pending_count > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">Pending Requests</span>
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-display font-bold bg-accent/20 text-accent">
                          {classroom.pending_count}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    className="w-full py-2 text-sm font-display font-semibold rounded-lg border border-accent/50 text-accent hover:bg-accent/10 transition-colors"
                  >
                    Manage Classroom
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
