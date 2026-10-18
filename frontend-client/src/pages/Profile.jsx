import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import '../assets/css/style.css';
import { showToast, showConfirm } from '../utils/toast';
import BottomNav from '../components/BottomNav';
import PageHeader from '../components/PageHeader';
import { clearCustomerAuth } from '../utils/authGuard';

const Profile = () => {
    const navigate = useNavigate();
    const [orderCount, setOrderCount] = useState(0);
    const [cartCount, setCartCount] = useState(0);

    const userName = localStorage.getItem('userName') || 'Khách hàng';
    const userEmail = localStorage.getItem('userEmail') || 'Chưa cập nhật email';

    const getFriendlyName = () => {
        return userName.trim().split(' ').pop();
    };

    const updateCartCount = () => {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    };

    useEffect(() => {
        const userToken = localStorage.getItem('userToken');
        const savedEmail = localStorage.getItem('userEmail');

        if (!userToken || !savedEmail) {
            clearCustomerAuth();
            navigate('/login');
            return;
        }

        const fetchProfileData = async () => {
            try {
                const headers = { Authorization: `Bearer ${userToken}` };
                const res = await axios.get(`${API_URL}/api/orders/user/${encodeURIComponent(savedEmail.trim())}`, { headers });
                setOrderCount(res.data.length);
                updateCartCount();
            } catch (err) {
                console.error("Lỗi lấy thông tin:", err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    clearCustomerAuth();
                    navigate('/login');
                }
            }
        };
        fetchProfileData();

        window.addEventListener('cartUpdated', updateCartCount);
        return () => window.removeEventListener('cartUpdated', updateCartCount);
    }, [navigate]);

    const handleLogout = async () => {
        const result = await showConfirm(
            `${getFriendlyName()} ơi...`,
            "Bạn có chắc chắn muốn đăng xuất khỏi CaféSync không?"
        );

        if (result.isConfirmed) {
            clearCustomerAuth();
            localStorage.removeItem('cart');
            localStorage.removeItem('lastOrderDBId');
            showToast("Hẹn gặp lại bạn nhé!");
            setTimeout(() => {
                navigate('/');
                window.location.reload();
            }, 1200);
        }
    };

    return (
        <div className="cafe-app-container">
            <PageHeader
                title="Tài khoản cá nhân"
                subtitle="Quản lý thông tin và tài khoản"
                onBack={() => navigate('/')}
            />

            <div className="px-3" style={{ paddingBottom: '90px' }}>
                {/* User card */}
                <div className="cafe-cart-summary-card text-center mb-3 p-4">
                    <div className="position-relative d-inline-block mb-3">
                        <div
                            className="rounded-circle shadow-sm d-flex align-items-center justify-content-center mx-auto"
                            style={{
                                width: '88px',
                                height: '88px',
                                border: '3px solid var(--cafe-border)',
                                background: 'linear-gradient(135deg, var(--cafe-primary) 0%, var(--cafe-caramel) 100%)',
                                color: '#ffffff',
                                fontSize: '2.2rem',
                                fontWeight: 700
                            }}
                            aria-label={`Ảnh đại diện của ${userName}`}
                        >
                            {(userName || 'C').trim().charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <h2 className="fs-5 fw-bold mb-1" style={{ color: 'var(--cafe-brown-dark)' }}>
                        {userName}
                    </h2>
                    <p className="text-muted small mb-3">{userEmail}</p>

                    <div className="d-flex justify-content-center gap-4 pt-3 border-top" style={{ borderColor: 'var(--cafe-border)' }}>
                        <div className="text-center px-2">
                            <span className="fw-bold d-block fs-5" style={{ color: 'var(--cafe-caramel)' }}>
                                {orderCount}
                            </span>
                            <small className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                                ĐƠN HÀNG
                            </small>
                        </div>
                        <div className="vr opacity-25"></div>
                        <div className="text-center px-2">
                            <span className="fw-bold d-block fs-5" style={{ color: 'var(--cafe-caramel)' }}>
                                Thành viên
                            </span>
                            <small className="text-muted" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                                HẠNG THẺ
                            </small>
                        </div>
                    </div>
                </div>

                {/* Actions list */}
                <div className="cafe-cart-summary-card p-2 mb-3">
                    <div className="list-group list-group-flush">
                        <button
                            onClick={() => navigate('/history')}
                            className="list-group-item list-group-item-action border-0 py-3 d-flex justify-content-between align-items-center"
                            style={{ background: 'transparent', color: 'var(--cafe-text)', fontWeight: 500 }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <i className="bi bi-clock-history fs-5" style={{ color: 'var(--cafe-caramel)' }}></i>
                                <span>Lịch sử đơn hàng</span>
                            </div>
                            <i className="bi bi-chevron-right text-muted small"></i>
                        </button>
                        <button
                            onClick={() => navigate('/favorites')}
                            className="list-group-item list-group-item-action border-0 py-3 d-flex justify-content-between align-items-center"
                            style={{ background: 'transparent', color: 'var(--cafe-text)', fontWeight: 500 }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <i className="bi bi-heart fs-5" style={{ color: 'var(--cafe-caramel)' }}></i>
                                <span>Món yêu thích</span>
                            </div>
                            <i className="bi bi-chevron-right text-muted small"></i>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="list-group-item list-group-item-action border-0 py-3 d-flex justify-content-between align-items-center"
                            style={{ background: 'transparent', color: 'var(--cafe-danger)', fontWeight: 600 }}
                        >
                            <div className="d-flex align-items-center gap-3">
                                <i className="bi bi-box-arrow-right fs-5"></i>
                                <span>Đăng xuất</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <BottomNav cartCount={cartCount} />
        </div>
    );
};

export default Profile;