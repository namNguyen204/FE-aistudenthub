import React, { useEffect, useState } from 'react';
import { CreditCard, Zap, Crown, CheckCircle2, BookOpen, Check, X } from 'lucide-react';
import Button from '../../../components/Button/Button';
import paymentService from '../../../services/payment.service';
import { useAuth } from '../../../context/AuthContext';
import './Payment.css';

const PACKAGES = [
  {
    id: 'basic',
    name: 'Gói Cơ bản',
    price: 0,
    priceStr: 'Miễn phí',
    icon: <BookOpen size={24} className="package-icon" />,
    color: 'var(--primary-500)',
    description: 'Dành cho sinh viên mới bắt đầu, trải nghiệm các tính năng cơ bản của hệ thống.',
    features: [
      { text: '5 câu hỏi AI / ngày', included: true },
      { text: 'Lưu trữ tối đa 50 tài liệu', included: true },
      { text: 'Dung lượng tối đa 10MB/tài liệu', included: true },
      { text: 'Tải lên & xem trước tài liệu', included: true },
      { text: 'Chat AI cơ bản', included: true },
      { text: 'Phân tích tài liệu PDF nâng cao', included: false }
    ],
    isPopular: false,
    buttonText: 'Đang sử dụng',
    subText: 'Không cần thẻ tín dụng'
  },
  {
    id: 'pro',
    name: 'Gói Nâng cao',
    price: 39000,
    priceStr: '39.000đ',
    icon: <Zap size={24} className="package-icon text-warning" />,
    color: '#eab308',
    description: 'Dành cho sinh viên học tập thường xuyên, cần AI hỗ trợ phân tích và tóm tắt.',
    features: [
      { text: '10 câu hỏi AI / ngày', included: true },
      { text: 'Lưu trữ tối đa 100 tài liệu', included: true },
      { text: 'Phân tích & trích xuất nội dung PDF', included: true },
      { text: 'Quản lý thư mục & nhãn', included: true },
      { text: 'Hỏi đáp AI theo từng tài liệu', included: true },
      { text: 'Tóm tắt tài liệu tự động', included: true }
    ],
    isPopular: true,
    buttonText: 'Chọn gói này',
    subText: 'Thanh toán qua VietQR - PayOS'
  },
  {
    id: 'premium',
    name: 'Gói Chuyên gia',
    price: 79000,
    priceStr: '79.000đ',
    icon: <Crown size={24} className="package-icon text-danger" />,
    color: 'var(--danger-500)',
    description: 'Dành cho sinh viên ôn thi, làm đồ án cần xử lý lượng lớn tài liệu và giải bài tập.',
    features: [
      { text: '15 câu hỏi AI / ngày', included: true },
      { text: 'Lưu trữ tối đa 150 tài liệu', included: true },
      { text: 'Tất cả tính năng gói Nâng cao', included: true },
      { text: 'Ưu tiên tốc độ xử lý AI', included: true }
    ],
    isPopular: false,
    buttonText: 'Chọn gói này',
    subText: 'Thanh toán qua VietQR - PayOS'
  }
];

const PaymentPackage = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState(PACKAGES);
  const [selectedPkg, setSelectedPkg] = useState(PACKAGES[1]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPricingPlans = async () => {
      try {
        const remotePlans = await paymentService.getPricingPlans();

        if (!Array.isArray(remotePlans)) return;

        const merged = PACKAGES.map((pkg) => {
          if (pkg.id === 'basic') {
            return pkg;
          }

          // Frontend PRO = Backend STUDENT
          // Frontend PREMIUM = Backend PRO
          const backendPlanName =
            pkg.id === 'pro' ? 'STUDENT' : 'PRO';

          const plan = remotePlans.find(
            (item) =>
              String(item.name || '')
                .trim()
                .toUpperCase() === backendPlanName
          );

          if (!plan) {
            return pkg;
          }

          const price = Number(plan.price);

          return {
            ...pkg,

            // ID frontend vẫn giữ nguyên
            id: pkg.id,

            // Lưu ID PricingPlan để thanh toán
            planId: plan.id,

            // Giá lấy từ DB
            price,

            priceStr:
              price === 0
                ? 'Miễn phí'
                : `${price.toLocaleString('vi-VN')}đ`,

            // Có thể lấy giới hạn từ backend
            aiDailyLimit: plan.aiDailyLimit,
            documentLimit: plan.documentLimit,
            durationMonths: plan.durationMonths
          };
        });

        setPackages(merged);

        setSelectedPkg((current) =>
          merged.find(
            (pkg) => pkg.id === current.id
          ) || merged[1]
        );

      } catch (err) {
        console.warn(
          'Không thể tải PricingPlan:',
          err
        );
      }
    };

    loadPricingPlans();
  }, []);

  const handlePayment = async (
    packageToBuy = selectedPkg
  ) => {
    const targetPackage =
      packageToBuy || selectedPkg;

    if (user?.subscriptionTier === 'PREMIUM') {
      setError(
        'Tài khoản của bạn đã có gói Chuyên gia (Premium). Bạn không thể mua thêm do hạn sử dụng là 30 ngày/1 gói.'
      );
      return;
    }

    if (
      user?.subscriptionTier === 'PRO' &&
      targetPackage.id === 'pro'
    ) {
      setError(
        'Tài khoản của bạn đã có gói Nâng cao (Pro). Bạn chỉ có thể nâng cấp lên gói Chuyên gia.'
      );
      return;
    }

    if (
      user?.subscriptionTier === 'BASIC' &&
      targetPackage.id === 'basic'
    ) {
      setError(
        'Bạn đang sử dụng gói Cơ bản.'
      );
      return;
    }

    // Basic không thanh toán
    if (targetPackage.id === 'basic') {
      return;
    }

    // Phải có PricingPlan ID
    if (!targetPackage.planId) {
      setError(
        'Không tìm thấy PricingPlan. Vui lòng tải lại trang.'
      );
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const returnUrl =
        `${window.location.origin}/dashboard/payment/success`;

      const cancelUrl =
        `${window.location.origin}/dashboard/payment/cancel`;

      // QUAN TRỌNG:
      // Không gửi price nữa.
      // Backend tự lấy price từ PricingPlan.
      const response =
        await paymentService.createPaymentByPlan(
          targetPackage.planId,
          returnUrl,
          cancelUrl
        );

      if (response?.checkoutUrl) {
        window.location.href =
          response.checkoutUrl;
      } else {
        setError(
          'Không thể tạo link thanh toán, vui lòng thử lại sau.'
        );
        setIsProcessing(false);
      }

    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
        'Đã xảy ra lỗi khi kết nối tới cổng thanh toán.'
      );

      setIsProcessing(false);
    }
  };
  
  return (
    <div className="premium-page-wrapper payment-page">
      <div className="page-header text-center" style={{ alignItems: 'center', marginBottom: '3rem' }}>
        <h1 className="page-title">Nâng cấp Tài khoản</h1>
        <p className="page-description" style={{ maxWidth: '600px', margin: '0.5rem auto' }}>
          Mở khóa toàn bộ sức mạnh của AI Student Hub với các gói cước siêu tiết kiệm. Thanh toán an toàn, nhanh chóng qua VietQR.
        </p>
      </div>

      {user?.subscriptionTier === 'PREMIUM' && (
        <div className="alert alert-success" style={{ maxWidth: '800px', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Crown size={24} color="#eab308" fill="#eab308" />
          <div>
            Tài khoản của bạn đang sử dụng <strong>Gói Chuyên gia (Premium)</strong>!
            Còn <strong>{user?.premiumExpireAt ? Math.ceil((new Date(user.premiumExpireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 30} ngày</strong> (hết hạn ngày <strong>{user?.premiumExpireAt ? new Date(user.premiumExpireAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</strong>). Hiện tại bạn không thể mua thêm.
          </div>
        </div>
      )}
      {user?.subscriptionTier === 'PRO' && (
        <div className="alert alert-info" style={{ maxWidth: '800px', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '1rem', borderRadius: '12px' }}>
          <Zap size={24} color="#0284c7" fill="#0284c7" />
          <div>
            <strong>Tài khoản của bạn đang sử dụng Gói Nâng cao (Pro)!</strong>
            <br />
            Bạn có thể nâng cấp lên Gói Chuyên gia để trải nghiệm đầy đủ tính năng.
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger" style={{ maxWidth: '800px', margin: '0 auto 2rem' }}>{error}</div>}

      <div className="packages-grid">

        {packages.map((pkg) => {
          const isSelected = selectedPkg.id === pkg.id;

          let isDisabled = isProcessing || pkg.id === 'basic';
          let btnText = pkg.buttonText;

          if (user?.subscriptionTier === 'PREMIUM') {
            isDisabled = true;
            btnText = pkg.id === 'premium' ? 'Đang sử dụng' : 'Không khả dụng';
          } else if (user?.subscriptionTier === 'PRO') {
            if (pkg.id === 'pro') {
              isDisabled = true;
              btnText = 'Đang sử dụng';
            } else if (pkg.id === 'basic') {
              isDisabled = true;
              btnText = 'Không khả dụng';
            }
          } else {
            if (pkg.id === 'basic') {
              isDisabled = true;
              btnText = 'Đang sử dụng';
            }
          }

          return (
            <div
              key={pkg.id}
              className={`package-card glass-card ${isSelected ? 'selected' : ''} ${pkg.isPopular ? 'popular' : ''}`}
              onClick={() => setSelectedPkg(pkg)}
              style={{ '--pkg-color': pkg.color }}
            >
              {pkg.isPopular && <div className="popular-badge">Phổ biến nhất</div>}

              <div className="package-header">
                <div className="icon-wrapper" style={{ color: pkg.color, backgroundColor: `${pkg.color}15` }}>
                  {pkg.icon}
                </div>
                <h3 className="package-name">{pkg.name}</h3>
                <div className="package-price">
                  <span className="amount">{pkg.priceStr}</span>
                  <span className="period">/tháng</span>
                </div>
                <p className="package-desc">{pkg.description}</p>
              </div>

              <ul className="package-features">
                {pkg.features.map((feature, idx) => (
                  <li key={idx} className={!feature.included ? 'disabled' : ''}>
                    {feature.included ? (
                      <Check size={18} color="var(--success-500)" />
                    ) : (
                      <X size={18} color="var(--neutral-400)" />
                    )}
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <div className="package-footer">
                <Button
                  className={`package-btn w-100 ${isSelected ? 'active' : ''}`}
                  style={{
                    backgroundColor: isSelected && !isDisabled ? pkg.color : '',
                    borderColor: isSelected && !isDisabled ? pkg.color : ''
                  }}
                  disabled={isDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePayment(pkg);
                  }}
                >
                  {isProcessing && isSelected ? <Zap className="spin" size={18} /> : null}
                  {btnText}
                </Button>
                <div className="package-subtext">{pkg.subText}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="payment-action-container glass-card text-center" style={{ marginTop: '3rem' }}>
        <h3 className="mb-2">Bạn đang chọn: <strong>{selectedPkg.name}</strong></h3>
        <p className="text-neutral-500 mb-4">Tổng thanh toán: <strong style={{ color: 'var(--primary-600)', fontSize: '1.25rem' }}>{selectedPkg.priceStr}</strong></p>

        {(() => {
          let isDisabled = isProcessing || selectedPkg.id === 'basic';
          let btnText = selectedPkg.price === 0 ? 'Gói mặc định của bạn' : (isProcessing ? 'Đang chuyển hướng...' : 'Thanh toán qua VietQR');

          if (user?.subscriptionTier === 'PREMIUM') {
            isDisabled = true;
            btnText = selectedPkg.id === 'premium' ? 'Bạn đang sử dụng gói này' : 'Không khả dụng (Bạn đã có gói cao hơn)';
          } else if (user?.subscriptionTier === 'PRO') {
            if (selectedPkg.id === 'pro') {
              isDisabled = true;
              btnText = 'Bạn đang sử dụng gói này';
            } else if (selectedPkg.id === 'basic') {
              isDisabled = true;
              btnText = 'Không khả dụng (Bạn đã có gói cao hơn)';
            }
          } else {
            if (selectedPkg.id === 'basic') {
              isDisabled = true;
              btnText = 'Bạn đang sử dụng gói này';
            }
          }

          return (
            <Button
              variant="primary"
              size="lg"
              onClick={() => handlePayment()}
              disabled={isDisabled}
              style={{ minWidth: '250px', fontSize: '1.1rem' }}
            >
              {btnText}
            </Button>
          );
        })()}
        {selectedPkg.price > 0 && (
          <div className="payment-methods mt-3 text-neutral-400" style={{ fontSize: '0.85rem' }}>
            Hỗ trợ quét mã QR qua mọi ứng dụng ngân hàng và ví điện tử tại Việt Nam.
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPackage;
