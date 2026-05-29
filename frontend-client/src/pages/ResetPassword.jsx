import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import API_URL from '../config';
import '../assets/css/auth.css';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Cập nhật SEO Meta tags khi truy cập trang đặt lại mật khẩu
    useEffect(() => {
        document.title = "Đặt lại mật khẩu - CaféSync";
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute("content", "Đặt lại mật khẩu mới cho tài khoản CaféSync của bạn một cách bảo mật.");
        } else {
            const meta = document.createElement('meta');
            meta.name = "description";
            meta.content = "Đặt lại mật khẩu mới cho tài khoản CaféSync của bạn một cách bảo mật.";
            document.head.appendChild(meta);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!password || !confirmPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Thiếu thông tin',
                text: 'Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu.',
                confirmButtonColor: '#826644',
                customClass: {
                    confirmButton: 'rounded-pill px-4'
                }
            });
            return;
        }

        if (password !== confirmPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Mật khẩu không khớp',
                text: 'Mật khẩu mới và mật khẩu xác nhận không giống nhau. Vui lòng kiểm tra lại!',
                confirmButtonColor: '#826644',
                customClass: {
                    confirmButton: 'rounded-pill px-4'
                }
            });
            return;
        }

        if (password.length < 6) {
            Swal.fire({
                icon: 'warning',
                title: 'Mật khẩu quá ngắn',
                text: 'Mật khẩu mới phải có ít nhất 6 ký tự để đảm bảo an toàn.',
                confirmButtonColor: '#826644',
                customClass: {
                    confirmButton: 'rounded-pill px-4'
                }
            });
            return;
        }

        try {
            setLoading(true);
            Swal.showLoading();
            
            const res = await axios.post(`${API_URL}/api/auth/reset-password/${token}`, { password });
            
            Swal.close();
            setLoading(false);

            Swal.fire({
                icon: 'success',
                title: 'Đặt lại mật khẩu thành công!',
                text: res.data.message || 'Mật khẩu của bạn đã được cập nhật thành công. Mời bạn đăng nhập lại!',
                confirmButtonColor: '#826644',
                customClass: {
                    confirmButton: 'rounded-pill px-4'
                }
            });

            // Chuyển hướng về trang Đăng nhập sau khi đổi thành công
            navigate('/login');
        } catch (error) {
            Swal.close();
            setLoading(false);
            
            Swal.fire({
                icon: 'error',
                title: 'Liên kết không hợp lệ',
                text: error.response?.data?.message || 'Mã token khôi phục mật khẩu đã hết hạn hoặc không hợp lệ!',
                confirmButtonColor: '#826644',
                customClass: {
                    confirmButton: 'rounded-pill px-4'
                }
            });
        }
    };

    return (
        <div className="auth-page-wrapper">
            <Link to="/login" className="auth-back-btn" id="btn-back-to-login">
                <i className="bi bi-chevron-left fs-5"></i>
            </Link>

            <div className="auth-container animate__animated animate__fadeIn">
                <img
                    src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80"
                    alt="CaféSync Coffee Reset Password"
                    className="auth-header-img"
                />

                <div className="auth-form-content shadow-lg">
                    <form onSubmit={handleSubmit} className="animate__animated animate__fadeIn" id="reset-password-form">
                        <div className="text-center mb-4">
                            <h1 className="text-white fw-bold fs-4 mb-2">Đặt lại mật khẩu mới</h1>
                            <p className="text-white-50 small">Thiết lập mật khẩu mới cho tài khoản CaféSync của bạn</p>
                        </div>

                        <div className="auth-input-group mb-3">
                            <i className="bi bi-lock-fill"></i>
                            <input
                                id="input-new-password"
                                type="password" 
                                className="auth-form-control"
                                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="auth-input-group mb-4">
                            <i className="bi bi-shield-lock-fill"></i>
                            <input
                                id="input-confirm-password"
                                type="password" 
                                className="auth-form-control"
                                placeholder="Nhập lại mật khẩu mới" 
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="text-center mt-4 mb-2">
                            <button 
                                id="btn-submit-reset-password"
                                type="submit" 
                                className="btn-auth-soft shadow w-100 py-3 text-uppercase fw-bold letter-spacing-1"
                                disabled={loading}
                            >
                                {loading ? "Đang xử lý..." : "Lưu thay đổi"}
                            </button>
                        </div>

                        <div className="text-center mt-3">
                            <Link to="/login" className="btn btn-link text-white-50 text-decoration-none small" id="link-login-return">
                                <i className="bi bi-arrow-left me-1"></i> Quay lại Đăng nhập
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
