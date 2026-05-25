import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submissionsAPI } from '../services/api';

export default function Results({ user, onLogout }) {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const pollResult = async () => {
      try {
        const response = await submissionsAPI.getJobStatus(jobId);

        if (!response.data) {
          setError('Result not found');
          setLoading(false);
          return;
        }

        if (response.data.state === 'completed') {
          setResult(response.data.result);
          setLoading(false);
        } else if (response.data.state === 'failed') {
          setError('Failed to grade exam');
          setLoading(false);
        } else {
          setTimeout(pollResult, 500);
        }
      } catch (err) {
        console.error('Poll error:', err);
        setTimeout(pollResult, 1000);
      }
    };

    pollResult();
  }, [jobId]);

  useEffect(() => {
    if (result) {
      const target = result.percentage;
      let current = 0;
      const step = target / 30;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        setAnimatedScore(Math.round(current));
      }, 20);
      return () => clearInterval(timer);
    }
  }, [result]);

  const handleBackToExams = () => {
    navigate('/exams');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="card-elevated text-center max-w-sm p-8 animate-scaleIn">
          <div className="spinner !w-9 !h-9 mx-auto mb-4"></div>
          <p className="text-text-primary font-display font-bold mb-1">Grading your examination</p>
          <p className="text-text-tertiary text-sm">Processing answers with parallel computing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="card-elevated text-center max-w-sm p-8 animate-scaleIn">
          <div className="w-14 h-14 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <p className="text-text-primary font-display font-bold mb-2">{error}</p>
          <button onClick={handleBackToExams} className="btn-primary mt-4">
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="card-elevated text-center max-w-sm p-8 animate-scaleIn">
          <p className="text-text-tertiary mb-4">No results available</p>
          <button onClick={handleBackToExams} className="btn-primary">
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 68;
  const strokeDasharray = (animatedScore / 100) * circumference;
  const isPassing = result.percentage >= 60;
  const breakdown = result.breakdown || [];

  const optionCounts = { A: 0, B: 0, C: 0, D: 0 };
  breakdown.forEach((q) => {
    if (q.studentAnswer && optionCounts.hasOwnProperty(q.studentAnswer)) {
      optionCounts[q.studentAnswer]++;
    }
  });
  const maxOption = Math.max(...Object.values(optionCounts), 1);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Grid bg */}
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      {/* Orbs */}
      <div className="fixed orb w-[500px] h-[500px] bg-accent/5 top-20 -right-20 animate-drift" />
      <div className="fixed orb w-[400px] h-[400px] bg-teal/4 -bottom-20 left-20 animate-drift" style={{ animationDelay: '-8s' }} />

      {/* Header */}
      <header className="border-b border-border-subtle sticky top-0 z-20 backdrop-filter backdrop-blur-xl bg-bg-secondary/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-accent rounded-lg blur-md opacity-40" />
              <div className="relative w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
            </div>
            <span className="font-display font-bold text-base text-text-primary">Aegis</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs text-text-secondary font-medium">{user?.username}</span>
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

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        {/* Score Header */}
        <div className="text-center mb-10 animate-fadeInUp">
          {/* Pass/Fail badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-display font-bold uppercase tracking-wider mb-6 ${
            isPassing
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-error/10 text-error border border-error/20'
          }`}>
            {isPassing ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Passed
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Did Not Pass
              </>
            )}
          </div>

          {/* Score Circle */}
          <div className="score-circle mx-auto mb-6 animate-countUp">
            <svg viewBox="0 0 160 160">
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--gold)" />
                </linearGradient>
              </defs>
              <circle className="track" cx="80" cy="80" r="68" />
              <circle
                className={`fill ${isPassing ? 'passing' : ''}`}
                cx="80"
                cy="80"
                r="68"
                strokeDasharray={`${strokeDasharray} ${circumference}`}
                style={!isPassing ? { stroke: 'var(--error)' } : undefined}
              />
            </svg>
            <div className="value gradient-text">
              {animatedScore}<span className="text-lg text-text-secondary" style={{ WebkitTextFillColor: 'var(--text-secondary)' }}>%</span>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary mb-2">
            {result.score} / {result.total}
          </h2>
          <p className="text-text-secondary text-sm">
            Graded in {result.gradingDuration}ms using parallel computing
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card-elevated p-6 text-center animate-fadeInUp stagger-1" style={{ opacity: 0 }}>
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-3xl font-display font-bold text-success mb-1">{result.score}</p>
            <p className="text-sm text-text-tertiary">Correct</p>
          </div>

          <div className="card-elevated p-6 text-center animate-fadeInUp stagger-2" style={{ opacity: 0 }}>
            <div className="w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <p className="text-3xl font-display font-bold text-error mb-1">{result.total - result.score}</p>
            <p className="text-sm text-text-tertiary">Incorrect</p>
          </div>

          <div className="card-elevated p-6 text-center animate-fadeInUp stagger-3" style={{ opacity: 0 }}>
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <p className="text-3xl font-display font-bold text-accent mb-1">{result.gradingDuration}ms</p>
            <p className="text-sm text-text-tertiary">Grading Time</p>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="card-elevated p-6 sm:p-8 mb-8 animate-fadeInUp stagger-4" style={{ opacity: 0 }}>
          <h3 className="font-display font-bold text-base text-text-primary mb-6">Question Breakdown</h3>

          {/* Bar chart */}
          <div className="bar-chart mb-8">
            {breakdown.map((q, idx) => (
              <div key={idx} className="bar">
                <div
                  className={`bar-fill ${q.isCorrect ? 'correct' : 'incorrect'}`}
                  style={{ height: `${q.isCorrect ? 100 : 30}%` }}
                />
                <span className="bar-label">Q{idx + 1}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mb-8 pb-6 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-success"></div>
              <span className="text-xs text-text-tertiary">Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-error"></div>
              <span className="text-xs text-text-tertiary">Incorrect</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-3 px-2 text-text-tertiary font-display font-semibold text-xs uppercase tracking-wider">Q</th>
                  <th className="text-center py-3 px-2 text-text-tertiary font-display font-semibold text-xs uppercase tracking-wider">Your Answer</th>
                  <th className="text-center py-3 px-2 text-text-tertiary font-display font-semibold text-xs uppercase tracking-wider">Correct</th>
                  <th className="text-center py-3 px-2 text-text-tertiary font-display font-semibold text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((q, idx) => (
                  <tr key={idx} className="border-b border-border-subtle last:border-b-0">
                    <td className="py-3 px-2 font-display font-semibold text-text-primary">{idx + 1}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-display font-bold ${
                        q.isCorrect ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {q.studentAnswer || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-display font-bold bg-bg-tertiary text-text-secondary">
                        {q.correctAnswer}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {q.isCorrect ? (
                        <span className="badge badge-success">Correct</span>
                      ) : (
                        <span className="badge badge-error">Wrong</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Answer Distribution */}
        <div className="card-elevated p-6 sm:p-8 mb-8 animate-fadeInUp stagger-5" style={{ opacity: 0 }}>
          <h3 className="font-display font-bold text-base text-text-primary mb-6">Answer Distribution</h3>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(optionCounts).map(([option, count]) => {
              const heightPercent = (count / maxOption) * 100;
              return (
                <div key={option} className="flex flex-col items-center">
                  <div className="w-full h-24 bg-bg-tertiary/50 rounded-lg relative overflow-hidden mb-2">
                    <div
                      className="absolute bottom-0 w-full rounded-lg transition-all duration-700"
                      style={{
                        height: `${Math.max(heightPercent, 8)}%`,
                        background: `linear-gradient(180deg, var(--accent) 0%, rgba(232, 89, 12, 0.4) 100%)`,
                        boxShadow: '0 0 8px var(--accent-glow)',
                      }}
                    />
                  </div>
                  <span className="font-display font-bold text-lg text-text-primary">{count}</span>
                  <span className="text-xs text-text-tertiary">Option {option}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance Info */}
        <div className="card-elevated p-6 border-l-2 border-accent animate-fadeInUp stagger-6" style={{ opacity: 0 }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-text-primary mb-2">About Your Results</h4>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Graded using parallel worker threads (fork-join model)
                </li>
                <li className="flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  All {result.total} questions graded simultaneously in parallel
                </li>
                <li className="flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Results stored in distributed PostgreSQL database
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="text-center mt-8 animate-fadeInUp stagger-6" style={{ opacity: 0 }}>
          <button onClick={handleBackToExams} className="btn-primary px-8 text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Exams
          </button>
        </div>
      </main>
    </div>
  );
}
