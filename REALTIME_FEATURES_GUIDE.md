# Real-Time Chat & Student Status Tracking - Implementation Guide

## Overview

This document describes the new real-time features added to the Online Examination System:
1. **Classroom Chat** - Real-time messaging with @mention support
2. **Student Online Status** - Teachers can see which students are online and taking exams

## Architecture

### Database Schema

#### classroom_messages
```sql
CREATE TABLE classroom_messages (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  message_text TEXT NOT NULL,
  mentioned_users JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### classroom_student_sessions
```sql
CREATE TABLE classroom_student_sessions (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  exam_id INTEGER,
  status VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online', 'taking_exam', 'offline')),
  joined_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  UNIQUE(classroom_id, student_id, session_id)
);
```

## Backend APIs

### Chat Endpoints

#### POST /api/classroom-chat/messages
Send a message to a classroom

**Request:**
```json
{
  "classroomId": 1,
  "messageText": "Hello @teacher1, I have a question",
  "mentionedUserIds": [2, 3]
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": 42,
    "classroom_id": 1,
    "sender_id": 5,
    "message_text": "Hello @teacher1, I have a question",
    "mentioned_users": [2, 3],
    "created_at": "2026-05-27T01:30:00Z",
    "sender": {
      "id": 5,
      "username": "student2"
    }
  }
}
```

#### GET /api/classroom-chat/messages/:classroomId
Fetch messages with pagination

**Query Parameters:**
- `limit` (default: 50, max: 200) - Number of messages to return
- `offset` (default: 0) - Message offset for pagination

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 42,
      "sender_id": 5,
      "message_text": "Hello",
      "mentioned_users": [],
      "created_at": "2026-05-27T01:30:00Z",
      "sender": {"id": 5, "username": "student2"}
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### GET /api/classroom-chat/members/:classroomId
Get classroom members for mention suggestions

**Response:**
```json
{
  "success": true,
  "members": [
    {
      "id": 1,
      "username": "teacher1",
      "role": "teacher"
    },
    {
      "id": 2,
      "username": "student1",
      "role": "member"
    },
    {
      "id": 3,
      "username": "student2",
      "role": "member"
    }
  ]
}
```

#### DELETE /api/classroom-chat/messages/:messageId
Delete a message (sender or teacher only)

### Student Status Endpoints

#### POST /api/student-status/join-classroom
Register student as online in classroom

**Request:**
```json
{
  "classroomId": 1,
  "sessionId": "5-1-1234567890"
}
```

#### POST /api/student-status/leave-classroom
Unregister student from classroom

**Request:**
```json
{
  "sessionId": "5-1-1234567890"
}
```

#### POST /api/student-status/start-exam
Mark student as taking an exam

**Request:**
```json
{
  "classroomId": 1,
  "sessionId": "5-1-1234567890",
  "examId": 3
}
```

#### POST /api/student-status/end-exam
Mark student as finished with exam

**Request:**
```json
{
  "sessionId": "5-1-1234567890"
}
```

#### GET /api/student-status/classroom/:classroomId
Get all online students in a classroom (teacher only)

**Response:**
```json
{
  "success": true,
  "onlineStudents": [
    {
      "id": 42,
      "student_id": 5,
      "status": "taking_exam",
      "exam_id": 3,
      "exam_title": "Database Management Systems",
      "joined_at": "2026-05-27T01:20:00Z",
      "last_activity": "2026-05-27T01:29:30Z",
      "username": "student2"
    }
  ]
}
```

#### POST /api/student-status/heartbeat
Keep session alive (call every 30 seconds)

**Request:**
```json
{
  "sessionId": "5-1-1234567890"
}
```

## Socket.IO Events

### Chat Events

#### Client → Server

**join-classroom-chat**
```javascript
socket.emit('join-classroom-chat', {
  classroomId: 1,
  userId: 5,
  username: 'student2'
});
```

**classroom-message**
```javascript
socket.emit('classroom-message', {
  classroomId: 1,
  message: {
    id: 42,
    sender_id: 5,
    message_text: "Hello",
    sender: { id: 5, username: "student2" }
  }
});
```

**leave-classroom-chat**
```javascript
socket.emit('leave-classroom-chat', {
  classroomId: 1,
  userId: 5,
  username: 'student2'
});
```

#### Server → Client

**message-received**
```javascript
socket.on('message-received', (message) => {
  console.log(message); // New message from another user
});
```

**user-joined**
```javascript
socket.on('user-joined', (data) => {
  console.log(`${data.username} joined`);
});
```

**user-left**
```javascript
socket.on('user-left', (data) => {
  console.log(`${data.username} left`);
});
```

### Student Status Events

#### Client → Server

**student-online**
```javascript
socket.emit('student-online', {
  classroomId: 1,
  studentId: 5,
  username: 'student2',
  sessionId: '5-1-1234567890'
});
```

**student-exam-start**
```javascript
socket.emit('student-exam-start', {
  classroomId: 1,
  studentId: 5,
  username: 'student2',
  examId: 3,
  examTitle: 'Database Management Systems',
  sessionId: '5-1-1234567890'
});
```

**student-exam-end**
```javascript
socket.emit('student-exam-end', {
  classroomId: 1,
  studentId: 5,
  username: 'student2',
  sessionId: '5-1-1234567890'
});
```

**student-offline**
```javascript
socket.emit('student-offline', {
  classroomId: 1,
  studentId: 5,
  username: 'student2',
  sessionId: '5-1-1234567890'
});
```

**join-classroom-status** (teacher)
```javascript
socket.emit('join-classroom-status', {
  classroomId: 1
});
```

**leave-classroom-status** (teacher)
```javascript
socket.emit('leave-classroom-status', {
  classroomId: 1
});
```

#### Server → Client

**student-status-update**
```javascript
socket.on('student-status-update', (data) => {
  console.log(data);
  // {
  //   studentId: 5,
  //   username: 'student2',
  //   status: 'taking_exam' or 'online' or 'offline',
  //   examId: 3,
  //   examTitle: 'Database Management Systems',
  //   sessionId: '5-1-1234567890',
  //   timestamp: '2026-05-27T01:30:00Z'
  // }
});
```

## Frontend Components

### ClassroomChat Component

**Location:** `client/src/components/ClassroomChat.jsx`

**Props:**
- `classroomId` (number) - Classroom ID
- `userId` (number) - Current user ID
- `username` (string) - Current user's username

**Features:**
- Real-time message display
- Auto-scroll to latest message
- @mention autocomplete
- Delete own messages
- Timestamp display
- Loading and error states

**Example Usage:**
```jsx
import ClassroomChat from './components/ClassroomChat';

<ClassroomChat 
  classroomId={1} 
  userId={5} 
  username="student2"
/>
```

### StudentStatusPanel Component

**Location:** `client/src/components/StudentStatusPanel.jsx`

**Props:**
- `classroomId` (number) - Classroom ID

**Features:**
- Real-time student status display
- Status indicators (online, taking exam, offline)
- Last activity timestamp
- Auto-polling with Socket.IO updates
- Teacher-only view

**Example Usage:**
```jsx
import StudentStatusPanel from './components/StudentStatusPanel';

<StudentStatusPanel classroomId={1} />
```

## Integration Points

### StudentClassroomView.jsx
- **Chat Tab:** Displays ClassroomChat component
- **Auto-register:** Student is registered as online when entering
- **Auto-unregister:** Student is unregistered when leaving
- **Heartbeat:** Sends heartbeat every 30 seconds to keep session alive

### ClassroomManagement.jsx
- **Status Tab:** Displays StudentStatusPanel component
- **Real-time Updates:** Teachers see live student status

## Client API Methods

### classroomChatAPI
```javascript
// Send message
classroomChatAPI.sendMessage(classroomId, messageText, mentionedUserIds)

// Get messages
classroomChatAPI.getMessages(classroomId, limit, offset)

// Get members for mentions
classroomChatAPI.getMembers(classroomId)

// Delete message
classroomChatAPI.deleteMessage(messageId)
```

### studentStatusAPI
```javascript
// Register as online
studentStatusAPI.joinClassroom(classroomId, sessionId)

// Unregister
studentStatusAPI.leaveClassroom(sessionId)

// Start exam
studentStatusAPI.startExam(classroomId, sessionId, examId)

// End exam
studentStatusAPI.endExam(sessionId)

// Get online students
studentStatusAPI.getOnlineStudents(classroomId)

// Keep alive
studentStatusAPI.heartbeat(sessionId)
```

## Workflow Examples

### Student Sending a Chat Message

1. Student types message in ClassroomChat input
2. Student types `@teacher1` to see mention suggestions
3. Student clicks on teacher's name in dropdown
4. Student clicks Send
5. classroomChatAPI.sendMessage() is called
6. Server stores message in database
7. Server broadcasts via Socket.IO `classroom-message` event
8. All connected users receive `message-received` event
9. Message appears in real-time in chat window

### Teacher Monitoring Online Students

1. Teacher opens classroom management
2. Teacher clicks "Student Status" tab
3. StudentStatusPanel fetches online students via API
4. StudentStatusPanel joins Socket.IO status room
5. Teacher sees list of currently online students
6. As students join/leave/start exams, Socket.IO sends `student-status-update` events
7. Panel updates in real-time

### Student Joining Classroom

1. Student navigates to StudentClassroomView
2. useEffect registers student as online:
   - Calls `studentStatusAPI.joinClassroom()`
   - Emits Socket.IO `student-online` event
3. Teacher's StudentStatusPanel receives `student-status-update` event
4. Student appears in teacher's online list
5. Heartbeat timer starts (every 30 seconds)
6. When student leaves classroom, cleanup unregisters them

## Performance Considerations

- **Messages:** Limited to 200 per page, pagination included
- **Status Polling:** Happens every 10 seconds as fallback
- **Heartbeat:** Every 30 seconds (configurable)
- **Mentions:** Only fetch classroom members once (cached)
- **Socket.IO:** Uses room-based broadcasts (efficient)

## Security

- ✅ All endpoints require JWT authentication
- ✅ Students can only see chat/status in approved classrooms
- ✅ Teachers can only see their own classrooms' status
- ✅ Only senders and teachers can delete messages
- ✅ Mention data is validated server-side

## Deployment

The migration will run automatically on server startup:

```bash
cd server
npm install
npm run dev
```

The new tables will be created automatically on first run.

## Troubleshooting

### Messages not sending
- Check browser console for errors
- Verify user is approved classroom member
- Check server logs for database errors

### Socket.IO not connecting
- Check CORS settings in server/src/index.js
- Verify WebSocket port is not blocked
- Check browser console for connection errors

### Status not updating
- Verify heartbeat is being sent (check Network tab)
- Check that user is registered with joinClassroom API
- Socket.IO polling fallback should still work

## Future Enhancements

- Message reactions/emojis
- File attachments
- Message search/filtering
- Message pinning
- Private direct messages
- Typing indicators
- Message read receipts
- Export chat history
