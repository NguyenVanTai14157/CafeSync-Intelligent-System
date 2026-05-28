import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import '../assets/css/track.css';
import '../assets/css/style.css'; // Đảm bảo import để có style cho bottom-nav

const TrackOrder = () => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cartCount, setCartCount] = useState(0); // Thêm state để giữ số lượng giỏ hàng
    const navigate = useNavigate();

    const savedEmail = localStorage.getItem('userEmail');
    const savedName = localStorage.getItem('userName');
    const identifier = savedEmail || savedName;
    const isMember = !!identifier;

    const fetchStatus = async () => {
        const orderDBId = localStorage.getItem('lastOrderDBId');
        // Lấy cartCount từ localStorage
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));

        let url = "";
        if (orderDBId && orderDBId !== "null") {
            url = `${API_URL}/api/orders/${orderDBId}`;
        } else if (isMember) {
            url = `${API_URL}/api/orders/email/${identifier}`;
        } else {
            url = `${API_URL}/api/orders/latest`;
        }

        try {
            const res = await axios.get(url);
            let data = null;
            if (Array.isArray(res.data)) {
                data = res.data.find(o => o.status !== 'Hoàn thành' && o.status !== 'Đã xong');
                if (!data) data = res.data[0];
            } else {
                data = res.data.order || res.data;
            }
            setOrder(data);
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái:", err);
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
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-creme">
            <div className="spinner-coffee mb-3"></div>
            <p className="text-muted fw-bold">Đang tải thông tin đơn hàng...</p>
        </div>
    );

    if (!order) {
        return (
            <div className="container mt-5 text-center py-5">
                <div className="empty-state-icon mb-4"><i className="bi bi-clock-history fs-1 text-muted"></i></div>
                <h5 className="fw-bold">Bạn không có đơn hàng nào</h5>
                <button onClick={() => navigate('/history')} className="btn btn-dark rounded-pill px-5 py-3 mt-3 shadow-sm">
                    XEM LỊCH SỬ ĐƠN HÀNG
                </button>
            </div>
        );
    }

    return (
        <div className="track-page min-vh-100 pb-5 mb-5">
            <div className="container pt-4 d-flex align-items-center mb-4">
                <button
                    onClick={() => {
                        if (window.history.length > 1) {
                            navigate(-1);
                        } else {
                            navigate('/');
                        }
                    }}
                    className="btn-back-circle me-3"
                >
                    <i className="bi bi-chevron-left"></i>
                </button>
                <h4 className="fw-bold mb-0">
                    {order.status === 'Hoàn thành' ? "Chi tiết đơn hàng" : "Theo dõi đơn hàng"}
                </h4>
            </div>

            <div className="container">
                <div className="card-premium mb-4 shadow-sm">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <span className="badge-id">Mã đơn: #{order.orderID}</span>
                        <div className="status-label" style={{ color: order.status === 'Hoàn thành' ? '#198754' : '#A47551' }}>
                            <span className="dot"></span> {order.status || 'Đang xử lý'}
                        </div>
                    </div>

                    {order.status !== 'Hoàn thành' ? (
                        <div className="progress-track-container mb-5">
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
                                    <span>Hoàn thành</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 animate__animated animate__zoomIn">
                            <div className="d-inline-block p-3 rounded-circle bg-success-light mb-3">
                                <i className="bi bi-check2-all text-success fs-1"></i>
                            </div>
                            <h6 className="fw-bold text-success">Đơn hàng đã hoàn thành!</h6>
                        </div>
                    )}
                </div>

                <div className="card-premium shadow-sm mb-4">
                    <h6 className="fw-bold mb-4 border-bottom pb-2">Món đã chọn</h6>
                    <div className="item-list">
                        {order.items?.map((item, index) => (
                            <div key={index} className="item-row-track mb-3 border-bottom-dashed pb-2">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <p className="item-name-track mb-0 fw-bold">{item.name} x{item.quantity}</p>
                                        <small className="text-muted">
                                            Size: {item.options?.size} | {item.options?.sugar} đường
                                        </small>
                                    </div>
                                    <p className="fw-bold">{(item.price * item.quantity).toLocaleString()}đ</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="total-section-track mt-3 d-flex justify-content-between">
                        <span className="fw-bold fs-5">Tổng cộng</span>
                        <span className="total-amount-track fs-5 fw-bold" style={{ color: '#826644' }}>
                            {(order.totalPrice || 0).toLocaleString()}đ
                        </span>
                    </div>
                </div>

                {isMember && (
                    <div className="text-center mt-4 mb-5">
                        <button className="btn btn-outline-dark rounded-pill px-4 shadow-sm" onClick={() => navigate('/history')}>
                            <i className="bi bi-arrow-left-right me-2"></i>Xem toàn bộ lịch sử
                        </button>
                    </div>
                )}
            </div>

            <div className="bottom-nav shadow-lg d-flex justify-content-around align-items-center">
                <i className="bi bi-house-door" onClick={() => navigate('/')}></i>
                <div className="position-relative" onClick={() => navigate('/cart')} style={{ cursor: 'pointer' }}>
                    <i className="bi bi-cart3 fs-4"></i>
                    {cartCount > 0 && <span className="badge-cart">{cartCount}</span>}
                </div>
                <i className="bi bi-heart" onClick={() => navigate('/favorites')}></i>
                <i className="bi bi-person-circle" onClick={() => navigate('/profile')}></i>
            </div>
        </div>
    );
};

export default TrackOrder;