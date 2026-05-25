import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examsAPI, examManagementAPI } from '../services/api';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'enumeration', label: 'Enumeration' },
  { value: 'identification', label: 'Identification' },
  { value: 'pairing', label: 'Pairing' },
  { value: 'true_false', label: 'True or False' },
  { value: 'essay', label: 'Essay' },
];

const CATEGORIES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'long_quiz', label: 'Long Quiz' },
  { value: 'midterm', label: 'Midterm' },
  { value: 'final', label: 'Final Exam' },
];

const emptyQuestion = (type = 'multiple_choice') => {
  const base = { question_type: type, question_text: '' };
  switch (type) {
    case 'multiple_choice':
      return { ...base, option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' };
    case 'identification':
      return { ...base, correct_answer: [''] };
    case 'enumeration':
      return { ...base, correct_answer: [''] };
    case 'pairing':
      return { ...base, options_json: { left: ['', ''], right: ['', ''] }, correct_answer: [] };
    case 'true_false':
      return { ...base, correct_option: 'true' };
    case 'essay':
      return { ...base };
    default:
      return { ...base, option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' };
  }
};

export default function CreateExam({ user, onLogout }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('quiz');
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState([emptyQuestion('multiple_choice')]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => {
    setQuestions([...questions, emptyQuestion('multiple_choice')]);
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

  const changeQuestionType = (index, type) => {
    const updated = [...questions];
    updated[index] = emptyQuestion(type);
    updated[index].question_text = questions[index].question_text || '';
    setQuestions(updated);
  };

  const addEnumItem = (index) => {
    const updated = [...questions];
    updated[index].correct_answer = [...(updated[index].correct_answer || []), ''];
    setQuestions(updated);
  };

  const removeEnumItem = (qIndex, aIndex) => {
    const updated = [...questions];
    updated[qIndex].correct_answer = updated[qIndex].correct_answer.filter((_, i) => i !== aIndex);
    if (updated[qIndex].correct_answer.length === 0) updated[qIndex].correct_answer = [''];
    setQuestions(updated);
  };

  const updateEnumItem = (qIndex, aIndex, value) => {
    const updated = [...questions];
    updated[qIndex].correct_answer[aIndex] = value;
    setQuestions(updated);
  };

  const addPairRow = (index) => {
    const updated = [...questions];
    updated[index].options_json.left.push('');
    updated[index].options_json.right.push('');
    setQuestions(updated);
  };

  const removePairRow = (qIndex, rowIdx) => {
    const updated = [...questions];
    updated[qIndex].options_json.left = updated[qIndex].options_json.left.filter((_, i) => i !== rowIdx);
    updated[qIndex].options_json.right = updated[qIndex].options_json.right.filter((_, i) => i !== rowIdx);
    if (updated[qIndex].options_json.left.length === 0) {
      updated[qIndex].options_json.left = [''];
      updated[qIndex].options_json.right = [''];
    }
    setQuestions(updated);
  };

  const updatePairField = (qIndex, rowIdx, side, value) => {
    const updated = [...questions];
    updated[qIndex].options_json[side][rowIdx] = value;
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
      if (!q.question_text.trim()) {
        setError(`Question ${i + 1} has empty question text`);
        return;
      }
      if (q.question_type === 'multiple_choice') {
        if (!q.option_a.trim() || !q.option_b.trim()) {
          setError(`Question ${i + 1} needs at least options A and B`);
          return;
        }
      }
      if ((q.question_type === 'enumeration' || q.question_type === 'identification') && 
          (!q.correct_answer || q.correct_answer.every(a => !a.trim()))) {
        setError(`Question ${i + 1} needs at least one correct answer`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const isTeacher = user?.userType === 'teacher';
      const createAPI = isTeacher ? examManagementAPI.create : examsAPI.create;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        duration_seconds: duration * 60,
        questions: questions.map(q => {
          const base = {
            question_text: q.question_text,
            question_type: q.question_type,
          };
          switch (q.question_type) {
            case 'multiple_choice':
              return { ...base, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c || '', option_d: q.option_d || '', correct_option: q.correct_option };
            case 'identification':
            case 'enumeration':
              return { ...base, correct_answer: q.correct_answer.filter(a => a.trim()) };
            case 'pairing':
              return { ...base, options_json: q.options_json, correct_answer: q.options_json.left.reduce((acc, l, i) => { acc[l] = q.options_json.right[i]; return acc; }, {}) };
            case 'true_false':
              return { ...base, correct_option: q.correct_option, correct_answer: q.correct_option };
            case 'essay':
              return { ...base };
            default:
              return { ...base, option_a: q.option_a || '', option_b: q.option_b || '', option_c: q.option_c || '', option_d: q.option_d || '', correct_option: q.correct_option || 'A' };
          }
        }),
      };

      await createAPI(payload);
      navigate(isTeacher ? '/teacher-dashboard' : '/exams');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create exam');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionForm = (q, idx) => {
    switch (q.question_type) {
      case 'multiple_choice':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {['A', 'B', 'C', 'D'].map((opt) => (
              <div key={opt} className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                q.correct_option === opt ? 'border-accent bg-accent/5' : 'border-border-subtle bg-transparent'
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
        );

      case 'identification':
        return (
          <div className="mb-4">
            <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Correct Answer(s)</label>
            {q.correct_answer.map((ans, ai) => (
              <div key={ai} className="flex gap-2 mb-2">
                <input type="text" value={ans} onChange={(e) => updateEnumItem(idx, ai, e.target.value)} className="input flex-1" placeholder={`Accepted answer ${ai + 1}`} />
                {q.correct_answer.length > 1 && (
                  <button type="button" onClick={() => removeEnumItem(idx, ai)} className="text-error/70 hover:text-error text-xs font-display font-semibold">Remove</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addEnumItem(idx)} className="text-accent text-xs font-display font-semibold hover:text-accent-hover transition-colors">+ Add alternative answer</button>
            <p className="text-text-tertiary text-[10px] mt-1">Add multiple acceptable variations of the answer</p>
          </div>
        );

      case 'enumeration':
        return (
          <div className="mb-4">
            <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Correct Items</label>
            {q.correct_answer.map((ans, ai) => (
              <div key={ai} className="flex gap-2 mb-2">
                <span className="text-text-tertiary text-sm w-6 flex items-center">{ai + 1}.</span>
                <input type="text" value={ans} onChange={(e) => updateEnumItem(idx, ai, e.target.value)} className="input flex-1" placeholder={`Item ${ai + 1}`} />
                {q.correct_answer.length > 1 && (
                  <button type="button" onClick={() => removeEnumItem(idx, ai)} className="text-error/70 hover:text-error text-xs font-display font-semibold">Remove</button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => addEnumItem(idx)} className="text-accent text-xs font-display font-semibold hover:text-accent-hover transition-colors">+ Add item to enumerate</button>
            <p className="text-text-tertiary text-[10px] mt-1">Students will list items that match the description</p>
          </div>
        );

      case 'pairing':
        return (
          <div className="mb-4">
            <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Pairs (Match Left to Right)</label>
            <div className="space-y-2">
              {q.options_json.left.map((_, ri) => (
                <div key={ri} className="flex gap-2 items-center">
                  <input type="text" value={q.options_json.left[ri]} onChange={(e) => updatePairField(idx, ri, 'left', e.target.value)} className="input flex-1" placeholder="Left item" />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  <input type="text" value={q.options_json.right[ri]} onChange={(e) => updatePairField(idx, ri, 'right', e.target.value)} className="input flex-1" placeholder="Right item" />
                  {q.options_json.left.length > 1 && (
                    <button type="button" onClick={() => removePairRow(idx, ri)} className="text-error/70 hover:text-error text-xs font-display font-semibold">Remove</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => addPairRow(idx)} className="text-accent text-xs font-display font-semibold hover:text-accent-hover transition-colors mt-2">+ Add pair</button>
            <p className="text-text-tertiary text-[10px] mt-1">Students match each left item to its corresponding right item</p>
          </div>
        );

      case 'true_false':
        return (
          <div className="mb-4">
            <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Correct Answer</label>
            <div className="flex gap-3">
              {['true', 'false'].map((val) => (
                <label key={val} className={`flex-1 p-3 rounded-lg border-2 transition-all cursor-pointer text-center ${
                  q.correct_option === val ? 'border-accent bg-accent/5' : 'border-border-subtle bg-transparent'
                }`} onClick={() => updateQuestion(idx, 'correct_option', val)}>
                  <span className={`text-sm font-display font-semibold ${q.correct_option === val ? 'text-accent' : 'text-text-tertiary'}`}>
                    {val === 'true' ? 'True' : 'False'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'essay':
        return (
          <div className="mb-4">
            <div className="p-4 rounded-lg bg-bg-tertiary/30 border border-border-subtle">
              <p className="text-text-tertiary text-sm">Essay questions require manual grading by the teacher. No correct answer is set here.</p>
            </div>
          </div>
        );

      default:
        return null;
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
            <span className="font-display font-bold text-base text-text-primary">Create Exam</span>
          </div>
          <button onClick={onLogout} className="btn-ghost">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        <div className="animate-fadeInUp mb-8">
          <h2 className="text-3xl font-display font-bold text-text-primary mb-2">New Examination</h2>
          <p className="text-text-secondary text-sm">Create a new exam with mixed question types</p>
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
                <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Type</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
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
                  <div className="flex items-center gap-2">
                    <span className="badge badge-accent">Q {idx + 1}</span>
                    <select value={q.question_type} onChange={(e) => changeQuestionType(idx, e.target.value)} className="input !py-1 !px-2 text-xs w-auto">
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
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

                {renderQuestionForm(q, idx)}
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