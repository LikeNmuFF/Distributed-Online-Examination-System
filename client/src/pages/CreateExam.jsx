import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI, examManagementAPI } from '../services/api';

const emptyQuestion = () => ({
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'A',
});

export default function CreateExam({ user, onLogout }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => {
    setQuestions([...questions, emptyQuestion()]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Exam title is required');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim() || !q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim()) {
        setError(`Question ${i + 1} has empty fields`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const isTeacher = user?.userType === 'teacher';
      const createAPI = isTeacher ? examManagementAPI.create : examsAPI.create;
      await createAPI({
        title: title.trim(),
        description: description.trim(),
        duration_seconds: duration * 60,
        questions: questions.map(q => ({
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
        })),
      });
      navigate(isTeacher ? '/teacher-dashboard' : '/exams');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      <header className="border-b border-border-subtle sticky top-0 z-20 backdrop-filter backdrop-blur-xl bg-bg-secondary/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/exams')} className="btn-ghost !p-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <div className="relative">
              <div className="absolute inset-0 bg-accent rounded-lg blur-md opacity-40" />
              <div className="relative w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
            </div>
            <span className="font-display font-bold text-base text-text-primary">Create Exam</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-text-secondary font-medium">{user?.username}</span>
            <button onClick={onLogout} className="btn-ghost">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        <div className="animate-fadeInUp mb-8">
          <h2 className="text-3xl font-display font-bold text-text-primary mb-2">New Examination</h2>
          <p className="text-text-secondary text-sm">Create a new exam with questions and answers</p>
        </div>

        {error && (
          <div className="alert alert-error mb-6 animate-scaleIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="card-elevated p-6 sm:p-8 mb-6 animate-fadeInUp">
            <h3 className="font-display font-bold text-sm text-text-primary uppercase tracking-widest mb-6">Exam Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="e.g. Introduction to Machine Learning" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input min-h-[80px] resize-y" placeholder="Describe what this exam covers..." />
              </div>
              <div>
                <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Duration (minutes)</label>
                <input type="number" value={duration} onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))} className="input" min="1" />
              </div>
            </div>
          </div>

          <div className="space-y-4 animate-fadeInUp stagger-1">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-text-primary uppercase tracking-widest">
                Questions ({questions.length})
              </h3>
              <button type="button" onClick={addQuestion} className="btn-secondary text-xs !py-2 !px-4">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add Question
              </button>
            </div>

            {questions.map((q, idx) => (
              <div key={idx} className="card-elevated p-5 sm:p-6 animate-scaleIn" style={{ animationDelay: `${idx * 0.03}s` }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="badge badge-accent">Q {idx + 1}</span>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(idx)} className="text-error/70 hover:text-error text-xs font-display font-semibold transition-colors">
                      Remove
                    </button>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Question Text</label>
                  <textarea value={q.question_text} onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)} className="input min-h-[60px] resize-y" placeholder="Enter the question..." />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {['A', 'B', 'C', 'D'].map((opt) => (
                    <div key={opt} className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      q.correct_option === opt
                        ? 'border-accent bg-accent/5'
                        : 'border-border-subtle bg-transparent'
                    }`} onClick={() => updateQuestion(idx, 'correct_option', opt)}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          q.correct_option === opt ? 'border-accent bg-accent' : 'border-text-tertiary'
                        }`}>
                          {q.correct_option === opt && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs font-display font-bold uppercase tracking-wider ${q.correct_option === opt ? 'text-accent' : 'text-text-tertiary'}`}>
                          Option {opt} {q.correct_option === opt ? '(correct)' : ''}
                        </span>
                      </div>
                      <input type="text" value={q[`option_${opt.toLowerCase()}`]} onChange={(e) => updateQuestion(idx, `option_${opt.toLowerCase()}`, e.target.value)} className="input !py-2 !px-3 text-sm" placeholder={`Enter option ${opt}`} onClick={(e) => e.stopPropagation()} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-8 animate-fadeInUp">
            <button type="button" onClick={() => navigate('/exams')} className="btn-secondary flex-1 sm:flex-none text-xs">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 sm:flex-none text-xs">
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Create Exam
                </span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
