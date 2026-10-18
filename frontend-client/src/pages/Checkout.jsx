import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import API_URL from '../config';
import '../assets/css/style.css';
import PageHeader from '../components/PageHeader';
import PriceDisplay from '../components/PriceDisplay';
import { getTableContext } from '../utils/tableContext';

const Checkout = () => {
    const [tableContext, setTableContextState] = useState(() => getTableContext());
    const [cart] = useState(() => JSON.parse(localStorage.getItem('cart')) || []);
    const paymentMethod = "Chuyển khoản";
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (cart.length === 0) {
            navigate('/cart');
        }

        const handleTableUpdate = () => {
            setTableContextState(getTableContext());
        };
        window.addEventListener('tableContextUpdated', handleTableUpdate);
        return () => {
            window.removeEventListener('tableContextUpdated', handleTableUpdate);
        };
    }, [cart.length, navigate]);

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const getFriendlyName = () => {
        const full = localStorage.getItem('userName');
        if (!full) return "bạn";
        return full.trim().split(' ').pop();
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();

        const currentContext = getTableContext();
        if (currentContext.isTableOrder && !currentContext.hasValidContext) {
            Swal.fire({
                icon: 'warning',
                title: 'Mã QR bàn không hợp lệ',
                text: 'Phiên QR bàn đã hết hạn hoặc không hợp lệ. Vui lòng quét lại mã QR tại bàn.',
                confirmButtonColor: '#6F5035',
                confirmButtonText: 'Quay lại thực đơn'
            }).then(() => {
                navigate('/');
            });
            return;
        }

        setIsSubmitting(true);

        const finalOrderID = `CFS${Date.now().toString().slice(-8)}`;
        const savedName = localStorage.getItem('userName');
        const savedEmail = localStorage.getItem('userEmail');
        const isTable = currentContext.isTableOrder && currentContext.hasValidContext;

        const orderData = {
            orderID: finalOrderID,
            items: cart.map(item => ({
                id_product: item._id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                options: item.options,
                note: item.note
            })),
            totalPrice: totalPrice,
            location: isTable ? `Bàn ${currentContext.tableNumber}` : "Mang đi",
            tableNumber: isTable ? currentContext.tableNumber : null,
            tableToken: isTable ? currentContext.tableToken : undefined,
            paymentMethod: paymentMethod,
            customerEmail: savedEmail || savedName || "Guest",
            customerName: savedName || "Khách vãn lai"
        };

        try {
            Swal.fire({
                title: 'Đang gửi đơn hàng...',
                text: 'Vui lòng chờ trong giây lát',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await axios.post(`${API_URL}/api/orders`, orderData);
            const dbOrderId = response.data._id || (response.data.order && response.data.order._id);

            if (dbOrderId) {
                localStorage.setItem('lastOrderDBId', dbOrderId);
            }

            if (paymentMethod === "Tiền mặt") {
                localStorage.removeItem('cart');
                window.dispatchEvent(new Event('cartUpdated'));
            }

            if (paymentMethod !== "Tiền mặt" && response.data.checkoutUrl) {
                setTimeout(() => { window.location.href = response.data.checkoutUrl; }, 1000);
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Đặt món thành công',
                    text: `Cảm ơn ${getFriendlyName()}, đơn hàng đang được CaféSync chuẩn bị.`,
                    confirmButtonColor: '#6F5035',
                    confirmButtonText: 'Theo dõi đơn hàng'
                }).then(() => { navigate('/track-order'); });
            }
        } catch (error) {
            setIsSubmitting(false);
            const errorMsg = error.response?.data?.message;
            Swal.fire({
                icon: 'error',
                title: 'Lỗi đặt hàng',
                text: errorMsg || `Có lỗi xảy ra, ${getFriendlyName()} vui lòng thử lại nhé.`,
                confirmButtonColor: '#6F5035'
            });
        }
    };

    return (
        <div className="cafe-app-container">
            <PageHeader
                title="Xác nhận thanh toán"
                subtitle="Kiểm tra thông tin trước khi hoàn tất"
                onBack={() => navigate('/cart')}
            />

            <div className="px-3" style={{ paddingBottom: '110px' }}>
                <div className="row g-3">
                    {/* Thông tin phục vụ & Phương thức thanh toán */}
                    <div className="col-12 col-md-5 order-md-2">
                        {/* Service Context */}
                        <div className="cafe-cart-summary-card mb-3">
                            <h2 className="fs-6 fw-bold mb-3" style={{ color: 'var(--cafe-brown-dark)' }}>
                                Thông tin phục vụ
                            </h2>
                            {tableContext.isTableOrder ? (
                                <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: 'var(--cafe-surface-soft)', border: '1px solid var(--cafe-border)' }}>
                                    <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', background: 'var(--cafe-surface)', color: 'var(--cafe-caramel)' }}>
                                        <i className="bi bi-geo-alt-fill"></i>
                                    </div>
                                    <div>
                                        <div className="fw-bold" style={{ color: 'var(--cafe-brown-dark)' }}>
                                            Phục vụ tại Bàn {tableContext.tableNumber}
                                        </div>
                                        <small className={tableContext.hasValidContext ? "text-muted" : "text-danger"}>
                                            {tableContext.hasValidContext
                                                ? "Nhận diện tự động qua mã QR bàn"
                                                : "Phiên QR bàn chưa có token xác thực. Vui lòng quét lại mã QR tại bàn."}
                                        </small>
                                    </div>
                                </div>
                            ) : (
                                <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: 'var(--cafe-surface-soft)', border: '1px solid var(--cafe-border)' }}>
                                    <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', background: 'var(--cafe-surface)', color: 'var(--cafe-success)' }}>
                                        <i className="bi bi-bag-check-fill"></i>
                                    </div>
                                    <div>
                                        <div className="fw-bold" style={{ color: 'var(--cafe-brown-dark)' }}>
                                            Mang đi (Takeaway)
                                        </div>
                                        <small className="text-muted">Nhận đồ tại quầy khi hoàn tất</small>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="cafe-cart-summary-card mb-3">
                            <h2 className="fs-6 fw-bold mb-3" style={{ color: 'var(--cafe-brown-dark)' }}>
                                Phương thức thanh toán
                            </h2>
                            <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: 'var(--cafe-surface-soft)', border: '2px solid var(--cafe-caramel)' }}>
                                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', background: 'var(--cafe-surface)', color: 'var(--cafe-caramel)' }}>
                                    <i className="bi bi-qr-code"></i>
                                </div>
                                <div className="flex-grow-1">
                                    <div className="fw-bold" style={{ color: 'var(--cafe-brown-dark)' }}>
                                        Chuyển khoản VietQR (PayOS)
                                    </div>
                                    <small className="text-muted">Quét mã QR bằng ứng dụng ngân hàng</small>
                                </div>
                                <i className="bi bi-check-circle-fill text-caramel fs-5"></i>
                            </div>
                        </div>
                    </div>

                    {/* Danh sách món tóm tắt */}
                    <div className="col-12 col-md-7 order-md-1">
                        <div className="cafe-cart-summary-card">
                            <h2 className="fs-6 fw-bold mb-3" style={{ color: 'var(--cafe-brown-dark)' }}>
                                Chi tiết món ({cart.length})
                            </h2>
                            <div className="mb-3">
                                {cart.map((item, i) => (
                                    <div key={i} className="py-2 border-bottom" style={{ borderColor: 'var(--cafe-border)' }}>
                                        <div className="d-flex justify-content-between align-items-start gap-2">
                                            <div>
                                                <div className="fw-semibold" style={{ color: 'var(--cafe-text)', fontSize: '0.95rem' }}>
                                                    {item.name} <span className="text-muted small">x{item.quantity}</span>
                                                </div>
                                                <div className="text-muted small mt-1">
                                                    Size {item.options?.size} | {item.options?.sugar} đường | {item.options?.ice} đá
                                                </div>
                                                {item.options?.toppings?.length > 0 && (
                                                    <div className="small" style={{ color: 'var(--cafe-caramel)', fontWeight: 500 }}>
                                                        + {item.options.toppings.join(', ')}
                                                    </div>
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

                            {/* Summary breakdown */}
                            <div className="pt-2">
                                <div className="d-flex justify-content-between text-muted small mb-1">
                                    <span>Tạm tính</span>
                                    <span><PriceDisplay amount={totalPrice} /></span>
                                </div>
                                <div className="d-flex justify-content-between text-muted small mb-2">
                                    <span>Phí phục vụ</span>
                                    <span>0đ</span>
                                </div>
                                <div className="d-flex justify-content-between fw-bold fs-5 pt-2 border-top" style={{ borderColor: 'var(--cafe-border)', color: 'var(--cafe-brown-dark)' }}>
                                    <span>Tổng thanh toán</span>
                                    <span style={{ color: 'var(--cafe-caramel)' }}><PriceDisplay amount={totalPrice} /></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Order Button */}
            <div className="cafe-sticky-bar" style={{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-muted small">Tổng cộng</span>
                    <span className="fw-bold" style={{ color: 'var(--cafe-caramel)', fontSize: '1.1rem' }}>
                        <PriceDisplay amount={totalPrice} />
                    </span>
                </div>
                <button
                    className="cafe-btn-primary"
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Đang xử lý..." : "Xác nhận đặt món"}
                </button>
            </div>
        </div>
    );
};

export default Checkout;