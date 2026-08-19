import React, { useState, useEffect } from 'react';
import { Users, FileText, MessageSquare, ShieldAlert, AlertTriangle, DollarSign, TrendingUp, Crown, Star, Flag, Clock, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import adminService from '../../services/admin.service';

/** Admin Dashboard Home component with clean charts and business metrics. */
const AdminDashboardHome = () => {
  const [stats, setStats] = useState(null);
  const [businessStats, setBusinessStats] = useState(null);
  const [aiUsage, setAiUsage] = useState(null);
  const [typeStats, setTypeStats] = useState([]);
  const [uploadTrend, setUploadTrend] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [violationStats, setViolationStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, businessData, aiData, typeData, trendData, revenueData, violationData] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getBusinessStats(),
          adminService.getAiUsage(),
          adminService.getDocumentTypeStats(),
          adminService.getUploadTrend(daysFilter),
          adminService.getRevenueTrend(daysFilter),
          adminService.getViolationStats().catch(() => null)
        ]);
        setStats(statsData);
        setBusinessStats(businessData);
        setAiUsage(aiData);
        setTypeStats(typeData || []);

        // Ensure trendData is in the correct format for recharts
        // Assuming backend returns [{ date: '2023-10-01', count: 5 }, ...]
        setUploadTrend(trendData || []);
        setRevenueTrend(revenueData || []);
        setViolationStats(violationData || {});
      } catch (err) {
        setError('Không thể tải dữ liệu thống kê');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [daysFilter]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải dữ liệu Dashboard...</div>;

  const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
  const totalRevenue = businessStats?.totalRevenue ?? 0;
  const totalTransactions = businessStats?.successfulTransactions ?? 0;
  const popularPackageKey = String(businessStats?.mostPopularPackage || '').toUpperCase();
  const popularPackage = {
    PRO: 'Gói Nâng cao',
    ADVANCED: 'Gói Nâng cao',
    PREMIUM: 'Gói Chuyên gia',
    BASIC: 'Gói Cơ bản'
  }[popularPackageKey] || businessStats?.mostPopularPackage || 'Chưa có giao dịch';
  const normalizedTypeStats = Object.values(
    typeStats.reduce((acc, item) => {
      const rawType = String(item.fileType || item.type || 'Khác').toLowerCase();
      let name = 'Khác';
      if (rawType.includes('pdf')) name = 'PDF';
      else if (rawType.includes('word') || rawType.includes('document')) name = 'Word';
      else if (rawType.includes('presentation') || rawType.includes('powerpoint')) name = 'PowerPoint';
      else if (rawType.includes('image')) name = 'Hình ảnh';
      else if (rawType.includes('text')) name = 'Văn bản';
      const value = Number(item.count ?? item.value ?? 0);
      acc[name] = { name, value: (acc[name]?.value ?? 0) + value };
      return acc;
    }, {})
  );
  const documentedTotal = normalizedTypeStats.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="premium-page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Dashboard Quản Trị</h1>
        <p className="page-description">Tổng quan tình hình hoạt động của hệ thống AI Student Hub.</p>
      </div>

      {error && (
        <div style={{ backgroundColor: 'var(--error-50)', color: 'var(--error-600)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon primary">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.totalUsers || 0}</div>
            <div className="stat-label">Tổng số Users</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.totalDocuments || 0}</div>
            <div className="stat-label">Tổng Tài liệu</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <MessageSquare size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.totalChatSessions || 0}</div>
            <div className="stat-label">Phiên Chat AI</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon danger">
            <ShieldAlert size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats?.disabledUsers || 0}</div>
            <div className="stat-label">User Bị Khóa</div>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '1rem', color: 'var(--neutral-700)' }}>Chỉ số Kinh doanh</h3>
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-50)', color: 'var(--success-600)' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(totalRevenue)}</div>
            <div className="stat-label">Doanh thu từ giao dịch thành công</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{formatCurrency(businessStats?.currentMonthRevenue)}</div>
            <div className="stat-label">Doanh thu tháng này</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-50)', color: 'var(--warning-600)' }}>
            <Crown size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{businessStats?.activePremiumUsers || 0}</div>
            <div className="stat-label">Active Premium Users</div>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-50)', color: 'var(--success-600)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{Number(totalTransactions).toLocaleString('vi-VN')}</div>
            <div className="stat-label">Giao dịch thành công</div>
          </div>
        </div>

      </div>

      <h3 style={{ marginBottom: '1rem', color: 'var(--neutral-700)' }}>Thống kê vi phạm</h3>
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {[
          ['Tổng báo cáo', violationStats.totalReports ?? violationStats.total ?? 0, Flag, 'danger'],
          ['Chờ xử lý', violationStats.pendingReports ?? violationStats.pending ?? 0, Clock, 'warning'],
          ['Vi phạm đã xác nhận', violationStats.resolvedReports ?? violationStats.resolved ?? 0, ShieldAlert, 'danger'],
          ['Báo cáo bị bác bỏ', violationStats.dismissedReports ?? violationStats.dismissed ?? 0, CheckCircle, 'success']
        ].map(([label, value, Icon, tone]) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${tone}`}><Icon size={24} /></div>
            <div className="stat-info"><div className="stat-value">{Number(value).toLocaleString('vi-VN')}</div><div className="stat-label">{label}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '8px' }}>
        <button
          onClick={() => setDaysFilter(7)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--neutral-300)', backgroundColor: daysFilter === 7 ? 'var(--primary-600)' : 'white', color: daysFilter === 7 ? 'white' : 'var(--neutral-700)', cursor: 'pointer', fontWeight: 500 }}
        >
          7 ngày
        </button>
        <button
          onClick={() => setDaysFilter(30)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--neutral-300)', backgroundColor: daysFilter === 30 ? 'var(--primary-600)' : 'white', color: daysFilter === 30 ? 'white' : 'var(--neutral-700)', cursor: 'pointer', fontWeight: 500 }}
        >
          30 ngày
        </button>
        <button
          onClick={() => setDaysFilter(90)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--neutral-300)', backgroundColor: daysFilter === 90 ? 'var(--primary-600)' : 'white', color: daysFilter === 90 ? 'white' : 'var(--neutral-700)', cursor: 'pointer', fontWeight: 500 }}
        >
          90 ngày
        </button>
      </div>

      <div className="dashboard-content-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="dashboard-section glass-card">
          <div className="dashboard-section-header">
            <h3 className="dashboard-section-title">Xu hướng Doanh thu ({daysFilter} ngày)</h3>
          </div>
          <div className="dashboard-section-body" style={{ padding: '2rem', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--neutral-200)" />
                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} tick={{ fontSize: 12, fill: 'var(--neutral-500)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `${value / 1000000}M`} tick={{ fontSize: 12, fill: 'var(--neutral-500)' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  formatter={(value) => [`${value.toLocaleString()} đ`, 'Doanh thu']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="var(--success-500)" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-section glass-card">
          <div className="dashboard-section-header">
            <h3 className="dashboard-section-title">Tài liệu theo loại tệp ({documentedTotal.toLocaleString('vi-VN')} tài liệu)</h3>
          </div>
          <div className="dashboard-section-body" style={{ padding: '2rem', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={normalizedTypeStats}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  label={false}
                >
                  {normalizedTypeStats.map((entry, index) => {
                    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#64748B'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
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
                  height={36}
                  formatter={(value) => {
                    const item = normalizedTypeStats.find((entry) => entry.name === value);
                    const pct = documentedTotal ? ((item?.value / documentedTotal) * 100).toFixed(0) : 0;
                    return `${value}: ${item?.value?.toLocaleString('vi-VN') || 0} (${pct}%)`;
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-section glass-card" style={{ marginTop: '2rem' }}>
        <div className="dashboard-section-header">
          <h3 className="dashboard-section-title">Xu hướng Upload tài liệu ({daysFilter} ngày)</h3>
        </div>
        <div className="dashboard-section-body" style={{ padding: '2rem', height: '350px' }}>
          {uploadTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={uploadTrend}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--neutral-200)" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--neutral-500)' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--neutral-500)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--neutral-100)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" fill="var(--primary-500)" radius={[4, 4, 0, 0]} barSize={30} name="Số lượng tài liệu" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--neutral-500)' }}>
              Chưa có dữ liệu upload
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
