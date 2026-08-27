import React, { useState, useEffect } from 'react';
import { FileText, Search, Trash2, Eye, Download, AlertCircle, Activity, Globe, ListFilter } from 'lucide-react';
import adminService from '../../services/admin.service';
import Button from '../../components/Button/Button';
import ConfirmDeleteModal from '../../components/Modal/ConfirmDeleteModal';
import Modal from '../../components/Modal/Modal';
import AdminDocumentPreviewModal from './AdminDocumentPreviewModal';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { sortDocuments } from '../../utils/documentSort';

const ModeratorDocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sortOption, setSortOption] = useState('createdAt,desc');
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPublic, setTotalPublic] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PUBLIC' | 'REVIEW'

  const [deleteDocId, setDeleteDocId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewStatusDoc, setViewStatusDoc] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [docToReject, setDocToReject] = useState(null);

  const renderStatusBadge = (doc) => {
    const docStatus = doc.approvalStatus || (doc.visibility === 'PUBLIC' ? 'APPROVED' : 'PRIVATE');

    switch (docStatus) {
      case 'PENDING':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: 'var(--warning-50, #fef3c7)',
            color: 'var(--warning-700, #b45309)',
            display: 'inline-block'
          }}>
            Chờ duyệt
          </span>
        );
      case 'APPROVED':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: 'var(--success-50, #ecfdf5)',
            color: 'var(--success-700, #047857)',
            display: 'inline-block'
          }}>
            Đã duyệt
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: 'var(--error-50, #fef2f2)',
            color: 'var(--error-700, #b91c1c)',
            display: 'inline-block'
          }} title={doc.rejectionReason ? `Lý do: ${doc.rejectionReason}` : ''}>
            Bị từ chối
          </span>
        );
      case 'DMCA_TAKEN_DOWN':
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: 'var(--error-100, #fee2e2)',
            color: 'var(--error-800, #991b1b)',
            display: 'inline-block'
          }} title={doc.rejectionReason ? `Lý do gỡ bỏ: ${doc.rejectionReason}` : "Bị gỡ bỏ do vi phạm bản quyền (DMCA)"}>
            Gỡ bỏ (DMCA)
          </span>
        );
      case 'PRIVATE':
      default:
        return (
          <span style={{
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: 'var(--neutral-100, #f3f4f6)',
            color: 'var(--neutral-600, #4b5563)',
            display: 'inline-block'
          }}>
            Riêng tư
          </span>
        );
    }
  };

  const handleApprove = async (id) => {
    setIsProcessing(true);
    try {
      await adminService.approveDocument(id);
      alert('Tài liệu đã được duyệt thành công!');
      fetchDocuments();
    } catch (err) {
      alert('Lỗi duyệt tài liệu: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (doc) => {
    setDocToReject(doc);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    setIsProcessing(true);
    try {
      await adminService.rejectDocument(docToReject.id, rejectReason);
      alert('Đã từ chối tài liệu thành công!');
      setRejectModalOpen(false);
      setDocToReject(null);
      fetchDocuments();
    } catch (err) {
      alert('Lỗi từ chối tài liệu: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDmcaTakedown = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn gỡ bỏ tài liệu này do vi phạm DMCA?')) return;
    setIsProcessing(true);
    try {
      await adminService.dmcaTakedown(id);
      alert('Đã gỡ bỏ tài liệu do vi phạm DMCA thành công!');
      fetchDocuments();
    } catch (err) {
      alert('Lỗi gỡ bỏ DMCA: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllDocuments(keyword, page, 20, sortOption);
      setDocuments(data?.content || data?.data || data || []);

      let total = 0;
      if (data?.totalElements !== undefined && data.totalElements !== null) {
        total = data.totalElements;
      } else if (data?.total !== undefined && data.total !== null) {
        total = data.total;
      } else {
        total = data?.content?.length || data?.data?.length || data?.length || 0;
      }

      if (total <= 20) {
        adminService.getDashboardStats().then(stats => {
          if (stats && stats.totalDocuments && !keyword) {
            setTotalElements(stats.totalDocuments);
          } else {
            setTotalElements(total);
          }
        }).catch(() => setTotalElements(total));
      } else {
        setTotalElements(total);
      }

    } catch (err) {
      setError('Lỗi kết nối máy chủ hoặc hệ thống phản hồi chậm.');
      console.error(err);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, sortOption]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 0) fetchDocuments();
      else setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (page === 0) fetchDocuments();
    else setPage(0);
  };

  const confirmDelete = async (idToDelete) => {
    const docId = idToDelete || deleteDocId;
    if (!docId) return;
    setIsProcessing(true);
    try {
      await adminService.deleteDocument(docId);
      setDeleteDocId(null);
      setPreviewDoc(null);
      fetchDocuments();
    } catch (err) {
      alert('Lỗi xóa tài liệu: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewStatus = async (doc) => {
    setViewStatusDoc(doc);
    setLoadingStatus(true);
    try {
      const statusData = await adminService.getUploadStatus(doc.id);
      setUploadStatus(statusData);
    } catch (err) {
      console.error('Lỗi khi tải trạng thái upload:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const filteredDocuments = sortDocuments(documents.filter(doc => {
    const status = doc.approvalStatus || doc.status || (doc.visibility === 'PUBLIC' ? 'APPROVED' : 'PRIVATE');
    if (activeTab === 'PENDING') return doc.visibility === 'PUBLIC' && (status === 'PENDING' || doc.processingStatus === 'PENDING');
    if (activeTab === 'APPROVED') return doc.visibility === 'PUBLIC' && status === 'APPROVED';
    if (activeTab === 'REJECTED') return status === 'REJECTED';
    return true;
  }), sortOption);

  const getFileIcon = (fileType) => {
    return <FileText size={20} color="var(--primary-500)" />;
  };

  return (
    <div className="premium-page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Kiểm duyệt Tài liệu (Moderator)</h1>
        <p className="page-description">Quản lý danh sách tài liệu Public từ người dùng và kiểm duyệt xem trước nội dung.</p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('ALL')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: activeTab === 'ALL' ? 'var(--primary-600)' : '#ffffff',
            color: activeTab === 'ALL' ? '#ffffff' : 'var(--neutral-700)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap'
          }}
        >
          <ListFilter size={18} /> Tất cả Tài liệu
        </button>
        <button
          onClick={() => setActiveTab('PENDING')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: activeTab === 'PENDING' ? 'var(--primary-600)' : '#ffffff',
            color: activeTab === 'PENDING' ? '#ffffff' : 'var(--neutral-700)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap'
          }}
        >
          <AlertCircle size={18} /> Chờ duyệt
        </button>
        <button
          onClick={() => setActiveTab('APPROVED')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: activeTab === 'APPROVED' ? 'var(--primary-600)' : '#ffffff',
            color: activeTab === 'APPROVED' ? '#ffffff' : 'var(--neutral-700)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap'
          }}
        >
          <Globe size={18} /> Đã duyệt (Public)
        </button>
        <button
          onClick={() => setActiveTab('REJECTED')}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: activeTab === 'REJECTED' ? 'var(--primary-600)' : '#ffffff',
            color: activeTab === 'REJECTED' ? '#ffffff' : 'var(--neutral-700)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap'
          }}
        >
          <Trash2 size={18} /> Bị từ chối
        </button>
      </div>

      <div className="dashboard-section glass-card" style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="header-search" style={{ flex: '1 1 280px', backgroundColor: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 'var(--radius-md)' }}>
            <Search size={18} color="var(--neutral-400)" style={{ marginLeft: '1rem' }} />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu theo tên..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ padding: '0.75rem', width: '100%', border: 'none', backgroundColor: 'transparent', outline: 'none' }}
            />
          </div>
          <select
            aria-label="Sắp xếp tài liệu"
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setPage(0);
            }}
            style={{
              minWidth: '190px',
              padding: '0.75rem 2.25rem 0.75rem 0.875rem',
              border: '1px solid var(--neutral-200)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#ffffff',
              color: 'var(--neutral-700)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="createdAt,desc">Mới nhất</option>
            <option value="createdAt,asc">Cũ nhất</option>
            <option value="title,asc">Tên: A → Z</option>
            <option value="title,desc">Tên: Z → A</option>
          </select>
          <Button type="submit">Tìm kiếm</Button>
        </form>

        {error && (
          <div style={{ backgroundColor: 'var(--error-50)', color: 'var(--error-600)', padding: '2rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
            <AlertCircle size={40} color="var(--error-500)" />
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--error-700)' }}>Đã xảy ra lỗi</h3>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
            <Button onClick={fetchDocuments} style={{ backgroundColor: 'var(--error-600)', color: 'white', border: 'none', marginTop: '8px' }}>Thử lại</Button>
          </div>
        )}

        {loading ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', color: 'var(--neutral-600)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Tên tài liệu</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Người đăng</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Trạng thái</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Môn học</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Thời gian</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                    {Array.from({ length: 6 }).map((_, colIdx) => (
                      <td key={colIdx} style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ height: '20px', backgroundColor: 'var(--neutral-200)', borderRadius: '4px', animation: 'skeleton-pulse 1.5s infinite', width: colIdx === 0 ? '70%' : '100%' }}></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', color: 'var(--neutral-600)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Tên tài liệu</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Người đăng</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Trạng thái</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Môn học</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Thời gian</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--neutral-500)', backgroundColor: '#ffffff' }}>
                      <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem', backgroundColor: 'var(--neutral-50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Search size={32} color="var(--neutral-400)" />
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', color: 'var(--neutral-700)', fontSize: '16px' }}>Không tìm thấy tài liệu nào</h4>
                      <p style={{ margin: 0, fontSize: '14px' }}>Thử thay đổi từ khóa hoặc bộ lọc để xem các kết quả khác.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map(doc => {
                    const docStatus = doc.approvalStatus || (doc.visibility === 'PUBLIC' ? 'APPROVED' : 'PRIVATE');

                    return (
                      <tr key={doc.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {getFileIcon(doc.fileType)}
                          <span style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {doc.title}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--neutral-600)' }}>{doc.uploaderFullName || doc.ownerName || doc.authorName || doc.uploadedBy || doc.user?.fullName || doc.uploaderEmail || 'Người dùng vô danh'}</td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          {renderStatusBadge(doc)}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--neutral-600)' }}>{doc.subject || '-'}</td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--neutral-600)' }}>
                          {doc.createdAt ? formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: vi }) : '-'}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            {/* Nút Xem (Eye) */}
                            <button
                              title="Xem trước tài liệu (Moderator Preview)"
                              onClick={() => setPreviewDoc(doc)}
                              style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)' }}
                            >
                              <Eye size={16} />
                            </button>

                            {activeTab === 'PENDING' && (
                              <>
                                
                                <button
                                  title="Duyệt tài liệu (Approve)"
                                  onClick={() => handleApprove(doc.id)}
                                  style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--success-50)', color: 'var(--success-600)' }}
                                >
                                  <Globe size={16} />
                                </button>
                                <button
                                  title="Từ chối tài liệu (Reject)"
                                  onClick={() => openRejectModal(doc)}
                                  style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--warning-50)', color: 'var(--warning-600)' }}
                                >
                                  <AlertCircle size={16} />
                                </button>
                              </>
                            )}

                            {activeTab === 'APPROVED' && (
                              <>
                                <button
                                  title="Gỡ bỏ khẩn cấp (DMCA)"
                                  onClick={() => handleDmcaTakedown(doc.id)}
                                  style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--error-100)', color: 'var(--error-700)' }}
                                >
                                  <AlertCircle size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Moderator Document Preview Modal */}
      <AdminDocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
        onDelete={(id) => confirmDelete(id)}
        onDmcaTakedown={(id) => handleDmcaTakedown(id)}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteDocId}
        onClose={() => setDeleteDocId(null)}
        onConfirm={() => confirmDelete(deleteDocId)}
        isDeleting={isProcessing}
        title="Xóa Tài liệu Vi phạm"
        message="Cảnh báo: Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này khỏi hệ thống? Hành động này không thể hoàn tác."
      />

      <Modal
        isOpen={!!viewStatusDoc}
        onClose={() => { setViewStatusDoc(null); setUploadStatus(null); }}
        title="Trạng thái Upload Tài liệu"
        footer={
          <Button variant="outline" onClick={() => { setViewStatusDoc(null); setUploadStatus(null); }}>Đóng</Button>
        }
      >
        {loadingStatus ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải trạng thái...</div>
        ) : uploadStatus ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>TÊN TÀI LIỆU</p>
              <p style={{ margin: 0, color: 'var(--neutral-800)', fontWeight: 500 }}>{viewStatusDoc?.title}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>TRẠNG THÁI HIỆN TẠI</p>
              <p style={{ margin: 0, fontWeight: 500, color: uploadStatus.processingStatus === 'COMPLETED' ? 'var(--success-600)' : uploadStatus.processingStatus === 'FAILED' ? 'var(--error-600)' : 'var(--warning-600)' }}>
                {uploadStatus.processingStatus}
              </p>
            </div>
            {uploadStatus.errorMessage && (
              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>LỖI (NẾU CÓ)</p>
                <p style={{ margin: 0, color: 'var(--error-600)', fontWeight: 500, fontSize: '13px', backgroundColor: 'var(--error-50)', padding: '0.5rem', borderRadius: '4px' }}>
                  {uploadStatus.errorMessage}
                </p>
              </div>
            )}
            <div>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>SỐ TRANG</p>
              <p style={{ margin: 0, color: 'var(--neutral-800)', fontWeight: 500 }}>{uploadStatus.totalPages || 0} trang</p>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-500)' }}>Không có thông tin trạng thái.</div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Từ chối tài liệu"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Hủy</Button>
            <Button style={{ backgroundColor: 'var(--danger-600)', color: 'white' }} onClick={handleReject} disabled={isProcessing}>Xác nhận từ chối</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
          <p style={{ margin: 0, color: 'var(--neutral-700)' }}>
            Vui lòng nhập lý do từ chối tài liệu <strong>{docToReject?.title}</strong>. Lý do này sẽ được gửi đến người đăng.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ví dụ: Tài liệu vi phạm bản quyền, nội dung không phù hợp..."
            style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--neutral-300)' }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ModeratorDocumentList;
