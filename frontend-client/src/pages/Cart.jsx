import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../assets/css/style.css';
import { showToast, showConfirm } from '../utils/toast'; // Import bộ thông báo xịn
import Swal from 'sweetalert2'; // <--- Thêm dòng này để chạy được thông báo Hủy thanh toán
import API_URL from '../config';

const Cart = () => {
    const [cart, setCart] = useState([]);
    const navigate = useNavigate();

    // 1. Tải giỏ hàng từ LocalStorage khi vào trang
    useEffect(() => {
        const savedCart = JSON.parse(localStorage.getItem('cart')) || [];
        setCart(savedCart);
    }, []);

    // 2. Hàm thay đổi số lượng món
    const updateQuantity = (index, delta) => {
        const newCart = [...cart];
        const item = newCart[index];

        if (item.quantity === 1 && delta === -1) {
            // Nếu khách muốn giảm khi số lượng đang là 1, hỏi xem có muốn xóa không
            removeItem(index);
            return;
        }

        item.quantity += delta;
        saveAndRefresh(newCart);
    };

    // 3. Hàm xóa món khỏi giỏ (Dùng showConfirm cực chuyên nghiệp)
    const removeItem = async (index) => {
        const item = cart[index];
        const result = await showConfirm(
            "Xóa món?",
            `Bạn muốn bỏ ${item.name} khỏi giỏ hàng sao?`
        );

        if (result.isConfirmed) {
            const newCart = cart.filter((_, i) => i !== index);
            saveAndRefresh(newCart);
            showToast("Đã xóa món khỏi giỏ", "info");
        }
    };

    // Hàm phụ để lưu dữ liệu đồng nhất
    const saveAndRefresh = (newCart) => {
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
        window.dispatchEvent(new Event('cartUpdated'));
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        // Lấy tên gọi thân mật từ LocalStorage
        const savedName = localStorage.getItem('userName');
        const friendlyName = savedName ? savedName.trim().split(' ').pop() : "bạn";

        if (params.get('status') === 'cancelled') {
            Swal.fire({
                icon: 'info',
                title: 'Đã hủy thanh toán',
                text: `Đơn hàng của ${friendlyName} đã được hủy thành công. Đừng lo, quầy pha chế sẽ không nhận đơn này đâu nhé!`,
                confirmButtonColor: '#826644'
            });

            // Dọn sạch URL để không hiện lại thông báo khi load trang
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // 4. Tính toán tổng tiền và tổng số lượng
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <div className="cart-page pb-5 mb-5 animate__animated animate__fadeIn">
            {/* Header với nút quay lại Home */}
            <div className="container pt-4 d-flex align-items-center mb-4">
                <button
                    onClick={() => navigate('/')}
                    className="btn bg-white shadow-sm rounded-circle p-2 me-3"
                    style={{ width: '40px', height: '40px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <i className="bi bi-chevron-left text-dark"></i>
                </button>
                <h4 className="fw-bold mb-0">Giỏ hàng của bạn</h4>
            </div>

            <div className="container mt-2" style={{ paddingBottom: '120px' }}>
                {cart.length === 0 ? (
                    /* GIAO DIỆN KHI GIỎ TRỐNG */
                    <div className="text-center py-5">
                        <div className="bg-white shadow-sm rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '100px', height: '100px' }}>
                            <i className="bi bi-cart-x fs-1 text-muted"></i>
                        </div>
                        <h5 className="fw-bold">Giỏ hàng đang trống</h5>
                        <p className="text-muted small">Chọn món ngay để CaféSync pha chế nhé!</p>
                        <Link to="/" className="btn btn-dark rounded-pill px-4 mt-3">Tiếp tục chọn món</Link>
                    </div>
                ) : (
                    /* DANH SÁCH MÓN TRONG GIỎ */
                    <div id="cart-list">
                        {cart.map((item, index) => {
                            const imagePath = (item.image && item.image.startsWith('http'))
                                ? item.image
                                : `${API_URL}/images/${item.image}`;

                            return (
                                <div key={index} className="card border-0 shadow-sm rounded-4 p-3 mb-3 animate__animated animate__fadeInUp">
                                    <div className="d-flex align-items-start">
                                        <img
                                            src={imagePath}
                                            className="rounded-4 shadow-sm"
                                            style={{ width: '85px', height: '85px', objectFit: 'cover' }}
                                            alt={item.name}
                                            onError={(e) => e.target.src = 'https://placehold.co/100x100?text=Coffee'}
                                        />
                                        <div className="ms-3 flex-grow-1">
                                            <div className="d-flex justify-content-between">
                                                <div>
                                                    <h6 className="fw-bold mb-0" style={{ fontSize: '1rem' }}>{item.name}</h6>

                                                    {/* Hiển thị Tùy chọn: Size, Đường, Đá */}
                                                    {item.options && (
                                                        <div className="mt-1 d-flex flex-wrap gap-1">
                                                            <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '0.65rem' }}>Size {item.options.size}</span>
                                                            <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '0.65rem' }}>{item.options.sugar} đường</span>
                                                            <span className="badge bg-light text-dark border fw-normal" style={{ fontSize: '0.65rem' }}>{item.options.ice} đá</span>
                                                        </div>
                                                    )}

                                                    {/* Hiển thị Topping */}
                                                    {item.options?.toppings?.length > 0 && (
                                                        <small className="d-block mt-1" style={{ fontSize: '0.75rem', color: '#826644', fontWeight: '600' }}>
                                                            + {item.options.toppings.join(', ')}
                                                        </small>
                                                    )}

                                                    {/* Hiển thị Ghi chú */}
                                                    {item.note && (
                                                        <div className="mt-2 p-2 rounded-3" style={{ background: '#fdfaf2', borderLeft: '3px solid #826644' }}>
                                                            <small className="text-muted d-block" style={{ fontSize: '0.7rem', fontStyle: 'italic' }}>
                                                                "{item.note}"
                                                            </small>
                                                        </div>
                                                    )}
                                                </div>
                                                <i className="bi bi-trash3 text-danger opacity-50"
                                                    onClick={() => removeItem(index)}
                                                    style={{ cursor: 'pointer', fontSize: '1.1rem' }}></i>
                                            </div>

                                            <div className="d-flex justify-content-between align-items-center mt-3">
                                                <span className="fw-bold" style={{ color: '#826644', fontSize: '1.1rem' }}>
                                                    {(item.price * item.quantity).toLocaleString()}đ
                                                </span>
                                                <div className="d-flex align-items-center bg-light rounded-pill px-1 border border-light-subtle">
                                                    <button className="btn btn-sm border-0 px-2" onClick={() => updateQuantity(index, -1)}><i className="bi bi-dash-lg"></i></button>
                                                    <span className="mx-2 fw-bold small" style={{ minWidth: '15px', textAlign: 'center' }}>{item.quantity}</span>
                                                    <button className="btn btn-sm border-0 px-2" onClick={() => updateQuantity(index, 1)}><i className="bi bi-plus-lg"></i></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* THANH THANH TOÁN CỐ ĐỊNH Ở ĐÁY */}
            <div className="fixed-bottom bg-white p-4 shadow-lg" style={{ borderRadius: '30px 30px 0 0', zIndex: 10 }}>
                <div className="container">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <span className="text-muted small d-block">Tổng cộng ({totalItems} món)</span>
                            <h4 className="fw-bold mb-0" style={{ color: '#826644' }}>{totalPrice.toLocaleString()}đ</h4>
                        </div>
                        {cart.length > 0 && (
                            <button
                                className="btn btn-outline-danger btn-sm rounded-pill"
                                onClick={async () => {
                                    const res = await showConfirm("Xóa sạch?", "Bạn muốn làm trống giỏ hàng chứ?");
                                    if (res.isConfirmed) saveAndRefresh([]);
                                }}
                            >
                                <i className="bi bi-trash me-1"></i> Xóa hết
                            </button>
                        )}
                    </div>

                    <button
                        className={`btn w-100 py-3 rounded-4 fw-bold shadow-sm ${cart.length === 0 ? 'btn-secondary opacity-50' : 'btn-dark'}`}
                        disabled={cart.length === 0}
                        onClick={() => navigate('/checkout')}
                    >
                        {cart.length === 0 ? 'GIỎ HÀNG ĐANG TRỐNG' : 'XÁC NHẬN ĐƠN HÀNG'} <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                </div>
            </div>
        </div>

    );
};

export default Cart;