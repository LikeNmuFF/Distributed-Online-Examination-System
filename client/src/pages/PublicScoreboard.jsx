import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { scoreboardAPI } from '../services/api';

export default function PublicScoreboard() {
  const [scores, setScores] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchScores();
  }, [selectedClassroom, selectedExam]);

  const fetchFilters = async () => {
    try {
      const [classRes, examRes] = await Promise.all([
        scoreboardAPI.getClassrooms(),
        scoreboardAPI.getExams(),
      ]);
      setClassrooms(classRes.data.classrooms);
      setExams(examRes.data.exams);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const fetchScores = async () => {
    try {
      setLoading(true);
      const response = await scoreboardAPI.getAll(
        selectedClassroom || undefined,
        selectedExam || undefined
      );
      setScores(response.data.scores);
    } catch (err) {
      console.error('Failed to load scoreboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    if (percentage >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBadge = (percentage) => {
    if (percentage >= 80) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (percentage >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (percentage >= 40) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const groupByClassroom = (scores) => {
    const groups = {};
    scores.forEach(s => {
      const key = s.classroom_name;
      if (!groups[key]) groups[key] = { name: key, teacher: s.teacher_name, exams: {} };
      if (!groups[key].exams[s.exam_title]) groups[key].exams[s.exam_title] = [];
      groups[key].exams[s.exam_title].push(s);
    });
    return groups;
  };

  const grouped = groupByClassroom(scores);

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="fixed orb w-[600px] h-[600px] bg-accent/5 -top-40 -right-40 animate-drift" />
      <div className="fixed orb w-[500px] h-[500px] bg-teal/4 -bottom-32 -left-32 animate-drift" style={{ animationDelay: '-10s' }} />

      {/* Header */}
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
              <h1 className="font-display font-bold text-lg text-text-primary">Aegis Scoreboard</h1>
              <div className="text-[9px] text-accent font-display font-semibold tracking-[0.15em] uppercase">Public Results</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-ghost text-xs font-display font-semibold tracking-wider uppercase"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        {/* Title */}
        <div className="mb-10 animate-fadeInUp">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-text-primary mb-2">
            Examination Results
          </h2>
          <p className="text-text-secondary">
            View scores across all classrooms and examinations
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8 animate-fadeInUp stagger-1">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Classroom</label>
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="input w-full"
            >
              <option value="">All Classrooms</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.submission_count} submissions)
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-display font-semibold text-text-secondary mb-2 tracking-wider uppercase">Exam</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="input w-full"
            >
              <option value="">All Exams</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} (avg: {e.avg_percentage || 'N/A'}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scoreboard */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : scores.length === 0 ? (
          <div className="p-12 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl text-center animate-scaleIn">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-text-tertiary opacity-50">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p className="text-text-primary font-display font-bold mb-1">No results available</p>
            <p className="text-text-tertiary text-sm">Scores will appear here once students complete exams</p>
          </div>
        ) : (
          <div className="space-y-8 animate-fadeInUp stagger-2">
            {Object.entries(grouped).map(([className, group]) => {
              const totalStudents = new Set(group.exams[Object.keys(group.exams)[0]]?.map(s => s.student_id)).size;
              return (
                <div key={className} className="rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl overflow-hidden">
                  {/* Classroom Header */}
                  <div className="p-5 border-b border-border-subtle bg-bg-tertiary/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-display font-bold text-text-primary">{className}</h3>
                        <p className="text-sm text-text-secondary">Teacher: {group.teacher}</p>
                      </div>
                      <div className="text-right text-sm">
                        <span className="text-text-secondary">{totalStudents} students</span>
                        <span className="mx-2 text-text-tertiary">|</span>
                        <span className="text-text-secondary">{Object.keys(group.exams).length} exams</span>
                      </div>
                    </div>
                  </div>

                  {/* Exams in Classroom */}
                  {Object.entries(group.exams).map(([examTitle, examScores]) => {
                    const avg = examScores.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / examScores.length;
                    const passCount = examScores.filter(s => parseFloat(s.percentage) >= 50).length;
                    return (
                      <div key={examTitle} className="border-b border-border-subtle last:border-b-0">
                        <div className="p-4 bg-bg-tertiary/10">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-display font-semibold text-text-primary text-sm">{examTitle}</h4>
                            <div className="flex items-center gap-4 text-xs text-text-secondary">
                              <span>Avg: <span className={getScoreColor(avg)}>{avg.toFixed(1)}%</span></span>
                              <span>Pass rate: <span className="text-green-400">{((passCount / examScores.length) * 100).toFixed(0)}%</span></span>
                              <span>{examScores.length} submissions</span>
                            </div>
                          </div>

                          {/* Results Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-text-tertiary uppercase tracking-wider border-b border-border-subtle">
                                  <th className="text-left py-2 pr-4 font-semibold">Rank</th>
                                  <th className="text-left py-2 pr-4 font-semibold">Student</th>
                                  <th className="text-center py-2 pr-4 font-semibold">Score</th>
                                  <th className="text-center py-2 pr-4 font-semibold">Percentage</th>
                                  <th className="text-right py-2 font-semibold">Submitted</th>
                                </tr>
                              </thead>
                              <tbody>
                                {examScores
                                  .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))
                                  .map((score, idx) => (
                                    <tr key={score.student_id} className="border-b border-border-subtle/50 hover:bg-bg-tertiary/20 transition-colors">
                                      <td className="py-2.5 pr-4">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                          idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                          idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                                          idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                                          'text-text-tertiary'
                                        }`}>
                                          {idx + 1}
                                        </span>
                                      </td>
                                      <td className="py-2.5 pr-4">
                                        <span className="font-display font-semibold text-text-primary">{score.student_name}</span>
                                      </td>
                                      <td className="py-2.5 pr-4 text-center">
                                        <span className="font-display font-semibold text-text-primary">{score.score}/{score.total_questions}</span>
                                      </td>
                                      <td className="py-2.5 pr-4 text-center">
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${getScoreBadge(parseFloat(score.percentage))}`}>
                                          {score.percentage}%
                                        </span>
                                      </td>
                                      <td className="py-2.5 text-right text-text-tertiary text-xs">
                                        {new Date(score.submitted_at).toLocaleDateString()}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Stats */}
        {scores.length > 0 && (
          <div className="mt-8 p-5 rounded-xl border border-border-subtle bg-glass-bg backdrop-filter backdrop-blur-xl animate-fadeInUp">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-2xl font-display font-bold gradient-text">{scores.length}</p>
                <p className="text-xs text-text-tertiary font-display font-semibold tracking-wider uppercase mt-1">Submissions</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold gradient-text">
                  {new Set(scores.map(s => s.student_name)).size}
                </p>
                <p className="text-xs text-text-tertiary font-display font-semibold tracking-wider uppercase mt-1">Students</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold gradient-text">
                  {Object.keys(grouped).length}
                </p>
                <p className="text-xs text-text-tertiary font-display font-semibold tracking-wider uppercase mt-1">Classrooms</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold gradient-text">
                  {new Set(scores.map(s => s.exam_title)).size}
                </p>
                <p className="text-xs text-text-tertiary font-display font-semibold tracking-wider uppercase mt-1">Exams</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
