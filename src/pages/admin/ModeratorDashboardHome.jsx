import React, { useState, useEffect } from 'react';
import { Flag, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import adminService from '../../services/admin.service';
import { getViolationReason } from '../../utils/violationReasons';

const ModeratorDashboardHome = () => {
  const [stats, setStats] = useState(null);
  const [reasonStats, setReasonStats] = useState([]);
  const [typeStats, setTypeStats] = useState([]);
  const [pendingDocsCount, setPendingDocsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [violationData, reportsData, typeData, docsData] = await Promise.all([
          adminService.getViolationStats(),
          adminService.getReports({ page: 0, size: 500 }),
          adminService.getDocumentTypeStats(),
          adminService.getAllDocuments('', 0, 500).catch(() => ({ content: [] }))
        ]);
        
        const reports = reportsData?.content || (Array.isArray(reportsData) ? reportsData : []);
        const docsList = docsData?.content || docsData?.data || (Array.isArray(docsData) ? docsData : []);

        const pendingDocs = docsList.filter(doc => {
          const status = doc.approvalStatus || doc.status || (doc.visibility === 'PUBLIC' ? 'APPROVED' : 'PRIVATE');
          return doc.visibility === 'PUBLIC' && (status === 'PENDING' || doc.processingStatus === 'PENDING');
        }).length;

        setPendingDocsCount(pendingDocs);

        const pendingFromList = reports.filter(r => r.status === 'PENDING').length;
        const resolvedFromList = reports.filter(r => r.status === 'RESOLVED').length;
        const dismissedFromList = reports.filter(r => r.status === 'DISMISSED').length;

        const normalizedStats = {
          totalReports: violationData?.totalReports ?? violationData?.total ?? reports.length,
          pendingReports: violationData?.pendingReports ?? violationData?.pending ?? violationData?.pendingCount ?? pendingFromList,
          resolvedReports: violationData?.resolvedReports ?? violationData?.resolved ?? violationData?.resolvedCount ?? resolvedFromList,
          dismissedReports: violationData?.dismissedReports ?? violationData?.dismissed ?? violationData?.dismissedCount ?? dismissedFromList
        };

        if (normalizedStats.pendingReports === 0 && pendingFromList > 0) {
          normalizedStats.pendingReports = pendingFromList;
        }

        setStats(normalizedStats);
        setTypeStats(typeData || []);
        
        // Group reports by reason for the Bar chart
        const countsByReason = {};
        reports.forEach(r => {
          const reason = r.reason || 'OTHER';
          countsByReason[reason] = (countsByReason[reason] || 0) + 1;
        });

        const formattedReasonStats = Object.keys(countsByReason).map(reasonId => ({
          name: getViolationReason(reasonId).label,
          count: countsByReason[reasonId]
        })).sort((a, b) => b.count - a.count);

        setReasonStats(formattedReasonStats);
      } catch (err) {
        setError('Không thể tải dữ liệu thống kê báo cáo');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải dữ liệu Dashboard...</div>;

  const STATUS_COLORS = {
    pending: '#eab308', // warning-500
    resolved: '#ef4444', // error-500
    dismissed: '#6b7280' // neutral-500
  };

  const pieData = [
    { name: 'Chờ xử lý', value: stats?.pendingReports || 0, color: STATUS_COLORS.pending },
    { name: 'Đã gỡ (Đồng ý)', value: stats?.resolvedReports || 0, color: STATUS_COLORS.resolved },
    { name: 'Bác bỏ', value: stats?.dismissedReports || 0, color: STATUS_COLORS.dismissed },
  ].filter(item => item.value > 0);

  const normalizedTypeStats = Object.values(
    typeStats.reduce((acc, item) => {
      const rawType = String(item.type || item.fileType || item.name || 'Khác').toLowerCase();
      let name = 'Khác';
      if (rawType.includes('pdf')) name = 'PDF';
      else if (rawType.includes('word') || rawType.includes('doc')) name = 'Word';
      else if (rawType.includes('powerpoint') || rawType.includes('ppt') || rawType.includes('presentation')) name = 'PowerPoint';
      else if (rawType.includes('hình ảnh') || rawType.includes('image') || rawType.includes('png') || rawType.includes('jpg') || rawType.includes('jpeg')) name = 'Hình ảnh';
      else if (rawType.includes('văn bản') || rawType.includes('text') || rawType.includes('txt')) name = 'Văn bản';
      else {
        const itemType = String(item.type || item.fileType || item.name || '');
        if (['PDF', 'Word', 'PowerPoint', 'Hình ảnh', 'Văn bản', 'Khác'].includes(itemType)) {
          name = itemType;
        }
      }
      const value = Number(item.count ?? item.value ?? 0);
      acc[name] = { name, value: (acc[name]?.value ?? 0) + value };
      return acc;
    }, {})
  );
  const documentedTotal = normalizedTypeStats.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="premium-page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Dashboard Moderator</h1>
        <p className="page-description">Theo dõi và phân tích tình hình báo cáo vi phạm nội dung.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--error-50)', color: 'var(--error-600)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="dashboard-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="metric-card glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--neutral-600)', fontWeight: 500, fontSize: '14px' }}>Tổng số báo cáo</span>
            <div style={{ backgroundColor: 'var(--primary-50)', padding: '8px', borderRadius: '8px' }}>
              <Flag size={20} color="var(--primary-600)" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--neutral-900)' }}>
            {stats?.totalReports || 0}
          </div>
        </div>

        <div className="metric-card glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--neutral-600)', fontWeight: 500, fontSize: '14px' }}>Tài liệu chờ duyệt</span>
            <div style={{ backgroundColor: 'var(--warning-50)', padding: '8px', borderRadius: '8px' }}>
              <Clock size={20} color="var(--warning-600)" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--neutral-900)' }}>
            {pendingDocsCount}
          </div>
        </div>

        <div className="metric-card glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--neutral-600)', fontWeight: 500, fontSize: '14px' }}>Đã gỡ (Đồng ý)</span>
            <div style={{ backgroundColor: 'var(--error-50)', padding: '8px', borderRadius: '8px' }}>
              <CheckCircle size={20} color="var(--error-600)" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--neutral-900)' }}>
            {stats?.resolvedReports || 0}
          </div>
        </div>

        <div className="metric-card glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--neutral-600)', fontWeight: 500, fontSize: '14px' }}>Đã bác bỏ</span>
            <div style={{ backgroundColor: 'var(--neutral-100)', padding: '8px', borderRadius: '8px' }}>
              <XCircle size={20} color="var(--neutral-600)" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--neutral-900)' }}>
            {stats?.dismissedReports || 0}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Pie Chart: Status Distribution */}
        <div className="dashboard-section glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--neutral-800)', fontSize: '16px' }}>Tỷ lệ Trạng thái Báo cáo</h3>
          <div style={{ height: '300px' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} báo cáo`, 'Số lượng']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-500)' }}>
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart: Reasons */}
        <div className="dashboard-section glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--neutral-800)', fontSize: '16px' }}>Phân loại Lý do Vi phạm</h3>
          <div style={{ height: '300px' }}>
            {reasonStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonStats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--neutral-200)" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value} báo cáo`, 'Số lượng']} />
                  <Bar dataKey="count" fill="var(--primary-500)" radius={[0, 4, 4, 0]} name="Số lượng" barSize={30}>
                    {reasonStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`var(--primary-${500 - (index * 100 > 300 ? 300 : index * 100)})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-500)' }}>
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart: Document Types */}
        <div className="dashboard-section glass-card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '16px' }}>
          <div style={{ borderBottom: '1px solid var(--neutral-200)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, color: 'var(--neutral-800)', fontSize: '18px', fontWeight: 600 }}>
              Tài liệu theo loại tệp ({documentedTotal.toLocaleString('vi-VN')} tài liệu)
            </h3>
          </div>
          <div style={{ height: '320px' }}>
            {normalizedTypeStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={normalizedTypeStats}
                    cx="50%"
                    cy="40%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    label={false}
                  >
                    {normalizedTypeStats.map((entry, index) => {
                      const typeColorMap = {
                        'Word': '#3B82F6',
                        'PDF': '#EF4444',
                        'Văn bản': '#10B981',
                        'Hình ảnh': '#F59E0B',
                        'Khác': '#8B5CF6',
                        'PowerPoint': '#64748B'
                      };
                      return <Cell key={`cell-${index}`} fill={typeColorMap[entry.name] || '#3B82F6'} />;
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [
                      `${value.toLocaleString('vi-VN')} tài liệu (${((value / (documentedTotal || 1)) * 100).toFixed(1)}%)`,
                      'Số lượng'
                    ]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value, entry) => {
                      const item = normalizedTypeStats.find((e) => e.name === value);
                      const pct = documentedTotal ? Math.round((item?.value / documentedTotal) * 100) : 0;
                      return (
                        <span style={{ color: entry.color, fontWeight: 600, fontSize: '14px', marginRight: '8px' }}>
                          {value}: {item?.value || 0} ({pct}%)
                        </span>
                      );
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-500)' }}>
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeratorDashboardHome;
