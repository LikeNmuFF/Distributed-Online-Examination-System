import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examsAPI, submissionsAPI } from '../services/api';
import { initSocket, joinExam, onTimerTick, closeSocket } from '../services/socket';
import Timer from '../components/Timer';

export default function ExamRoom({ user, onLogout }) {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [remainingMs, setRemainingMs] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [nodeStatus, setNodeStatus] = useState('connecting');

  useEffect(() => {
    const loadExam = async () => {
      try {
        setLoading(true);

        const examResponse = await examsAPI.get(parseInt(examId));
        setExam(examResponse.data.exam);
        setQuestions(examResponse.data.questions);

        const initialAnswers = {};
        examResponse.data.questions.forEach((q, idx) => {
          const type = q.question_type || 'multiple_choice';
          initialAnswers[idx] = (type === 'identification' || type === 'enumeration' || type === 'essay') ? '' : null;
        });
        setAnswers(initialAnswers);

        const sessionResponse = await examsAPI.start(parseInt(examId));
        const { sessionId: newSessionId, nodeId: newNodeId, durationSeconds } = sessionResponse.data;

        setSessionId(newSessionId);
        setNodeId(newNodeId);
        setRemainingMs(durationSeconds * 1000);

        const socket = initSocket();

        socket.on('connect', () => {
          setSocketConnected(true);
          setNodeStatus('active');
        });

        socket.on('disconnect', () => {
          setSocketConnected(false);
          setNodeStatus('reconnecting');
        });

        joinExam(newSessionId, user.id, parseInt(examId));

        onTimerTick(({ remainingMs }) => {
          setRemainingMs(remainingMs);
          if (remainingMs === 0) {
            setTimerExpired(true);
          }
        });
      } catch (err) {
        setError('Failed to load exam');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadExam();

    return () => {
      closeSocket();
    };
  }, [examId, user.id]);

  const handleAnswerChange = (answer) => {
    setAnswers({
      ...answers,
      [currentQuestion]: answer,
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (timerExpired) {
      setError('Time is up, cannot submit');
      return;
    }

    try {
      setSubmitting(true);
      const answersList = Object.values(answers);
      const response = await submissionsAPI.submit(
        parseInt(examId),
        answersList,
        sessionId
      );

      closeSocket();
      navigate(`/results/${response.data.jobId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit exam');
      setSubmitting(false);
    } finally {
      setShowSubmitConfirm(false);
    }
  };

  const answeredCount = Object.values(answers).filter((a) => a !== null && a !== undefined).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center animate-fadeIn">
          <div className="spinner !w-9 !h-9 mx-auto"></div>
          <p className="text-text-secondary mt-4 text-sm font-medium">Loading examination...</p>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="card-elevated text-center max-w-md p-8 animate-scaleIn">
          <div className="w-14 h-14 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-text-primary font-display font-bold mb-1">Failed to load examination</p>
          <p className="text-text-tertiary text-sm mb-6">Please try again or contact support</p>
          <button onClick={() => navigate('/exams')} className="btn-primary">
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Grid bg */}
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border-subtle sticky top-0 z-20 backdrop-filter backdrop-blur-xl bg-bg-secondary/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => navigate('/exams')} className="btn-ghost !p-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <div>
              <h1 className="font-display font-bold text-base sm:text-lg text-text-primary truncate max-w-[150px] sm:max-w-none">{exam.title}</h1>
            </div>
          </div>

          <div className="hidden sm:block">
            <Timer remainingMs={remainingMs} />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary/50 rounded-lg border border-border-subtle">
              <div className={`w-2 h-2 rounded-full ${
                nodeStatus === 'active' ? 'bg-success animate-pulse' :
                nodeStatus === 'reconnecting' ? 'bg-warning animate-pulse' :
                'bg-text-tertiary'
              }`} />
              <span className="text-[10px] font-display font-semibold text-text-tertiary tracking-wider uppercase">N{nodeId}</span>
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

        {/* Mobile timer */}
        <div className="sm:hidden border-t border-border-subtle px-4 py-2 flex items-center justify-between">
          <Timer remainingMs={remainingMs} />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-tertiary/50 rounded-md">
            <div className={`w-1.5 h-1.5 rounded-full ${
              nodeStatus === 'active' ? 'bg-success' :
              nodeStatus === 'reconnecting' ? 'bg-warning animate-pulse' :
              'bg-text-tertiary'
            }`} />
            <span className="text-[10px] font-display font-semibold text-text-tertiary">N{nodeId}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-bg-tertiary/50">
          <div
            className="h-full bg-gradient-to-r from-accent to-gold transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-10">
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

        {timerExpired && (
          <div className="alert alert-warning mb-6 animate-scaleIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Time is up! Submit your answers now.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="card-elevated sticky top-24">
              <div className="p-4 border-b border-border-subtle">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-display font-bold text-xs text-text-primary uppercase tracking-widest">Questions</h3>
                  <span className="text-xs font-display font-semibold text-text-tertiary">{answeredCount}/{questions.length}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <div className="p-3 grid grid-cols-5 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`q-nav-btn ${
                      idx === currentQuestion
                        ? 'active'
                        : answers[idx] !== null && answers[idx] !== undefined
                        ? 'answered'
                        : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-border-subtle">
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="btn-primary w-full text-xs"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Exam'}
                </button>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            <div className="card-elevated">
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="badge badge-accent">
                    Q {currentQuestion + 1} / {questions.length}
                  </span>
                  {answers[currentQuestion] !== null && (
                    <span className="badge badge-success">Answered</span>
                  )}
                </div>

                {/* Question type badge */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="badge badge-accent">
                    Q {currentQuestion + 1} / {questions.length}
                  </span>
                  <span className="badge badge-info text-[10px] uppercase tracking-wider">
                    {question.question_type === 'multiple_choice' ? 'Multiple Choice' :
                     question.question_type === 'enumeration' ? 'Enumeration' :
                     question.question_type === 'identification' ? 'Identification' :
                     question.question_type === 'pairing' ? 'Pairing' :
                     question.question_type === 'true_false' ? 'True or False' :
                     question.question_type === 'essay' ? 'Essay' : 'Multiple Choice'}
                  </span>
                  {answers[currentQuestion] !== null && answers[currentQuestion] !== undefined && answers[currentQuestion] !== '' && (
                    <span className="badge badge-success">Answered</span>
                  )}
                </div>

                {/* Question text */}
                <h2 className="text-xl sm:text-2xl font-display font-semibold text-text-primary mb-8 leading-snug">
                  {question.question_text}
                </h2>

                {/* Options - render based on question type */}
                {question.question_type === 'multiple_choice' && (
                  <div className="space-y-3 mb-8">
                    {['A', 'B', 'C', 'D'].map((option) => (
                      <label
                        key={option}
                        className={`option-card ${
                          answers[currentQuestion] === option ? 'selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion}`}
                          value={option}
                          checked={answers[currentQuestion] === option}
                          onChange={() => handleAnswerChange(option)}
                          className="hidden"
                        />
                        <span className="option-letter">{option}</span>
                        <span className="option-text">{question[`option_${option.toLowerCase()}`]}</span>
                        {answers[currentQuestion] === option && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto flex-shrink-0">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {question.question_type === 'true_false' && (
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {['true', 'false'].map((val) => (
                      <label
                        key={val}
                        className={`option-card text-center justify-center ${
                          answers[currentQuestion] === val ? 'selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion}`}
                          value={val}
                          checked={answers[currentQuestion] === val}
                          onChange={() => handleAnswerChange(val)}
                          className="hidden"
                        />
                        <span className={`font-display font-bold text-lg ${answers[currentQuestion] === val ? 'text-accent' : 'text-text-primary'}`}>
                          {val === 'true' ? 'True' : 'False'}
                        </span>
                        {answers[currentQuestion] === val && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2 flex-shrink-0">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </label>
                    ))}
                  </div>
                )}

                {question.question_type === 'identification' && (
                  <div className="mb-8">
                    <label className="input mb-2">
                      <input
                        type="text"
                        value={answers[currentQuestion] || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="w-full bg-transparent outline-none text-text-primary text-lg font-display placeholder:text-text-tertiary/50"
                        placeholder="Type your answer..."
                        autoComplete="off"
                      />
                    </label>
                    <p className="text-text-tertiary text-xs">Type the correct term or phrase</p>
                  </div>
                )}

                {question.question_type === 'enumeration' && (
                  <div className="mb-8">
                    <label className="block text-text-secondary text-xs font-display font-semibold tracking-wider mb-3 uppercase">List your answers (one per line)</label>
                    <textarea
                      value={answers[currentQuestion] || ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="input min-h-[150px] resize-y font-mono text-sm"
                      placeholder={`Item 1\nItem 2\nItem 3`}
                    />
                    <p className="text-text-tertiary text-xs mt-2">Enter each item on a separate line</p>
                  </div>
                )}

                {question.question_type === 'pairing' && question.options_json && (
                  <div className="mb-8">
                    <label className="block text-text-secondary text-xs font-display font-semibold tracking-wider mb-3 uppercase">Match the items</label>
                    <div className="space-y-3">
                      {question.options_json.left.map((leftItem, pi) => (
                        <div key={pi} className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-bg-tertiary/20">
                          <span className="text-sm text-text-primary font-display font-medium min-w-[120px]">{leftItem}</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          <select
                            value={(answers[currentQuestion] && answers[currentQuestion][pi]) || ''}
                            onChange={(e) => {
                              const current = answers[currentQuestion] || {};
                              handleAnswerChange({ ...current, [pi]: e.target.value });
                            }}
                            className="input !py-2 flex-1"
                          >
                            <option value="">— Select match —</option>
                            {question.options_json.right.map((rightItem, ri) => (
                              <option key={ri} value={rightItem}>{rightItem}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {question.question_type === 'essay' && (
                  <div className="mb-8">
                    <label className="block text-text-secondary text-xs font-display font-semibold tracking-wider mb-3 uppercase">Your Answer</label>
                    <textarea
                      value={answers[currentQuestion] || ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="input min-h-[200px] resize-y text-sm leading-relaxed"
                      placeholder="Write your essay response here..."
                    />
                    <p className="text-text-tertiary text-xs mt-2">This will be graded manually</p>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-6 border-t border-border-subtle">
                  <button
                    onClick={handlePrev}
                    disabled={currentQuestion === 0}
                    className="btn-secondary flex-1 sm:flex-none text-xs"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"/>
                      <polyline points="12 19 5 12 12 5"/>
                    </svg>
                    Previous
                  </button>

                  {currentQuestion === questions.length - 1 ? (
                    <button
                      onClick={() => setShowSubmitConfirm(true)}
                      disabled={submitting || timerExpired}
                      className="btn-primary flex-1 sm:flex-none text-xs"
                    >
                      Submit
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="btn-primary flex-1 sm:flex-none text-xs"
                    >
                      Next
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="card-elevated max-w-md w-full p-6 animate-scaleIn">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 className="text-xl font-display font-bold text-center text-text-primary mb-2">Submit Examination?</h3>
            <p className="text-center text-text-secondary text-sm mb-6">
              You have answered <strong className="text-text-primary">{answeredCount}</strong> of <strong className="text-text-primary">{questions.length}</strong> questions.
              {answeredCount < questions.length && (
                <span className="block mt-1 text-warning">
                  {questions.length - answeredCount} unanswered questions will be marked incorrect.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex-1 text-xs"
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
