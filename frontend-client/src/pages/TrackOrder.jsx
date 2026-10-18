import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import '../assets/css/track.css';
import '../assets/css/style.css';
import BottomNav from '../components/BottomNav';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import PriceDisplay from '../components/PriceDisplay';

const TrackOrder = () => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cartCount, setCartCount] = useState(0);
    const navigate = useNavigate();

    const savedEmail = localStorage.getItem('userEmail');
    const savedName = localStorage.getItem('userName');
    const identifier = savedEmail || savedName;
    const isMember = !!identifier;

    const fetchStatus = async () => {
        const orderDBId = localStorage.getItem('lastOrderDBId');
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));

        if (!orderDBId || orderDBId === "null") {
            setOrder(null);
            setLoading(false);
            return;
        }

        const url = `${API_URL}/api/orders/track/${orderDBId}`;

        try {
            const res = await axios.get(url);
            const data = res.data?.order || res.data;
            setOrder(data);
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái đơn hàng:", err);
            setOrder(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const orderCode = urlParams.get('orderCode');

        if (code === '00' && orderCode) {
            axios.post(`${API_URL}/api/orders/payment-success`, { orderCode })
                .then(() => {
                    localStorage.removeItem('cart');
                    window.dispatchEvent(new Event('cartUpdated'));
                    window.history.replaceState({}, document.title, window.location.pathname);
                    fetchStatus();
                })
                .catch(err => {
                    console.error("Lỗi xác nhận thanh toán PayOS:", err);
                    fetchStatus();
                });
        } else {
            fetchStatus();
        }

        const interval = setInterval(fetchStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const getProgressWidth = (status) => {
        if (status === 'Đang pha chế' || status === 'Pha chế') return '50%';
        if (status === 'Hoàn thành' || status === 'Đã xong') return '100%';
        return '0%';
    };

    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100" style={{ background: 'var(--cafe-cream)' }}>
            <div className="spinner-coffee mb-3"></div>
            <p className="text-muted fw-semibold">Đang tải thông tin đơn hàng...</p>
        </div>
    );

    if (!order) {
        return (
            <div className="cafe-app-container px-3 pt-5">
                <EmptyState
                    icon="bi bi-clock-history"
                    title="Bạn chưa có đơn hàng nào"
                    description="Hãy chọn thức uống từ thực đơn để CaféSync phục vụ bạn nhé!"
                    actionText="Khám phá thực đơn"
                    actionHref="/"
                />
                <BottomNav cartCount={cartCount} />
            </div>
        );
    }

    const isCompleted = order.status === 'Hoàn thành' || order.status === 'Đã xong';

    return (
        <div className="cafe-app-container track-page">
            <PageHeader
                title={isCompleted ? "Chi tiết đơn hàng" : "Theo dõi đơn hàng"}
                subtitle="Cập nhật trạng thái trực tiếp"
                onBack={() => {
                    if (window.history.length > 1) {
                        navigate(-1);
                    } else {
                        navigate('/');
                    }
                }}
            />

            <div className="px-3" style={{ paddingBottom: '90px' }}>
                {/* Status card */}
                <div className="card-premium mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <span className="badge-id">Mã đơn: #{order.orderID}</span>
                        <div
                            className="status-label"
                            style={{ color: isCompleted ? 'var(--cafe-success)' : 'var(--cafe-caramel)' }}
                        >
                            <span className="dot"></span>
                            {order.status || 'Đang xử lý'}
                        </div>
                    </div>

                    {!isCompleted ? (
                        <div className="progress-track-container mb-2">
                            <div className="track-line">
                                <div className="track-line-fill" style={{ width: getProgressWidth(order.status) }}></div>
                            </div>
                            <div className="d-flex justify-content-between position-relative">
                                <div className="track-step active">
                                    <div className="step-blob"><i className="bi bi-receipt"></i></div>
                                    <span>Đã nhận</span>
                                </div>
                                <div className={`track-step ${getProgressWidth(order.status) !== '0%' ? 'active' : ''}`}>
                                    <div className="step-blob"><i className="bi bi-cup-hot"></i></div>
                                    <span>Pha chế</span>
                                </div>
                                <div className={`track-step ${getProgressWidth(order.status) === '100%' ? 'active' : ''}`}>
                                    <div className="step-blob"><i className="bi bi-check-lg"></i></div>
                                    <span>Hoàn tất</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-3">
                            <div className="d-inline-flex p-3 rounded-circle mb-2" style={{ background: 'rgba(113, 130, 102, 0.15)', color: 'var(--cafe-success)' }}>
                                <i className="bi bi-check2-all fs-2"></i>
                            </div>
                            <h2 className="fs-6 fw-bold" style={{ color: 'var(--cafe-success)' }}>
                                Đơn hàng đã hoàn tất!
                            </h2>
                            <small className="text-muted">Chúc bạn thưởng thức đồ uống ngon miệng.</small>
                        </div>
                    )}
                </div>

                {/* Items card */}
                <div className="card-premium mb-3">
                    <h2 className="fs-6 fw-bold mb-3 pb-2 border-bottom" style={{ color: 'var(--cafe-brown-dark)', borderColor: 'var(--cafe-border)' }}>
                        Món đã chọn
                    </h2>
                    <div>
                        {order.items?.map((item, index) => (
                            <div key={index} className="item-row-track">
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                    <div>
                                        <div className="item-name-track">
                                            {item.name} <span className="text-muted small">x{item.quantity}</span>
                                        </div>
                                        <small className="text-muted d-block">
                                            Size {item.options?.size || 'M'}
                                            {item.options?.sugar ? ` | ${item.options.sugar} đường` : ''}
                                            {item.options?.ice ? ` | ${item.options.ice} đá` : ''}
                                        </small>
                                        {item.options?.toppings && item.options.toppings.length > 0 && (
                                            <small className="d-block mt-1" style={{ color: 'var(--cafe-caramel)', fontWeight: 500 }}>
                                                + {item.options.toppings.join(', ')}
                                            </small>
                                        )}
                                        {item.note && (
                                            <div className="cafe-cart-note mt-1">
                                                "{item.note}"
                                            </div>
                                        )}
                                    </div>
                                    <div className="fw-bold" style={{ color: 'var(--cafe-brown-dark)', whiteSpace: 'nowrap' }}>
                                        <PriceDisplay amount={item.price * item.quantity} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top" style={{ borderColor: 'var(--cafe-border)' }}>
                        <span className="fw-bold" style={{ color: 'var(--cafe-brown-dark)' }}>Tổng cộng</span>
                        <span className="total-amount-track">
                            <PriceDisplay amount={order.totalPrice || 0} />
                        </span>
                    </div>
                </div>

                {isMember && (
                    <div className="text-center mt-3 mb-4">
                        <button
                            className="btn btn-outline-secondary rounded-pill px-4"
                            style={{ borderColor: 'var(--cafe-border)', color: 'var(--cafe-brown)', fontSize: '0.88rem' }}
                            onClick={() => navigate('/history')}
                        >
                            <i className="bi bi-clock-history me-2"></i>
                            Xem tất cả lịch sử
                        </button>
                    </div>
                )}
            </div>

            <BottomNav cartCount={cartCount} />
        </div>
    );
};

export default TrackOrder;