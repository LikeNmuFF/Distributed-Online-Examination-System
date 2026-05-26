import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { classroomChatAPI, studentStatusAPI } from '../services/api';

const ClassroomChat = ({ classroomId, userId, username, userType = 'student' }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [classroomMembers, setClassroomMembers] = useState([]);
  const [suggestedMentions, setSuggestedMentions] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    socketRef.current = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('Chat connected');
      socketRef.current.emit('join-classroom-chat', { classroomId, userId, username });
    });

    socketRef.current.on('message-received', (message) => {
      setMessages(prev => [...prev, message]);
      onNewMessage?.(message);
    });

    socketRef.current.on('user-joined', (data) => {
      console.log(`${data.username} joined the chat`);
    });

    socketRef.current.on('user-left', (data) => {
      console.log(`${data.username} left the chat`);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-classroom-chat', { classroomId, userId, username });
        socketRef.current.disconnect();
      }
    };
  }, [classroomId, userId, username]);

  // Fetch initial messages and classroom members
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Fetch messages
        const messagesResponse = await classroomChatAPI.getMessages(classroomId);
        setMessages(messagesResponse.data.messages);

        // Fetch classroom members for mentions
        const membersResponse = await classroomChatAPI.getMembers(classroomId);
        setClassroomMembers(membersResponse.data.members);
      } catch (err) {
        console.error('Error fetching chat data:', err);
        setError('Failed to load chat data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [classroomId]);

  // Handle mention suggestions while typing
  const handleMessageChange = (e) => {
    const text = e.target.value;
    setMessageText(text);

    // Check for @ mentions
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = text.substring(lastAtIndex + 1).split(/\s/)[0];
      
      if (afterAt.length > 0) {
        const filtered = classroomMembers.filter(m =>
          m.username.toLowerCase().includes(afterAt.toLowerCase())
        );
        setSuggestedMentions(filtered);
        setShowMentionSuggestions(true);
      } else {
        setSuggestedMentions(classroomMembers);
        setShowMentionSuggestions(true);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Handle mention selection
  const selectMention = (member) => {
    const lastAtIndex = messageText.lastIndexOf('@');
    const beforeAt = messageText.substring(0, lastAtIndex);
    const afterAt = messageText.substring(lastAtIndex + 1);
    const spaceIndex = afterAt.indexOf(' ');
    
    let afterMention = '';
    if (spaceIndex !== -1) {
      afterMention = afterAt.substring(spaceIndex);
    } else {
      afterMention = ' ';
    }

    const newText = `${beforeAt}@${member.username}${afterMention}`;
    setMessageText(newText);
    setShowMentionSuggestions(false);

    // Add to mentioned users if not already there
    if (!mentionedUsers.includes(member.id)) {
      setMentionedUsers([...mentionedUsers, member.id]);
    }

    // Focus back on input
    inputRef.current?.focus();
  };

  // Extract mentioned user IDs from message text
  const extractMentionedIds = () => {
    const mentionRegex = /@(\w+)/g;
    const matches = messageText.matchAll(mentionRegex);
    const ids = [];

    for (const match of matches) {
      const mentionedUsername = match[1];
      const user = classroomMembers.find(m => m.username === mentionedUsername);
      if (user && !ids.includes(user.id)) {
        ids.push(user.id);
      }
    }

    return ids;
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim()) {
      return;
    }

    try {
      setIsSending(true);
      setError('');

      const mentionedIds = extractMentionedIds();

      const response = await classroomChatAPI.sendMessage(
        classroomId,
        messageText.trim(),
        mentionedIds
      );

      // Broadcast via Socket.IO
      if (socketRef.current) {
        socketRef.current.emit('classroom-message', {
          classroomId,
          message: response.data.message
        });
      }

      // Clear input
      setMessageText('');
      setMentionedUsers([]);
      setShowMentionSuggestions(false);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Delete this message?')) {
      return;
    }

    try {
      await classroomChatAPI.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Classroom Chat</h2>
          {userType === 'teacher' && (
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded text-sm">
            {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No messages yet. Be the first to say hello!
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="flex flex-col group">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-700">
                      {msg.sender?.username || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mt-1 break-words">
                    {msg.message_text}
                  </p>
                </div>

                {/* Delete button for own messages or for teacher admin */}
                {(msg.sender_id === userId || userType === 'teacher') && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 text-xs transition-opacity"
                    title="Delete message"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <form onSubmit={handleSendMessage} className="space-y-2">
          {/* Mention suggestions */}
          {showMentionSuggestions && suggestedMentions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded max-h-32 overflow-y-auto text-sm">
              {suggestedMentions.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => selectMention(member)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-gray-700 flex items-center gap-2"
                >
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {member.role === 'teacher' ? '👨‍🏫' : '👤'}
                  </span>
                  {member.username}
                </button>
              ))}
            </div>
          )}

          {/* Input field */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={handleMessageChange}
              placeholder="Type your message... (use @name to mention)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!messageText.trim() || isSending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassroomChat;
