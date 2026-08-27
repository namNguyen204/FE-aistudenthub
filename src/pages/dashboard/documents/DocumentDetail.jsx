import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Edit, Trash2, ArrowLeft, FileText, Calendar, HardDrive, Folder, MessageSquare, Edit3, History, RefreshCw, Eye } from 'lucide-react';
import documentService from '../../../services/document.service';
import folderService from '../../../services/folder.service';
import Button from '../../../components/Button/Button';
import Modal from '../../../components/Modal/Modal';
import ConfirmDeleteModal from '../../../components/Modal/ConfirmDeleteModal';
import Input from '../../../components/Input/Input';
import OnlyOfficeEditor from '../../../components/OnlyOfficeEditor/OnlyOfficeEditor';
import ShareDocumentModal from '../../../components/Modal/ShareDocumentModal';
import ReportDocumentModal from '../../../components/Modal/ReportDocumentModal';
import { validateForm, ruleRequired } from '../../../utils/validation';
import { Flag } from 'lucide-react';
import './DocumentDetail.css';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // OnlyOffice state
  const [isOnlyOfficeOpen, setIsOnlyOfficeOpen] = useState(false);
  const [onlyOfficeConfig, setOnlyOfficeConfig] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [folders, setFolders] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    major: '',
    documentType: '',
    visibility: '',
    folderId: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchDocumentData();
    fetchVersionsData();
    loadFolders();

    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [id]);

  const fetchVersionsData = async () => {
    setVersionsLoading(true);
    try {
      const data = await documentService.getVersions(id);
      setVersions(data || []);
    } catch (err) {
      console.error("Failed to load versions", err);
    } finally {
      setVersionsLoading(false);
    }
  };

  const refreshVersions = async () => {
    setRefreshing(true);
    try {
      // Re-fetch document to get latest currentVersionId and other metadata
      const data = await documentService.getById(id);
      setDoc(data);
      // Re-fetch versions
      await fetchVersionsData();
    } catch (err) {
      console.error("Failed to refresh versions", err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadFolders = async () => {
    try {
      const data = await folderService.getFolders();
      setFolders(data || []);
    } catch (err) {
      console.error("Failed to load folders");
    }
  };

  const fetchDocumentData = async () => {
    try {
      const data = await documentService.getById(id);
      setDoc(data);
      setFormData({
        title: data.title || '',
        description: data.description || '',
        subject: data.subject || '',
        major: data.major || '',
        documentType: data.documentType || 'LECTURE',
        visibility: data.visibility || 'PRIVATE',
        folderId: data.folderId || ''
      });

      const preview = await documentService.getPreview(id);
      setPreviewData(preview);

      if (preview && (preview.previewMode === 'PDF' || preview.previewMode === 'IMAGE')) {
        fetchFileStream();
      } else {
        setStreamLoading(false);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to load document details');
      setLoading(false);
    }
  };

  const fetchFileStream = async () => {
    try {
      setStreamLoading(true);
      const blob = await documentService.stream(id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
      }
    } catch (err) {
      console.error("Failed to stream document", err);
    } finally {
      setStreamLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const url = await documentService.getDownloadUrl(id);
      if (url) window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to download document', err);
      alert('Failed to download document');
    }
  };

  const handleUpdate = async () => {
    const errors = validateForm(formData, { title: [ruleRequired('Title is required')] });
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const payload = {
        ...formData,
        folderId: formData.folderId || null
      };
      const updatedDoc = await documentService.update(id, payload);
      setDoc(updatedDoc);
      setIsEditModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update document');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await documentService.delete(id);
      setIsDeleteModalOpen(false);
      navigate('/dashboard/my');
    } catch (err) {
      alert('Failed to delete document');
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleDirectEdit = async () => {
    setIsConfigLoading(true);
    try {
      const config = await documentService.getOnlyOfficeConfig(id);
      if (config) {
        setOnlyOfficeConfig(config);
        setIsOnlyOfficeOpen(true);
      } else {
        alert('Không lấy được cấu hình soạn thảo.');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Lỗi khi kết nối đến trình soạn thảo trực tuyến');
    } finally {
      setIsConfigLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Đang tải tài liệu...</div>;
  if (error || !doc) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--error-600)' }}>{error}</div>;

  return (
    <div className="document-detail-container">
      <div className="preview-section">
        <div className="preview-header">
          <Button variant="outline" onClick={() => navigate(-1)} style={{ padding: '6px 12px' }}>
            <ArrowLeft size={16} style={{ marginRight: '4px' }} /> Quay lại
          </Button>
          <h2 className="preview-title" title={doc.fileName}>{doc.fileName}</h2>

        </div>

        <div className="preview-content">
          {streamLoading ? (
            <div style={{ color: 'white' }}>Đang tải bản xem trước...</div>
          ) : previewData?.previewMode === 'IMAGE' && fileUrl ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', backgroundColor: '#fff' }}>
              <img src={fileUrl} alt="Document Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ) : previewData?.previewMode === 'PDF' && fileUrl ? (
            <iframe src={`${fileUrl}#toolbar=0`} className="pdf-iframe" title="PDF Preview" />
          ) : previewData?.previewMode === 'OFFICE' ? (
            <OnlyOfficeEditor documentId={id} />
          ) : previewData?.previewMode === 'TEXT' && previewData?.textContent ? (
            <div style={{ padding: '1.5rem', width: '100%', height: '100%', overflowY: 'auto', backgroundColor: '#fff', color: '#333', textAlign: 'left', fontFamily: 'monospace', whiteSpace: 'pre-wrap', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-200)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neutral-600)' }}>Chế độ xem văn bản</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {previewData.textContent}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--neutral-400)', textAlign: 'center', padding: '2rem' }}>
              <FileText size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <p>{previewData?.message || 'Không có bản xem trước cho loại tệp này.'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="metadata-section">
        <div className="metadata-header">
          <h1 className="metadata-title">{doc.title}</h1>
          <p className="metadata-description">{doc.description || 'Không có mô tả.'}</p>
        </div>

        <div className="metadata-body">
          <div className="meta-item">
            <span className="meta-label">Môn học & Chuyên ngành</span>
            <div className="meta-value">
              {doc.subject ? <span className="meta-badge">{doc.subject}</span> : '-'}
              {doc.major && <span className="meta-badge" style={{ backgroundColor: 'var(--neutral-100)', color: 'var(--neutral-700)' }}>{doc.major}</span>}
            </div>
          </div>

          <div className="meta-item">
            <span className="meta-label">Loại tài liệu</span>
            <span className="meta-value"><FileText size={16} color="var(--primary-500)" /> {doc.documentType}</span>
          </div>

          {doc.folderId && (
            <div className="meta-item">
              <span className="meta-label">Thư mục</span>
              <span className="meta-value"><Folder size={16} color="#f59e0b" /> Đã lưu trong Thư mục</span>
            </div>
          )}

          <div className="meta-item">
            <span className="meta-label">Kích thước tệp</span>
            <span className="meta-value"><HardDrive size={16} color="var(--neutral-500)" /> {formatFileSize(doc.fileSize)}</span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Ngày tải lên</span>
            <span className="meta-value"><Calendar size={16} color="var(--neutral-500)" /> {new Date(doc.createdAt).toLocaleString()}</span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Phiên bản</span>
            <span className="meta-value" style={{ fontWeight: 600, color: 'var(--primary-600)' }}>v{versions.length + 1 || '1.0'}</span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Quyền riêng tư</span>
            <span className="meta-value">{doc.visibility === 'PUBLIC' ? 'Công khai (Đã chia sẻ)' : 'Riêng tư (Chỉ mình bạn)'}</span>
          </div>
        </div>

        <div className="metadata-footer">
          <Button variant="primary" style={{ width: '100%', backgroundColor: 'var(--primary-600)', color: 'white', marginBottom: '8px' }} onClick={() => setIsShareModalOpen(true)}>
            <MessageSquare size={16} style={{ marginRight: '6px' }} /> Chia sẻ Tài liệu
          </Button>

          <Button variant="outline" style={{ width: '100%', marginBottom: '8px', borderColor: 'var(--primary-500)', color: 'var(--primary-600)' }} onClick={() => navigate('/dashboard/chat', { state: { documentId: doc.id, documentTitle: doc.title } })}>
            <MessageSquare size={16} style={{ marginRight: '6px' }} /> Trò chuyện với Tài liệu này
          </Button>

          <Button variant="outline" style={{ width: '100%', marginBottom: '8px', color: 'var(--neutral-700)', borderColor: 'var(--neutral-300)' }} onClick={handleDownload}>
            <Download size={16} style={{ marginRight: '6px' }} /> Lưu Tài liệu
          </Button>

          <Button variant="outline" style={{ width: '100%' }} onClick={() => setIsEditModalOpen(true)}>
            <Edit size={16} style={{ marginRight: '6px' }} /> Chỉnh sửa Thông tin
          </Button>
          <Button variant="outline" style={{ width: '100%', borderColor: 'var(--error-200)', color: 'var(--error-600)', marginTop: '8px' }} onClick={() => setIsDeleteModalOpen(true)} isLoading={isDeleting}>
            <Trash2 size={16} style={{ marginRight: '6px' }} /> Xóa Tài liệu
          </Button>

          {doc.visibility === 'PUBLIC' && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--neutral-200)', paddingTop: '16px' }}>
              <Button variant="outline" style={{ width: '100%', borderColor: 'transparent', color: 'var(--neutral-500)', fontSize: '13px' }} onClick={() => setIsReportModalOpen(true)}>
                <Flag size={14} style={{ marginRight: '6px' }} /> Báo cáo vi phạm
              </Button>
            </div>
          )}
        </div>

        {/* Version History Section */}
        <div className="version-history-section" style={{ marginTop: '24px', borderTop: '1px solid var(--neutral-200)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--neutral-800)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <History size={16} color="var(--primary-600)" /> Lịch sử Phiên bản
            </h3>
            <button
              onClick={refreshVersions}
              disabled={refreshing}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--neutral-500)' }}
              title="Làm mới lịch sử"
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            </button>
          </div>

          {versionsLoading && versions.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--neutral-500)' }}>Đang tải lịch sử...</div>
          ) : versions.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--neutral-500)' }}>Chưa có lịch sử lưu phiên bản từ ONLYOFFICE.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {versions.map((ver) => {
                const isCurrent = ver.id === doc.currentVersionId;
                return (
                  <div key={ver.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', backgroundColor: isCurrent ? 'var(--primary-50)' : 'var(--neutral-50)', border: `1px solid ${isCurrent ? 'var(--primary-200)' : 'var(--neutral-200)'}`, borderRadius: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neutral-800)' }}>Phiên bản {ver.versionNumber || '-'}</span>
                        {isCurrent && <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)', borderRadius: '10px', fontWeight: 600 }}>Hiện tại</span>}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>
                        {new Date(ver.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {ver.fileUrl && (
                        <>
                          
                          <a href={ver.fileUrl} download style={{ padding: '6px', backgroundColor: '#ffffff', border: '1px solid var(--neutral-200)', borderRadius: '6px', color: 'var(--neutral-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Tải xuống">
                            <Download size={14} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ShareDocumentModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentTitle={doc.title}
        documentId={doc.id}
      />

      <ReportDocumentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        documentTitle={doc.title}
        documentId={doc.id}
      />

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa Thông tin Tài liệu"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
            <Button onClick={handleUpdate}>Lưu Thay Đổi</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Tiêu đề *"
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.target.value });
              if (formErrors.title) setFormErrors({ ...formErrors, title: null });
            }}
            error={formErrors.title}
          />
          <Input
            label="Mô tả"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="edit-form-grid">
            <Input
              label="Môn học"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
            <Input
              label="Chuyên ngành"
              value={formData.major}
              onChange={(e) => setFormData({ ...formData, major: e.target.value })}
            />
          </div>

          <div className="edit-form-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neutral-700)' }}>Thư mục</label>
              <select
                style={{ padding: '10px 14px', border: '1px solid var(--neutral-300)', borderRadius: 'var(--radius-md)' }}
                value={formData.folderId}
                onChange={(e) => setFormData({ ...formData, folderId: e.target.value })}
              >
                <option value="">-- Không có Thư mục --</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neutral-700)' }}>Quyền riêng tư</label>
              <select
                style={{ padding: '10px 14px', border: '1px solid var(--neutral-300)', borderRadius: 'var(--radius-md)' }}
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
              >
                <option value="PRIVATE">Riêng tư</option>
                <option value="PUBLIC">Công khai</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {isOnlyOfficeOpen && onlyOfficeConfig && (
        <OnlyOfficeEditor
          configData={onlyOfficeConfig}
          onClose={() => {
            setIsOnlyOfficeOpen(false);
            fetchFileStream();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title="Xóa Tài liệu"
        message="Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này không? Hành động này không thể hoàn tác."
      />
    </div>
  );
};

export default DocumentDetail;
