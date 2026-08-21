import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Send, MessageSquare, Trash2, Bot, User, FileText } from 'lucide-react';
import chatService from '../../../services/chat.service';
import documentService from '../../../services/document.service';
import ConfirmDeleteModal from '../../../components/Modal/ConfirmDeleteModal';
import './AIChatbot.css';

const renderFormattedMessage = (text) => {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const parseLineTokens = (str) => {
      const parts = [];
      let lastIdx = 0;

      const regex = /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
      let match;

      while ((match = regex.exec(str)) !== null) {
        if (match.index > lastIdx) {
          parts.push(str.substring(lastIdx, match.index));
        }

        if (match[2]) {
          parts.push(<strong key={match.index}><em>{match[2]}</em></strong>);
        } else if (match[3]) {
          parts.push(<strong key={match.index}>{match[3]}</strong>);
        } else if (match[4]) {
          parts.push(<em key={match.index}>{match[4]}</em>);
        } else if (match[5]) {
          parts.push(
            <code key={match.index} style={{ backgroundColor: 'var(--neutral-100)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9em' }}>
              {match[5]}
            </code>
          );
        }

        lastIdx = regex.lastIndex;
      }

      if (lastIdx < str.length) {
        parts.push(str.substring(lastIdx));
      }

      return parts.length > 0 ? parts : str;
    };

    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
    const cleanedLine = isBullet ? line.trim().replace(/^[-*]\s+/, '') : line;

    return (
      <React.Fragment key={lineIdx}>
        {isBullet ? (
          <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', margin: '2px 0' }}>
            <span style={{ color: 'var(--primary-600)', fontWeight: 'bold' }}>•</span>
            <span>{parseLineTokens(cleanedLine)}</span>
          </div>
        ) : (
          <span>{parseLineTokens(cleanedLine)}</span>
        )}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

const SUGGESTIONS = [
  { icon: '💡', title: 'Giải thích khái niệm', desc: 'Giải thích chủ đề phức tạp theo cách dễ hiểu.' },
  { icon: '📝', title: 'Tóm tắt tài liệu', desc: 'Tóm tắt các ý chính của tài liệu học tập.' },
  { icon: '💻', title: 'Hỗ trợ viết code', desc: 'Viết, giải thích hoặc tìm lỗi cho đoạn mã.' },
  { icon: '✍️', title: 'Soạn thảo nội dung', desc: 'Lên ý tưởng, viết bài luận hoặc soạn thư.' }
];

const AIChatbot = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Context selection
  const [myDocuments, setMyDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [sharedDoc, setSharedDoc] = useState(null);

  // Delete Confirmation State
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    loadSessions();
    loadMyDocuments();

    // If navigated from DocumentDetail with state
    if (location.state?.documentId) {
      setSelectedDocumentId(location.state.documentId);
      if (location.state.documentTitle) {
        setSharedDoc({ id: location.state.documentId, title: location.state.documentTitle });
      }
      // Clean up history state so refresh doesn't lock it
      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const loadSessions = async () => {
    try {
      const data = await chatService.getSessions();
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load chat sessions', err);
    }
  };

  const loadMyDocuments = async () => {
    try {
      // Just fetch all documents or recent ones for context selection
      const data = await documentService.getMyDocuments();
      setMyDocuments(data || []);
    } catch (err) {
      console.error('Failed to load documents for chat context', err);
    }
  };

  const loadSessionMessages = async (sessionId) => {
    try {
      const data = await chatService.getSessionMessages(sessionId);
      setMessages(data || []);

      // Auto-set the selected document context if this session is tied to a document
      const session = sessions.find(s => s.id === sessionId);
      if (session && session.documentId) {
        setSelectedDocumentId(session.documentId);
      } else if (session && !session.documentId) {
        setSelectedDocumentId(''); // General AI
      }
    } catch (err) {
      console.error('Failed to load session messages', err);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    // Optionally keep the currently selected document context or reset it
    // setSelectedDocumentId(''); 
  };

  const confirmDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeletingSession(true);
    try {
      await chatService.deleteSession(sessionToDelete);
      if (currentSessionId === sessionToDelete) {
        handleNewChat();
      }
      loadSessions();
      setSessionToDelete(null);
    } catch (err) {
      alert('Xóa phiên thất bại');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping || sendingRef.current) return;

    sendingRef.current = true;
    const textToSend = inputText.trim();
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message to UI optimistically
    const optimisticMsg = {
      id: Date.now().toString(),
      sender: 'USER',
      message: textToSend,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setIsTyping(true);

    try {
      let response;
      if (selectedDocumentId) {
        response = await chatService.chatWithDocument(selectedDocumentId, textToSend, currentSessionId);
      } else {
        response = await chatService.chat(textToSend, currentSessionId);
      }

      // If this was a new session, set the currentSessionId
      if (!currentSessionId && response.sessionId) {
        setCurrentSessionId(response.sessionId);
        // We also need to reload sessions to update the sidebar
        loadSessions();
      }

      // Add AI response to UI
      const aiMsg = {
        id: Date.now().toString() + '-ai',
        sender: 'AI',
        message: response.answer,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (err) {
      console.error('Chat error', err);

      const apiErrorMessage = err.response?.data?.message || 'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại.';

      // Show error as a system message
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-err',
        sender: 'AI',
        message: apiErrorMessage,
        createdAt: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsTyping(false);
      sendingRef.current = false;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const autoResizeTextarea = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = (e.target.scrollHeight) + 'px';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="chat-page-wrapper">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <Plus size={18} /> Cuộc trò chuyện mới
          </button>
        </div>

        <div className="chat-sessions-list">
          {sessions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--neutral-400)', padding: '2rem 1rem', fontSize: '13px' }}>
              Không tìm thấy cuộc trò chuyện trước đó.
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={`chat-session-item ${currentSessionId === session.id ? 'active' : ''}`}
                onClick={() => setCurrentSessionId(session.id)}
              >
                <div className="session-info">
                  <span className="session-title">
                    <MessageSquare size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                    {session.title || 'Cuộc trò chuyện mới'}
                  </span>
                  <span className="session-date">{new Date(session.updatedAt || session.createdAt).toLocaleDateString()}</span>
                </div>
                <button
                  className="delete-session-btn"
                  onClick={(e) => confirmDeleteSession(session.id, e)}
                  title="Xóa cuộc trò chuyện"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main-area">
        <header className="chat-header">
          <div className="chat-header-title">
            <div style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
              <Bot size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neutral-900)' }}>Trợ lý AI</h2>
              <p style={{ fontSize: '13px', color: 'var(--neutral-500)' }}>
                {selectedDocumentId 
                  ? `Đang hỏi về tài liệu: ${sharedDoc && sharedDoc.id === selectedDocumentId ? sharedDoc.title : myDocuments.find(d => d.id === selectedDocumentId)?.title || 'Tài liệu không xác định'}` 
                  : 'Kiến thức chung & hỗ trợ'}
              </p>
            </div>
          </div>

          <div className="context-selector">
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--neutral-600)' }}>Ngữ cảnh trò chuyện:</span>
            <div style={{ position: 'relative' }}>
              <FileText size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--neutral-500)' }} />
              <select
                className="context-select"
                style={{ paddingLeft: '32px' }}
                value={selectedDocumentId}
                onChange={(e) => {
                  setSelectedDocumentId(e.target.value);
                  if (currentSessionId && messages.length > 0) {
                    handleNewChat();
                  }
                }}
              >
                <option value="">Trí tuệ nhân tạo (Không có tài liệu)</option>
                {sharedDoc && !myDocuments.some(d => d.id === sharedDoc.id) && (
                  <option value={sharedDoc.id}>{sharedDoc.title} (Tài liệu được chia sẻ)</option>
                )}
                {myDocuments.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.title}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-chat-state">
              <div className="empty-chat-icon">
                <Bot size={40} />
              </div>
              <h3 className="empty-chat-title">Hôm nay tôi có thể giúp gì cho bạn?</h3>
              <p className="empty-chat-desc">
                {selectedDocumentId
                  ? "Tôi đã sẵn sàng trả lời các câu hỏi cụ thể về tài liệu bạn đã chọn."
                  : "Tôi là trợ lý thông minh của bạn. Hãy hỏi tôi bất cứ điều gì, hoặc chọn một tài liệu ở trên để dựa vào đó trả lời."}
              </p>

              {!selectedDocumentId && (
                <div className="chat-suggestions-grid">
                  {SUGGESTIONS.map((sug, idx) => (
                    <div
                      key={idx}
                      className="chat-suggestion-card"
                      onClick={() => {
                        setInputText(sug.title + ": ");
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                        }
                      }}
                    >
                      <div className="sug-icon">{sug.icon}</div>
                      <div className="sug-content">
                        <div className="sug-title">{sug.title}</div>
                        <div className="sug-desc">{sug.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`message-wrapper ${msg.sender.toLowerCase()}`}>
                <div className={`message-avatar ${msg.sender.toLowerCase()}`}>
                  {msg.sender === 'USER' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div>
                  <div className="message-bubble" style={msg.isError ? { backgroundColor: 'var(--error-50)', color: 'var(--error-600)', borderColor: 'var(--error-200)' } : {}}>
                    {renderFormattedMessage(msg.message)}
                  </div>
                  <div className="message-time">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="message-wrapper ai">
              <div className="message-avatar ai">
                <Bot size={20} />
              </div>
              <div className="message-bubble typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder={selectedDocumentId ? "Hỏi một câu hỏi về tài liệu này..." : "Nhắn tin cho Trợ lý AI..."}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                autoResizeTextarea(e);
              }}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
            >
              <Send size={18} style={{ marginLeft: '2px' }} />
            </button>
          </div>
          <div style={{ fontSize: '11px', textAlign: 'center', marginTop: '8px', color: 'var(--neutral-400)' }}>
            AI có thể mắc lỗi. Hãy cân nhắc xác minh các thông tin quan trọng.
          </div>
        </div>
      </main>

      {/* Professional Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={handleDeleteSession}
        isDeleting={isDeletingSession}
        title="Xóa phiên trò chuyện"
        message="Bạn có chắc chắn muốn xóa phiên trò chuyện này không? Tất cả các tin nhắn bên trong phiên này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
      />
    </div>
  );
};

export default AIChatbot;
