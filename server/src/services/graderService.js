import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GRADE_WORKER_PATH = path.join(__dirname, 'gradeWorker.js');

function normalizeAnswer(answer) {
  if (typeof answer === 'string') return answer.trim();
  if (typeof answer === 'number') return String(answer).trim();
  if (typeof answer === 'boolean') return String(answer);
  return answer;
}

function gradeMC(answer, correct) {
  return normalizeAnswer(answer) === normalizeAnswer(correct);
}

function gradeIdentification(answer, correctArray) {
  const normalized = normalizeAnswer(answer).toLowerCase();
  return (correctArray || []).some(c => normalizeAnswer(c).toLowerCase() === normalized);
}

function gradeEnumeration(answer, correctArray) {
  if (!answer || !correctArray) return 0;
  const studentItems = (typeof answer === 'string' ? answer.split('\n') : answer)
    .map(a => a.trim().toLowerCase())
    .filter(a => a.length > 0);
  const correctItems = correctArray.map(c => normalizeAnswer(c).toLowerCase());
  let correctCount = 0;
  for (const item of studentItems) {
    if (correctItems.includes(item)) correctCount++;
  }
  const total = Math.max(studentItems.length, correctItems.length);
  return correctCount / total >= 0.5 ? 1 : 0;
}

function gradePairing(answer, correctMap) {
  if (!answer || !correctMap) return 0;
  try {
    const studentMap = typeof answer === 'string' ? JSON.parse(answer) : answer;
    const correct = typeof correctMap === 'string' ? JSON.parse(correctMap) : correctMap;
    return Object.keys(correct).every(k => String(studentMap[k]) === String(correct[k])) ? 1 : 0;
  } catch {
    return 0;
  }
}

function gradeTrueFalse(answer, correct) {
  const a = normalizeAnswer(answer).toLowerCase();
  const c = normalizeAnswer(correct).toLowerCase();
  return a === c || (a === 't' && c === 'true') || (a === 'f' && c === 'false') ? 1 : 0;
}

function gradeEssay() {
  return 'pending';
}

function gradeSingle(questionType, answer, correctOption, correctAnswer) {
  switch (questionType) {
    case 'multiple_choice':
      return { isCorrect: gradeMC(answer, correctOption) ? 1 : 0, type: 'multiple_choice', value: answer, expected: correctOption };
    case 'identification':
      return { isCorrect: gradeIdentification(answer, correctAnswer) ? 1 : 0, type: 'identification', value: answer, expected: correctAnswer };
    case 'enumeration':
      return { isCorrect: gradeEnumeration(answer, correctAnswer), type: 'enumeration', value: answer, expected: correctAnswer };
    case 'pairing':
      return { isCorrect: gradePairing(answer, correctAnswer), type: 'pairing', value: answer, expected: correctAnswer };
    case 'true_false':
      return { isCorrect: gradeTrueFalse(answer, correctOption || correctAnswer), type: 'true_false', value: answer, expected: correctOption || correctAnswer };
    case 'essay':
      return { isCorrect: gradeEssay(), type: 'essay', value: answer, expected: null };
    default:
      return { isCorrect: gradeMC(answer, correctOption) ? 1 : 0, type: 'multiple_choice', value: answer, expected: correctOption };
  }
}

export async function gradeParallel(answers, questionsMeta) {
  const startTime = Date.now();

  try {
    if (answers.length !== questionsMeta.length) {
      throw new Error('Answer count mismatch');
    }

    const workerPromises = answers.map((item, index) => {
      const q = questionsMeta[index];
      const questionType = q.question_type || 'multiple_choice';
      const correctOption = q.correct_option;
      const correctAnswer = q.correct_answer;
      const answerValue = item && typeof item === 'object' && 'answer' in item ? item.answer : item;

      // For types that don't need heavy computation, grade inline
      if (questionType !== 'multiple_choice') {
        return Promise.resolve({
          questionIndex: index,
          ...gradeSingle(questionType, answerValue, correctOption, correctAnswer),
          questionType,
        });
      }

      // Use worker for MC questions (existing parallel pattern)
      return new Promise((resolve, reject) => {
        const worker = new Worker(GRADE_WORKER_PATH, {
          workerData: { answer: answerValue, correct: correctOption },
        });

        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error(`Worker timeout for question ${index + 1}`));
        }, 5000);

        worker.on('message', (result) => {
          clearTimeout(timeout);
          worker.terminate();
          resolve({
            questionIndex: index,
            isCorrect: result.isCorrect,
            studentAnswer: result.answer,
            correctAnswer: result.correct,
            questionType: 'multiple_choice',
          });
        });

        worker.on('error', (error) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(error);
        });
      });
    });

    const breakdown = await Promise.all(workerPromises);

    const score = breakdown.reduce((sum, item) => {
      if (item.isCorrect === 'pending') return sum;
      return sum + (item.isCorrect || 0);
    }, 0);
    const essayCount = breakdown.filter(b => b.isCorrect === 'pending').length;
    const total = breakdown.length;

    const duration = Date.now() - startTime;

    console.log(
      `✓ Graded ${total} questions (${duration}ms, score: ${score}/${total}, essays: ${essayCount})`
    );

    return {
      score,
      total,
      percentage: Math.round((score / total) * 100),
      breakdown,
      gradingDuration: duration,
    };
  } catch (error) {
    console.error('Grading error:', error);
    throw error;
  }
}

export async function gradeSequential(answers, questionsMeta) {
  const startTime = Date.now();

  const breakdown = answers.map((item, index) => {
    const q = questionsMeta[index];
    const answerValue = item && typeof item === 'object' && 'answer' in item ? item.answer : item;
    return {
      questionIndex: index,
      ...gradeSingle(q.question_type || 'multiple_choice', answerValue, q.correct_option, q.correct_answer),
    };
  });

  const score = breakdown.reduce((sum, item) => {
    if (item.isCorrect === 'pending') return sum;
    return sum + (item.isCorrect || 0);
  }, 0);
  const total = breakdown.length;
  const duration = Date.now() - startTime;

  console.log(
    `✓ Graded ${total} questions sequentially (${duration}ms, score: ${score}/${total})`
  );

  return {
    score,
    total,
    percentage: Math.round((score / total) * 100),
    breakdown,
    gradingDuration: duration,
  };
}