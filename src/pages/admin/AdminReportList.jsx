import React, { useState, useEffect } from 'react';
import { Flag, Filter, XCircle, FileText, CheckCircle, Clock, Eye, AlertTriangle } from 'lucide-react';
import adminService from '../../services/admin.service';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import AdminDocumentPreviewModal from './AdminDocumentPreviewModal';
import { VIOLATION_REASONS, getViolationReason } from '../../utils/violationReasons';

const AdminReportList = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filterStatus, setFilterStatus] = useState('ALL'); // PENDING, RESOLVED, DISMISSED, ALL
  const [filterReason, setFilterReason] = useState('');
  
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [decision, setDecision] = useState('RESOLVED');
  const [moderatorNote, setModeratorNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const getReasonLabel = (id) => {
    return getViolationReason(id).label;
  };

  useEffect(() => {
    fetchReports();
  }, [filterStatus, filterReason, page]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        size: 20
      };
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (filterReason) params.reason = filterReason;
      
      const data = await adminService.getReports(params);
      setReports(data?.content || []);
      setTotalPages(data?.totalPages || 0);
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối khi lấy danh sách báo cáo.');
    } finally {
      setLoading(false);
    }
  };

  const openResolveModal = (report) => {
    setSelectedReport(report);
    setDecision('RESOLVED');
    setModeratorNote('');
    setResolveModalOpen(true);
  };

  const handleResolve = async () => {
    if (!decision) return;
    if (decision === 'RESOLVED' && moderatorNote.trim().length < 20) {
      alert('Vui lòng nhập lý do xử lý chi tiết (ít nhất 20 ký tự) để người tải lên hiểu rõ vi phạm.');
      return;
    }
    setIsProcessing(true);
    try {
      await adminService.resolveReport(selectedReport.reportId, decision, moderatorNote);
      setResolveModalOpen(false);
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      alert('Lỗi xử lý báo cáo: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="premium-page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Quản lý Báo cáo Vi phạm</h1>
        <p className="page-description">Theo dõi và xử lý các báo cáo vi phạm nội dung hoặc bản quyền từ cộng đồng.</p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => { setFilterStatus('ALL'); setPage(0); }} 
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: filterStatus === 'ALL' ? 'var(--primary-600)' : '#ffffff',
            color: filterStatus === 'ALL' ? '#ffffff' : 'var(--neutral-700)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap'
          }}
        >
          <Flag size={18} /> Tất cả Báo cáo
        </button>
        <button 
          onClick={() => { setFilterStatus('PENDING'); setPage(0); }} 
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: filterStatus === 'PENDING' ? 'var(--primary-600)' : '#ffffff',
            color: filterStatus === 'PENDING' ? '#ffffff' : 'var(--neutral-700)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap'
          }}
        >
          <Clock size={18} /> Chờ xử lý
        </button>
        <button 
          onClick={() => { setFilterStatus('RESOLVED'); setPage(0); }} 
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: filterStatus === 'RESOLVED' ? 'var(--primary-600)' : '#ffffff',
            color: filterStatus === 'RESOLVED' ? '#ffffff' : 'var(--neutral-700)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap'
          }}
        >
          <CheckCircle size={18} /> Đã gỡ tài liệu
        </button>
        <button 
          onClick={() => { setFilterStatus('DISMISSED'); setPage(0); }} 
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: filterStatus === 'DISMISSED' ? 'var(--primary-600)' : '#ffffff',
            color: filterStatus === 'DISMISSED' ? '#ffffff' : 'var(--neutral-700)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            whiteSpace: 'nowrap'
          }}
        >
          <XCircle size={18} /> Bị bác bỏ
        </button>
      </div>

      <div className="dashboard-section glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div className="header-search" style={{ flex: 1, backgroundColor: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center' }}>
            <Filter size={18} color="var(--neutral-400)" style={{ marginLeft: '1rem' }} />
            <select 
              className="form-control" 
              style={{ padding: '0.75rem', width: '100%', border: 'none', backgroundColor: 'transparent', outline: 'none', color: 'var(--neutral-700)' }}
              value={filterReason}
              onChange={(e) => { setFilterReason(e.target.value); setPage(0); }}
            >
              <option value="">Tất cả lý do vi phạm</option>
              {VIOLATION_REASONS.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
          <Button variant="outline" onClick={fetchReports}>
            Làm mới
          </Button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--error-50)', color: 'var(--error-600)', padding: '2rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
            <XCircle size={40} color="var(--error-500)" />
            <div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--error-700)' }}>Đã xảy ra lỗi</h3>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
            <Button onClick={fetchReports} style={{ backgroundColor: 'var(--error-600)', color: 'white', border: 'none', marginTop: '8px' }}>Thử lại</Button>
          </div>
        )}

        {loading ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', color: 'var(--neutral-600)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Tài liệu</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Người báo cáo</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Lý do</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Thời gian</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Trạng thái</th>
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
                  <th style={{ padding: '1rem 0.5rem' }}>Tài liệu</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Người báo cáo</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Lý do</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Thời gian</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Trạng thái</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--neutral-500)', backgroundColor: '#ffffff' }}>
                      <div style={{ width: '64px', height: '64px', margin: '0 auto 1rem', backgroundColor: 'var(--neutral-50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Flag size={32} color="var(--neutral-400)" />
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', color: 'var(--neutral-700)', fontSize: '16px' }}>Không có báo cáo nào</h4>
                      <p style={{ margin: 0, fontSize: '14px' }}>Tuyệt vời! Không có báo cáo vi phạm nào cần xử lý hoặc tìm thấy.</p>
                    </td>
                  </tr>
                ) : (
                  reports.map(report => (
                    <tr key={report.reportId} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={20} color="var(--primary-500)" />
                        <span style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {report.documentTitle || report.documentId}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--neutral-600)' }}>
                        {report.reporterName || report.reporterEmail || 'Vô danh'}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>{getReasonLabel(report.reason)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--neutral-500)', marginTop: '3px', maxWidth: '240px' }}>
                          {getViolationReason(report.reason).guidance}
                        </div>
                        {report.description && (
                          <div style={{ fontSize: '12px', color: 'var(--neutral-500)', marginTop: '4px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={report.description}>
                            {report.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--neutral-600)' }}>
                        {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: vi }) : '-'}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: report.status === 'PENDING' ? 'var(--warning-50)' : report.status === 'RESOLVED' ? 'var(--error-50)' : 'var(--neutral-100)',
                          color: report.status === 'PENDING' ? 'var(--warning-600)' : report.status === 'RESOLVED' ? 'var(--error-600)' : 'var(--neutral-600)'
                        }}>
                          {report.status === 'PENDING' && 'Chờ xử lý'}
                          {report.status === 'RESOLVED' && 'Đã gỡ'}
                          {report.status === 'DISMISSED' && 'Bác bỏ'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <Button variant="outline" style={{ padding: '6px 10px', fontSize: '13px' }} onClick={() => setPreviewDoc({
                            id: report.documentId,
                            title: report.documentTitle || `Tài liệu #${report.documentId}`,
                            uploaderFullName: report.uploaderName,
                            uploaderEmail: report.uploaderEmail,
                            reports: [report]
                          })}>
                            <Eye size={15} /> Xem
                          </Button>
                          {report.status === 'PENDING' && (
                            <Button variant="outline" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => openResolveModal(report)}>
                              Xử lý
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal 
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="Xử lý báo cáo vi phạm"
        footer={
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="outline" onClick={() => setResolveModalOpen(false)}>Hủy</Button>
            <Button style={{ backgroundColor: 'var(--primary-600)', color: 'white' }} onClick={handleResolve} isLoading={isProcessing}>Xác nhận xử lý</Button>
          </div>
        }
      >
        {selectedReport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--neutral-800)' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--neutral-50)', borderRadius: '8px', border: '1px solid var(--neutral-200)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--neutral-800)' }}>Thông tin báo cáo</h4>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--neutral-700)' }}><strong>Tài liệu:</strong> {selectedReport.documentTitle || selectedReport.documentId}</p>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--neutral-700)' }}><strong>Lý do:</strong> {getReasonLabel(selectedReport.reason)}</p>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--neutral-700)' }}><strong>Mô tả:</strong> {selectedReport.description || 'Không có'}</p>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--neutral-600)', display: 'flex', gap: '6px' }}>
                <AlertTriangle size={16} /> Tiêu chí: {getViolationReason(selectedReport.reason).guidance}
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Quyết định xử lý <span style={{ color: 'var(--error-500)' }}>*</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: `1px solid ${decision === 'RESOLVED' ? 'var(--error-300)' : 'var(--neutral-200)'}`, backgroundColor: decision === 'RESOLVED' ? 'var(--error-50)' : 'white', cursor: 'pointer' }}>
                  <input type="radio" name="decision" value="RESOLVED" checked={decision === 'RESOLVED'} onChange={(e) => setDecision(e.target.value)} style={{ accentColor: 'var(--error-600)' }} />
                  <div>
                    <strong style={{ color: 'var(--error-700)', display: 'block' }}>Đồng ý báo cáo (Gỡ tài liệu)</strong>
                    <span style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>Hệ thống sẽ tự động gỡ bỏ tài liệu này khỏi cộng đồng.</span>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: `1px solid ${decision === 'DISMISSED' ? 'var(--neutral-300)' : 'var(--neutral-200)'}`, backgroundColor: decision === 'DISMISSED' ? 'var(--neutral-50)' : 'white', cursor: 'pointer' }}>
                  <input type="radio" name="decision" value="DISMISSED" checked={decision === 'DISMISSED'} onChange={(e) => setDecision(e.target.value)} />
                  <div>
                    <strong style={{ color: 'var(--neutral-700)', display: 'block' }}>Bác bỏ báo cáo (Giữ nguyên)</strong>
                    <span style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>Báo cáo không chính xác, tài liệu không vi phạm.</span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                Lý do xử lý gửi người tải lên {decision === 'RESOLVED' && <span style={{ color: 'var(--error-500)' }}>*</span>}
              </label>
              <textarea 
                className="form-control" 
                style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px', border: '1px solid var(--neutral-300)' }} 
                placeholder="Nêu rõ nội dung vi phạm, bằng chứng/vị trí và hành động xử lý để người tải lên có thể khắc phục..."
                value={moderatorNote}
                onChange={(e) => setModeratorNote(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
      <AdminDocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  );
};

export default AdminReportList;
