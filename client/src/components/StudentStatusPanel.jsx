import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { studentStatusAPI } from '../services/api';

const StudentStatusPanel = ({ classroomId }) => {
  const [onlineStudents, setOnlineStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Status color and icon mapping
  const getStatusDisplay = (status, examTitle) => {
    switch (status) {
      case 'online':
        return { icon: '🟢', label: 'Online', color: 'text-green-600' };
      case 'taking_exam':
        return { 
          icon: '📝', 
          label: `Taking exam: ${examTitle || 'Unknown'}`, 
          color: 'text-blue-600' 
        };
      case 'offline':
        return { icon: '🔴', label: 'Offline', color: 'text-gray-500' };
      default:
        return { icon: '❓', label: 'Unknown', color: 'text-gray-500' };
    }
  };

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('Status panel connected');
      socketRef.current.emit('join-classroom-status', { classroomId });
    });

    socketRef.current.on('student-status-update', (data) => {
      console.log('Student status update:', data);
      
      // Update student in list
      setOnlineStudents(prev => {
        const filtered = prev.filter(s => s.student_id !== data.studentId);
        
        // If student went offline, don't add back
        if (data.status === 'offline') {
          return filtered;
        }

        // Otherwise add/update student
        return [
          ...filtered,
          {
            student_id: data.studentId,
            username: data.username,
            status: data.status,
            exam_title: data.examTitle,
            last_activity: new Date().toISOString(),
            session_id: data.sessionId
          }
        ];
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-classroom-status', { classroomId });
        socketRef.current.disconnect();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [classroomId]);

  // Fetch initial online students
  useEffect(() => {
    const fetchOnlineStudents = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await studentStatusAPI.getOnlineStudents(classroomId);
        setOnlineStudents(response.data.onlineStudents);
      } catch (err) {
        console.error('Error fetching online students:', err);
        setError('Failed to load student status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnlineStudents();

    // Poll for updates every 10 seconds
    pollIntervalRef.current = setInterval(fetchOnlineStudents, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [classroomId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading student status...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          👥 Student Status
          <span className="text-sm font-normal text-gray-500">
            ({onlineStudents.length} online)
          </span>
        </h2>
      </div>

      {/* Student List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {error && (
          <div className="bg-red-100 text-red-700 p-3 text-sm">
            {error}
          </div>
        )}

        {onlineStudents.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            No students online
          </div>
        ) : (
          onlineStudents.map(student => {
            const display = getStatusDisplay(student.status, student.exam_title);
            const lastActivityTime = new Date(student.last_activity);
            const timeDiff = Math.floor((Date.now() - lastActivityTime) / 1000);
            const timeLabel = timeDiff < 60 
              ? 'just now' 
              : timeDiff < 3600 
              ? `${Math.floor(timeDiff / 60)}m ago`
              : `${Math.floor(timeDiff / 3600)}h ago`;

            return (
              <div 
                key={student.student_id} 
                className="p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div className="text-2xl" title={display.label}>
                    {display.icon}
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">
                      {student.username}
                    </div>
                    <div className={`text-xs ${display.color} truncate`}>
                      {display.label}
                    </div>
                  </div>

                  {/* Last Activity */}
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {timeLabel}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      {onlineStudents.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>
              Online: {onlineStudents.filter(s => s.status === 'online').length}
            </span>
            <span>
              Taking exam: {onlineStudents.filter(s => s.status === 'taking_exam').length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentStatusPanel;
