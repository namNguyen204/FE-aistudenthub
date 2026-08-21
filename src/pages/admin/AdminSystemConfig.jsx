import React, { useState, useEffect } from 'react';
import { Shield, Save, Server, AlertCircle, DollarSign } from 'lucide-react';
import adminService from '../../services/admin.service';
import Button from '../../components/Button/Button';

const AdminSystemConfig = () => {
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllConfigs();
      // data might be an array [{key: 'ai_chat_enabled', value: 'true'}, ...]
      // Transform to object for easier binding
      const configObj = {};
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.configValue === 'true' || item.configValue === '1' || item.configValue === true) {
            configObj[item.configKey] = true;
          } else if (item.configValue === 'false' || item.configValue === '0' || item.configValue === false) {
            configObj[item.configKey] = false;
          } else {
            configObj[item.configKey] = item.configValue; // Preserve original string/number
          }
        });
      }
      // Provide some defaults if API is empty
      if (Object.keys(configObj).length === 0) {
        configObj['feature.ai_chat.enabled'] = true;
        configObj['feature.upload.enabled'] = true;
        configObj['system.maintenance_mode'] = false;
      }
      configObj['package.pro.price'] ??= '39000';
      configObj['package.premium.price'] ??= '79000';

      setConfigs(configObj);
    } catch (err) {
      console.warn('Không thể tải cấu hình từ server, sử dụng cấu hình mặc định:', err);

      // Fallback for UI if API missing
      setConfigs({
        'feature.ai_chat.enabled': true,
        'feature.upload.enabled': true,
        'system.maintenance_mode': false,
        'package.pro.price': '39000',
        'package.premium.price': '79000'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleToggle = (key) => {
    setConfigs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));

    setSuccessMsg('');
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      await adminService.updateConfigs(configs);

      setSuccessMsg('Đã lưu cấu hình hệ thống thành công!');
    } catch (err) {
      setError(
        'Lỗi khi lưu cấu hình: ' +
        (err.response?.data?.message || err.message)
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="premium-page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Cài đặt Hệ thống</h1>
        <p className="page-description">Bật/tắt các tính năng cốt lõi và quản lý trạng thái của hệ thống.</p>
      </div>

      <div className="dashboard-section glass-card" style={{ width: '100%' }}>
        <div className="dashboard-section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Server size={20} color="var(--primary-600)" />
          <h3 className="dashboard-section-title">Tính năng hệ thống</h3>
        </div>

        <div className="dashboard-section-body" style={{ padding: '2rem' }}>
          {error && (
            <div style={{ backgroundColor: 'var(--error-50)', color: 'var(--error-600)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{ backgroundColor: 'var(--success-50)', color: 'var(--success-600)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} />
              {successMsg}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-500)' }}>Đang tải cấu hình...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--neutral-800)' }}>Tính năng AI Chat</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--neutral-500)' }}>Cho phép người dùng tương tác với AI và hỏi đáp tài liệu.</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={!!configs['feature.ai_chat.enabled']} onChange={() => handleToggle('feature.ai_chat.enabled')} />
                  <span className="slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--neutral-800)' }}>Tải lên Tài liệu</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--neutral-500)' }}>Cho phép users mới upload file lên hệ thống.</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={!!configs['feature.upload.enabled']} onChange={() => handleToggle('feature.upload.enabled')} />
                  <span className="slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--warning-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning-200)' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--warning-800)' }}>Chế độ Bảo trì</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--warning-600)' }}>Tạm ngưng tất cả chức năng, chỉ Admin mới truy cập được hệ thống.</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={!!configs['system.maintenance_mode']} onChange={() => handleToggle('system.maintenance_mode')} />
                  <span className="slider"></span>
                </label>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleSave} isLoading={saving} disabled={saving}>
                  <Save size={18} />
                  Lưu cấu hình
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--neutral-300);
          transition: .3s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input:checked + .slider {
          background-color: var(--primary-500);
        }
        input:checked + .slider:before {
          transform: translateX(24px);
        }
      `}} />
    </div>
  );
};

export default AdminSystemConfig;
