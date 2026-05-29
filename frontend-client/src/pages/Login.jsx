import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2'; // Import thư viện thông báo xịn
import API_URL from '../config';
import '../assets/css/auth.css';

const Login = () => {
    // 1. Quản lý trạng thái Tab (Sign In / Sign Up)
    const [isLoginTab, setIsLoginTab] = useState(true);

    // 2. Quản lý dữ liệu nhập vào
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });

    // Trạng thái Quên mật khẩu
    const [forgotViewState, setForgotViewState] = useState('none'); // 'none', 'forgot'
    const [forgotEmail, setForgotEmail] = useState('');

    const navigate = useNavigate();
    const AUTH_API_URL = `${API_URL}/api/auth`;

    // Hàm lấy tên gọi thân mật tự động từ chuỗi họ tên
    const getFirstName = (fullName) => {
        if (!fullName) return "bạn";
        return fullName.trim().split(' ').pop();
    };

    // Hàm xử lý Đăng nhập mạng xã hội (Google & Facebook)
    const handleSocialLogin = (provider) => {
        if (provider === 'google') {
            // Chuyển hướng trực tiếp đến route Passport OAuth của Backend
            window.location.href = `${API_URL}/api/auth/google`;
        } else if (provider === 'facebook') {
            // Chuyển hướng trực tiếp đến route Passport OAuth của Backend
            window.location.href = `${API_URL}/api/auth/facebook`;
        }
    };

    const handleSocialSuccess = (data) => {
        if (data.token) {
            localStorage.removeItem('lastOrderDBId');
            localStorage.removeItem('cart');
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userName', data.user.name);
            localStorage.setItem('userEmail', data.user.email);

            const friendlyName = getFirstName(data.user.name);
            Swal.fire({
                icon: 'success',
                title: `Chào ${friendlyName}!`,
                text: 'Bạn đã đăng nhập thành công bằng tài khoản mạng xã hội',
                confirmButtonColor: '#826644',
                timer: 2000,
                showConfirmButton: false
            });

            setTimeout(() => {
                navigate('/');
                window.location.reload();
            }, 2000);
        }
    };

    // Effect lắng nghe thông tin trả về từ Google/Facebook OAuth Callback qua URL params
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const tokenParam = queryParams.get('token');
        const nameParam = queryParams.get('name');
        const emailParam = queryParams.get('email');
        const errorParam = queryParams.get('error');

        if (tokenParam && nameParam && emailParam) {
            // Xóa sạch query parameters trên URL để bảo mật
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Đăng nhập thành công
            handleSocialSuccess({
                token: tokenParam,
                user: { name: nameParam, email: emailParam }
            });
        } else if (errorParam) {
            const detailsParam = queryParams.get('details');
            window.history.replaceState({}, document.title, window.location.pathname);
            const providerName = errorParam.includes('facebook') ? 'Facebook' : 'Google';
            Swal.fire({
                icon: 'error',
                title: `Lỗi đăng nhập ${providerName}`,
                text: detailsParam 
                    ? `Chi tiết: ${decodeURIComponent(detailsParam)}` 
                    : `Đăng nhập bằng tài khoản ${providerName} thất bại. Vui lòng thử lại!`,
                confirmButtonColor: '#826644'
            });
        }
    }, [navigate]);

    // 3. Hàm xử lý Đăng nhập
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${AUTH_API_URL}/login-custom`, loginData);
            if (res.data.token) {
                // XÓA DẤU VẾT KHÁCH VÃN LAI TRƯỚC KHI LƯU USER MỚI
                localStorage.removeItem('lastOrderDBId');
                localStorage.removeItem('cart'); // Nếu muốn giỏ hàng cũng phải sạch khi đổi user

                localStorage.setItem('userToken', res.data.token);
                localStorage.setItem('userName', res.data.user.name);
                localStorage.setItem('userEmail', res.data.user.email);

                const friendlyName = getFirstName(res.data.user.name);

                // Thông báo chào mừng hiện đại
                Swal.fire({
                    icon: 'success',
                    title: `Chào ${friendlyName}!`,
                    text: 'Chào mừng bạn quay trở lại với CaféSync',
                    confirmButtonColor: '#826644',
                    timer: 2000,
                    showConfirmButton: false
                });

                setTimeout(() => {
                    navigate('/');
                    window.location.reload();
                }, 2000);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi đăng nhập',
                text: error.response?.data?.message || "Email hoặc mật khẩu không đúng!",
                confirmButtonColor: '#826644'
            });
        }
    };

    // 4. Hàm xử lý Đăng ký
    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${AUTH_API_URL}/register-custom`, registerData);

            // 1. Xóa dấu vết đơn hàng khách vãn lai để tài khoản mới sạch sẽ
            localStorage.removeItem('lastOrderDBId');

            // 2. Lấy tên để chào cho thân thiện
            const friendlyName = registerData.name.trim().split(' ').pop();

            Swal.fire({
                icon: 'success',
                title: 'Đăng ký thành công!',
                text: `Tài khoản của ${friendlyName} đã sẵn sàng. Mời bạn đăng nhập nhé!`,
                confirmButtonColor: '#826644'
            });

            setIsLoginTab(true);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi đăng ký',
                text: error.response?.data?.message || "Thông tin đăng ký chưa hợp lệ!",
                confirmButtonColor: '#826644'
            });
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        try {
            Swal.showLoading();
            const res = await axios.post(`${AUTH_API_URL}/forgot-password`, { email: forgotEmail });
            Swal.close();
            
            Swal.fire({
                icon: 'success',
                title: 'Gửi yêu cầu thành công!',
                text: 'Vui lòng kiểm tra hộp thư Gmail của bạn!',
                confirmButtonColor: '#826644'
            });
            setForgotViewState('none');
            setForgotEmail('');
        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Lỗi gửi yêu cầu',
                text: error.response?.data?.message || "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng kiểm tra lại email!",
                confirmButtonColor: '#826644'
            });
        }
    };

    return (
        <div className="auth-page-wrapper">
            <Link to="/" className="auth-back-btn">
                <i className="bi bi-chevron-left fs-5"></i>
            </Link>

            <div className="auth-container animate__animated animate__fadeIn">
                <img
                    src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80"
                    alt="CaféSync Coffee"
                    className="auth-header-img"
                />

                <div className="auth-form-content shadow-lg">
                    {forgotViewState === 'none' && (
                        <ul className="nav auth-tabs-nav">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${isLoginTab ? 'active' : ''}`}
                                    onClick={() => setIsLoginTab(true)}
                                >Đăng nhập</button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${!isLoginTab ? 'active' : ''}`}
                                    onClick={() => setIsLoginTab(false)}
                                >Đăng ký</button>
                            </li>
                        </ul>
                    )}

                    {forgotViewState === 'forgot' ? (
                        <form onSubmit={handleForgotPassword} className="animate__animated animate__fadeIn">
                            <div className="text-center mb-3">
                                <h5 className="text-white fw-bold">Khôi phục mật khẩu</h5>
                                <p className="text-white-50 small">Nhập email đăng ký tài khoản để nhận liên kết khôi phục mật khẩu</p>
                            </div>
                            <div className="auth-input-group">
                                <i className="bi bi-envelope"></i>
                                <input
                                    type="email" className="auth-form-control"
                                    placeholder="Địa chỉ Email" required
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                />
                            </div>
                            <div className="text-center mt-4 mb-2">
                                <button type="submit" className="btn-auth-soft shadow">
                                    GỬI YÊU CẦU
                                </button>
                            </div>
                            <div className="text-center mt-3">
                                <button type="button" className="btn btn-link text-white-50 text-decoration-none small" 
                                    onClick={() => setForgotViewState('none')}>
                                    <i className="bi bi-arrow-left me-1"></i> Quay lại Đăng nhập
                                </button>
                            </div>
                        </form>
                    ) : isLoginTab ? (
                        <form onSubmit={handleLogin} className="animate__animated animate__fadeIn">
                            <div className="auth-input-group">
                                <i className="bi bi-envelope"></i>
                                <input
                                    type="email" className="auth-form-control"
                                    placeholder="Địa chỉ Email" required
                                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                />
                            </div>
                            <div className="auth-input-group">
                                <i className="bi bi-lock"></i>
                                <input
                                    type="password" className="auth-form-control"
                                    placeholder="Mật khẩu" required
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                />
                            </div>
                            <div className="text-center mt-4 mb-3">
                                <button type="submit" className="btn-auth-soft shadow">
                                    ĐĂNG NHẬP
                                </button>
                            </div>
                            <div className="text-center">
                                <a href="#" className="auth-secondary-link" onClick={(e) => { e.preventDefault(); setForgotViewState('forgot'); }}>Quên mật khẩu?</a>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="animate__animated animate__fadeIn">
                            <div className="auth-input-group">
                                <i className="bi bi-person"></i>
                                <input
                                    type="text" className="auth-form-control"
                                    placeholder="Họ và tên" required
                                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                />
                            </div>
                            <div className="auth-input-group">
                                <i className="bi bi-envelope"></i>
                                <input
                                    type="email" className="auth-form-control"
                                    placeholder="Địa chỉ Email" required
                                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                />
                            </div>
                            <div className="auth-input-group">
                                <i className="bi bi-lock"></i>
                                <input
                                    type="password" className="auth-form-control"
                                    placeholder="Mật khẩu" required
                                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                />
                            </div>
                            <div className="text-center mt-4">
                                <button type="submit" className="btn-auth-soft shadow">
                                    ĐĂNG KÝ
                                </button>
                            </div>
                        </form>
                    )}

                    {forgotViewState === 'none' && (
                        <div className="text-center mt-4">
                            <span className="text-white-50 small">hoặc đăng nhập bằng</span>
                            <div className="auth-social-group mt-2">
                                <button type="button" className="auth-social-icon border-0 bg-transparent" onClick={() => handleSocialLogin('facebook')}><i className="bi bi-facebook"></i></button>
                                <button type="button" className="auth-social-icon border-0 bg-transparent" onClick={() => handleSocialLogin('google')}><i className="bi bi-google"></i></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;