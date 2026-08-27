import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, FileText, Download, Eye, Globe, FileCode2, FileSpreadsheet, FileIcon, AlertTriangle } from 'lucide-react';
import documentService from '../../../services/document.service';
import Button from '../../../components/Button/Button';
import './DocumentSearch.css';

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

const CommunityDocuments = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  
  const [filters, setFilters] = useState({
    keyword: searchParams.get('keyword') || '',
    subject: searchParams.get('subject') || '',
    major: searchParams.get('major') || '',
    documentType: searchParams.get('documentType') || '',
    category: searchParams.get('category') || '',
    uploader: searchParams.get('uploader') || '',
    dateFilter: searchParams.get('dateFilter') || '',
    sort: searchParams.get('sort') || 'createdAt,desc',
    page: 0,
    size: 12
  });

  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ subjects: [], majors: [], documentTypes: [] });

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    const keyword = searchParams.get('keyword') || '';
    const subject = searchParams.get('subject') || '';
    const major = searchParams.get('major') || '';
    const documentType = searchParams.get('documentType') || '';
    const category = searchParams.get('category') || '';
    const uploader = searchParams.get('uploader') || '';
    const dateFilter = searchParams.get('dateFilter') || '';
    const sort = searchParams.get('sort') || 'createdAt,desc';
    
    setFilters(prev => {
      if (prev.keyword === keyword && prev.subject === subject && prev.major === major && 
          prev.documentType === documentType && prev.category === category && 
          prev.uploader === uploader && prev.dateFilter === dateFilter && prev.sort === sort) {
        return prev;
      }
      return { ...prev, keyword, subject, major, documentType, category, uploader, dateFilter, sort, page: 0 };
    });
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]); // re-fetch when any filter changes

  const loadFilterOptions = async () => {
    try {
      const options = await documentService.getPublicFilterOptions();
      if (options) {
        setFilterOptions({
          subjects: options.subjects || [],
          majors: options.majors || [],
          documentTypes: options.documentTypes || []
        });
      }
    } catch (error) {
      console.error('Failed to load filter options');
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        keyword: filters.keyword,
        subject: filters.subject,
        major: filters.major,
        documentType: filters.documentType,
        category: filters.category,
        uploader: filters.uploader,
        sort: filters.sort,
        page: filters.page,
        size: filters.size
      };
      
      // Calculate start/end date from dateFilter (today, week, month, etc) if needed, but for now we just pass dateFilter if API supports it or omit.
      if (filters.dateFilter) {
          params.dateFilter = filters.dateFilter;
      }

      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const data = await documentService.getPublicDocuments(params);
      if (data) {
        const docs = data.content || data.data || data || [];
        setDocuments(docs);
        setTotalPages(data.totalPages || 1);
        
        let total = 0;
        if (data.totalElements !== undefined && data.totalElements !== null) {
            total = data.totalElements;
        } else if (data.total !== undefined && data.total !== null) {
            total = data.total;
        } else {
            total = docs.length || 0;
        }
        setTotalElements(total);
      }
    } catch (err) {
      console.error('Failed to search documents', err);
      setError('Lỗi kết nối máy chủ hoặc hệ thống phản hồi chậm.');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = {};
    if (filters.keyword) newParams.keyword = filters.keyword;
    if (filters.subject) newParams.subject = filters.subject;
    if (filters.major) newParams.major = filters.major;
    if (filters.documentType) newParams.documentType = filters.documentType;
    if (filters.category) newParams.category = filters.category;
    if (filters.uploader) newParams.uploader = filters.uploader;
    if (filters.dateFilter) newParams.dateFilter = filters.dateFilter;
    if (filters.sort && filters.sort !== 'createdAt,desc') newParams.sort = filters.sort;
    
    setSearchParams(newParams);
    setFilters(prev => ({ ...prev, page: 0 }));
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
      alert('Tải xuống thất bại');
    }
  };

  const handlePreview = (docId, e) => {
    e.stopPropagation();
    navigate(`/dashboard/documents/${docId}`);
  };

  const isSearching = filters.keyword || filters.subject || filters.major;

  return (
    <div className="premium-page-wrapper document-search-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={28} color="var(--primary-600)" /> Tài liệu Cộng đồng
          </h1>
          <p className="page-description">Khám phá và học hỏi từ hàng ngàn tài liệu được chia sẻ bởi sinh viên khác.</p>
        </div>
      </div>

      <div className="search-header-card">
        <form onSubmit={handleSearchSubmit} className="search-bar-wrapper" style={{ marginBottom: '16px' }}>
          <div className="search-input-container">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm theo tiêu đề hoặc từ khóa..."
              value={filters.keyword}
              onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          
          <Button type="submit" style={{ padding: '0 32px' }}>Tìm kiếm</Button>
        </form>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' }}>
          <select
            className="filter-select"
            style={{ width: 'auto', flex: 1, minWidth: '160px' }}
            value={filters.major}
            onChange={(e) => setFilters(prev => ({ ...prev, major: e.target.value }))}
          >
            <option value="">Tất cả Chuyên ngành</option>
            {filterOptions.majors.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            className="filter-select"
            style={{ width: 'auto', flex: 1, minWidth: '160px' }}
            value={filters.subject}
            onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
          >
            <option value="">Tất cả Môn học</option>
            {filterOptions.subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          
          <select
            className="filter-select"
            style={{ width: 'auto', flex: 1, minWidth: '160px' }}
            value={filters.documentType}
            onChange={(e) => setFilters(prev => ({ ...prev, documentType: e.target.value }))}
          >
            <option value="">Tất cả loại tài liệu</option>
            {filterOptions.documentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}

          </select>
          
          
        </div>
      </div>

      {loading ? (
        <div className="documents-grid" style={{ marginTop: '2rem' }}>
          {Array.from({ length: 8 }).map((_, idx) => (
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
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--neutral-100)', paddingTop: '12px' }}>
                <div style={{ height: '20px', width: '80px', backgroundColor: 'var(--neutral-200)', borderRadius: '4px', animation: 'skeleton-pulse 1.5s infinite' }}></div>
                <div style={{ height: '20px', width: '60px', backgroundColor: 'var(--neutral-200)', borderRadius: '4px', animation: 'skeleton-pulse 1.5s infinite' }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="documents-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: 'var(--neutral-500)', fontWeight: 500 }}>
                Tìm thấy {totalElements} tài liệu công khai
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--neutral-600)', fontWeight: 500 }}>Sắp xếp:</span>
                <select 
                  className="filter-select" 
                  style={{ padding: '6px 12px', height: 'auto', fontSize: '13px' }}
                  value={filters.sort}
                  onChange={(e) => {
                     setFilters(prev => ({ ...prev, sort: e.target.value }));
                     const newParams = Object.fromEntries(searchParams.entries());
                     newParams.sort = e.target.value;
                     setSearchParams(newParams);
                  }}
                >
                  <option value="createdAt,desc">Mới nhất (Latest)</option>
                  <option value="createdAt,asc">Cũ nhất (Oldest)</option>
                  <option value="downloadCount,asc">Tải nhiều nhất</option>
                  <option value="downloadCount,desc">Tải ít nhất</option>
                </select>
              </div>
            </div>

            {documents.length > 0 ? (
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
                          <span>{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>

                    <p className="doc-description">
                      {doc.description || 'Không có mô tả cho tài liệu này.'}
                    </p>

                    <div className="doc-footer">
                      <span className="doc-size" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {formatFileSize(doc.fileSize)}
                        <span style={{ color: 'var(--primary-600)', backgroundColor: 'var(--primary-50)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                          {doc.creatorName || doc.authorName || doc.uploadedBy || doc.user?.fullName || 'Người dùng vô danh'}
                        </span>
                      </span>
                      <div className="doc-actions" style={{ display: 'flex', gap: '16px', color: 'var(--primary-600)', fontSize: '13px', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Eye size={16} /> {doc.viewCount || doc.views || 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Download size={16} /> {doc.downloadCount || doc.downloads || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'var(--glass-bg)', borderRadius: 'var(--radius-xl)' }}>
                <Globe size={48} color="var(--neutral-300)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neutral-700)' }}>Không tìm thấy tài liệu nào</h3>
                <p style={{ color: 'var(--neutral-500)' }}>{isSearching ? 'Hãy thử điều chỉnh tiêu chí tìm kiếm.' : 'Kho tài liệu cộng đồng hiện đang trống.'}</p>
              </div>
            )}

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
        </>
      )}
    </div>
  );
};

export default CommunityDocuments;
