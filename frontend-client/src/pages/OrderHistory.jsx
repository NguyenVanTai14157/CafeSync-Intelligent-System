import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/style.css';

const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cartCount, setCartCount] = useState(0);
    const navigate = useNavigate();

    // Đồng bộ cách lấy định danh: Email trước, Name sau
    const userIdentifier = localStorage.getItem('userEmail') || localStorage.getItem('userName');
    const API_URL = "https://cafesync-intelligent-system-sntf.onrender.com";

    useEffect(() => {
        // Nếu không có định danh thì cho về Home (hoặc Login tùy Yến)
        // Nhưng thường trang lịch sử nên cho xem cả khách vãn lai nếu họ có đơn vừa đặt
        const fetchHistory = async () => {
            try {
                // Cập nhật cartCount từ localStorage
                const cart = JSON.parse(localStorage.getItem('cart')) || [];
                setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));

                if (userIdentifier) {
                    const res = await axios.get(`${API_URL}/api/orders/user/${userIdentifier}`);
                    // Sắp xếp đơn mới nhất lên đầu
                    const sortedOrders = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setOrders(sortedOrders);
                }
            } catch (err) {
                console.error("Lỗi lấy lịch sử:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [userIdentifier]);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center min-vh-100">
            <div className="spinner-border text-brown" role="status" style={{ color: '#826644' }}>
                <span className="visually-hidden">Đang tải...</span>
            </div>
        </div>
    );

    return (
        <div className="history-page min-vh-100 bg-light-custom pb-5 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="container pt-4 d-flex align-items-center mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="btn bg-white shadow-sm rounded-circle p-2 me-3 d-flex align-items-center justify-content-center"
                    style={{ width: '40px', height: '40px', border: 'none' }}
                >
                    <i className="bi bi-chevron-left text-dark"></i>
                </button>
                <h4 className="fw-bold mb-0">Lịch sử đặt món</h4>
            </div>

            <div className="container mb-5" style={{ paddingBottom: '80px' }}>
                {orders.length === 0 ? (
                    <div className="text-center py-5 bg-white rounded-4 shadow-sm animate__animated animate__zoomIn">
                        <i className="bi bi-cup-hot fs-1 text-muted opacity-25 d-block mb-3"></i>
                        <p className="text-muted small">Bạn chưa có đơn hàng nào.<br />Đặt một ly cà phê ngay thôi!</p>
                        <button onClick={() => navigate('/')} className="btn btn-dark rounded-pill px-5 py-2 mt-2 shadow-sm">ĐẶT MÓN NGAY</button>
                    </div>
                ) : (
                    <div className="order-list">
                        {orders.map((order, index) => (
                            <div
                                key={order._id}
                                className="card border-0 shadow-sm mb-3 p-3 position-relative animate__animated animate__fadeInUp"
                                style={{
                                    cursor: 'pointer',
                                    borderRadius: '18px',
                                    animationDelay: `${index * 0.05}s`,
                                    transition: 'transform 0.2s'
                                }}
                                onClick={() => {
                                    localStorage.setItem('lastOrderDBId', order._id);
                                    navigate('/track-order');
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <span className="fw-bold d-block text-dark" style={{ letterSpacing: '0.5px' }}>#{order.orderID}</span>
                                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                            {new Date(order.createdAt).toLocaleString('vi-VN', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </small>
                                    </div>
                                    <span className={`badge rounded-pill px-3 py-2 ${order.status === 'Hoàn thành' ? 'bg-success text-white' : 'bg-warning text-dark'
                                        }`} style={{ fontSize: '0.65rem' }}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-light">
                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                        <i className="bi bi-bag-check me-1"></i>
                                        {order.items.length} món • {order.location}
                                    </div>
                                    <div className="fw-bold" style={{ color: '#826644', fontSize: '1.1rem' }}>
                                        {order.totalPrice.toLocaleString()}đ
                                    </div>
                                </div>
                                <i className="bi bi-chevron-right position-absolute" style={{ right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }}></i>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Navigation - Đã đồng bộ màu sắc và icon active */}
            <div className="bottom-nav shadow-lg d-flex justify-content-around align-items-center bg-white py-2 fixed-bottom">
                <i className="bi bi-house-door fs-4 text-muted" onClick={() => navigate('/')}></i>

                <div className="position-relative" onClick={() => navigate('/cart')} style={{ cursor: 'pointer' }}>
                    <i className="bi bi-cart3 fs-4 text-muted"></i>
                    {cartCount > 0 && <span className="badge-cart">{cartCount}</span>}
                </div>

                <i className="bi bi-heart fs-4 text-muted" onClick={() => navigate('/favorites')}></i>

                <i className="bi bi-person-circle fs-4" style={{ color: '#826644' }} onClick={() => navigate('/profile')}></i>
            </div>
        </div>
    );
};

export default OrderHistory;