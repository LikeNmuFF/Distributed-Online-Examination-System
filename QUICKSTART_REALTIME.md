# Quick Start - Real-Time Features

## For Users

### Students: Using Classroom Chat

1. **Open a Classroom**
   - Go to "My Classrooms" and click a classroom

2. **Click the "💬 Chat" Tab**
   - You'll see all messages in the classroom

3. **Send a Message**
   - Type your message in the input box
   - To mention someone, type `@` followed by their name
   - Click on their name from the dropdown to mention them
   - Click "Send"

4. **Delete Your Message**
   - Hover over a message you sent
   - Click the X button that appears

### Teachers: Monitoring Student Status

1. **Open a Classroom**
   - Go to classroom management

2. **Click the "👥 Student Status" Tab**
   - You'll see all currently online students

3. **Understanding the Status Indicators**
   - 🟢 **Online** - Student is in the classroom
   - 📝 **Taking exam** - Student is actively taking an exam (shows exam name)
   - 🔴 **Offline** - Student has left the classroom

4. **Real-Time Updates**
   - Updates happen automatically as students join/leave/start exams
   - Refresh may be needed if connection drops (polling every 10 seconds)

## For Developers

### Running the Application

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Start development server
cd ../server && npm run dev

# In another terminal, start client
cd client && npm run dev
```

### Key Files to Know

**Backend:**
- `server/src/routes/classroomChat.js` - Chat API endpoints
- `server/src/routes/studentStatus.js` - Status tracking API
- `server/src/index.js` - Socket.IO event handlers

**Frontend:**
- `client/src/components/ClassroomChat.jsx` - Chat UI component
- `client/src/components/StudentStatusPanel.jsx` - Status display component
- `client/src/pages/StudentClassroomView.jsx` - Integrated chat
- `client/src/pages/ClassroomManagement.jsx` - Integrated status panel
- `client/src/services/api.js` - API client methods

### Testing Locally

**Test Chat:**
1. Open browser 1 at http://localhost:3000 → Student view
2. Open browser 2 at http://localhost:3000 → Different student
3. Send message from browser 1
4. Message appears instantly in browser 2

**Test Status:**
1. Open teacher account in browser 1
2. Open student account in browser 2 → Enter classroom
3. Student appears instantly in teacher's status panel
4. When student starts exam, status updates to 📝

### Database Migrations

The tables are created automatically on server startup:

```sql
-- Automatically created:
- classroom_messages
- classroom_student_sessions
```

If you need to reset:
```bash
# Drop tables (development only!)
psql -U postgres -d exam_db -c "
DROP TABLE IF EXISTS classroom_student_sessions;
DROP TABLE IF EXISTS classroom_messages;
"

# Server will recreate on next start
npm run dev
```

### Common Issues & Solutions

**Issue: Messages not appearing**
- Solution: Check browser console for errors
- Make sure user is an approved classroom member
- Verify JWT token in localStorage

**Issue: Socket.IO connection fails**
- Solution: Check server is running on correct port
- Verify CORS settings allow your origin
- Check browser console for WebSocket errors

**Issue: Status not updating for students**
- Solution: Make sure heartbeat is sending (Network tab)
- Refresh page - polling fallback should catch it
- Check server logs for database errors

**Issue: Build fails**
- Solution: Run `npm install` in both client and server dirs
- Clear node_modules and reinstall if persistent
- Check Node version (need 14+)

## API Quick Reference

### Send Chat Message
```bash
POST /api/classroom-chat/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "classroomId": 1,
  "messageText": "Hello @teacher1",
  "mentionedUserIds": [2]
}
```

### Get Chat Messages
```bash
GET /api/classroom-chat/messages/1?limit=50&offset=0
Authorization: Bearer {token}
```

### Join Classroom (for status)
```bash
POST /api/student-status/join-classroom
Authorization: Bearer {token}
Content-Type: application/json

{
  "classroomId": 1,
  "sessionId": "5-1-1234567890"
}
```

### Get Online Students
```bash
GET /api/student-status/classroom/1
Authorization: Bearer {token}
```

## Configuration

### Heartbeat Interval
Currently set to 30 seconds. To change in StudentClassroomView.jsx:

```javascript
// Change 30000 to desired milliseconds
const heartbeatInterval = setInterval(async () => {
  await studentStatusAPI.heartbeat(studentSessionId);
}, 30000); // milliseconds
```

### Message Pagination
Currently 50 messages per page, max 200. To change in classroomChat.js:

```javascript
const limit = Math.min(parseInt(req.query.limit) || 50, 200);
```

### Status Poll Interval
Currently 10 seconds. To change in StudentStatusPanel.jsx:

```javascript
// Change 10000 to desired milliseconds
pollIntervalRef.current = setInterval(fetchOnlineStudents, 10000);
```

## Production Deployment

1. **Build client:**
   ```bash
   cd client
   npm run build
   ```

2. **Set environment variables:**
   ```bash
   DATABASE_URL=postgresql://user:pass@host/exam_db
   NODE_ENV=production
   ```

3. **Start server:**
   ```bash
   cd server
   npm run start
   ```

4. **Configure nginx** to serve static client files and proxy API requests

See `DOCKER_SETUP.md` for Docker deployment instructions

## Support

For detailed documentation, see: `REALTIME_FEATURES_GUIDE.md`

## Features Summary

✅ Real-time classroom chat  
✅ @mention support with autocomplete  
✅ Student online status tracking  
✅ Exam status monitoring  
✅ Message deletion  
✅ Automatic session management  
✅ Heartbeat keep-alive  
✅ WebSocket + HTTP polling fallback  
✅ Fully integrated with existing exam system
