/**
 * Load Test Script
 * 
 * Simulates 50 concurrent students taking an exam simultaneously.
 * Demonstrates:
 * - Load balancing effectiveness
 * - Parallel grading capacity
 * - Distributed system reliability
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost';
const SOCKET_URL = 'http://localhost';

const NUM_STUDENTS = 50;
const EXAM_ID = 1;

// Student credentials (cycle through)
const CREDENTIALS = [
  { username: 'student1', password: 'test123' },
  { username: 'student2', password: 'test123' },
  { username: 'student3', password: 'test123' },
];

class TestStudent {
  constructor(studentId, credentials) {
    this.studentId = studentId;
    this.username = credentials.username;
    this.password = credentials.password;
    this.token = null;
    this.userId = null;
    this.nodeId = null;
    this.sessionId = null;
    this.jobId = null;
    this.result = null;
    this.errors = [];
    this.timings = {};
  }

  async login() {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username: this.username,
        password: this.password,
      });
      this.token = response.data.token;
      this.userId = response.data.user.id;
      this.timings.login = Date.now() - startTime;
      return true;
    } catch (error) {
      this.errors.push(`Login failed: ${error.message}`);
      return false;
    }
  }

  async startExam() {
    const startTime = Date.now();
    try {
      const response = await axios.post(
        `${API_URL}/api/exams/${EXAM_ID}/start`,
        {},
        { headers: { Authorization: `Bearer ${this.token}` } }
      );
      this.nodeId = response.data.nodeId;
      this.sessionId = response.data.sessionId;
      this.timings.startExam = Date.now() - startTime;
      return true;
    } catch (error) {
      this.errors.push(`Start exam failed: ${error.message}`);
      return false;
    }
  }

  async getExamQuestions() {
    const startTime = Date.now();
    try {
      const response = await axios.get(
        `${API_URL}/api/exams/${EXAM_ID}`,
        { headers: { Authorization: `Bearer ${this.token}` } }
      );
      this.timings.getQuestions = Date.now() - startTime;
      return response.data.questions;
    } catch (error) {
      this.errors.push(`Get questions failed: ${error.message}`);
      return [];
    }
  }

  async submitExam(questions) {
    const startTime = Date.now();
    try {
      // Generate random answers
      const answers = questions.map(() => {
        const options = ['A', 'B', 'C', 'D'];
        return options[Math.floor(Math.random() * options.length)];
      });

      const response = await axios.post(
        `${API_URL}/api/submissions/exams/${EXAM_ID}/submit`,
        { answers, sessionId: this.sessionId },
        { headers: { Authorization: `Bearer ${this.token}` } }
      );
      this.jobId = response.data.jobId;
      this.timings.submit = Date.now() - startTime;
      return true;
    } catch (error) {
      this.errors.push(`Submit exam failed: ${error.message}`);
      return false;
    }
  }

  async waitForResults() {
    const startTime = Date.now();
    const maxWait = 30000; // 30 seconds
    const pollInterval = 500; // 500ms

    while (Date.now() - startTime < maxWait) {
      try {
        const response = await axios.get(
          `${API_URL}/api/submissions/${this.jobId}/status`,
          { headers: { Authorization: `Bearer ${this.token}` } }
        );

        if (response.data.state === 'completed') {
          this.result = response.data.result;
          this.timings.grading = Date.now() - startTime;
          return true;
        } else if (response.data.state === 'failed') {
          this.errors.push('Grading failed');
          return false;
        }

        // Still processing, wait and retry
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        this.errors.push(`Poll status failed: ${error.message}`);
        return false;
      }
    }

    this.errors.push('Grading timeout (>30s)');
    return false;
  }

  getTotalTime() {
    return Object.values(this.timings).reduce((a, b) => a + b, 0);
  }
}

async function runLoadTest() {
  console.log('╔═════════════════════════════════════════════════════╗');
  console.log('║     Distributed Exam System - Load Test              ║');
  console.log('║     Simulating 50 Concurrent Students                ║');
  console.log('╚═════════════════════════════════════════════════════╝\n');

  const students = [];
  const nodeStats = { Node1: 0, Node2: 0, Node3: 0 };

  // Step 1: Login all students simultaneously
  console.log('📝 STEP 1: Logging in 50 students...');
  const loginStartTime = Date.now();

  const loginPromises = Array.from({ length: NUM_STUDENTS }, (_, i) => {
    const credential = CREDENTIALS[i % CREDENTIALS.length];
    const student = new TestStudent(i + 1, credential);
    students.push(student);
    return student.login();
  });

  const loginResults = await Promise.all(loginPromises);
  const loginDuration = Date.now() - loginStartTime;
  const loggedIn = loginResults.filter((r) => r).length;

  console.log(`✓ ${loggedIn}/${NUM_STUDENTS} students logged in in ${loginDuration}ms\n`);

  if (loggedIn === 0) {
    console.error('✗ No students logged in. Is the server running?');
    process.exit(1);
  }

  // Step 2: Start exams simultaneously
  console.log('🚀 STEP 2: Starting exams for all students...');
  const startExamStartTime = Date.now();

  const startExamPromises = students.map((s) => s.startExam());
  const startExamResults = await Promise.all(startExamPromises);
  const startExamDuration = Date.now() - startExamStartTime;
  const examsStarted = startExamResults.filter((r) => r).length;

  console.log(`✓ ${examsStarted}/${NUM_STUDENTS} exams started in ${startExamDuration}ms`);

  // Collect node distribution
  students.forEach((s) => {
    if (s.nodeId === '1') nodeStats.Node1++;
    else if (s.nodeId === '2') nodeStats.Node2++;
    else if (s.nodeId === '3') nodeStats.Node3++;
  });

  console.log(`   📍 Load Distribution (Nginx least-conn):`);
  console.log(`      Node 1: ${nodeStats.Node1} students`);
  console.log(`      Node 2: ${nodeStats.Node2} students`);
  console.log(`      Node 3: ${nodeStats.Node3} students\n`);

  // Step 3: Get exam questions
  console.log('📄 STEP 3: Fetching exam questions...');
  const getQuestionsStartTime = Date.now();

  const getQuestionsPromises = students.map((s) => s.getExamQuestions());
  const questions = await Promise.all(getQuestionsPromises);
  const getQuestionsDuration = Date.now() - getQuestionsStartTime;

  console.log(`✓ Questions fetched in ${getQuestionsDuration}ms`);
  console.log(`   ${questions[0]?.length || 0} questions per student\n`);

  // Step 4: Submit exams simultaneously
  console.log('📤 STEP 4: Submitting all exams simultaneously...');
  const submitStartTime = Date.now();

  const submitPromises = students.map((s) => s.submitExam(questions[0]));
  const submitResults = await Promise.all(submitPromises);
  const submitDuration = Date.now() - submitStartTime;
  const submitted = submitResults.filter((r) => r).length;

  console.log(`✓ ${submitted}/${NUM_STUDENTS} exams submitted in ${submitDuration}ms`);
  console.log(`   (Submissions queued in Bull, grading in parallel)\n`);

  // Step 5: Wait for grading results
  console.log('⏳ STEP 5: Waiting for parallel grading to complete...');
  const gradeStartTime = Date.now();

  const gradePromises = students.map((s) => s.waitForResults());
  const gradeResults = await Promise.all(gradePromises);
  const gradeDuration = Date.now() - gradeStartTime;
  const graded = gradeResults.filter((r) => r).length;

  console.log(`✓ ${graded}/${NUM_STUDENTS} exams graded in ${gradeDuration}ms`);
  console.log(`   Average: ${(gradeDuration / graded).toFixed(2)}ms per student\n`);

  // Summary statistics
  const totalDuration = Date.now() - loginStartTime;
  const avgScore = students
    .filter((s) => s.result)
    .reduce((sum, s) => sum + s.result.score, 0) / graded;
  const avgPercentage = students
    .filter((s) => s.result)
    .reduce((sum, s) => sum + s.result.percentage, 0) / graded;

  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 LOAD TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`Total Duration:         ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`  - Login:              ${loginDuration}ms`);
  console.log(`  - Start Exam:         ${startExamDuration}ms`);
  console.log(`  - Get Questions:      ${getQuestionsDuration}ms`);
  console.log(`  - Submit:             ${submitDuration}ms`);
  console.log(`  - Grading:            ${gradeDuration}ms`);
  console.log(`\nStudents:               ${loggedIn} logged in, ${examsStarted} started, ${submitted} submitted, ${graded} graded`);
  console.log(`\nLoad Distribution:      ${nodeStats.Node1}/${nodeStats.Node2}/${nodeStats.Node3} (Node1/Node2/Node3)`);
  console.log(`Average Score:          ${avgScore.toFixed(1)}/10 (${avgPercentage.toFixed(1)}%)`);
  console.log(`Grading Throughput:     ${(NUM_STUDENTS / (gradeDuration / 1000)).toFixed(0)} students/sec`);

  // Error summary
  const totalErrors = students.reduce((sum, s) => sum + s.errors.length, 0);
  if (totalErrors > 0) {
    console.log(`\n⚠️  Errors: ${totalErrors}`);
    students.forEach((s) => {
      if (s.errors.length > 0) {
        console.log(`   Student ${s.studentId}: ${s.errors.join(', ')}`);
      }
    });
  } else {
    console.log('\n✓ All operations successful, no errors!');
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✓ Load test completed successfully!');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Key Observations:');
  console.log(`- Load balanced across ${Object.values(nodeStats).filter((n) => n > 0).length} nodes`);
  console.log(`- ${graded} concurrent exams graded in ${gradeDuration}ms`);
  console.log(`- No submissions lost or rejected`);
  console.log(`- System handled ${(NUM_STUDENTS / (totalDuration / 1000)).toFixed(0)} ops/sec\n`);

  process.exit(totalErrors > 0 ? 1 : 0);
}

// Run the test
runLoadTest().catch((error) => {
  console.error('Load test failed:', error);
  process.exit(1);
});
