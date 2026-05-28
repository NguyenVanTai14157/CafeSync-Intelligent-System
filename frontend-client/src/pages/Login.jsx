import React, { useState } from 'react';
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

    const navigate = useNavigate();
    const AUTH_API_URL = `${API_URL}/api/auth`;

    // Hàm lấy tên gọi thân mật tự động từ chuỗi họ tên
    const getFirstName = (fullName) => {
        if (!fullName) return "bạn";
        return fullName.trim().split(' ').pop();
    };

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
                    <ul className="nav auth-tabs-nav">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${isLoginTab ? 'active' : ''}`}
                                onClick={() => setIsLoginTab(true)}
                            >Sign In</button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${!isLoginTab ? 'active' : ''}`}
                                onClick={() => setIsLoginTab(false)}
                            >Sign Up</button>
                        </li>
                    </ul>

                    {isLoginTab ? (
                        <form onSubmit={handleLogin} className="animate__animated animate__fadeIn">
                            <div className="auth-input-group">
                                <i className="bi bi-envelope"></i>
                                <input
                                    type="email" className="auth-form-control"
                                    placeholder="Email Address" required
                                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                />
                            </div>
                            <div className="auth-input-group">
                                <i className="bi bi-lock"></i>
                                <input
                                    type="password" className="auth-form-control"
                                    placeholder="Password" required
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                />
                            </div>
                            <div className="text-center mt-4 mb-3">
                                <button type="submit" className="btn-auth-soft shadow">
                                    SIGN IN
                                </button>
                            </div>
                            <div className="text-center">
                                <a href="#" className="auth-secondary-link">Forgot Password?</a>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="animate__animated animate__fadeIn">
                            <div className="auth-input-group">
                                <i className="bi bi-person"></i>
                                <input
                                    type="text" className="auth-form-control"
                                    placeholder="Full Name" required
                                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                />
                            </div>
                            <div className="auth-input-group">
                                <i className="bi bi-envelope"></i>
                                <input
                                    type="email" className="auth-form-control"
                                    placeholder="Email Address" required
                                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                />
                            </div>
                            <div className="auth-input-group">
                                <i className="bi bi-lock"></i>
                                <input
                                    type="password" className="auth-form-control"
                                    placeholder="Password" required
                                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                />
                            </div>
                            <div className="text-center mt-4">
                                <button type="submit" className="btn-auth-soft shadow">
                                    SIGN UP
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="text-center mt-4">
                        <span className="text-white-50 small">or login with</span>
                        <div className="auth-social-group mt-2">
                            <a href="#" className="auth-social-icon"><i className="bi bi-facebook"></i></a>
                            <a href="#" className="auth-social-icon"><i className="bi bi-google"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;