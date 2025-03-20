'use client';

import { useState, useRef, useEffect } from 'react';

export default function ChatBox({ messages, onSendMessage, isDisabled, currentUserId }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    onSendMessage(message);
    setMessage('');
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-white mb-2">Chat</h3>
      
      {/* Message container */}
      <div className="flex-1 overflow-y-auto mb-4 bg-gray-700 rounded-lg p-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            No messages yet. Start chatting!
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`p-2 rounded-lg ${
                  msg.isSystem 
                    ? 'bg-gray-600 text-gray-300 italic' 
                    : msg.userId === currentUserId
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-white'
                }`}
              >
                {!msg.isSystem && (
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-sm">
                      {msg.username}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                )}
                <p className="break-words text-sm">
                  {msg.message}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isDisabled}
          placeholder={isDisabled ? "You can't send messages while drawing" : "Type your guess..."}
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isDisabled || !message.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
} 