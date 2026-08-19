export const VIOLATION_REASONS = [
  {
    id: 'COPYRIGHT_VIOLATION',
    label: 'Vi phạm bản quyền',
    guidance: 'Nêu rõ nội dung bị sao chép, chủ sở hữu hoặc nguồn gốc và trang/vị trí xuất hiện.',
    placeholder: 'Ví dụ: Trang 3–8 sao chép nguyên văn từ giáo trình..., tác giả/chủ sở hữu là...'
  },
  {
    id: 'INAPPROPRIATE_CONTENT',
    label: 'Nội dung không phù hợp',
    guidance: 'Mô tả loại nội dung và vị trí cụ thể trong tài liệu để quản trị viên kiểm tra.',
    placeholder: 'Ví dụ: Trang 5 có nội dung kích động/bạo lực...'
  },
  {
    id: 'PERSONAL_INFORMATION',
    label: 'Lộ dữ liệu cá nhân',
    guidance: 'Dùng khi tài liệu chứa họ tên kèm số điện thoại, email, địa chỉ, tài khoản hoặc dữ liệu riêng tư khác.',
    placeholder: 'Ví dụ: Trang 2 chứa họ tên, số điện thoại và địa chỉ của một cá nhân...'
  },
  {
    id: 'IDENTITY_DOCUMENT',
    label: 'Chứa giấy tờ/ID định danh',
    guidance: 'Dùng khi thấy CCCD/CMND, hộ chiếu, thẻ sinh viên, mã số cá nhân hoặc ảnh giấy tờ có thể nhận diện một người.',
    placeholder: 'Ví dụ: Trang 1 có ảnh CCCD, hiển thị số định danh và ảnh chân dung...'
  },
  {
    id: 'SPAM',
    label: 'Spam hoặc quảng cáo',
    guidance: 'Dấu hiệu gồm nội dung lặp lại, không liên quan học tập, chèn hàng loạt liên kết, số liên hệ hoặc lời mời mua hàng.',
    placeholder: 'Ví dụ: Nội dung/l liên kết quảng cáo lặp lại ở các trang..., không liên quan tiêu đề tài liệu...'
  },
  {
    id: 'OTHER',
    label: 'Lý do khác',
    guidance: 'Mô tả rõ hành vi vi phạm và vị trí xuất hiện trong tài liệu.',
    placeholder: 'Mô tả chi tiết vi phạm, bằng chứng và trang/vị trí xuất hiện...'
  }
];

export const getViolationReason = (id) =>
  VIOLATION_REASONS.find((reason) => reason.id === id) || {
    id,
    label: id || 'Chưa xác định',
    guidance: 'Loại vi phạm do hệ thống ghi nhận.'
  };

