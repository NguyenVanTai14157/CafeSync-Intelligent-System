import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../assets/css/style.css';

const Checkout = () => {
    const storedTable = localStorage.getItem('tableNumber');
    const [cart, setCart] = useState([]);
    const [orderType, setOrderType] = useState(storedTable ? "Tại bàn" : "Tại bàn");
    const [tableNo, setTableNo] = useState(storedTable || "1");
    const [paymentMethod, setPaymentMethod] = useState("Tiền mặt");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();
    const API_URL = "http://localhost:5000";

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
            location: orderType === "Mang đi" ? "Mang đi" : `Bàn ${tableNo}`,
            tableNumber: orderType === "Tại bàn" ? Number(tableNo) : null,
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

            // Xóa sạch giỏ hàng và cập nhật Badge
            localStorage.removeItem('cart');
            window.dispatchEvent(new Event('cartUpdated'));

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
                            <h5 className="fw-bold mb-4">Phương thức thanh toán</h5>
                            <div className="row g-3">
                                <div className="col-6">
                                    <div className={`p-3 rounded-4 border text-center ${paymentMethod === 'Tiền mặt' ? 'border-primary bg-light shadow-sm' : ''}`}
                                        onClick={() => setPaymentMethod('Tiền mặt')} style={{ cursor: 'pointer', transition: '0.3s' }}>
                                        <i className="bi bi-cash-stack fs-2 d-block mb-2"></i>
                                        <span className="fw-bold small">Tiền mặt</span>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className={`p-3 rounded-4 border text-center ${paymentMethod === 'Chuyển khoản' ? 'border-primary bg-light shadow-sm' : ''}`}
                                        onClick={() => setPaymentMethod('Chuyển khoản')} style={{ cursor: 'pointer', transition: '0.3s' }}>
                                        <i className="bi bi-qr-code-scan fs-2 d-block mb-2"></i>
                                        <span className="fw-bold small">Chuyển khoản</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cột phải: Thông tin nhận hàng */}
                    <div className="col-lg-5">
                        <div className="card border-0 shadow-sm rounded-4 p-4 sticky-top" style={{ top: '20px' }}>
                            <h5 className="fw-bold mb-4">Nhận hàng</h5>
                            <div className="mb-3">
                                <label className="small fw-bold text-muted mb-2 text-uppercase">Hình thức</label>
                                <select className="form-select p-3 border-0 bg-light rounded-3 shadow-none fw-bold" disabled={!!storedTable} value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                                    <option value="Tại bàn">Tại bàn</option>
                                    <option value="Mang đi">Mang đi</option>
                                </select>
                            </div>
                            {orderType === "Tại bàn" && (
                                <div className="mb-4">
                                    <label className="small fw-bold text-muted mb-2 text-uppercase">Số bàn {storedTable && '(Từ mã QR)'}</label>
                                    <select className="form-select p-3 border-0 bg-light rounded-3 shadow-none fw-bold" disabled={!!storedTable} value={tableNo} onChange={(e) => setTableNo(e.target.value)}>
                                        {Array.from({ length: 50 }, (_, i) => i + 1).map(n => <option key={n} value={n}>Bàn {n}</option>)}
                                    </select>
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