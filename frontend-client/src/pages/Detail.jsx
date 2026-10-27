import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import { sizeExtraPrice } from '../utils/cartPricing';
import '../assets/css/detail.css';
import { showToast } from '../utils/toast';
import PriceDisplay from '../components/PriceDisplay';
import QuantityStepper from '../components/QuantityStepper';

const Detail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [options, setOptions] = useState({ size: 'M', sugar: '100%', ice: '100%', toppings: [] });
    const [note, setNote] = useState("");
    const [cartCount, setCartCount] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);

    const updateCartCount = () => {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    };

    const checkFavoriteStatus = (productId) => {
        const favs = JSON.parse(localStorage.getItem('favorites')) || [];
        setIsFavorite(favs.some(f => f._id === productId));
    };

    useEffect(() => {
        const email = localStorage.getItem('userEmail') || 'Guest';
        axios.get(`${API_URL}/api/products/${id}?email=${email}`)
            .then(res => {
                const data = res.data;
                setProduct(data);
                checkFavoriteStatus(id);
                
                // Ưu tiên:
                // 1. Gợi ý cá nhân hóa (preferredSugar/preferredIce từ Layer 2 navigation state) nếu hợp lệ
                // 2. Thói quen cũ của món này (data.habit)
                // 3. Mặc định từ product options
                const navPrefSugar = location.state?.preferredSugar;
                const defaultSugar = (navPrefSugar && Array.isArray(data.sugarOptions) && data.sugarOptions.includes(navPrefSugar))
                    ? navPrefSugar
                    : (data.habit?.sugar || data.sugarOptions?.[data.sugarOptions.length - 1] || '100%');

                const navPrefIce = location.state?.preferredIce;
                const defaultIce = (navPrefIce && Array.isArray(data.iceOptions) && data.iceOptions.includes(navPrefIce))
                    ? navPrefIce
                    : (data.habit?.ice || data.iceOptions?.[data.iceOptions.length - 1] || '100%');

                const defaultSize = data.habit?.size || data.sizes?.[1] || data.sizes?.[0] || 'M';
                const defaultToppings = (data.habit?.toppings || []).filter(name =>
                    data.toppings?.some(t => t.status === 'active' && t.name === name));

                setOptions({
                    size: defaultSize,
                    sugar: defaultSugar,
                    ice: defaultIce,
                    toppings: defaultToppings
                });
            })
            .catch(err => console.error(err));
        updateCartCount();
    }, [id]);

    if (!product) return <div className="loading-state"> Đang pha chế...</div>;

    const availableToppings = (product.toppings || []).filter(t => t.status === 'active');

    // Giá được quản lý trong collection toppings, không suy đoán theo tên.
    const getToppingPrice = (toppingName) => {
        return availableToppings.find(t => t.name === toppingName)?.price || 0;
    };

    // Giả lập lượng Calo dựa trên tên sản phẩm
    const getCalories = () => {
        if (!product) return 0;
        const nameLower = product.name.toLowerCase();
        if (nameLower.includes("sữa đá") || nameLower.includes("sữa nóng")) return 180;
        if (nameLower.includes("đen đá") || nameLower.includes("americano")) return 15;
        if (nameLower.includes("bạc xỉu") || nameLower.includes("latte") || nameLower.includes("cappuccino")) return 160;
        if (nameLower.includes("sinh tố") || nameLower.includes("smoothie")) return 240;
        if (nameLower.includes("trà sữa")) return 320;
        if (nameLower.includes("nước ép") || nameLower.includes("juice")) return 130;
        if (nameLower.includes("trà")) return 65;
        return 120;
    };

    const getExtraPrice = () => {
        let extra = 0;
        extra = sizeExtraPrice(options.size);

        // Cộng giá các toppings đã chọn
        options.toppings.forEach(t => {
            extra += getToppingPrice(t);
        });

        return extra;
    };

    const totalPrice = (product.price + getExtraPrice()) * quantity;

    const handleToppingToggle = (t) => {
        const current = [...options.toppings];
        const idx = current.indexOf(t);
        idx > -1 ? current.splice(idx, 1) : current.push(t);
        setOptions({ ...options, toppings: current });
    };

    const toggleFavorite = () => {
        let favs = JSON.parse(localStorage.getItem('favorites')) || [];
        if (isFavorite) {
            favs = favs.filter(f => f._id !== product._id);
            showToast("Đã bỏ yêu thích món này", "info");
        } else {
            favs.push(product);
            showToast("Đã thêm vào danh sách yêu thích");
        }
        localStorage.setItem('favorites', JSON.stringify(favs));
        setIsFavorite(!isFavorite);
    };

    const handleAddToCart = () => {
        const newItem = {
            _id: product._id,
            name: product.name,
            price: product.price + getExtraPrice(),
            image: product.image,
            quantity,
            options,
            note,
            category: product.category
        };
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existIdx = cart.findIndex(i => i._id === newItem._id && JSON.stringify(i.options) === JSON.stringify(newItem.options));

        existIdx > -1 ? cart[existIdx].quantity += quantity : cart.push(newItem);

        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
        updateCartCount();

        showToast(`Đã thêm ${quantity} x ${product.name} vào giỏ!`);
    };

    const sizeMap = {
        'S': 'Nhỏ (S)',
        'M': 'Vừa (M)',
        'L': 'Lớn (L)'
    };

    const iceMap = {
        'No ice': 'Không đá',
        'Less ice': 'Ít đá',
        'Normal': 'Bình thường',
        '0%': 'Không đá',
        '50%': 'Ít đá',
        '100%': 'Bình thường'
    };

    const categoryName = typeof product.category === 'object' ? product.category?.name : product.category;

    return (
        <div className="cafe-detail-page">
            <div className="cafe-detail-hero">
                <img
                    src={`${API_URL}/images/${product.image}`}
                    className="cafe-detail-image"
                    alt={product.name}
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/fallback-product.svg';
                    }}
                />

                {/* Floating header controls */}
                <button
                    className="cafe-hero-btn cafe-hero-btn-back"
                    onClick={() => navigate(-1)}
                    aria-label="Quay lại"
                >
                    <i className="bi bi-chevron-left"></i>
                </button>

                <div className="cafe-hero-actions">
                    <button
                        className="cafe-hero-btn"
                        onClick={toggleFavorite}
                        aria-label="Yêu thích món"
                    >
                        <i className={`bi ${isFavorite ? 'bi-heart-fill text-danger' : 'bi-heart'}`}></i>
                    </button>
                    <button
                        className="cafe-hero-btn position-relative"
                        onClick={() => navigate('/cart')}
                        aria-label="Xem giỏ hàng"
                    >
                        <i className="bi bi-bag"></i>
                        {cartCount > 0 && <span className="cafe-hero-badge">{cartCount}</span>}
                    </button>
                </div>

                <span className="cafe-hero-tag">Tùy chỉnh món</span>
            </div>

            <div className="cafe-detail-container">
                <div className="cafe-detail-sheet">
                    {/* Category & Name & Price */}
                    <div className="cafe-detail-header-block">
                        {categoryName && (
                            <span className="cafe-detail-cat-badge">{categoryName}</span>
                        )}
                        <div className="cafe-detail-title-row">
                            <h1 className="cafe-detail-name">{product.name}</h1>
                            <PriceDisplay
                                price={product.price + getExtraPrice()}
                                className="cafe-detail-price"
                            />
                        </div>

                        {product.description && (
                            <p className="cafe-detail-desc">{product.description}</p>
                        )}

                        <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                            <div className="cafe-calorie-pill">
                                <span>{getCalories()} kcal</span>
                            </div>
                            {product.habit && (
                                <div className="cafe-habit-pill">
                                    <i className="bi bi-clock-history me-1"></i>
                                    Đã chọn theo lựa chọn gần đây của bạn
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Kích cỡ */}
                    <div className="cafe-option-group">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="cafe-option-label">Kích cỡ</span>
                            {product.habit?.size && (
                                <span className="cafe-habit-tag">Quen thuộc</span>
                            )}
                        </div>
                        <div className="cafe-pill-group">
                            {product.sizes?.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    className={`cafe-pill-btn ${options.size === s ? 'active' : ''} ${product.habit?.size === s ? 'is-habit' : ''}`}
                                    onClick={() => setOptions({ ...options, size: s })}
                                >
                                    {sizeMap[s] || s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Độ ngọt */}
                    <div className="cafe-option-group">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="cafe-option-label">Độ ngọt</span>
                            {product.habit?.sugar && (
                                <span className="cafe-habit-tag">Quen thuộc</span>
                            )}
                        </div>
                        <div className="cafe-pill-group">
                            {product.sugarOptions?.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    className={`cafe-pill-btn ${options.sugar === opt ? 'active' : ''} ${product.habit?.sugar === opt ? 'is-habit' : ''}`}
                                    onClick={() => setOptions({ ...options, sugar: opt })}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lượng đá */}
                    <div className="cafe-option-group">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="cafe-option-label">Lượng đá</span>
                            {product.habit?.ice && (
                                <span className="cafe-habit-tag">Quen thuộc</span>
                            )}
                        </div>
                        <div className="cafe-pill-group">
                            {product.iceOptions?.map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    className={`cafe-pill-btn ${options.ice === opt ? 'active' : ''} ${product.habit?.ice === opt ? 'is-habit' : ''}`}
                                    onClick={() => setOptions({ ...options, ice: opt })}
                                >
                                    {iceMap[opt] || opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Topping */}
                    {availableToppings.length > 0 && (
                        <div className="cafe-option-group">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="cafe-option-label">Topping</span>
                                {product.habit?.toppings?.length > 0 && (
                                    <span className="cafe-habit-tag">Thường chọn</span>
                                )}
                            </div>
                            <div className="cafe-topping-list">
                                {availableToppings.map(t => {
                                    const isSelected = options.toppings.includes(t.name);
                                    const toppingPrice = t.price;
                                    const isHabitTopping = product.habit?.toppings?.includes(t.name);
                                    return (
                                        <div
                                            key={t._id}
                                            className={`cafe-topping-row ${isSelected ? 'selected' : ''} ${isHabitTopping ? 'is-habit' : ''}`}
                                            onClick={() => handleToppingToggle(t.name)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="cafe-topping-check">
                                                    <i className={`bi ${isSelected ? 'bi-check-circle-fill text-caramel' : 'bi-circle text-muted'}`}></i>
                                                </span>
                                                <span className="cafe-topping-name">{t.name}</span>
                                            </div>
                                            <span className="cafe-topping-price">+{toppingPrice.toLocaleString()}đ</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Ghi chú */}
                    <div className="cafe-option-group cafe-note-group">
                        <span className="cafe-option-label">Ghi chú đặc biệt</span>
                        <textarea
                            className="cafe-note-textarea"
                            rows="2"
                            placeholder="Ví dụ: Ít ngọt, không lấy ống hút, mang đi..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                {/* Footer sticky bar */}
                <div className="cafe-detail-footer">
                    <div className="cafe-detail-footer-inner">
                        <QuantityStepper
                            quantity={quantity}
                            onIncrease={() => setQuantity(quantity + 1)}
                            onDecrease={() => quantity > 1 && setQuantity(quantity - 1)}
                            size="lg"
                            ariaLabelPrefix="ly"
                        />
                        <button
                            type="button"
                            className="cafe-btn-add-cart"
                            onClick={handleAddToCart}
                        >
                            Thêm vào giỏ | {totalPrice.toLocaleString()}đ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Detail;
