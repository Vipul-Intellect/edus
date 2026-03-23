import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Maximize2, Minimize2, Loader2, Bot, User, RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const response = await api.getChatHistory();
      if (response && response.history) {
        setMessages(response.history);
      } else {
        // Initial greeting
        setMessages([{
          type: 'bot',
          message: "👋 Hi! I'm your SIH Timetable Assistant. How can I help you today?",
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      setMessages([{
        type: 'bot',
        message: "👋 Hi! I'm your SIH Timetable Assistant. How can I help you today?",
        timestamp: new Date().toISOString()
      }]);
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = inputVal.trim();
    setInputVal('');

    const newMessages = [...messages, {
      type: 'user',
      message: userMsg,
      timestamp: new Date().toISOString()
    }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const resp = await api.sendChatMessage(userMsg);
      if (resp && resp.response) {
        setMessages(prev => [...prev, {
          type: 'bot',
          message: resp.response,
          timestamp: new Date().toISOString()
        }]);
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'bot',
        message: '❌ Sorry, I encountered an error. Please try again later.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await api.clearChatHistory();
      setMessages([{
        type: 'bot',
        message: "Chat history cleared. How can I help you today?",
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const formatMessage = (msg) => {
    // Basic markdown-like formatting (bold and bullet points)
    return msg.split('\n').map((line, i) => {
      // Handle bold text like **text**
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      
      if (formattedLine.includes('**')) {
        const parts = formattedLine.split(boldRegex);
        return (
          <span key={i} className="block mb-1">
            {parts.map((p, idx) => idx % 2 === 1 ? <strong key={idx}>{p}</strong> : p)}
          </span>
        );
      }
      return <span key={i} className="block mb-1">{formattedLine}</span>;
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-blue-700 transition-transform duration-300 hover:scale-110 z-50 group"
        aria-label="Open Chatbot"
      >
        <MessageCircle className="w-7 h-7 group-hover:animate-pulse" />
        {/* Unread dot or similar could go here */}
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out z-50 ${
        isExpanded ? 'w-[450px] h-[600px] sm:w-[500px] sm:h-[700px]' : 'w-[350px] h-[500px]'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">EduScheduler Assistant</h3>
            <p className="text-xs text-blue-100 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={clearHistory}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Clear Chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} max-w-full drop-shadow-sm`}>
            {msg.type === 'bot' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mr-2 mt-auto mb-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div 
              className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap flex-1 max-w-[85%] ${
                msg.type === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
              }`}
            >
              <div className="break-words font-medium">
                {msg.type === 'user' ? msg.message : formatMessage(msg.message)}
              </div>
              <div className={`text-[10px] mt-1 text-right ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {msg.type === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 ml-2 mt-auto mb-1">
                <User className="w-4 h-4 text-gray-500" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mr-2">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-full border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask about your timetable, classes..."
            className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none text-gray-700 placeholder-gray-400"
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={!inputVal.trim() || isLoading}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm ${
              !inputVal.trim() || isLoading 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-gray-400 font-medium">Powered by SIH AI Assistant</span>
        </div>
      </div>
    </div>
  );
}
