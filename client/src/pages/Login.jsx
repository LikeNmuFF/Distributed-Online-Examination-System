import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, teachersAPI, studentsAPI } from '../services/api';

export default function Login({ onLogin }) {
  const [role, setRole] = useState(null); // null, 'student', or 'teacher'
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
  };

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setError('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setEmail('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!role) {
      setError('Please select a role');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      let response;
      if (role === 'teacher') {
        if (isRegister) {
          response = await teachersAPI.register(username, password, email);
        } else {
          response = await teachersAPI.login(username, password);
        }
      } else {
        if (isRegister) {
          response = await studentsAPI.register(username, password);
        } else {
          response = await studentsAPI.login(username, password);
        }
      }
      const { token, user } = response.data;
      onLogin(token, { ...user, userType: role });
      navigate(role === 'teacher' ? '/teacher-dashboard' : '/exams');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen flex relative overflow-hidden bg-bg-primary">
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
        <div className="orb w-[500px] h-[500px] bg-accent/8 -top-32 -left-32 animate-drift" />
        <div className="orb w-[400px] h-[400px] bg-teal/6 bottom-20 right-10 animate-drift" style={{ animationDelay: '-7s', animationDirection: 'reverse' }} />

        <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative items-center">
          <div className="relative z-10 w-full px-14 xl:px-20">
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-accent rounded-lg blur-lg opacity-40" />
                  <div className="relative w-11 h-11 bg-accent rounded-lg flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <span className="text-white font-display font-bold text-xl tracking-tight">Aegis</span>
                  <div className="text-[10px] text-accent font-display font-semibold tracking-[0.15em] uppercase">Distributed Examination</div>
                </div>
              </div>
            </div>

            <div className="relative mb-14">
              <div className="relative z-10">
                <h1 className="text-5xl xl:text-6xl font-display font-bold leading-[1.05] mb-5">
                  <span className="block text-text-primary">Secure</span>
                  <span className="block gradient-text">Distributed</span>
                  <span className="block text-text-primary">Examination</span>
                </h1>
                <p className="text-text-secondary text-base max-w-md leading-relaxed">
                  A production-grade platform demonstrating parallel and distributed computing.
                  Three-node cluster with load balancing, fault tolerance, and real-time sync.
                </p>
              </div>
              <div className="absolute top-0 right-0 w-48 h-px bg-gradient-to-r from-accent to-transparent rotate-45 translate-x-16 translate-y-20 opacity-50" />
            </div>

            <div className="grid grid-cols-3 gap-5 max-w-lg">
              {[
                { value: '3', label: 'Compute Nodes', desc: 'Distributed architecture' },
                { value: '5', label: 'Exams', desc: 'Available assessments' },
                { value: '50+', label: 'Concurrent', desc: 'Students supported' },
              ].map((stat, i) => (
                <div key={i} className="relative">
                  <div className="p-5 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl hover:border-accent/25 transition-all duration-300">
                    <span className="block text-3xl font-display font-bold gradient-text mb-1">{stat.value}</span>
                    <span className="block text-sm font-display font-semibold text-text-primary">{stat.label}</span>
                    <span className="block text-xs text-text-tertiary mt-0.5">{stat.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-border-subtle">
              <p className="text-text-tertiary text-xs font-display font-semibold tracking-[0.15em] uppercase mb-3">Infrastructure</p>
              <div className="flex flex-wrap gap-3">
                {['Node.js', 'React', 'PostgreSQL', 'Redis', 'Nginx', 'Docker'].map((tech) => (
                  <span key={tech} className="px-3 py-1.5 text-xs font-display font-medium text-text-secondary bg-bg-tertiary/50 rounded border border-border-subtle">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center p-6 sm:p-8 lg:p-12 relative z-20">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex items-center gap-3 mb-14">
              <div className="relative">
                <div className="absolute inset-0 bg-accent rounded-lg blur-lg opacity-40" />
                <div className="relative w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </div>
              </div>
              <div>
                <span className="text-white font-display font-bold text-xl tracking-tight">Aegis</span>
                <div className="text-[9px] text-accent font-display font-semibold tracking-[0.15em] uppercase">Distributed Examination</div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold text-text-primary mb-2">
                Choose Your Role
              </h2>
              <p className="text-text-secondary text-sm">
                Select whether you're a student or teacher
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelect('student')}
                className="w-full p-4 rounded-xl border-2 border-border-subtle hover:border-accent bg-glass-bg hover:bg-bg-tertiary/50 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-text-primary font-display font-semibold">Student</div>
                    <div className="text-xs text-text-secondary">Take exams and view results</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('teacher')}
                className="w-full p-4 rounded-xl border-2 border-border-subtle hover:border-accent bg-glass-bg hover:bg-bg-tertiary/50 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-text-primary font-display font-semibold">Teacher</div>
                    <div className="text-xs text-text-secondary">Create exams and manage classes</div>
                  </div>
                </div>
              </button>
            </div>

              <p className="mt-8 text-[11px] text-text-tertiary text-center leading-relaxed">
                Powered by 3-node cluster with load balancing, redis DSM, and parallel grading.
              </p>
              <div className="mt-6 text-center">
                <a
                  href="/scoreboard"
                  className="text-xs text-accent hover:text-accent-hover transition-colors font-display font-semibold tracking-wider uppercase inline-flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  View Public Scoreboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-bg-primary">
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
      <div className="orb w-[500px] h-[500px] bg-accent/8 -top-32 -left-32 animate-drift" />
      <div className="orb w-[400px] h-[400px] bg-teal/6 bottom-20 right-10 animate-drift" style={{ animationDelay: '-7s', animationDirection: 'reverse' }} />

      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative items-center">
        <div className="relative z-10 w-full px-14 xl:px-20">
          <div className="mb-16">
            <button
              onClick={() => handleRoleSelect(null)}
              className="text-xs text-accent hover:text-accent-hover transition-colors font-display font-semibold tracking-wider uppercase mb-4"
            >
              ← Back to role selection
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-accent rounded-lg blur-lg opacity-40" />
                <div className="relative w-11 h-11 bg-accent rounded-lg flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </div>
              </div>
              <div>
                <span className="text-white font-display font-bold text-xl tracking-tight">Aegis</span>
                <div className="text-[10px] text-accent font-display font-semibold tracking-[0.15em] uppercase">{role === 'teacher' ? 'Teacher' : 'Student'} Portal</div>
              </div>
            </div>
          </div>

          <div className="relative mb-14">
            <div className="relative z-10">
              <h1 className="text-5xl xl:text-6xl font-display font-bold leading-[1.05] mb-5">
                <span className="block text-text-primary">Welcome</span>
                <span className="block gradient-text">{role === 'teacher' ? 'Educator' : 'Learner'}</span>
              </h1>
              <p className="text-text-secondary text-base max-w-md leading-relaxed">
                {role === 'teacher' 
                  ? 'Create exams, manage classrooms, and track student performance.'
                  : 'Take exams, join classrooms, and monitor your progress.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center p-6 sm:p-8 lg:p-12 relative z-20">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-14">
            <div className="relative">
              <div className="absolute inset-0 bg-accent rounded-lg blur-lg opacity-40" />
              <div className="relative w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
            </div>
            <div>
              <span className="text-white font-display font-bold text-xl tracking-tight">Aegis</span>
              <div className="text-[9px] text-accent font-display font-semibold tracking-[0.15em] uppercase">{role === 'teacher' ? 'Teacher' : 'Student'} Portal</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-text-primary mb-2">
              {isRegister ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-text-secondary text-sm">
              {isRegister ? `Register as a ${role}` : `Login as a ${role}`}
            </p>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder={isRegister ? 'Choose a username' : (role === 'teacher' ? 'teacher1' : 'student1')}
                autoComplete="username"
              />
            </div>
            {isRegister && role === 'teacher' && (
              <div>
                <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="your.email@example.com"
                  autoComplete="email"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder={isRegister ? 'Choose a password' : 'Enter your password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
            </div>
            {isRegister && (
              <div>
                <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isRegister ? 'Creating Account...' : 'Authenticating'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isRegister ? 'Create Account' : 'Enter Examination'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center">
            <button
              onClick={toggleMode}
              className="text-xs text-accent hover:text-accent-hover transition-colors font-display font-semibold tracking-wider uppercase"
            >
              {isRegister ? "Already have an account? Sign In" : "No Account? Create one!"}
            </button>
          </p>
          <p className="mt-4 text-[11px] text-text-tertiary text-center leading-relaxed">
            Powered by 3-node cluster with load balancing, redis DSM, and parallel grading.
          </p>
          <div className="mt-4 text-center">
            <a
              href="/scoreboard"
              className="text-[11px] text-accent hover:text-accent-hover transition-colors font-display font-semibold tracking-wider"
            >
              View Public Scoreboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


