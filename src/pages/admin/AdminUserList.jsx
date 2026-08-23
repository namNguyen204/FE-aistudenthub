import { useState, useEffect } from 'react';
import { Search, Trash2, Power, PowerOff, AlertCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import adminService from '../../services/admin.service';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import ConfirmDeleteModal from '../../components/Modal/ConfirmDeleteModal';

// Ánh xạ planName từ BE → style badge tương ứng
const getPlanStyle = (subscriptionTier = 'BASIC', isPremium = false) => {
  const tier = (subscriptionTier || 'BASIC').toUpperCase();

  if (!isPremium || tier === 'BASIC') {
    return {
      label: 'Cơ bản',
      backgroundColor: 'var(--neutral-100)',
      color: 'var(--neutral-600)'
    };
  }

  if (tier === 'PREMIUM') {
    return {
      label: 'Chuyên gia',
      backgroundColor: 'var(--danger-50)',
      color: 'var(--danger-600)'
    };
  }

  if (tier === 'PRO') {
    return {
      label: 'Nâng cao',
      backgroundColor: 'var(--warning-50)',
      color: 'var(--warning-600)'
    };
  }

  return {
    label: 'Cơ bản',
    backgroundColor: 'var(--neutral-100)',
    color: 'var(--neutral-600)'
  };
};

const AdminUserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [toggleUser, setToggleUser] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [viewUserDetails, setViewUserDetails] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers(keyword, page, 20);
      setUsers(data?.content || []);
      setTotalPages(data?.totalPages || 1);
    } catch (err) {
      setError('Lỗi khi tải danh sách người dùng.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleViewUser = async (user) => {
    setViewUser(user);
    try {
      const details = await adminService.getUserById(user.id);
      setViewUserDetails(details);
    } catch (err) {
      console.error('Lỗi khi lấy chi tiết người dùng:', err);
      setViewUserDetails(user);
    }
  };

  const confirmToggleStatus = async () => {
    if (!toggleUser) return;
    setIsProcessing(true);
    try {
      await adminService.updateUserStatus(toggleUser.id, !toggleUser.active);
      setToggleUser(null);
      fetchUsers();
    } catch (err) {
      alert('Lỗi cập nhật trạng thái: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserId) return;
    setIsProcessing(true);
    try {
      await adminService.softDeleteUser(deleteUserId);
      setDeleteUserId(null);
      fetchUsers();
    } catch (err) {
      alert('Lỗi xóa người dùng: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="premium-page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Quản lý Người dùng</h1>
        <p className="page-description">Xem danh sách, khóa tài khoản hoặc xóa người dùng khỏi hệ thống.</p>
      </div>

      <div className="dashboard-section glass-card" style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="header-search" style={{ flex: 1, backgroundColor: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 'var(--radius-md)' }}>
            <Search size={18} color="var(--neutral-400)" style={{ marginLeft: '1rem' }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo email hoặc tên..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ padding: '0.75rem', width: '100%', border: 'none', backgroundColor: 'transparent', outline: 'none' }}
            />
          </div>
          <Button type="submit">Tìm kiếm</Button>
        </form>

        {error && (
          <div style={{ backgroundColor: 'var(--error-50)', color: 'var(--error-600)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải danh sách...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--neutral-200)', color: 'var(--neutral-600)' }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Người dùng</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Email</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Vai trò</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Gói đăng ký</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Trạng thái</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-500)' }}>Không tìm thấy người dùng nào.</td>
                  </tr>
                ) : (
                  users.map(user => {
                    const plan = getPlanStyle(user.subscriptionTier, user.isPremium);
                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          {user.fullName || 'Chưa cập nhật'}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--neutral-600)' }}>{user.email}</td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '12px', fontWeight: 600, backgroundColor: user.role === 'ADMIN' ? 'var(--primary-100)' : 'var(--neutral-100)', color: user.role === 'ADMIN' ? 'var(--primary-700)' : 'var(--neutral-700)' }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '12px', fontWeight: 600, backgroundColor: plan.backgroundColor, color: plan.color }}>
                            {plan.label}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          {user.deletedAt ? (
                            <span style={{ color: 'var(--error-600)', fontWeight: 500, fontSize: '14px' }}>Đã xóa</span>
                          ) : user.active ? (
                            <span style={{ color: 'var(--success-600)', fontWeight: 500, fontSize: '14px' }}>Hoạt động</span>
                          ) : (
                            <span style={{ color: 'var(--warning-600)', fontWeight: 500, fontSize: '14px' }}>Đã khóa</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleViewUser(user)}
                              title="Xem chi tiết"
                              style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => setToggleUser(user)}
                              title={user.active ? 'Khóa tài khoản' : 'Kích hoạt tài khoản'}
                              style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: user.active ? 'var(--warning-50)' : 'var(--success-50)', color: user.active ? 'var(--warning-600)' : 'var(--success-600)' }}
                            >
                              {user.active ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                            <button
                              onClick={() => setDeleteUserId(user.id)}
                              title="Xóa tài khoản"
                              style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: 'var(--error-50)', color: 'var(--error-600)' }}
                              disabled={!!user.deletedAt}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {totalPages >= 1 && (
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                <Button
                  onClick={() => setPage(prev => Math.max(0, prev - 1))}
                  disabled={page === 0}
                  style={{ padding: '0.5rem 0.75rem' }}
                  variant="outline"
                >
                  <ChevronLeft size={20} />
                </Button>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--neutral-600)' }}>
                  Trang {page + 1} / {totalPages}
                </span>
                <Button
                  onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={page >= totalPages - 1}
                  style={{ padding: '0.5rem 0.75rem' }}
                  variant="outline"
                >
                  <ChevronRight size={20} />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        onConfirm={confirmDeleteUser}
        isDeleting={isProcessing}
        title="Xác nhận Xóa Người dùng"
        message="Bạn có chắc chắn muốn xóa người dùng này? Tài khoản sẽ bị vô hiệu hóa hoàn toàn khỏi hệ thống (Xóa mềm)."
      />

      <Modal
        isOpen={!!toggleUser}
        onClose={() => setToggleUser(null)}
        title={toggleUser?.active ? 'Xác nhận Khóa tài khoản' : 'Xác nhận Kích hoạt tài khoản'}
        footer={
          <>
            <Button variant="outline" onClick={() => setToggleUser(null)}>Hủy</Button>
            <Button
              onClick={confirmToggleStatus}
              isLoading={isProcessing}
              style={{ backgroundColor: toggleUser?.active ? 'var(--warning-600)' : 'var(--success-600)', borderColor: toggleUser?.active ? 'var(--warning-600)' : 'var(--success-600)', color: 'white' }}
            >
              {toggleUser?.active ? 'Khóa' : 'Kích hoạt'}
            </Button>
          </>
        }
      >
        <div style={{ color: 'var(--neutral-600)', fontSize: '14px', lineHeight: '1.5' }}>
          Bạn có chắc chắn muốn {toggleUser?.active ? 'khóa' : 'kích hoạt'} tài khoản <strong>{toggleUser?.email}</strong>?
          <br /><br />
          {toggleUser?.active
            ? 'Tài khoản bị khóa sẽ không thể đăng nhập và truy cập vào hệ thống nữa.'
            : 'Tài khoản sẽ được hoạt động bình thường trở lại.'}
        </div>
      </Modal>

      {/* Modal chi tiết user */}
      <Modal
        isOpen={!!viewUser}
        onClose={() => { setViewUser(null); setViewUserDetails(null); }}
        title="Hồ sơ Người dùng"
        footer={
          <Button variant="outline" onClick={() => { setViewUser(null); setViewUserDetails(null); }}>Đóng</Button>
        }
      >
        {viewUserDetails ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--neutral-100)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                {viewUserDetails.fullName ? viewUserDetails.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--neutral-800)' }}>{viewUserDetails.fullName || 'Chưa cập nhật tên'}</h3>
                <p style={{ margin: 0, color: 'var(--neutral-500)' }}>{viewUserDetails.email}</p>
                <span style={{ display: 'inline-block', marginTop: '0.5rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '12px', fontWeight: 600, backgroundColor: viewUserDetails.role === 'ADMIN' ? 'var(--primary-100)' : 'var(--neutral-100)', color: viewUserDetails.role === 'ADMIN' ? 'var(--primary-700)' : 'var(--neutral-700)' }}>
                  {viewUserDetails.role}
                </span>
              </div>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>ID NGƯỜI DÙNG</p>
                <p style={{ margin: 0, color: 'var(--neutral-800)', fontWeight: 500, fontFamily: 'monospace' }}>
                  {viewUserDetails.id || 'Không có ID'}
                </p>
              </div>

              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>NGÀY THAM GIA</p>
                <p style={{ margin: 0, color: 'var(--neutral-800)', fontWeight: 500 }}>
                  {viewUserDetails.createdAt ? new Date(viewUserDetails.createdAt).toLocaleDateString('vi-VN') : 'Không rõ'}
                </p>
              </div>

              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>CẬP NHẬT LẦN CUỐI</p>
                <p style={{ margin: 0, color: 'var(--neutral-800)', fontWeight: 500 }}>
                  {viewUserDetails.updatedAt ? new Date(viewUserDetails.updatedAt).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                </p>
              </div>

              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>GÓI ĐĂNG KÝ</p>
                <p style={{ margin: 0 }}>
                  {(() => {
                    const plan = getPlanStyle(viewUserDetails.subscriptionTier, viewUserDetails.isPremium);
                    return (
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '13px', fontWeight: 600, backgroundColor: plan.backgroundColor, color: plan.color }}>
                        {plan.label}
                      </span>
                    );
                  })()}
                </p>
              </div>

              {/* Hiển thị ngày hết hạn và số ngày còn lại nếu là premium */}
              {viewUserDetails.isPremium && (viewUserDetails.premiumExpiredAt || viewUserDetails.premiumExpireAt) && (
                <div>
                  <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>HẾT HẠN</p>
                  <p style={{ margin: 0, color: 'var(--neutral-800)', fontWeight: 500 }}>
                    {new Date(viewUserDetails.premiumExpiredAt || viewUserDetails.premiumExpireAt).toLocaleDateString('vi-VN')}
                    {viewUserDetails.daysRemaining > 0 && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '12px', color: 'var(--success-600)', fontWeight: 600 }}>
                        (còn {viewUserDetails.daysRemaining} ngày)
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>TRẠNG THÁI TÀI KHOẢN</p>
                <p style={{ margin: 0, fontWeight: 500, color: viewUserDetails.deletedAt ? 'var(--error-600)' : viewUserDetails.active ? 'var(--success-600)' : 'var(--warning-600)' }}>
                  {viewUserDetails.deletedAt ? 'Đã xóa vĩnh viễn' : viewUserDetails.active ? 'Đang hoạt động' : 'Đang bị khóa'}
                </p>
              </div>

              <div>
                <p style={{ margin: '0 0 0.25rem 0', fontSize: '12px', color: 'var(--neutral-500)', fontWeight: 500 }}>XÁC THỰC EMAIL</p>
                <p style={{ margin: 0, fontWeight: 500, color: viewUserDetails.emailVerified ? 'var(--success-600)' : 'var(--warning-600)' }}>
                  {viewUserDetails.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-500)' }}>
            Đang tải dữ liệu hồ sơ...
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminUserList;
