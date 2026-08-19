import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Download, Trash2, X, Eye, AlertTriangle } from 'lucide-react';
import Button from '../../components/Button/Button';
import documentService from '../../services/document.service';
import { getViolationReason } from '../../utils/violationReasons';

const AdminDocumentPreviewModal = ({ isOpen, onClose, document, onDelete, onDmcaTakedown }) => {
  const [previewData, setPreviewData] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return undefined;

    const body = globalThis.document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && document?.id) {
      loadPreview(document.id);
    } else {
      setPreviewData(null);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
  }, [isOpen, document]);

  const loadPreview = async (docId) => {
    setLoading(true);
    try {
      const preview = await documentService.getPreview(docId);
      setPreviewData(preview);

      if (preview && (preview.previewMode === 'PDF' || preview.previewMode === 'IMAGE')) {
        const blob = await documentService.stream(docId);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setFileUrl(url);
        }
      }
    } catch (err) {
      console.error('Failed to load preview for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document?.id) return;
    try {
      const url = await documentService.getDownloadUrl(document.id);
      if (url) window.open(url, '_blank');
    } catch (err) {
      alert('Không thể tải xuống tài liệu');
    }
  };

  if (!isOpen || !document) return null;

  const previewOverlay = (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#ffffff',
      zIndex: 9999,
      padding: 0,
      margin: 0,
      overflow: 'hidden',
      isolation: 'isolate'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 0,
        width: '100%',
        maxWidth: 'none',
        height: '100%',
        maxHeight: 'none',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--neutral-200)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexShrink: 0,
          backgroundColor: 'var(--neutral-50)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)', borderRadius: '8px' }}>
              <Eye size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--neutral-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                [Admin Preview] {document.title}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--neutral-500)' }}>
               Người đăng: <strong>{document.uploaderFullName || document.ownerName || document.authorName || document.uploaderEmail || 'Người dùng vô danh'}</strong> |
                {document.reviewerName && <span> Kiểm duyệt bởi: <strong>{document.reviewerName}</strong> | </span>}
                Chế độ: <strong style={{ color: document.visibility === 'PUBLIC' ? 'var(--success-600)' : 'var(--neutral-600)' }}>{document.visibility || 'PUBLIC'}</strong>
                {document.dmcaVerified && (
                  <span> | <strong style={{ color: 'var(--success-600)' }}>Đã xác minh DMCA</strong> ({new Date(document.dmcaVerifiedAt).toLocaleDateString()})</span>
                )}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={onClose}
              aria-label="Đóng bản xem trước"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--neutral-500)', padding: '4px' }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{
          flex: 1,
          padding: '1.5rem',
          overflow: 'auto',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: 0,
          width: '100%'
        }}>
          {document.reports && document.reports.length > 0 && (
            <div style={{ width: '100%', marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--error-50)', border: '1px solid var(--error-200)', borderRadius: '8px' }}>
              <h4 style={{ color: 'var(--error-700)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={18} /> Báo cáo vi phạm ({document.reports.length})
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--error-600)', fontSize: '14px' }}>
                {document.reports.map((report, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    <strong>{getViolationReason(report.reason || report.type).label}</strong>
                    {report.details || report.description ? `: ${report.details || report.description}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '4rem', color: 'var(--neutral-500)' }}>Đang tải bản xem trước tài liệu...</div>
          ) : previewData?.previewMode === 'IMAGE' && fileUrl ? (
            <img src={fileUrl} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
          ) : previewData?.previewMode === 'PDF' && fileUrl ? (
            <iframe src={`${fileUrl}#toolbar=0`} style={{ width: '100%', height: '100%', flex: 1, minHeight: 0, border: 'none', borderRadius: '8px' }} title="PDF Preview" />
          ) : previewData?.previewMode === 'OFFICE' && previewData?.previewUrl ? (
            <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewData.previewUrl)}`} style={{ width: '100%', height: '100%', flex: 1, minHeight: 0, border: 'none', borderRadius: '8px' }} title="Office Preview" />
          ) : previewData?.previewMode === 'TEXT' && previewData?.textContent ? (
            <div style={{ width: '100%', padding: '1.5rem', backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '8px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: '500px', overflowY: 'auto' }}>
              {previewData.textContent}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--neutral-500)' }}>
              <FileText size={56} style={{ opacity: 0.4, marginBottom: '1rem' }} />
              <p style={{ margin: 0 }}>Không có bản xem trước trực tiếp cho định dạng tệp này.</p>
              <Button variant="outline" style={{ marginTop: '1rem' }} onClick={handleDownload}>
                <Download size={16} style={{ marginRight: '6px' }} /> Tải xuống tệp gốc để xem
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--neutral-200)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          flexShrink: 0,
          backgroundColor: '#ffffff'
        }}>
          <Button variant="outline" onClick={handleDownload}>
            <Download size={16} style={{ marginRight: '6px' }} /> Tải xuống
          </Button>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={onClose}>Đóng</Button>
            {document.visibility === 'PUBLIC' && document.approvalStatus !== 'DMCA_TAKEN_DOWN' && onDmcaTakedown && (
              <Button 
                variant="primary" 
                style={{ backgroundColor: 'var(--error-700)', color: 'white' }} 
                onClick={() => { onClose(); onDmcaTakedown(document.id); }}
              >
                <AlertTriangle size={16} style={{ marginRight: '6px' }} /> Gỡ bỏ khẩn cấp (DMCA)
              </Button>
            )}
            {onDelete && <Button
              variant="primary" 
              style={{ backgroundColor: 'var(--error-600)', color: 'white' }} 
              onClick={() => { onClose(); onDelete(document.id); }}
            >
              <Trash2 size={16} style={{ marginRight: '6px' }} /> Xóa tài liệu vi phạm
            </Button>}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(previewOverlay, globalThis.document.body);
};

export default AdminDocumentPreviewModal;
