import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/style.css';
import { showToast, showConfirm } from '../utils/toast'; // Sử dụng bộ thông báo xịn

const Profile = () => {
    const navigate = useNavigate();
    const [orderCount, setOrderCount] = useState(0);
    const [cartCount, setCartCount] = useState(0);
    const API_URL = "https://cafesync-intelligent-system-sntf.onrender.com";

    // Lấy thông tin khách hàng từ LocalStorage
    const userName = localStorage.getItem('userName') || 'Khách hàng';
    const userEmail = localStorage.getItem('userEmail') || 'Chưa cập nhật email';
    const userIdentifier = localStorage.getItem('userEmail') || localStorage.getItem('userName');

    const getFriendlyName = () => {
        return userName.trim().split(' ').pop();
    };

    // Hàm cập nhật số lượng giỏ hàng
    const updateCartCount = () => {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    };

    useEffect(() => {
        if (!userIdentifier) {
            navigate('/login');
            return;
        }

        const fetchProfileData = async () => {
            try {
                // 1. Lấy số lượng đơn hàng
                const res = await axios.get(`${API_URL}/api/orders/user/${userIdentifier}`);
                setOrderCount(res.data.length);

                // 2. Cập nhật giỏ hàng
                updateCartCount();
            } catch (err) {
                console.error("Lỗi lấy thông tin:", err);
            }
        };
        fetchProfileData();

        // Lắng nghe thay đổi giỏ hàng từ các trang khác
        window.addEventListener('cartUpdated', updateCartCount);
        return () => window.removeEventListener('cartUpdated', updateCartCount);
    }, [userIdentifier, navigate]);

    const handleLogout = async () => {
        const result = await showConfirm(
            `${getFriendlyName()} ơi...`,
            "Bạn có chắc chắn muốn đăng xuất khỏi CaféSync không?"
        );

        if (result.isConfirmed) {
            localStorage.clear();
            showToast("Hẹn gặp lại bạn nhé!");
            setTimeout(() => {
                navigate('/');
                window.location.reload();
            }, 1500);
        }
    };

    return (
        <div className="profile-page min-vh-100 bg-light-custom pb-5 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="container pt-4 d-flex align-items-center mb-4">
                <button onClick={() => navigate('/')} className="btn bg-white shadow-sm rounded-circle p-2 me-3 border-0" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-chevron-left text-dark"></i>
                </button>
                <h4 className="fw-bold mb-0">Tài khoản cá nhân</h4>
            </div>

            <div className="container">
                {/* Card Avatar & Thông tin chính */}
                <div className="card-premium text-center p-4 mb-4 shadow-sm border-0" style={{ borderRadius: '25px', backgroundColor: 'white' }}>
                    <div className="position-relative d-inline-block mb-3">
                        <img
                            src={`https://ui-avatars.com/api/?name=${userName}&background=826644&color=fff&size=128`}
                            className="rounded-circle shadow-sm"
                            alt="avatar"
                            style={{ width: '100px', height: '100px', border: '4px solid #fdf8f3' }}
                        />
                        <div className="position-absolute bottom-0 end-0 bg-white rounded-circle shadow-sm p-1 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                            <i className="bi bi-camera-fill text-muted small"></i>
                        </div>
                    </div>
                    <h5 className="fw-bold mb-1">{userName}</h5>
                    <p className="text-muted small mb-3">{userEmail}</p>

                    <div className="d-flex justify-content-center gap-3 border-top pt-3">
                        <div className="text-center px-3">
                            <span className="fw-bold d-block fs-5 text-brown">{orderCount}</span>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>ĐƠN HÀNG</small>
                        </div>
                        <div className="vr opacity-10"></div>
                        <div className="text-center px-3">
                            <span className="fw-bold d-block fs-5 text-brown">Thành viên</span>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>HẠNG THẺ</small>
                        </div>
                    </div>
                </div>

                {/* Danh sách chức năng */}
                <div className="card-premium p-2 shadow-sm border-0" style={{ borderRadius: '20px', backgroundColor: 'white' }}>
                    <div className="list-group list-group-flush">
                        <button onClick={() => navigate('/history')} className="list-group-item list-group-item-action border-0 py-3 d-flex justify-content-between align-items-center">
                            <div><i className="bi bi-clock-history me-3 text-brown"></i>Lịch sử đơn hàng</div>
                            <i className="bi bi-chevron-right text-muted small"></i>
                        </button>
                        <button className="list-group-item list-group-item-action border-0 py-3 d-flex justify-content-between align-items-center">
                            <div><i className="bi bi-geo-alt me-3 text-brown"></i>Địa chỉ của tôi</div>
                            <i className="bi bi-chevron-right text-muted small"></i>
                        </button>
                        <button className="list-group-item list-group-item-action border-0 py-3 d-flex justify-content-between align-items-center">
                            <div><i className="bi bi-shield-lock me-3 text-brown"></i>Đổi mật khẩu</div>
                            <i className="bi bi-chevron-right text-muted small"></i>
                        </button>
                        <button onClick={handleLogout} className="list-group-item list-group-item-action border-0 py-3 d-flex justify-content-between align-items-center text-danger">
                            <div><i className="bi bi-box-arrow-right me-3"></i>Đăng xuất</div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation Đồng bộ */}
            <div className="bottom-nav shadow-lg d-flex justify-content-around align-items-center bg-white py-2 fixed-bottom">
                <i className="bi bi-house-door fs-4 text-muted" onClick={() => navigate('/')}></i>

                <div className="position-relative" onClick={() => navigate('/cart')} style={{ cursor: 'pointer' }}>
                    <i className="bi bi-cart3 fs-4 text-muted"></i>
                    {cartCount > 0 && <span className="badge-cart">{cartCount}</span>}
                </div>

                <i className="bi bi-heart fs-4 text-muted" onClick={() => navigate('/favorites')}></i>

                {/* Icon Profile đang active */}
                <i className="bi bi-person-circle fs-4" style={{ color: '#826644' }} onClick={() => navigate('/profile')}></i>
            </div>
        </div>
    );
};

export default Profile;