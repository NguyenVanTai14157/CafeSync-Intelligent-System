import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { purgeIfStaffSession } from '../utils/authGuard';

/**
 * Route guard bảo vệ các route chức năng cá nhân của Customer Web.
 * 1. Chặn toàn bộ tài khoản nhân viên / quản trị (staff, admin, manager, quanly, nhanvien).
 * 2. Xóa sạch thông tin đăng nhập staff nếu còn sót trong localStorage/token.
 * 3. Chuyển hướng về /login kèm thông báo rõ ràng.
 * 4. Không ảnh hưởng đến khách vãng lai (Guest) và khách hàng hợp lệ (Customer).
 */
const CustomerRouteGuard = ({ children, requireAuth = false }) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra và thanh trừng phiên staff nếu phát hiện
    const isStaff = purgeIfStaffSession();
    if (isStaff) {
      Swal.fire({
        icon: 'error',
        title: 'Truy cập bị từ chối',
        text: 'Tài khoản nhân viên không sử dụng Customer Web. Vui lòng đăng nhập tại hệ thống Admin/POS.',
        confirmButtonColor: '#826644'
      });
      navigate('/login', { replace: true });
      return;
    }

    // 2. Nếu route yêu cầu bắt buộc đăng nhập (như /profile), kiểm tra userToken
    if (requireAuth) {
      const token = localStorage.getItem('userToken');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
    }

    setIsAuthorized(true);
  }, [navigate, requireAuth]);

  if (!isAuthorized) {
    return null;
  }

  return children;
};

export default CustomerRouteGuard;
