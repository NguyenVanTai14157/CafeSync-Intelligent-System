import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/style.css';
import { showToast, showConfirm } from '../utils/toast';
import Swal from 'sweetalert2';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ProductImage from '../components/ProductImage';
import PriceDisplay from '../components/PriceDisplay';
import QuantityStepper from '../components/QuantityStepper';

const Cart = () => {
    const [cart, setCart] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const savedCart = JSON.parse(localStorage.getItem('cart')) || [];
        setCart(savedCart);
    }, []);

    const updateQuantity = (index, delta) => {
        const newCart = [...cart];
        const item = newCart[index];

        if (item.quantity === 1 && delta === -1) {
            removeItem(index);
            return;
        }

        item.quantity += delta;
        saveAndRefresh(newCart);
    };

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

    const saveAndRefresh = (newCart) => {
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
        window.dispatchEvent(new Event('cartUpdated'));
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const savedName = localStorage.getItem('userName');
        const friendlyName = savedName ? savedName.trim().split(' ').pop() : "bạn";

        if (params.get('status') === 'cancelled') {
            Swal.fire({
                icon: 'info',
                title: 'Đã hủy thanh toán',
                text: `Đơn hàng của ${friendlyName} đã được hủy thành công. Đừng lo, quầy pha chế sẽ không nhận đơn này đâu nhé!`,
                confirmButtonColor: '#6F5035'
            });

            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <div className="cafe-app-container">
            {/* 1. Shared Page Header */}
            <PageHeader
                title="Giỏ hàng"
                subtitle={cart.length > 0 ? `${totalItems} món đã chọn` : null}
                rightAction={
                    cart.length > 0 ? (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary border-0 text-danger"
                            style={{ fontSize: '0.8rem', fontWeight: 600 }}
                            onClick={async () => {
                                const res = await showConfirm("Xóa sạch?", "Bạn muốn làm trống giỏ hàng chứ?");
                                if (res.isConfirmed) saveAndRefresh([]);
                            }}
                        >
                            Xóa tất cả
                        </button>
                    ) : null
                }
            />

            <div className="px-3" style={{ paddingBottom: '140px' }}>
                {cart.length === 0 ? (
                    /* 2. Shared Empty State */
                    <EmptyState
                        icon="bi-bag"
                        title="Giỏ hàng đang trống"
                        description="Bạn chưa có món nào trong giỏ. Khám phá menu và chọn món yêu thích để CaféSync chuẩn bị nhé!"
                        actionText="Khám phá thực đơn"
                        actionHref="/"
                    />
                ) : (
                    /* 3. Danh sách món trong giỏ */
                    <div id="cart-list">
                        {cart.map((item, index) => (
                            <div key={index} className="cafe-cart-card">
                                <div className="d-flex align-items-start gap-3">
                                    <ProductImage
                                        src={item.image}
                                        alt={item.name}
                                        className="cafe-cart-img"
                                    />
                                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                        <div className="d-flex justify-content-between align-items-start gap-2">
                                            <div>
                                                <h3 className="cafe-cart-title">{item.name}</h3>
                                                {/* Options */}
                                                {item.options && (
                                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                                        <span className="cafe-opt-chip">Size {item.options.size}</span>
                                                        <span className="cafe-opt-chip">{item.options.sugar} đường</span>
                                                        <span className="cafe-opt-chip">{item.options.ice} đá</span>
                                                    </div>
                                                )}
                                                {/* Topping */}
                                                {item.options?.toppings?.length > 0 && (
                                                    <div className="cafe-cart-topping">
                                                        + {item.options.toppings.join(', ')}
                                                    </div>
                                                )}
                                                {/* Note */}
                                                {item.note && (
                                                    <div className="cafe-cart-note">
                                                        "{item.note}"
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className="cafe-btn-icon-danger"
                                                onClick={() => removeItem(index)}
                                                aria-label={`Xóa ${item.name} khỏi giỏ`}
                                            >
                                                <i className="bi bi-trash3"></i>
                                            </button>
                                        </div>

                                        {/* Price & Quantity Stepper */}
                                        <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top" style={{ borderColor: 'var(--cafe-border)' }}>
                                            <PriceDisplay
                                                price={item.price * item.quantity}
                                                className="cafe-cart-price"
                                            />
                                            <QuantityStepper
                                                quantity={item.quantity}
                                                onIncrease={() => updateQuantity(index, 1)}
                                                onDecrease={() => updateQuantity(index, -1)}
                                                min={1}
                                                ariaLabelPrefix={item.name}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 4. Thanh thanh toán cố định ở đáy */}
            <div className="cafe-sticky-bar" style={{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <span className="text-muted small d-block">Tạm tính ({totalItems} món)</span>
                        <PriceDisplay
                            price={totalPrice}
                            className="fw-bold fs-5"
                            style={{ color: 'var(--cafe-brown-dark)' }}
                        />
                    </div>
                    <button
                        type="button"
                        className="cafe-btn-primary"
                        style={{ width: 'auto', minWidth: '180px' }}
                        disabled={cart.length === 0}
                        onClick={() => navigate('/checkout')}
                    >
                        <span>Thanh toán</span>
                        <i className="bi bi-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Cart;