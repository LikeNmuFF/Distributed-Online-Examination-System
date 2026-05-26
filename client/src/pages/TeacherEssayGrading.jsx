import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { essayGradingAPI, examsAPI } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

export default function TeacherEssayGrading({ user, onLogout }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);
  const [questionTexts, setQuestionTexts] = useState({});
  const [grading, setGrading] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await essayGradingAPI.getPending();
      setSubmissions(res.data.submissions);
      setError('');

      const examIds = [...new Set(res.data.submissions.map(s => s.examId))];
      for (const id of examIds) {
        try {
          const examRes = await examsAPI.get(id);
          const qs = examRes.data.exam?.questions || [];
          const map = {};
          qs.forEach((q, i) => { map[i] = q.question_text; });
          setQuestionTexts(prev => ({ ...prev, [id]: map }));
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch pending essays');
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (submissionId, questionIndex) => {
    const score = grading[`${submissionId}-${questionIndex}`];
    if (score === undefined) return;

    try {
      const res = await essayGradingAPI.gradeEssay(submissionId, questionIndex, score);
      setSuccessMsg(`Essay graded! New score: ${res.data.score}`);
      setTimeout(() => setSuccessMsg(''), 3000);

      setSubmissions(prev =>
        prev.map(s => {
          if (s.id !== submissionId) return s;
          const updatedBreakdown = s.breakdown.map(b =>
            b.questionIndex === questionIndex ? { ...b, isCorrect: score } : b
          );
          const updated = { ...s, breakdown: updatedBreakdown };
          return {
            ...updated,
            essayQuestions: updatedBreakdown.filter(
              b => b.type === 'essay' && b.isCorrect === 'pending'
            ).map(eq => ({
              questionIndex: eq.questionIndex,
              type: eq.type,
              value: eq.value,
              expected: eq.expected,
            })),
          };
        })
      );

      setGrading(prev => {
        const next = { ...prev };
        delete next[`${submissionId}-${questionIndex}`];
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to grade essay');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="card-elevated text-center max-w-sm p-8 animate-scaleIn">
          <div className="spinner !w-9 !h-9 mx-auto mb-4" />
          <p className="text-text-primary font-display font-bold">Loading pending essays...</p>
        </div>
      </div>
    );
  }

  const pendingCount = submissions.reduce((sum, s) => sum + s.essayQuestions.length, 0);

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="fixed orb w-[500px] h-[500px] bg-accent/5 top-20 -right-20 animate-drift" />
      <div className="fixed orb w-[400px] h-[400px] bg-teal/4 -bottom-20 left-20 animate-drift" style={{ animationDelay: '-8s' }} />

      <header className="border-b border-border-subtle sticky top-0 z-20 backdrop-filter backdrop-blur-xl bg-bg-secondary/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-accent rounded-lg blur-md opacity-30" />
              <div className="relative w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
            </div>
            <span className="font-display font-bold text-base text-text-primary">Essay Grading</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => navigate('/dashboard')} className="btn-ghost text-xs">
              Dashboard
            </button>
            <span className="hidden sm:inline text-xs text-text-secondary font-medium">{user?.username}</span>
            <button onClick={handleLogout} className="btn-ghost">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        {successMsg && (
          <div className="mb-6 p-4 rounded-lg border border-success/30 bg-success/5 text-success text-sm font-display font-medium animate-fadeInUp">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-error/30 bg-error/5 text-error text-sm font-display font-medium animate-fadeInUp">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-8 animate-fadeInUp">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
              Essay Grading
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {pendingCount} pending essay{pendingCount !== 1 ? 's' : ''} across {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gold rounded-lg blur-md opacity-20" />
            <div className="relative px-4 py-2 rounded-lg border border-gold/20 bg-gold/5">
              <span className="text-2xl font-display font-bold text-gold">{pendingCount}</span>
              <span className="text-xs text-text-tertiary ml-2 font-medium">Pending</span>
            </div>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="card-elevated p-12 text-center animate-fadeInUp">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-lg font-display font-bold text-text-primary mb-2">All Caught Up!</h3>
            <p className="text-text-tertiary text-sm">No pending essay submissions to grade.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map(sub => (
              <div key={sub.id} className="card-elevated overflow-hidden animate-fadeInUp">
                <div className="p-5 sm:p-6 border-b border-border-subtle bg-bg-tertiary/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-bold text-text-primary text-base">{sub.examTitle}</h3>
                      <p className="text-sm text-text-secondary mt-0.5">
                        Student: <span className="font-medium text-text-primary">{sub.studentName}</span>
                        <span className="mx-2 text-border-subtle">·</span>
                        Score: <span className="font-medium text-accent">{sub.score}/{sub.totalQuestions}</span>
                        <span className="mx-2 text-border-subtle">·</span>
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="badge badge-warning self-start sm:self-auto">
                      {sub.essayQuestions.length} pending essay{sub.essayQuestions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  {sub.essayQuestions.map(eq => {
                    const qIdx = eq.questionIndex;
                    const questionText = questionTexts[sub.examId]?.[qIdx] || `Question ${qIdx + 1}`;
                    const gradeKey = `${sub.id}-${qIdx}`;

                    return (
                      <div key={qIdx} className="p-4 sm:p-5 rounded-xl border border-border-subtle bg-bg-elevated/40">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-display font-bold text-accent">Q{qIdx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-display font-semibold text-text-primary mb-2">{questionText}</p>
                            <div className="p-3 rounded-lg bg-bg-tertiary/50 border border-border-subtle">
                              <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                                {eq.value || '(No answer provided)'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-10">
                          <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border-subtle bg-bg-tertiary/30">
                            <button
                              onClick={() => setGrading(prev => ({ ...prev, [gradeKey]: 0 }))}
                              className={`px-4 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${
                                grading[gradeKey] === 0
                                  ? 'bg-error/20 text-error border border-error/30'
                                  : 'text-text-tertiary hover:text-error hover:bg-error/5'
                              }`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              Incorrect
                            </button>
                            <button
                              onClick={() => setGrading(prev => ({ ...prev, [gradeKey]: 1 }))}
                              className={`px-4 py-1.5 rounded-md text-xs font-display font-semibold transition-all ${
                                grading[gradeKey] === 1
                                  ? 'bg-success/20 text-success border border-success/30'
                                  : 'text-text-tertiary hover:text-success hover:bg-success/5'
                              }`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Correct
                            </button>
                          </div>

                          <button
                            onClick={() => handleGrade(sub.id, qIdx)}
                            disabled={grading[gradeKey] === undefined}
                            className={`btn-primary text-xs px-5 ${
                              grading[gradeKey] === undefined ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                          >
                            Submit Grade
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
