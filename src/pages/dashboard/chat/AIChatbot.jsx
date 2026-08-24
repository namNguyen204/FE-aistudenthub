import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Send, 
  MessageSquare, 
  Trash2, 
  Bot, 
  User, 
  FileText, 
  Sparkles, 
  Search, 
  Copy, 
  Check, 
  Lightbulb, 
  BookOpen, 
  Code2, 
  PenTool, 
  ArrowUpRight, 
  CornerDownLeft,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import chatService from '../../../services/chat.service';
import documentService from '../../../services/document.service';
import ConfirmDeleteModal from '../../../components/Modal/ConfirmDeleteModal';
import './AIChatbot.css';

const CodeBlock = ({ code, language = 'code' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-block-lang">{language}</span>
        <button className="code-copy-btn" onClick={handleCopy} title="Sao chép mã">
          {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
          <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
        </button>
      </div>
      <pre className="code-block-content">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const renderFormattedMessage = (text) => {
  if (!text) return null;

  // Check for multiline code blocks enclosed in ```
  if (text.includes('```')) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        let lang = 'code';
        let codeContent;
        if (firstLineEnd !== -1) {
          lang = part.substring(3, firstLineEnd).trim() || 'code';
          codeContent = part.substring(firstLineEnd + 1, part.length - 3);
        } else {
          codeContent = part.substring(3, part.length - 3);
        }
        return <CodeBlock key={index} code={codeContent} language={lang} />;
      } else {
        return <React.Fragment key={index}>{parseTextLines(part)}</React.Fragment>;
      }
    });
  }

  return parseTextLines(text);
};

const parseTextLines = (text) => {
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
            <code key={match.index} className="inline-code">
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
          <div className="bullet-item">
            <span className="bullet-dot">•</span>
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
  {
    icon: Lightbulb,
    badgeColor: 'amber',
    title: 'Giải thích khái niệm',
    desc: 'Phân tích các chủ đề hoặc công thức phức tạp một cách ngắn gọn, trực quan và dễ hiểu.',
    prompt: 'Hãy giải thích cho tôi về khái niệm: '
  },
  {
    icon: BookOpen,
    badgeColor: 'blue',
    title: 'Tóm tắt tài liệu học',
    desc: 'Rút ra các ý chính, từ khóa quan trọng và lộ trình bài học từ nội dung được chọn.',
    prompt: 'Hãy tóm tắt các điểm quan trọng nhất trong chủ đề: '
  },
  {
    icon: Code2,
    badgeColor: 'emerald',
    title: 'Hỗ trợ Lập trình & Debug',
    desc: 'Viết thuật toán, tối ưu hóa đoạn mã hoặc tìm và sửa lỗi trong chương trình của bạn.',
    prompt: 'Hãy giúp tôi kiểm tra đoạn mã nguồn này: '
  },
  {
    icon: PenTool,
    badgeColor: 'purple',
    title: 'Soạn thảo & Ý tưởng',
    desc: 'Lên dàn ý bài luận, viết đề xuất dự án hoặc biên soạn nội dung trao đổi chuyên môn.',
    prompt: 'Hãy giúp tôi gợi ý dàn ý cho nội dung: '
  }
];

const QUICK_CHIPS = [
  "💡 Giải thích khái niệm",
  "📝 Tóm tắt ý chính",
  "💻 Debug đoạn mã",
  "🎯 Đặt 5 câu hỏi ôn tập"
];

const AIChatbot = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  // Context selection
  const [myDocuments, setMyDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(() => location.state?.documentId || '');
  const [sharedDoc] = useState(() => location.state?.documentTitle
    ? { id: location.state.documentId, title: location.state.documentTitle }
    : null);

  // Delete Confirmation State
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const sendingRef = useRef(false);

  const loadSessions = useCallback(async () => {
    try {
      const data = await chatService.getSessions();
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load chat sessions', err);
    }
  }, []);

  const loadSessionMessages = useCallback(async (sessionId) => {
    try {
      const data = await chatService.getSessionMessages(sessionId);
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to load session messages', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      const [sessionsResult, documentsResult] = await Promise.allSettled([
        chatService.getSessions(),
        documentService.getMyDocuments()
      ]);

      if (cancelled) return;

      if (sessionsResult.status === 'fulfilled') {
        setSessions(sessionsResult.value || []);
      } else {
        console.error('Failed to load chat sessions', sessionsResult.reason);
      }

      if (documentsResult.status === 'fulfilled') {
        setMyDocuments(documentsResult.value || []);
      } else {
        console.error('Failed to load documents for chat context', documentsResult.reason);
      }
    };

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (location.state?.documentId) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state?.documentId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleSelectSession = (session) => {
    setCurrentSessionId(session.id);
    setSelectedDocumentId(session.documentId || '');
    loadSessionMessages(session.id);
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
    } catch {
      alert('Xóa phiên thất bại');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleSendMessage = async (textOverride = null) => {
    const messageContent = typeof textOverride === 'string' ? textOverride : inputText;
    if (!messageContent.trim() || isTyping || sendingRef.current) return;

    sendingRef.current = true;
    const textToSend = messageContent.trim();
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

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

      if (!currentSessionId && response.sessionId) {
        setCurrentSessionId(response.sessionId);
        loadSessions();
      }

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
    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
  };

  const handleCopyMessage = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const filteredSessions = sessions.filter(session => 
    (session.title || 'Cuộc trò chuyện mới').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDocTitle = selectedDocumentId 
    ? (sharedDoc && sharedDoc.id === selectedDocumentId 
        ? sharedDoc.title 
        : myDocuments.find(d => d.id === selectedDocumentId)?.title || 'Tài liệu đã chọn')
    : null;

  return (
    <div className="chat-page-wrapper">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <Plus size={18} className="new-chat-icon" />
            <span>Cuộc trò chuyện mới</span>
          </button>

          {/* Search box for sessions */}
          {sessions.length > 0 && (
            <div className="sidebar-search-box">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                placeholder="Tìm cuộc trò chuyện..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="chat-sessions-list">
          {sessions.length === 0 ? (
            <div className="empty-sessions">
              <div className="empty-sessions-icon">
                <MessageSquare size={28} />
              </div>
              <p>Chưa có cuộc trò chuyện nào</p>
              <span>Bắt đầu cuộc hội thoại mới với Trợ lý AI ngay bên cạnh.</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="empty-sessions">
              <p>Không tìm thấy kết quả</p>
            </div>
          ) : (
            filteredSessions.map(session => (
              <div
                key={session.id}
                className={`chat-session-item ${currentSessionId === session.id ? 'active' : ''}`}
                onClick={() => handleSelectSession(session)}
              >
                <div className="session-icon-badge">
                  <MessageSquare size={16} />
                </div>
                <div className="session-info">
                  <span className="session-title">
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

        <div className="sidebar-footer">
          <div className="ai-status-pill">
            <span className="status-dot"></span>
            <span className="status-text">AI StudentHub v2.0</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main-area">
        <header className="chat-header">
          <div className="chat-header-title">
            <div className="ai-avatar-badge">
              <Sparkles size={20} className="sparkle-icon" />
            </div>
            <div className="header-text-group">
              <div className="header-title-row">
                <h2>Trợ lý AI StudentHub</h2>
                <span className="online-badge">
                  <span className="online-dot"></span> Sẵn sàng
                </span>
              </div>
              <p className="header-subtitle">
                {activeDocTitle 
                  ? `Đang hội thoại dựa trên nội dung: "${activeDocTitle}"` 
                  : 'Kiến thức tổng hợp & Giải đáp học tập toàn diện'}
              </p>
            </div>
          </div>

          <div className="context-selector">
            <div className="context-label">
              <FileText size={14} />
              <span>Ngữ cảnh:</span>
            </div>
            <div className="context-select-wrapper">
              <select
                className="context-select"
                value={selectedDocumentId}
                onChange={(e) => {
                  setSelectedDocumentId(e.target.value);
                  if (currentSessionId && messages.length > 0) {
                    handleNewChat();
                  }
                }}
              >
                <option value="">Trí tuệ nhân tạo (Chung)</option>
                {sharedDoc && !myDocuments.some(d => d.id === sharedDoc.id) && (
                  <option value={sharedDoc.id}>📄 {sharedDoc.title} (Chia sẻ)</option>
                )}
                {myDocuments.map(doc => (
                  <option key={doc.id} value={doc.id}>📄 {doc.title}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-chat-state">
              <div className="hero-orb-wrapper">
                <div className="hero-orb-glow"></div>
                <div className="hero-orb-icon">
                  <Bot size={44} />
                </div>
              </div>

              <h1 className="empty-chat-title">
                Hôm nay tôi có thể <span className="gradient-text">giúp gì cho bạn?</span>
              </h1>
              
              <p className="empty-chat-desc">
                {selectedDocumentId
                  ? `Tôi đã tải xong tài liệu "${activeDocTitle}". Hãy đặt bất kỳ câu hỏi nào liên quan!`
                  : "Hệ thống AI tích hợp hỗ trợ sinh viên tra cứu, học tập, tóm tắt tài liệu và tối ưu hoá mã nguồn."}
              </p>

              {/* Quick Prompts Chips */}
              <div className="quick-chips-row">
                {QUICK_CHIPS.map((chip, idx) => (
                  <button 
                    key={idx} 
                    className="quick-chip-btn"
                    onClick={() => {
                      const cleanText = chip.replace(/^[^\s]+\s+/, '');
                      setInputText(cleanText + ": ");
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {!selectedDocumentId && (
                <div className="chat-suggestions-grid">
                  {SUGGESTIONS.map((sug, idx) => {
                    const IconComponent = sug.icon;
                    return (
                      <div
                        key={idx}
                        className={`chat-suggestion-card badge-${sug.badgeColor}`}
                        onClick={() => {
                          setInputText(sug.prompt);
                          if (textareaRef.current) textareaRef.current.focus();
                        }}
                      >
                        <div className="sug-header">
                          <div className={`sug-icon-wrapper ${sug.badgeColor}`}>
                            <IconComponent size={20} />
                          </div>
                          <ArrowUpRight size={18} className="sug-arrow-icon" />
                        </div>
                        <div className="sug-content">
                          <div className="sug-title">{sug.title}</div>
                          <div className="sug-desc">{sug.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="messages-container">
              {messages.map(msg => (
                <div key={msg.id} className={`message-wrapper ${msg.sender.toLowerCase()}`}>
                  <div className={`message-avatar ${msg.sender.toLowerCase()}`}>
                    {msg.sender === 'USER' ? (
                      <User size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </div>

                  <div className="message-content-group">
                    <div className="message-sender-name">
                      {msg.sender === 'USER' ? 'Bạn' : 'Trợ lý AI'}
                    </div>

                    <div className={`message-bubble ${msg.sender.toLowerCase()} ${msg.isError ? 'is-error' : ''}`}>
                      {renderFormattedMessage(msg.message)}
                    </div>

                    <div className="message-footer-bar">
                      <span className="message-time">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>

                      {msg.sender === 'AI' && !msg.isError && (
                        <div className="message-actions">
                          <button 
                            className="msg-action-btn" 
                            onClick={() => handleCopyMessage(msg.id, msg.message)}
                            title="Sao chép toàn bộ phản hồi"
                          >
                            {copiedMsgId === msg.id ? <Check size={14} className="copied-check" /> : <Copy size={14} />}
                          </button>
                          <button className="msg-action-btn" title="Hữu ích">
                            <ThumbsUp size={14} />
                          </button>
                          <button className="msg-action-btn" title="Chưa chính xác">
                            <ThumbsDown size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="message-wrapper ai">
                  <div className="message-avatar ai typing-avatar">
                    <Sparkles size={18} />
                  </div>
                  <div className="message-content-group">
                    <div className="message-sender-name">Trợ lý AI</div>
                    <div className="message-bubble ai typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          {activeDocTitle && (
            <div className="active-context-banner">
              <FileText size={13} />
              <span>Đang trò chuyện trong ngữ cảnh tài liệu: <strong>{activeDocTitle}</strong></span>
              <button onClick={() => setSelectedDocumentId('')} title="Bỏ chọn ngữ cảnh">✕</button>
            </div>
          )}

          <div className="chat-input-card">
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder={selectedDocumentId ? "Hỏi bất cứ điều gì về tài liệu này..." : "Nhập câu hỏi hoặc yêu cầu cho Trợ lý AI..."}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                autoResizeTextarea(e);
              }}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            <div className="chat-input-actions">
              <div className="input-hints">
                <span className="kbd-hint"><CornerDownLeft size={12} style={{ display: 'inline', marginRight: 2 }} /> Enter gửi</span>
                <span className="kbd-hint-sub">Shift + Enter xuống dòng</span>
              </div>

              <button
                className="send-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isTyping}
                title="Gửi tin nhắn"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          <div className="chat-disclaimer">
            <ShieldCheck size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
            AI có thể mắc sai sót. Hãy kiểm tra các thông tin quan trọng trước khi áp dụng vào bài học.
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={handleDeleteSession}
        isDeleting={isDeletingSession}
        title="Xóa phiên trò chuyện"
        message="Bạn có chắc chắn muốn xóa phiên trò chuyện này không? Tất cả tin nhắn trong phiên này sẽ bị xóa vĩnh viễn và không thể hoàn tác."
      />
    </div>
  );
};

export default AIChatbot;
