import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Crown, 
  Award, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import adminService from '../../services/admin.service';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import './AdminRevenue.css';

const AdminRevenue = () => {
  const [businessStats, setBusinessStats] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [allSystemTransactions, setAllSystemTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [daysFilter, setDaysFilter] = useState(30);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [bStats, rTrend, plans, allTxRes] = await Promise.all([
        adminService.getBusinessStats().catch(() => null),
        adminService.getRevenueTrend(daysFilter).catch(() => []),
        adminService.getPricingPlans().catch(() => []),
        adminService.getTransactions('ALL', 0, 500).catch(() => null)
      ]);
      setBusinessStats(bStats);
      setRevenueTrend(rTrend || []);
      setPricingPlans(plans || []);

      const allList = allTxRes?.content || allTxRes?.data || (Array.isArray(allTxRes) ? allTxRes : []);
      setAllSystemTransactions(allList);
    } catch (err) {
      console.error('Lỗi khi tải báo cáo doanh thu:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    setTableLoading(true);
    try {
      const res = await adminService.getTransactions(statusFilter, page, pageSize);
      if (res && ((res.content && res.content.length > 0) || res.totalElements > 0)) {
        setTransactions(res.content || res.data || (Array.isArray(res) ? res : []));
        setTotalElements(res.totalElements || (res.content ? res.content.length : 0));
        setTotalPages(res.totalPages || 1);
      } else {
        // Fallback to filtering allSystemTransactions if primary page response is empty
        let filtered = allSystemTransactions;
        if (statusFilter && statusFilter !== 'ALL') {
          filtered = allSystemTransactions.filter(t => String(t.status || '').toUpperCase() === statusFilter);
        }
        setTransactions(filtered);
        setTotalElements(filtered.length);
        setTotalPages(Math.ceil(filtered.length / pageSize) || 1);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử giao dịch:', err);
      let filtered = allSystemTransactions;
      if (statusFilter && statusFilter !== 'ALL') {
        filtered = allSystemTransactions.filter(t => String(t.status || '').toUpperCase() === statusFilter);
      }
      setTransactions(filtered);
      setTotalElements(filtered.length);
      setTotalPages(Math.ceil(filtered.length / pageSize) || 1);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [daysFilter]);

  useEffect(() => {
    loadTransactions();
  }, [statusFilter, page]);

  const handleRefresh = () => {
    loadDashboardData();
    loadTransactions();
  };

  const formatVND = (val) => `${Number(val || 0).toLocaleString('vi-VN')}đ`;

  const filteredTransactions = transactions.filter(t => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    const codeStr = String(t.orderCode || '');
    const emailStr = (t.userEmail || t.userFullName || '').toLowerCase();
    const descStr = (t.description || '').toLowerCase();
    return codeStr.includes(kw) || emailStr.includes(kw) || descStr.includes(kw);
  });

  const renderStatusBadge = (status) => {
    const st = String(status || '').toUpperCase();
    if (st === 'PAID' || st === 'SUCCESS') {
      return (
        <span className="status-badge paid">
          <CheckCircle size={14} /> Thành công
        </span>
      );
    }
    if (st === 'PENDING') {
      return (
        <span className="status-badge pending">
          <Clock size={14} /> Đang chờ
        </span>
      );
    }
    if (st === 'CANCELLED' || st === 'EXPIRED') {
      return (
        <span className="status-badge cancelled">
          <XCircle size={14} /> Đã hủy
        </span>
      );
    }
    return (
      <span className="status-badge failed">
        <XCircle size={14} /> Thất bại
      </span>
    );
  };

  if (loading && !businessStats) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--neutral-500)' }}>
        Đang tải báo cáo doanh thu & giao dịch...
      </div>
    );
  }

  const popularPkgKey = String(businessStats?.mostPopularPackage || '').toUpperCase();
  const popularPkgLabel = {
    PRO: 'Gói Nâng cao (PRO)',
    STUDENT: 'Gói Sinh viên (PRO)',
    ADVANCED: 'Gói Nâng cao',
    PREMIUM: 'Gói Chuyên gia (PREMIUM)',
    BASIC: 'Gói Cơ bản'
  }[popularPkgKey] || businessStats?.mostPopularPackage || 'Chưa có giao dịch';

  // Source transactions dataset for system-wide charts
  const chartTxSource = allSystemTransactions.length > 0 ? allSystemTransactions : transactions;

  // Calculate Payment Status Breakdown
  const paidTx = chartTxSource.filter(t => ['PAID', 'SUCCESS'].includes(String(t.status || '').toUpperCase())).length;
  const pendingTx = chartTxSource.filter(t => String(t.status || '').toUpperCase() === 'PENDING').length;
  const cancelledTx = chartTxSource.filter(t => ['CANCELLED', 'EXPIRED', 'FAILED'].includes(String(t.status || '').toUpperCase())).length;

  const actualPaidCount = Math.max(paidTx, Number(businessStats?.successfulTransactions || 0));

  const statusChartData = [
    { name: 'Thành công (PAID)', value: actualPaidCount, color: '#10B981' },
    { name: 'Đang chờ (PENDING)', value: pendingTx, color: '#F59E0B' },
    { name: 'Đã hủy / Lỗi', value: cancelledTx, color: '#6B7280' }
  ].filter(item => item.value > 0);

  const statusTotalCount = statusChartData.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <div className="premium-page-wrapper admin-revenue-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp color="var(--primary-600)" size={30} /> Quản Lý Doanh Thu & Giao Dịch
          </h1>
          <p className="page-description">
            Báo cáo tổng quan về dòng tiền, doanh số gói cước và nhật ký giao dịch từ hệ thống.
          </p>
        </div>
        <div className="revenue-header-actions">
          <select 
            value={daysFilter} 
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            className="revenue-filter-select"
          >
            <option value={7}>7 ngày qua</option>
            <option value={30}>30 ngày qua</option>
            <option value={90}>90 ngày qua</option>
            <option value={365}>1 năm qua</option>
          </select>
          <button className="revenue-refresh-btn" onClick={handleRefresh} title="Làm mới dữ liệu">
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="revenue-kpi-grid">
        <div className="revenue-kpi-card">
          <div className="kpi-icon-box green">
            <DollarSign size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Tổng doanh thu</span>
            <span className="kpi-value">{formatVND(businessStats?.totalRevenue)}</span>
          </div>
        </div>

        <div className="revenue-kpi-card">
          <div className="kpi-icon-box blue">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Doanh thu tháng này</span>
            <span className="kpi-value">{formatVND(businessStats?.currentMonthRevenue)}</span>
          </div>
        </div>

        <div className="revenue-kpi-card">
          <div className="kpi-icon-box purple">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Giao dịch thành công</span>
            <span className="kpi-value">{Number(businessStats?.successfulTransactions || 0).toLocaleString('vi-VN')}</span>
          </div>
        </div>

        <div className="revenue-kpi-card">
          <div className="kpi-icon-box amber">
            <Crown size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">User Premium Hoạt động</span>
            <span className="kpi-value">{businessStats?.activePremiumUsers || 0} user</span>
          </div>
        </div>

        <div className="revenue-kpi-card">
          <div className="kpi-icon-box rose">
            <Award size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Gói phổ biến nhất</span>
            <span className="kpi-value" style={{ fontSize: '15px' }}>{popularPkgLabel}</span>
          </div>
        </div>
      </div>

      {/* Revenue Analytics Chart */}
      <div className="revenue-chart-card">
        <div className="chart-card-header">
          <h3 className="chart-card-title">
            Biểu đồ xu hướng Doanh thu ({daysFilter} ngày gần nhất)
          </h3>
          <span style={{ fontSize: '13px', color: 'var(--neutral-500)', fontWeight: 500 }}>
            Đơn vị: VNĐ
          </span>
        </div>
        <div style={{ height: '320px', width: '100%' }}>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--neutral-200)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} 
                  tick={{ fontSize: 12, fill: 'var(--neutral-500)' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : `${(val/1000).toFixed(0)}k`} 
                  tick={{ fontSize: 12, fill: 'var(--neutral-500)' }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={55}
                />
                <Tooltip 
                  formatter={(value) => [formatVND(value), 'Doanh thu']}
                  labelFormatter={(lbl) => `Ngày: ${new Date(lbl).toLocaleDateString('vi-VN')}`}
                  contentStyle={{ borderRadius: '10px', border: '1px solid var(--neutral-200)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--neutral-500)' }}>
              Chưa phát sinh dữ liệu doanh thu trong khoảng thời gian này
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side Financial Charts: Status Breakdown & Revenue by Package */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Chart A: Payment Status Breakdown */}
        <div className="revenue-chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">
              <CheckCircle size={18} color="#10B981" /> Tỷ lệ Trạng thái Giao dịch
            </h3>
          </div>
          <div style={{ height: '260px', position: 'relative' }}>
            {statusChartData && statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="42%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [
                      `${value.toLocaleString('vi-VN')} giao dịch (${((value / statusTotalCount) * 100).toFixed(1)}%)`,
                      'Số lượng'
                    ]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    iconType="square"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value, entry) => {
                      const item = statusChartData.find((e) => e.name === value);
                      const pct = Math.round(((item?.value || 0) / statusTotalCount) * 100);
                      return (
                        <span style={{ color: entry.color, fontWeight: 600, fontSize: '12px', marginRight: '6px' }}>
                          {value}: {item?.value || 0} ({pct}%)
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--neutral-500)', fontSize: '14px' }}>
                Chưa có dữ liệu trạng thái giao dịch
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real Transactions Management Table */}
      <div className="transactions-card">
        <div className="chart-card-header" style={{ marginBottom: '1rem' }}>
          <h3 className="chart-card-title">
            <CreditCard size={20} color="var(--primary-600)" /> Lịch Sử Giao Dịch Thanh Toán
          </h3>
        </div>

        {/* Filters & Search */}
        <div className="transactions-filter-bar">
          <div className="status-tabs">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'PAID', label: 'Thành công' },
              { id: 'PENDING', label: 'Đang chờ' },
              { id: 'CANCELLED', label: 'Đã hủy' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`status-tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(0);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
            <input 
              type="text"
              placeholder="Tìm theo mã đơn, email user..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid var(--neutral-200)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Mã đơn hàng</th>
                <th>Khách hàng (User)</th>
                <th>Nội dung thanh toán</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                    Đang tải dữ liệu giao dịch...
                  </td>
                </tr>
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id || tx.orderCode}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary-700)' }}>
                      #{tx.orderCode}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>
                        {tx.userFullName || tx.userEmail || 'Sinh viên'}
                      </div>
                      {tx.userEmail && tx.userFullName && (
                        <div style={{ fontSize: '12px', color: 'var(--neutral-500)' }}>{tx.userEmail}</div>
                      )}
                    </td>
                    <td style={{ color: 'var(--neutral-700)', maxWidth: '280px' }}>
                      {tx.description || 'Thanh toán gói dịch vụ AI Student Hub'}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--success-700)' }}>
                      {formatVND(tx.amount)}
                    </td>
                    <td>
                      {renderStatusBadge(tx.status)}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--neutral-500)', whiteSpace: 'nowrap' }}>
                      {tx.paidAt ? (
                        format(new Date(tx.paidAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                      ) : tx.createdAt ? (
                        format(new Date(tx.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                      ) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--neutral-500)' }}>
                    Không tìm thấy giao dịch nào phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination-wrapper">
          <span style={{ fontSize: '13px', color: 'var(--neutral-500)' }}>
            Hiển thị {filteredTransactions.length} / tổng số {totalElements} giao dịch (Trang {page + 1}/{totalPages})
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="page-btn" 
              disabled={page === 0} 
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              <ChevronLeft size={16} /> Trang trước
            </button>
            <button 
              className="page-btn" 
              disabled={page >= totalPages - 1} 
              onClick={() => setPage(p => p + 1)}
            >
              Trang sau <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;
