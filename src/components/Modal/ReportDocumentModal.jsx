import React, { useState } from 'react';
import { X, Send, Flag, ShieldAlert, Loader2, ShieldCheck } from 'lucide-react';
import Button from '../Button/Button';
import documentService from '../../services/document.service';
import { VIOLATION_REASONS, getViolationReason } from '../../utils/violationReasons';

const ReportDocumentModal = ({ isOpen, onClose, documentTitle, documentId }) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedReason = getViolationReason(reason);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setDescription('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError('Vui lòng chọn lý do báo cáo.');
      return;
    }
    if (description.trim().length < 20) {
      setError('Vui lòng mô tả chi tiết vi phạm (ít nhất 20 ký tự), gồm bằng chứng và vị trí trong tài liệu.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      // Gọi API report (bạn cần đảm bảo documentService.reportDocument có tồn tại hoặc bổ sung vào)
      await documentService.reportDocument(documentId, { reason, description });
      setSuccess('Báo cáo của bạn đã được gửi thành công. Cảm ơn bạn đã đóng góp!');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi gửi báo cáo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose} disabled={isSubmitting}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Flag size={24} color="var(--danger-500)" />
            Báo cáo tài liệu
          </h2>
          <p className="modal-description" style={{ marginTop: '0.5rem' }}>
            Tài liệu: <strong>{documentTitle}</strong>
          </p>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: 'var(--error-50)', color: 'var(--error-600)', borderRadius: 'var(--radius-md)' }}>
              <ShieldAlert size={18} />
              {error}
            </div>
          )}
          
          {success ? (
            <div className="alert alert-success" style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--success-50)', color: 'var(--success-700)', borderRadius: 'var(--radius-md)' }}>
              <ShieldCheck size={48} style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Gửi thành công!</h3>
              <p>{success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '8px' }}>
                  Lý do báo cáo <span style={{ color: 'var(--error-500)' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {VIOLATION_REASONS.map((r) => (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--neutral-700)', padding: '8px', borderRadius: '8px', background: reason === r.id ? 'var(--error-50)' : 'transparent' }}>
                      <input 
                        type="radio" 
                        name="reportReason" 
                        value={r.id} 
                        checked={reason === r.id}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={isSubmitting}
                        style={{ accentColor: 'var(--danger-500)', width: '16px', height: '16px' }}
                      />
                      <span><strong style={{ display: 'block' }}>{r.label}</strong><small style={{ color: 'var(--neutral-500)' }}>{r.guidance}</small></span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '8px' }}>
                  Mô tả chi tiết vi phạm <span style={{ color: 'var(--error-500)' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)', fontSize: '14px' }}
                  placeholder={selectedReason.placeholder || 'Nêu bằng chứng và vị trí vi phạm trong tài liệu...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Hủy
                </Button>
                <Button type="submit" style={{ backgroundColor: 'var(--danger-600)', color: 'white', borderColor: 'var(--danger-600)' }} disabled={isSubmitting || !reason || description.trim().length < 20}>
                  {isSubmitting ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                  <span style={{ marginLeft: '8px' }}>Gửi báo cáo</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDocumentModal;
