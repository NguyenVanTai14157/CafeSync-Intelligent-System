import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import API_URL from '../config';
import '../assets/css/style.css';

const Checkout = () => {
    const storedTable = localStorage.getItem('tableNumber');
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState("Chuyển khoản");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();
    

    useEffect(() => {
        const savedCart = JSON.parse(localStorage.getItem('cart')) || [];
        if (savedCart.length === 0) {
            navigate('/cart');
        } else {
            setCart(savedCart);
        }
    }, [navigate]);

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Lấy tên động từ người dùng đang đăng nhập để cá nhân hóa thông báo
    const getFriendlyName = () => {
        const full = localStorage.getItem('userName');
        if (!full) return "bạn";
        return full.trim().split(' ').pop();
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const finalOrderID = `CFS${Date.now().toString().slice(-8)}`;
        const savedName = localStorage.getItem('userName');
        const savedEmail = localStorage.getItem('userEmail');

        const orderData = {
            orderID: finalOrderID,
            items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                options: item.options,
                note: item.note
            })),
            totalPrice: totalPrice,
            location: storedTable ? `Bàn ${storedTable}` : "Mang đi",
            tableNumber: storedTable ? Number(storedTable) : null,
            paymentMethod: paymentMethod,
            customerEmail: savedEmail || savedName || "Guest",
            customerName: savedName || "Khách vãn lai"
        };

        try {
            // Hiển thị trạng thái đang xử lý mượt mà trên Mobile
            Swal.fire({
                title: 'Đang gửi đơn hàng...',
                text: 'Vui lòng chờ trong giây lát',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await axios.post(`${API_URL}/api/orders`, orderData);
            const dbOrderId = response.data._id || (response.data.order && response.data.order._id);

            // QUAN TRỌNG: Lưu ID đơn hàng mới nhất để hiện nút Theo dõi cho khách vãn lai
            if (dbOrderId) {
                localStorage.setItem('lastOrderDBId', dbOrderId);
            }

            // Xóa sạch giỏ hàng và cập nhật Badge chỉ khi thanh toán bằng Tiền mặt
            if (paymentMethod === "Tiền mặt") {
                localStorage.removeItem('cart');
                window.dispatchEvent(new Event('cartUpdated'));
            }

            if (paymentMethod !== "Tiền mặt" && response.data.checkoutUrl) {
                // Chuyển hướng sang trang thanh toán online nếu có
                setTimeout(() => { window.location.href = response.data.checkoutUrl; }, 1000);
            } else {
                // Thông báo thành công cá nhân hóa cực xịn
                Swal.fire({
                    icon: 'success',
                    title: 'Đặt món thành công! ☕',
                    text: `Cảm ơn ${getFriendlyName()}, đơn hàng đang được CaféSync chuẩn bị.`,
                    confirmButtonColor: '#826644',
                    confirmButtonText: 'Theo dõi đơn hàng'
                }).then(() => { navigate('/track-order'); });
            }
        } catch (error) {
            setIsSubmitting(false);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi đặt hàng',
                text: `Có lỗi xảy ra, ${getFriendlyName()} vui lòng thử lại nhé!`,
                confirmButtonColor: '#826644'
            });
        }
    };

    return (
        <div className="checkout-page bg-light-custom min-vh-100 pb-5">
            {/* Header */}
            <div className="container pt-4 d-flex align-items-center mb-4">
                <button onClick={() => navigate('/cart')} className="btn bg-white shadow-sm rounded-circle p-2 me-3" style={{ width: '40px', height: '40px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-chevron-left text-dark"></i>
                </button>
                <h4 className="fw-bold mb-0">Thanh toán</h4>
            </div>

            <div className="container">
                <div className="row g-4">
                    {/* Cột trái: Review đơn hàng */}
                    <div className="col-lg-7">
                        <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
                            <h5 className="fw-bold mb-4 border-bottom pb-2">Tóm tắt đơn hàng</h5>
                            <div className="cart-items-review">
                                {cart.map((item, i) => (
                                    <div key={i} className="mb-3 pb-3 border-bottom border-light">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="flex-grow-1">
                                                <h6 className="fw-bold mb-1">{item.name} <span className="text-muted small">x{item.quantity}</span></h6>
                                                <small className="text-muted d-block">
                                                    {item.options?.size} | {item.options?.sugar} đường | {item.options?.ice} đá
                                                </small>
                                            </div>
                                            <span className="fw-bold">{(item.price * item.quantity).toLocaleString()}đ</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="d-flex justify-content-between mt-3 fw-bold fs-5">
                                <span>Tổng cộng</span>
                                <span style={{ color: '#826644' }}>{totalPrice.toLocaleString()}đ</span>
                            </div>
                        </div>

                        {/* Phương thức thanh toán */}
                        <div className="card border-0 shadow-sm rounded-4 p-4">
                            <h5 className="fw-bold mb-3">Phương thức thanh toán</h5>
                            <div className="p-3 rounded-4 border border-primary bg-light d-flex align-items-center gap-3">
                                <i className="bi bi-qr-code-scan fs-3 text-primary"></i>
                                <div>
                                    <span className="fw-bold d-block">Chuyển khoản qua mã QR</span>
                                    <small className="text-muted">Quét mã QR thanh toán nhanh qua PayOS</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cột phải: Thông tin nhận hàng */}
                    <div className="col-lg-5">
                        <div className="card border-0 shadow-sm rounded-4 p-4 sticky-top" style={{ top: '20px' }}>
                            <h5 className="fw-bold mb-3">Thông tin phục vụ</h5>
                            {storedTable ? (
                                <div className="p-3 rounded-4 border border-warning bg-light d-flex align-items-center gap-3 mb-4">
                                    <i className="bi bi-geo-alt-fill fs-3 text-warning"></i>
                                    <div>
                                        <span className="fw-bold d-block">Phục vụ tại Bàn {storedTable}</span>
                                        <small className="text-muted">Nhận diện tự động từ mã QR</small>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 rounded-4 border border-success bg-light d-flex align-items-center gap-3 mb-4">
                                    <i className="bi bi-bag-check-fill fs-3 text-success"></i>
                                    <div>
                                        <span className="fw-bold d-block">Mang đi (Takeaway)</span>
                                        <small className="text-muted">Không có số bàn từ mã QR</small>
                                    </div>
                                </div>
                            )}
                            <button
                                className="btn btn-dark w-100 py-3 rounded-4 fw-bold shadow mt-2"
                                onClick={handlePlaceOrder}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "ĐANG XỬ LÝ..." : "XÁC NHẬN ĐẶT MÓN"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;