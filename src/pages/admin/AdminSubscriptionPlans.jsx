import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Power, HardDrive, Upload, MessageSquare, Check, AlertTriangle, Shield, Crown, Zap } from 'lucide-react';
import Button from '../../components/Button/Button';
import Input from '../../components/Input/Input';
import Modal from '../../components/Modal/Modal';
import adminService from '../../services/admin.service';
import './AdminSubscriptionPlans.css';

const DEFAULT_PLANS = [
  {
    id: 'basic',
    badge: 'BASIC',
    name: 'Gói Cơ bản',
    price: 0,
    duration: 'Không giới hạn thời hạn',
    storageMb: 10,
    documentLimit: 50,
    aiDailyLimit: 5,
    description: 'Dành cho sinh viên mới bắt đầu, trải nghiệm các tính năng cơ bản của hệ thống.',
    active: true
  },
  {
    id: 'pro',
    badge: 'PRO',
    name: 'Gói Nâng cao',
    price: 39000,
    duration: '30 ngày',
    storageMb: 50,
    documentLimit: 100,
    aiDailyLimit: 10,
    description: 'Dành cho sinh viên học tập thường xuyên, cần AI hỗ trợ phân tích và tóm tắt.',
    active: true
  },
  {
    id: 'premium',
    badge: 'PREMIUM',
    name: 'Gói Chuyên gia',
    price: 79000,
    duration: '30 ngày',
    storageMb: 100,
    documentLimit: 150,
    aiDailyLimit: 15,
    description: 'Dành cho sinh viên ôn thi, làm đồ án cần xử lý lượng lớn tài liệu và giải bài tập.',
    active: true
  }
];

const AdminSubscriptionPlans = () => {
  const [plans, setPlans] = useState(() => {
    const saved = localStorage.getItem('admin_subscription_plans_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const pro = parsed.find(p => p.id === 'pro');
        if (pro && (pro.price >= 79000 || pro.aiDailyLimit >= 15)) {
          pro.price = 39000;
          pro.aiDailyLimit = 10;
          pro.documentLimit = 100;
          pro.storageMb = 50;
          localStorage.setItem('admin_subscription_plans_v2', JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {}
    }
    return DEFAULT_PLANS;
  });

  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [formData, setFormData] = useState({
    badge: '',
    name: '',
    price: 0,
    originalPrice: '',
    duration: '30 ngày',
    storageMb: 10,
    documentLimit: 50,
    aiDailyLimit: 5,
    description: '',
    active: true
  });

  useEffect(() => {
    localStorage.setItem('admin_subscription_plans_v2', JSON.stringify(plans));
  }, [plans]);

  // Load pricing plans from Backend API on initial mount
  useEffect(() => {
    const loadRemotePlans = async () => {
      try {
        const remotePlans = await adminService.getPricingPlans();
        if (!Array.isArray(remotePlans) || remotePlans.length === 0) return;

        setPlans(currentPlans => {
          const next = currentPlans.map(pkg => {
            if (pkg.id === 'basic' || pkg.badge === 'BASIC') return pkg;
            
            let remoteItem = null;
            if (pkg.id === 'pro') {
              remoteItem = remotePlans.find(r => {
                const name = String(r.name || '').trim().toUpperCase();
                return name === 'STUDENT' || name === 'NÂNG CAO' || name === 'GÓI NÂNG CAO';
              }) || remotePlans.find(r => Number(r.price) > 0 && Number(r.price) < 70000);
            } else if (pkg.id === 'premium') {
              remoteItem = remotePlans.find(r => {
                const name = String(r.name || '').trim().toUpperCase();
                return name === 'PRO' || name === 'PREMIUM' || name === 'CHUYÊN GIA' || name === 'GÓI CHUYÊN GIA';
              }) || remotePlans.find(r => Number(r.price) >= 70000);
            }

            if (!remoteItem) return pkg;
            return {
              ...pkg,
              backendId: remoteItem.id,
              price: Number(remoteItem.price ?? pkg.price),
              aiDailyLimit: remoteItem.aiDailyLimit ?? pkg.aiDailyLimit,
              documentLimit: remoteItem.documentLimit ?? pkg.documentLimit,
              storageMb: remoteItem.storageMb ?? pkg.storageMb
            };
          });
          return next;
        });
      } catch (err) {
        console.warn('Lỗi tải PricingPlan từ API:', err);
      }
    };
    loadRemotePlans();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      badge: 'CUSTOM',
      name: '',
      price: 0,
      originalPrice: '',
      duration: '30 ngày',
      storageMb: 10,
      documentLimit: 50,
      aiDailyLimit: 5,
      description: '',
      active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan) => {
    if (plan.id === 'basic' || plan.badge === 'BASIC') {
      alert('Gói Cơ bản (Basic) là gói mặc định miễn phí của hệ thống và không thể chỉnh sửa.');
      return;
    }
    setEditingPlan(plan);
    setFormData({
      badge: plan.badge || '',
      name: plan.name || '',
      price: plan.price || 0,
      duration: plan.duration || '30 ngày',
      storageMb: plan.storageMb || 10,
      documentLimit: plan.documentLimit || 50,
      aiDailyLimit: plan.aiDailyLimit || 5,
      description: plan.description || '',
      active: plan.active !== false
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!editingPlan) return;

    const newPrice = Number(formData.price || 0);
    const newDocumentLimit = Number(formData.documentLimit || 0);
    const newAiDailyLimit = Number(formData.aiDailyLimit || 0);

    const updatedPlanData = {
      ...editingPlan,
      price: newPrice,
      documentLimit: newDocumentLimit,
      aiDailyLimit: newAiDailyLimit,
      active: formData.active
    };

    // Update state and localStorage immediately
    setPlans(prev => {
      const next = prev.map(p => p.id === editingPlan.id ? updatedPlanData : p);
      localStorage.setItem('admin_subscription_plans_v2', JSON.stringify(next));
      return next;
    });

    setIsModalOpen(false);

    // Call API to sync with backend
    const backendName = editingPlan.id === 'pro' ? 'STUDENT' : (editingPlan.id === 'premium' ? 'PRO' : 'BASIC');
    const targetId = editingPlan.backendId;

    const requestBody = {
      name: backendName,
      price: newPrice,
      durationMonths: editingPlan.id === 'basic' ? 120 : 1,
      aiDailyLimit: newAiDailyLimit,
      documentLimit: newDocumentLimit,
      description: editingPlan.description || 'Gói cước hệ thống',
      active: formData.active !== false
    };

    try {
      if (targetId && targetId !== 'pro' && targetId !== 'premium' && targetId !== 'basic') {
        await adminService.updatePricingPlan(targetId, requestBody);
      } else {
        const created = await adminService.createPricingPlan(requestBody);
        if (created && created.id) {
          setPlans(prev => {
            const next = prev.map(p => p.id === editingPlan.id ? { ...p, backendId: created.id } : p);
            localStorage.setItem('admin_subscription_plans_v2', JSON.stringify(next));
            return next;
          });
        }
      }
    } catch (err) {
      console.warn('Lỗi khi gọi API cập nhật gói cước:', err);
    }

    // Sync system config prices for payments (package.pro.price / package.premium.price)
    try {
      if (editingPlan.id === 'pro' || editingPlan.badge === 'PRO') {
        await adminService.updateConfigs({ 'package.pro.price': String(newPrice) });
      } else if (editingPlan.id === 'premium' || editingPlan.badge === 'PREMIUM') {
        await adminService.updateConfigs({ 'package.premium.price': String(newPrice) });
      }
    } catch (e) {
      console.warn('Lỗi khi đồng bộ giá vào System Config:', e);
    }
  };

  const filteredPlans = plans.filter(plan => {
    if (statusFilter === 'ACTIVE') return plan.active;
    if (statusFilter === 'INACTIVE') return !plan.active;
    return true;
  });

  const formatPrice = (price) => price === 0 ? 'Miễn phí' : `${Number(price || 0).toLocaleString('vi-VN')} đ`;

  return (
    <div className="premium-page-wrapper subscription-plans-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Quản lý gói dịch vụ</h1>
          <p className="page-description">Thiết lập giá cước và 3 chỉ số giới hạn hoạt động cho từng gói hệ thống.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--neutral-300)', backgroundColor: 'white', fontSize: '14px' }}
          >
            <option value="ALL">Tất cả Trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </div>
      </div>

      <div className="plans-grid">
        {filteredPlans.map(plan => (
          <div key={plan.id} className={`plan-card glass-card ${!plan.active ? 'inactive' : ''}`}>
            <div className="plan-card-header">
              <span className={`plan-badge-pill badge-${plan.badge.toLowerCase()}`}>
                {plan.badge}
              </span>
              <span className={`plan-status-pill ${plan.active ? 'active' : 'inactive'}`}>
                {plan.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
              </span>
            </div>

            <div className="plan-info">
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price-wrapper">
                <span className="plan-price">{formatPrice(plan.price)}</span>
              </div>
              <div className="plan-duration">{plan.duration}</div>
              {plan.description && (
                <p style={{ fontSize: '13px', color: 'var(--neutral-500)', marginTop: '8px', marginBottom: 0 }}>
                  {plan.description}
                </p>
              )}
            </div>

            <div className="plan-limits-list">
              <div className="limit-item">
                <span className="limit-label"><MessageSquare size={16} /> Lượt câu hỏi AI / ngày</span>
                <span className="limit-value highlighted">{plan.aiDailyLimit} câu / ngày</span>
              </div>
              <div className="limit-item">
                <span className="limit-label"><Upload size={16} /> Giới hạn lưu trữ (tài liệu)</span>
                <span className="limit-value">{plan.documentLimit} tài liệu</span>
              </div>
            </div>

            <div className="plan-card-actions">
              {plan.id === 'basic' || plan.badge === 'BASIC' ? (
                <div style={{ padding: '8px 12px', width: '100%', textAlign: 'center', backgroundColor: 'var(--neutral-100)', borderRadius: '8px', color: 'var(--neutral-500)', fontSize: '13px', fontStyle: 'italic', fontWeight: 500 }}>
                  Gói mặc định của hệ thống (Không thể sửa)
                </div>
              ) : (
                <button className="plan-btn edit" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleOpenEditModal(plan)}>
                  <Edit2 size={16} /> Chỉnh sửa
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Chỉnh sửa cấu hình ${editingPlan?.name || ''}`}
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSubmit}>
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--primary-50)', borderRadius: '8px', border: '1px solid var(--primary-100)', color: 'var(--primary-800)', fontSize: '14px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Gói: {editingPlan?.name} ({editingPlan?.badge})</span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--neutral-600)' }}>Thời hạn: {editingPlan?.duration}</span>
          </div>

          <div>
            <Input
              label="Giá bán (đ) *"
              type="number"
              placeholder="VD: 39000"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              disabled={editingPlan?.id === 'basic'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Lượt câu hỏi AI / ngày *"
              type="number"
              placeholder="VD: 5"
              value={formData.aiDailyLimit}
              onChange={(e) => setFormData({ ...formData, aiDailyLimit: e.target.value })}
              required
            />
            <Input
              label="Giới hạn lưu trữ (tài liệu) *"
              type="number"
              placeholder="VD: 50"
              value={formData.documentLimit}
              onChange={(e) => setFormData({ ...formData, documentLimit: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <input
              type="checkbox"
              id="planActive"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            />
            <label htmlFor="planActive" style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 500, color: 'var(--neutral-800)' }}>
              Đang mở bán / Kích hoạt gói này
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminSubscriptionPlans;
