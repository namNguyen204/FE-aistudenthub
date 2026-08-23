import React, { useState, useEffect } from 'react';
import { Users, FileText, MessageSquare, ShieldAlert, AlertTriangle, DollarSign, TrendingUp, Crown, Eye, Download, Flame, BookOpen, Award, User, Lock, CreditCard, Clock, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import adminService from '../../services/admin.service';
import { useAuth } from '../../context/AuthContext';

import ModeratorDashboardHome from './ModeratorDashboardHome';

/** Admin Dashboard Home component with clean charts and business metrics. */
const AdminDashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [businessStats, setBusinessStats] = useState(null);
  const [aiUsage, setAiUsage] = useState(null);
  const [uploadTrend, setUploadTrend] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [topDocs, setTopDocs] = useState([]);
  const [subjectStats, setSubjectStats] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    if (user?.role === 'ROLE_MODERATOR' || user?.role === 'MODERATOR') return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, businessData, aiData, trendData, revenueData, docsData, usersData, reportsData] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getBusinessStats(),
          adminService.getAiUsage(),
          adminService.getUploadTrend(daysFilter),
          adminService.getRevenueTrend(daysFilter),
          adminService.getAllDocuments('', 0, 50).catch(() => ({ content: [] })),
          adminService.getUsers('', 0, 50).catch(() => ({ content: [] })),
          adminService.getReports({ page: 0, size: 50 }).catch(() => ({ content: [] }))
        ]);
        setStats(statsData);
        setBusinessStats(businessData);
        setAiUsage(aiData);
        setUploadTrend(trendData || []);
        setRevenueTrend(revenueData || []);

        const docs = docsData?.content || docsData?.data || (Array.isArray(docsData) ? docsData : []);
        const usersList = usersData?.content || usersData?.data || (Array.isArray(usersData) ? usersData : []);
        const reportsList = reportsData?.content || reportsData?.data || (Array.isArray(reportsData) ? reportsData : []);

        // Sort top 5 docs by view/download engagement
        const sortedDocs = [...docs]
          .sort((a, b) => ((b.viewCount || 0) + (b.downloadCount || 0) * 2) - ((a.viewCount || 0) + (a.downloadCount || 0) * 2))
          .slice(0, 5);
        setTopDocs(sortedDocs);

        // Group subject counts
        const counts = {};
        docs.forEach(d => {
          const subj = d.subject || 'Môn học chung';
          counts[subj] = (counts[subj] || 0) + 1;
        });
        const totalDocsCount = docs.length || 1;
        const formattedSubjects = Object.keys(counts).map(name => ({
          name,
          count: counts[name],
          percentage: Math.round((counts[name] / totalDocsCount) * 100)
        })).sort((a, b) => b.count - a.count).slice(0, 5);

        setSubjectStats(formattedSubjects);

        // Construct 100% Dynamic Recent Activities feed from real backend data
        const activities = [];

        usersList.slice(0, 4).forEach(u => {
          const name = u.fullName || u.email || 'Người dùng';
          if (u.active === false || u.enabled === false || u.status === 'DISABLED' || u.status === 'LOCKED') {
            activities.push({
              id: `user-lock-${u.id}`,
              icon: <Lock size={18} color="#EF4444" />,
              text: `Tài khoản ${name} đã bị khóa / ngưng hoạt động`,
              timestamp: u.updatedAt || u.createdAt || new Date().toISOString()
            });
          } else {
            activities.push({
              id: `user-reg-${u.id}`,
              icon: <User size={18} color="#8B5CF6" />,
              text: `Người dùng ${name} vừa đăng ký tài khoản (${u.role || 'USER'})`,
              timestamp: u.createdAt || new Date().toISOString()
            });
          }
        });

        docs.slice(0, 5).forEach(doc => {
          const uploader = doc.uploaderFullName || doc.uploaderEmail || 'Sinh viên';
          if (doc.approvalStatus === 'DMCA_TAKEN_DOWN') {
            activities.push({
              id: `doc-dmca-${doc.id}`,
              icon: <ShieldAlert size={18} color="#EF4444" />,
              text: `Tài liệu "${doc.title}" bị gỡ bỏ khẩn cấp (DMCA)`,
              timestamp: doc.updatedAt || doc.createdAt || new Date().toISOString()
            });
          } else if (doc.approvalStatus === 'REJECTED') {
            activities.push({
              id: `doc-reject-${doc.id}`,
              icon: <AlertTriangle size={18} color="#F59E0B" />,
              text: `Tài liệu "${doc.title}" bị từ chối công khai`,
              timestamp: doc.updatedAt || doc.createdAt || new Date().toISOString()
            });
          } else {
            activities.push({
              id: `doc-upload-${doc.id}`,
              icon: <FileText size={18} color="#3B82F6" />,
              text: `User ${uploader} vừa upload tài liệu "${doc.title}"`,
              timestamp: doc.createdAt || new Date().toISOString()
            });
          }
        });

        reportsList.slice(0, 4).forEach(rep => {
          const code = String(rep.id || '').slice(0, 6).toUpperCase();
          const st = rep.status === 'RESOLVED' ? 'Đã gỡ tệp' : rep.status === 'DISMISSED' ? 'Bác bỏ' : 'Chờ xử lý';
          activities.push({
            id: `rep-${rep.id}`,
            icon: <ShieldAlert size={18} color="#06B6D4" />,
            text: `Moderator xử lý báo cáo vi phạm #${code} [${st}]`,
            timestamp: rep.createdAt || rep.updatedAt || new Date().toISOString()
          });
        });

        activities.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        setRecentActivities(activities.slice(0, 6));

      } catch (err) {
        setError('Không thể tải dữ liệu thống kê');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [daysFilter]);

  if (user?.role === 'ROLE_MODERATOR' || user?.role === 'MODERATOR') {
    return <ModeratorDashboardHome />;
  }

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

  return (
    <div className="premium-page-wrapper">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Dashboard Quản Trị</h1>
          <p className="page-description">Tổng quan tình hình hoạt động của hệ thống AI Student Hub.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid var(--neutral-200)' }}>
          <Clock size={18} color="var(--neutral-500)" />
          <select 
            value={daysFilter} 
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', fontWeight: 500, color: 'var(--neutral-700)', cursor: 'pointer', fontSize: '14px' }}
          >
            <option value={7}>7 ngày qua</option>
            <option value={30}>30 ngày qua</option>
            <option value={90}>90 ngày qua</option>
          </select>
        </div>
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
            <div className="stat-label">Tổng doanh thu</div>
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

      {/* Recent Activities */}
      <div className="dashboard-section glass-card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, color: 'var(--neutral-800)', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="var(--primary-600)" /> Hoạt động gần đây
          </h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recentActivities.length > 0 ? (
            recentActivities.map((act) => (
              <div key={act.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'var(--neutral-50)', border: '1px solid var(--neutral-100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {act.icon}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--neutral-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {act.text}
                  </span>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--neutral-500)', whiteSpace: 'nowrap', marginLeft: '16px', fontWeight: 500 }}>
                  {formatDistanceToNow(new Date(act.timestamp), { addSuffix: true, locale: vi })}
                </span>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-500)', fontSize: '14px' }}>
              Chưa có hoạt động gần đây trong hệ thống
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
