import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import ExamList from './pages/ExamList';
import ExamRoom from './pages/ExamRoom';
import Results from './pages/Results';
import CreateExam from './pages/CreateExam';
import TeacherDashboard from './pages/TeacherDashboard';
import ClassroomManagement from './pages/ClassroomManagement';
import StudentJoinClassroom from './pages/StudentJoinClassroom';
import StudentClassroomView from './pages/StudentClassroomView';
import TeacherEssayGrading from './pages/TeacherEssayGrading';
import PublicScoreboard from './pages/PublicScoreboard';
import './index.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center animate-fadeIn">
          <div className="spinner mx-auto"></div>
          <p className="text-text-secondary mt-4 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              user?.userType === 'teacher' ? (
                <Navigate to="/teacher-dashboard" replace />
              ) : (
                <Navigate to="/exams" replace />
              )
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/scoreboard"
          element={<PublicScoreboard />}
        />
        
        {/* Teacher Routes */}
        <Route
          path="/teacher-dashboard"
          element={
            isAuthenticated && user?.userType === 'teacher' ? (
              <TeacherDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/classroom/:classroomId"
          element={
            isAuthenticated && user?.userType === 'teacher' ? (
              <ClassroomManagement user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/essay-grading"
          element={
            isAuthenticated && user?.userType === 'teacher' ? (
              <TeacherEssayGrading user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        
        {/* Student Routes */}
        <Route
          path="/exams"
          element={
            isAuthenticated ? (
              <ExamList user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/classroom-room/:classroomId"
          element={
            isAuthenticated && user?.userType === 'student' ? (
              <StudentClassroomView user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/join-classroom"
          element={
            isAuthenticated && user?.userType === 'student' ? (
              <StudentJoinClassroom />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/exams/create"
          element={
            isAuthenticated && (user?.isAdmin || user?.userType === 'teacher') ? (
              <CreateExam user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/exams" replace />
            )
          }
        />
        <Route
          path="/exam/:examId"
          element={
            isAuthenticated ? (
              <ExamRoom user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/results/:jobId"
          element={
            isAuthenticated ? (
              <Results user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Router>
    </ThemeProvider>
  );
}
