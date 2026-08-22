import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, FolderOpen, Zap, Sparkles } from 'lucide-react';
import './Welcome.css';

const Welcome = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      const role = user?.role?.replace('ROLE_', '') || 'USER';
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'MODERATOR') navigate('/moderator');
      else navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="welcome-container">
      <nav className="welcome-nav">
        <div className="welcome-logo">
          <Bot size={28} color="#60a5fa" />
          AI Student Hub
        </div>
        <div className="welcome-nav-links">
          {isAuthenticated ? (
            <button className="btn-primary-glow" onClick={handleGetStarted}>
              Đến Trang Chủ
            </button>
          ) : (
            <>
              <button className="btn-glass" onClick={() => navigate('/login')}>Đăng nhập</button>
              <button className="btn-primary-glow" onClick={() => navigate('/register')}>Đăng ký</button>
            </>
          )}
        </div>
      </nav>

      <main className="welcome-main">
        <div className="badge">
          <Sparkles size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
          Tương lai của việc học là đây
        </div>
        
        <h1 className="hero-title">
          <span className="text-gradient">Nâng cao hiệu quả học tập với </span>
          <br />
          <span className="text-gradient-primary">Tài liệu hỗ trợ bởi AI</span>
        </h1>
        
        <p className="hero-subtitle">
          Tải lên bài giảng, sách và ghi chú của bạn. Trò chuyện trực tiếp với tài liệu, sắp xếp thông minh và học nhanh hơn bao giờ hết.
        </p>
        
        <div className="cta-group">
          <button className="btn-primary-glow btn-large" onClick={handleGetStarted}>
            {isAuthenticated ? 'Tiếp tục đến Trang Chủ' : 'Bắt đầu miễn phí'}
          </button>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <FolderOpen size={28} />
            </div>
            <h3 className="feature-title">Sắp xếp Thông minh</h3>
            <p className="feature-desc">Giữ tất cả tài liệu học tập của bạn được sắp xếp hoàn hảo trong các thư mục. Truy cập mọi lúc, mọi nơi với lưu trữ đám mây bảo mật.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <Bot size={28} />
            </div>
            <h3 className="feature-title">Trò chuyện với Tài liệu</h3>
            <p className="feature-desc">Ngừng đọc hàng trăm trang tài liệu. Chỉ cần yêu cầu trợ lý AI của chúng tôi tóm tắt, giải thích hoặc trích xuất các thông tin chính từ bất kỳ tài liệu nào.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <Zap size={28} />
            </div>
            <h3 className="feature-title">Tốc độ Nhanh chóng</h3>
            <p className="feature-desc">Được xây dựng với các công nghệ web hiện đại để đảm bảo trải nghiệm mượt mà, liền mạch. Tìm thấy những gì bạn cần ngay lập tức.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Welcome;
