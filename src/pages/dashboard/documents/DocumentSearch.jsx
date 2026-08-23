import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Search, FileText, Download, Eye, Plus, Folder, Edit2, Trash2, FolderOpen, ChevronRight, FileCode2, FileSpreadsheet, FileIcon, AlertTriangle, HardDrive
} from 'lucide-react';
import documentService from '../../../services/document.service';
import folderService from '../../../services/folder.service';
import Button from '../../../components/Button/Button';
import Input from '../../../components/Input/Input';
import Modal from '../../../components/Modal/Modal';
import ConfirmDeleteModal from '../../../components/Modal/ConfirmDeleteModal';
import Toast from '../../../components/Toast/Toast';
import { validateForm, ruleRequired } from '../../../utils/validation';
import { useAuth } from '../../../context/AuthContext';
import './DocumentSearch.css';

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

const getFileIcon = (documentType, fileName = '') => {
  const name = fileName.toLowerCase();
  if (name.endsWith('.pdf')) return <FileText size={24} />;
  if (name.endsWith('.doc') || name.endsWith('.docx')) return <FileText size={24} />;
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return <FileSpreadsheet size={24} />;
  if (documentType === 'CODE') return <FileCode2 size={24} />;
  return <FileIcon size={24} />;
};

const getIconClass = (fileName = '') => {
  const name = fileName.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'word';
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ppt';
  return 'other';
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const DocumentSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);

  const [toastMessage, setToastMessage] = useState(location.state?.toastMessage || '');

  const handleCloseToast = () => {
    setToastMessage('');
    window.history.replaceState({}, document.title);
  };

  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    folderId: searchParams.get('folderId') || '',
    documentType: searchParams.get('documentType') || '',
    page: 0,
    size: 12
  });

  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Folder Modal states
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [folderFormData, setFolderFormData] = useState({ name: '', description: '', color: PRESET_COLORS[0] });
  const [folderFormErrors, setFolderFormErrors] = useState({});
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [folderSubmitting, setFolderSubmitting] = useState(false);

  useEffect(() => {
    loadFolders();
  }, []);

  // Sync search parameters with filters state
  useEffect(() => {
    const folderId = searchParams.get('folderId') || '';
    const keyword = searchParams.get('keyword') || '';
    const documentType = searchParams.get('documentType') || '';
    setFilters(prev => {
      if (prev.folderId === folderId && prev.keyword === keyword && prev.documentType === documentType) {
        return prev;
      }
      return {
        ...prev,
        folderId,
        keyword,
        documentType,
        page: 0
      };
    });
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const loadFolders = async () => {
    try {
      const data = await folderService.getFolders();
      setFolders(data || []);
    } catch (error) {
      console.error('Failed to load folders');
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        keyword: filters.keyword,
        folderId: filters.folderId,
        documentType: filters.documentType,
        page: filters.page,
        size: filters.size
      };

      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const data = await documentService.search(params);
      if (data) {
        setDocuments(data.content || []);
        setTotalPages(data.totalPages || 0);
        setTotalElements(data.totalElements || 0);
      }
    } catch (err) {
      console.error('Failed to search documents', err);
      setError('Lỗi kết nối máy chủ hoặc hệ thống phản hồi chậm.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderId) => {
    const newParams = {};
    if (folderId) newParams.folderId = folderId;
    if (filters.keyword) newParams.keyword = filters.keyword;
    if (filters.documentType) newParams.documentType = filters.documentType;
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = {};
    if (filters.folderId) newParams.folderId = filters.folderId;
    if (filters.keyword) newParams.keyword = filters.keyword;
    if (filters.documentType) newParams.documentType = filters.documentType;
    setSearchParams(newParams);
  };

  const handleDownload = async (docId, fileName, e) => {
    e.stopPropagation();
    try {
      const url = await documentService.getDownloadUrl(docId);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Failed to get download URL', err);
      alert('Failed to download document');
    }
  };

  const handlePreview = (docId, e) => {
    e.stopPropagation();
    navigate(`/dashboard/documents/${docId}`);
  };

  // Folder CRUD Handlers
  const handleOpenFolderModal = (folder = null) => {
    setFolderFormErrors({});
    if (folder) {
      setEditingFolderId(folder.id);
      setFolderFormData({
        name: folder.name || '',
        description: folder.description || '',
        color: folder.color || PRESET_COLORS[0]
      });
    } else {
      setEditingFolderId(null);
      setFolderFormData({ name: '', description: '', color: PRESET_COLORS[0] });
    }
    setIsFolderModalOpen(true);
  };

  const handleFolderSubmit = async () => {
    const errors = validateForm(folderFormData, { name: [ruleRequired('Folder name is required')] });
    setFolderFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFolderSubmitting(true);
    try {
      if (editingFolderId) {
        await folderService.updateFolder(editingFolderId, {
          ...folderFormData,
          parentId: folders.find(f => f.id === editingFolderId)?.parentId || null
        });
        setToastMessage('Folder updated successfully!');
      } else {
        await folderService.createFolder({
          ...folderFormData,
          parentId: filters.folderId || null
        });
        setToastMessage('Folder created successfully!');
      }
      setIsFolderModalOpen(false);
      loadFolders();
    } catch (error) {
      console.error('Failed to save folder', error);
    } finally {
      setFolderSubmitting(false);
    }
  };

  const confirmDeleteFolder = (folder, e) => {
    e.stopPropagation();
    setFolderToDelete(folder);
    setIsDeleteFolderModalOpen(true);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    setFolderSubmitting(true);
    try {
      await folderService.deleteFolder(folderToDelete.id);
      setIsDeleteFolderModalOpen(false);
      setFolderToDelete(null);
      loadFolders();
      if (filters.folderId === folderToDelete.id) {
        navigateToFolder('');
      }
    } catch (error) {
      console.error('Failed to delete folder', error);
    } finally {
      setFolderSubmitting(false);
    }
  };

  const getBreadcrumbs = () => {
    const trail = [];
    let currentId = filters.folderId;
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (!folder) break;
      trail.unshift(folder);
      currentId = folder.parentId;
    }
    return trail;
  };

  const isSearching = filters.keyword || filters.documentType;

  const currentFolders = folders.filter(f => {
    if (!filters.folderId) {
      return !f.parentId;
    }
    return f.parentId === filters.folderId;
  });

  const showEmptyState = !isSearching && currentFolders.length === 0 && documents.length === 0;

  let maxDocs = 50;
  let planName = 'Gói Cơ bản';
  if (user?.subscriptionTier === 'PREMIUM') {
    maxDocs = 150;
    planName = 'Gói Chuyên gia';
  } else if (user?.subscriptionTier === 'PRO') {
    maxDocs = 100;
    planName = 'Gói Nâng cao';
  }

  const currentDocs = totalElements || 0;
  const percentUsed = Math.min(Math.round((currentDocs / maxDocs) * 100), 100);

  return (
    <div className="premium-page-wrapper document-search-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              Tài liệu của tôi
              <span style={{ marginLeft: '12px', fontSize: '13px', fontWeight: 600, color: 'var(--primary-600)', backgroundColor: '#f0f5ff', padding: '4px 10px', borderRadius: '16px', border: '1px solid #d6e4ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HardDrive size={14} />
                {currentDocs}/{maxDocs} tài liệu
              </span>
            </h1>
          </div>
          <p className="page-description" style={{ margin: 0 }}>Tìm chính xác những gì bạn cần trên tất cả thư mục và hub.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={() => handleOpenFolderModal()} variant="outline" className="flex-center" style={{ gap: '8px' }}>
            <Plus size={18} /> Tạo Thư mục
          </Button>
          <Button onClick={() => navigate('/dashboard/upload')} className="flex-center" style={{ gap: '8px' }}>
            <FileText size={18} /> Tải lên Tài liệu
          </Button>
        </div>
      </div>

      <Toast message={toastMessage} onClose={handleCloseToast} />

      {/* Dung lượng lưu trữ tài liệu block */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--neutral-200)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neutral-700)', fontWeight: 600 }}>
            <HardDrive size={18} color="var(--primary-600)" />
            Dung lượng lưu trữ tài liệu
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{currentDocs}</span>
            <span style={{ color: 'var(--neutral-500)' }}>/ {maxDocs} tài liệu</span>
            <span style={{ color: 'var(--neutral-400)', fontSize: '14px' }}>({planName})</span>
          </div>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--neutral-100)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${percentUsed}%`, backgroundColor: 'var(--primary-500)', borderRadius: '4px' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-600)' }}>{percentUsed}%</span>
        </div>
      </div>

      <div className="search-header-card">
        <form onSubmit={handleSearchSubmit} className="search-bar-wrapper" style={{ marginBottom: 0 }}>
          <div className="search-input-container">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm theo tiêu đề, mô tả hoặc từ khóa..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <select
            className="filter-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={filters.folderId}
            onChange={(e) => navigateToFolder(e.target.value)}
          >
            <option value="">Tất cả Thư mục</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select
            className="filter-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={filters.documentType}
            onChange={(e) => setFilters(prev => ({ ...prev, documentType: e.target.value, page: 0 }))}
          >
            <option value="">Tất cả Loại</option>
            <option value="LECTURE">Bài giảng</option>
            <option value="ASSIGNMENT">Bài tập</option>
            <option value="EXAM_PREP">Đề cương Ôn thi</option>
            <option value="REFERENCE">Tài liệu Tham khảo</option>
            <option value="OTHER">Khác</option>
          </select>
          <Button type="submit" style={{ padding: '0 32px' }}>Tìm kiếm</Button>
        </form>
      </div>

      {/* Breadcrumbs */}
      {!isSearching && (
        <div className="breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: 'var(--neutral-500)', marginBottom: '8px' }}>
          <span
            style={{ cursor: 'pointer', transition: 'color 0.2s' }}
            className="breadcrumb-link"
            onClick={() => navigateToFolder('')}
          >
            Tài liệu của tôi
          </span>
          {getBreadcrumbs().map((folder, index, array) => (
            <React.Fragment key={folder.id}>
              <ChevronRight size={16} color="var(--neutral-400)" />
              <span
                style={{
                  cursor: index === array.length - 1 ? 'default' : 'pointer',
                  color: index === array.length - 1 ? 'var(--neutral-800)' : 'var(--neutral-500)',
                  fontWeight: index === array.length - 1 ? 600 : 500
                }}
                className={index === array.length - 1 ? '' : 'breadcrumb-link'}
                onClick={() => index === array.length - 1 ? null : navigateToFolder(folder.id)}
              >
                {folder.name}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {loading ? (
        <div className="documents-grid" style={{ marginTop: '2rem' }}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="document-card" style={{ padding: '1.25rem', height: '220px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '48px', backgroundColor: 'var(--neutral-200)', borderRadius: '6px', animation: 'skeleton-pulse 1.5s infinite' }}></div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ height: '20px', width: '80%', backgroundColor: 'var(--neutral-200)', borderRadius: '4px', animation: 'skeleton-pulse 1.5s infinite' }}></div>
                  <div style={{ height: '14px', width: '50%', backgroundColor: 'var(--neutral-100)', borderRadius: '4px', animation: 'skeleton-pulse 1.5s infinite' }}></div>
                </div>
              </div>
              <div style={{ height: '14px', width: '100%', backgroundColor: 'var(--neutral-100)', borderRadius: '4px', animation: 'skeleton-pulse 1.5s infinite', marginBottom: '8px' }}></div>
              <div style={{ height: '14px', width: '70%', backgroundColor: 'var(--neutral-100)', borderRadius: '4px', animation: 'skeleton-pulse 1.5s infinite' }}></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: 'var(--error-50)', borderRadius: '12px', margin: '2rem 0' }}>
          <AlertTriangle size={48} color="var(--error-500)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--error-700)' }}>Đã xảy ra lỗi</h3>
          <p style={{ color: 'var(--error-600)', marginBottom: '1.5rem' }}>{error}</p>
          <Button onClick={fetchDocuments} style={{ backgroundColor: 'var(--error-600)', color: 'white', border: 'none' }}>
            Thử lại
          </Button>
        </div>
      ) : showEmptyState ? (
        <div className="empty-state">
          <FolderOpen size={48} color="var(--neutral-300)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neutral-700)' }}>Thư mục này trống</h3>
          <p style={{ color: 'var(--neutral-500)', marginBottom: '1.5rem' }}>Hãy tạo thư mục con hoặc tải lên tài liệu mới.</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button onClick={() => handleOpenFolderModal()} variant="outline">Tạo Thư mục</Button>
            <Button onClick={() => navigate('/dashboard/upload')}>Tải lên Tài liệu</Button>
          </div>
        </div>
      ) : (
        <>
          {/* Folders Section (Only when not searching) */}
          {!isSearching && currentFolders.length > 0 && (
            <div className="folders-section" style={{ marginBottom: '24px' }}>
              <h2 className="section-title" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neutral-800)', marginBottom: '16px' }}>Thư mục</h2>
              <div className="folder-grid">
                {currentFolders.map(folder => (
                  <div
                    key={folder.id}
                    className="folder-card"
                    style={{ '--folder-color': folder.color || 'var(--primary-500)', cursor: 'pointer' }}
                    onClick={() => navigateToFolder(folder.id)}
                  >
                    <div className="folder-card-header">
                      <div className="folder-icon-wrapper">
                        <Folder size={24} fill="currentColor" />
                      </div>
                      <div className="folder-actions" onClick={e => e.stopPropagation()}>
                        <button className="folder-action-btn" onClick={() => handleOpenFolderModal(folder)} title="Chỉnh sửa">
                          <Edit2 size={16} />
                        </button>
                        <button className="folder-action-btn delete" onClick={(e) => confirmDeleteFolder(folder, e)} title="Xóa">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="folder-content">
                      <h3 className="folder-title" title={folder.name}>{folder.name}</h3>
                      {folder.description && <p className="folder-desc">{folder.description}</p>}
                    </div>

                    <div className="folder-footer">
                      <span>{folder.documentCount || 0} Tài liệu</span>
                      <span>{folder.createdAt ? new Date(folder.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {documents.length > 0 ? (
            <div className="documents-section">
              {!isSearching && currentFolders.length > 0 && (
                <h2 className="section-title" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neutral-800)', marginBottom: '16px' }}>Tài liệu</h2>
              )}
              {isSearching && (
                <div style={{ fontSize: '14px', color: 'var(--neutral-500)', fontWeight: 500, marginBottom: '16px' }}>
                  Tìm thấy {totalElements} tài liệu
                </div>
              )}

              <div className="documents-grid">
                {documents.map(doc => (
                  <div key={doc.id} className="document-card" onClick={(e) => handlePreview(doc.id, e)}>
                    <div className="document-card-header">
                      <div className={`doc-icon-wrapper ${getIconClass(doc.fileName)}`}>
                        {getFileIcon(doc.documentType, doc.fileName)}
                      </div>
                      <div className="doc-info">
                        <h3 className="doc-title" title={doc.title}>{doc.title}</h3>
                        <div className="doc-meta">
                          {doc.subject && <span className="doc-badge">{doc.subject}</span>}
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                        {doc.visibility === 'PUBLIC' && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {(!doc.approvalStatus || doc.approvalStatus === 'PENDING') && <span className="doc-badge" style={{ backgroundColor: 'var(--warning-100)', color: 'var(--warning-700)', padding: '2px 8px', fontSize: '11px', borderRadius: '12px' }}>Chờ duyệt</span>}
                            {doc.approvalStatus === 'APPROVED' && <span className="doc-badge" style={{ backgroundColor: 'var(--success-100)', color: 'var(--success-700)', padding: '2px 8px', fontSize: '11px', borderRadius: '12px' }}>Đã duyệt công khai</span>}
                            {doc.approvalStatus === 'REJECTED' && <span className="doc-badge" style={{ backgroundColor: 'var(--error-100)', color: 'var(--error-700)', padding: '2px 8px', fontSize: '11px', borderRadius: '12px' }} title={`Lý do: ${doc.rejectionReason || 'Không hợp lệ'}`}>Từ chối công khai</span>}
                            {doc.approvalStatus === 'DMCA_TAKEN_DOWN' && <span className="doc-badge" style={{ backgroundColor: 'var(--error-500)', color: 'white', padding: '2px 8px', fontSize: '11px', borderRadius: '12px' }} title={`Lý do: ${doc.rejectionReason || 'Vi phạm bản quyền'}`}>Gỡ bỏ bản quyền</span>}
                          </div>
                        )}
                        {['REJECTED', 'DMCA_TAKEN_DOWN'].includes(doc.approvalStatus) && (
                          <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '8px', backgroundColor: 'var(--error-50)', color: 'var(--error-700)', fontSize: '12px', lineHeight: 1.45 }}>
                            <strong>Lý do vi phạm:</strong> {doc.rejectionReason || doc.moderatorNote || 'Tài liệu không đáp ứng chính sách nội dung. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.'}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="doc-description">
                      {doc.description || 'Không có mô tả cho tài liệu này.'}
                    </p>

                    <div className="doc-footer">
                      <span className="doc-size">{formatFileSize(doc.fileSize)}</span>
                      <div className="doc-actions">
                        <button className="doc-btn" onClick={(e) => handlePreview(doc.id, e)}>
                          <Eye size={16} /> Xem
                        </button>
                        <button className="doc-btn" onClick={(e) => handleDownload(doc.id, doc.fileName, e)}>
                          <Download size={16} /> Lưu
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls">
                  <Button
                    variant="outline"
                    disabled={filters.page === 0}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Trang trước
                  </Button>
                  <span className="pagination-text">Trang {filters.page + 1} trên {totalPages}</span>
                  <Button
                    variant="outline"
                    disabled={filters.page === totalPages - 1}
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Trang tiếp
                  </Button>
                </div>
              )}
            </div>
          ) : (
            isSearching && (
              <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'var(--glass-bg)', borderRadius: 'var(--radius-xl)' }}>
                <FileText size={48} color="var(--neutral-300)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neutral-700)' }}>Không tìm thấy tài liệu nào</h3>
                <p style={{ color: 'var(--neutral-500)' }}>Hãy thử điều chỉnh tiêu chí tìm kiếm hoặc tải lên tài liệu mới.</p>
              </div>
            )
          )}
        </>
      )}

      {/* Create/Edit Folder Modal */}
      <Modal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        title={editingFolderId ? 'Chỉnh sửa Thư mục' : 'Tạo Thư mục mới'}
        footer={
          <>
            <Button variant="text" onClick={() => setIsFolderModalOpen(false)}>Hủy</Button>
            <Button onClick={handleFolderSubmit} isLoading={folderSubmitting}>
              {editingFolderId ? 'Lưu Thay đổi' : 'Tạo Thư mục'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Tên Thư mục"
            placeholder="VD: Tài liệu Machine Learning"
            value={folderFormData.name}
            onChange={(e) => {
              const val = e.target.value;
              setFolderFormData({ ...folderFormData, name: val });
              if (folderFormErrors.name && val.trim()) {
                setFolderFormErrors({ ...folderFormErrors, name: null });
              }
            }}
            onBlur={(e) => {
              if (!e.target.value.trim()) {
                setFolderFormErrors(prev => ({ ...prev, name: 'Tên thư mục là bắt buộc' }));
              }
            }}
            error={folderFormErrors.name}
            required
          />
          <Input
            label="Mô tả (Tùy chọn)"
            placeholder="Thư mục này dùng để làm gì?"
            value={folderFormData.description}
            onChange={(e) => setFolderFormData({ ...folderFormData, description: e.target.value })}
          />
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '4px' }}>
              Màu Thư mục
            </label>
            <div className="color-picker">
              {PRESET_COLORS.map(color => (
                <div
                  key={color}
                  className={`color-option ${folderFormData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFolderFormData({ ...folderFormData, color })}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Folder Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteFolderModalOpen}
        onClose={() => setIsDeleteFolderModalOpen(false)}
        onConfirm={handleDeleteFolder}
        isDeleting={folderSubmitting}
        title="Xóa Thư mục"
        message={<>Bạn có chắc chắn muốn xóa <strong>{folderToDelete?.name}</strong>? Hành động này không thể hoàn tác và sẽ xóa toàn bộ nội dung bên trong.</>}
      />
    </div>
  );
};

export default DocumentSearch;
