import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/style.css';
import API_URL from '../config';
import BottomNav from '../components/BottomNav';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import PriceDisplay from '../components/PriceDisplay';

import { clearCustomerAuth } from '../utils/authGuard';

const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cartCount, setCartCount] = useState(0);
    const navigate = useNavigate();

    const userEmail = localStorage.getItem('userEmail');
    const userToken = localStorage.getItem('userToken');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const cart = JSON.parse(localStorage.getItem('cart')) || [];
                setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));

                if (userToken && userEmail) {
                    const headers = { Authorization: `Bearer ${userToken}` };
                    const res = await axios.get(`${API_URL}/api/orders/user/${encodeURIComponent(userEmail.trim())}`, { headers });
                    const sortedOrders = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setOrders(sortedOrders);
                } else {
                    setOrders([]);
                }
            } catch (err) {
                console.error("Lỗi lấy lịch sử:", err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    clearCustomerAuth();
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [userEmail, userToken, navigate]);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center min-vh-100" style={{ background: 'var(--cafe-cream)' }}>
            <div className="spinner-border" role="status" style={{ color: 'var(--cafe-caramel)' }}>
                <span className="visually-hidden">Đang tải...</span>
            </div>
        </div>
    );

    const getStatusClass = (status) => {
        if (status === 'Hoàn thành' || status === 'Đã xong') return 'completed';
        if (status === 'Đang pha chế' || status === 'Pha chế') return 'brewing';
        return 'pending';
    };

    return (
        <div className="cafe-app-container">
            <PageHeader
                title="Lịch sử đặt món"
                subtitle="Danh sách các đơn hàng đã thực hiện"
                onBack={() => navigate(-1)}
            />

            <div className="px-3" style={{ paddingBottom: '90px' }}>
                {orders.length === 0 ? (
                    <EmptyState
                        icon="bi bi-clock-history"
                        title="Chưa có lịch sử đơn hàng"
                        description="Bạn chưa có đơn hàng nào tại CaféSync. Đặt một ly cà phê ngay thôi!"
                        actionText="Đặt món ngay"
                        actionHref="/"
                    />
                ) : (
                    <div className="order-list">
                        {orders.map((order) => (
                            <div
                                key={order._id}
                                className="cafe-order-card position-relative"
                                onClick={() => {
                                    localStorage.setItem('lastOrderDBId', order._id);
                                    navigate('/track-order');
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <span className="fw-bold d-block" style={{ color: 'var(--cafe-brown-dark)' }}>
                                            #{order.orderID}
                                        </span>
                                        <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                                            {new Date(order.createdAt).toLocaleString('vi-VN', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </small>
                                    </div>
                                    <span className={`cafe-status-badge ${getStatusClass(order.status)}`}>
                                        <span className="dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}></span>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top" style={{ borderColor: 'var(--cafe-border)' }}>
                                    <div className="text-muted small">
                                        <i className="bi bi-cup-hot me-1"></i>
                                        {order.items.length} món • {order.location}
                                    </div>
                                    <div className="fw-bold" style={{ color: 'var(--cafe-caramel)', fontSize: '1.05rem' }}>
                                        <PriceDisplay amount={order.totalPrice} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <BottomNav cartCount={cartCount} />
        </div>
    );
};

export default OrderHistory;