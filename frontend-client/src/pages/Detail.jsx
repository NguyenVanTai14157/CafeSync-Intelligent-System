import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/css/detail.css';
import { showToast } from '../utils/toast'; // Import bộ thông báo xịn

const Detail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const API_URL = "https://cafesync-intelligent-system-sntf.onrender.com";

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

    // Kiểm tra xem món này đã nằm trong danh sách yêu thích chưa
    const checkFavoriteStatus = (productId) => {
        const favs = JSON.parse(localStorage.getItem('favorites')) || [];
        setIsFavorite(favs.some(f => f._id === productId));
    };

    useEffect(() => {
        axios.get(`${API_URL}/api/products/${id}`)
            .then(res => {
                const data = res.data;
                setProduct(data);
                checkFavoriteStatus(id);
                setOptions({
                    size: data.sizes?.[1] || data.sizes?.[0] || 'M',
                    sugar: data.sugarOptions?.[data.sugarOptions.length - 1] || '100%',
                    ice: data.iceOptions?.[data.iceOptions.length - 1] || '100%',
                    toppings: []
                });
            })
            .catch(err => console.error(err));
        updateCartCount();
    }, [id]);

    if (!product) return <div className="loading-state"> Đang pha chế...</div>;

    const getExtraPrice = () => {
        if (options.size === 'S') return 0;
        if (options.size === 'L') return 10000;
        return 5000;
    };

    const totalPrice = (product.price + getExtraPrice()) * quantity;

    const handleToppingToggle = (t) => {
        const current = [...options.toppings];
        const idx = current.indexOf(t);
        idx > -1 ? current.splice(idx, 1) : current.push(t);
        setOptions({ ...options, toppings: current });
    };

    // Hàm xử lý Yêu thích (Favorite)
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
            category: product.category // Lưu thêm category để phục vụ logic gợi ý
        };
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existIdx = cart.findIndex(i => i._id === newItem._id && JSON.stringify(i.options) === JSON.stringify(newItem.options));

        existIdx > -1 ? cart[existIdx].quantity += quantity : cart.push(newItem);

        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
        updateCartCount();

        // Thông báo chuyên nghiệp thay cho alert()
        showToast(`Đã thêm ${quantity} x ${product.name} vào giỏ!`);
    };

    return (
        <div className="detail-page-premium">
            <div className="top-nav-bar">
                <button className="nav-icon-btn" onClick={() => navigate(-1)}><i className="bi bi-chevron-left"></i></button>
                <span className="nav-title">Chi tiết món</span>
                <button className="nav-icon-btn" onClick={toggleFavorite}>
                    <i className={`bi ${isFavorite ? 'bi-heart-fill text-danger' : 'bi-heart'}`}></i>
                </button>
            </div>

            <div className="hero-image-container">
                <img src={`${API_URL}/images/${product.image}`} className="product-hero-image" alt={product.name} />
            </div>

            <div className="detail-content-sheet-full">
                <h1 className="premium-item-name">{product.name}</h1>
                <p className="premium-description">{product.description || "Hương vị cà phê đích thực từ CaféSync."}</p>

                <div className="option-section">
                    <span className="premium-section-title">Kích cỡ ly</span>
                    <div className="capsule-selector">
                        {product.sizes?.map(s => {
                            let extra = 0;
                            if (s === 'M') extra = 5000;
                            else if (s === 'L') extra = 10000;
                            const finalPrice = product.price + extra;
                            return (
                                <div key={s} className={`flex-grow-1 capsule-item ${options.size === s ? 'active' : ''}`} onClick={() => setOptions({ ...options, size: s })}>
                                    <div style={{ fontWeight: '600' }}>{s}</div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>{finalPrice.toLocaleString()}đ</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="option-section mt-4">
                    <span className="premium-section-title">Mức đường</span>
                    <div className="capsule-selector-small">
                        {product.sugarOptions?.map(opt => (
                            <div key={opt} className={`capsule-item-small ${options.sugar === opt ? 'active' : ''}`} onClick={() => setOptions({ ...options, sugar: opt })}>{opt}</div>
                        ))}
                    </div>
                </div>

                <div className="option-section mt-4">
                    <span className="premium-section-title">Mức đá</span>
                    <div className="capsule-selector-small">
                        {product.iceOptions?.map(opt => (
                            <div key={opt} className={`capsule-item-small ${options.ice === opt ? 'active' : ''}`} onClick={() => setOptions({ ...options, ice: opt })}>{opt}</div>
                        ))}
                    </div>
                </div>

                {product.toppings?.length > 0 && (
                    <div className="option-section mt-4">
                        <span className="premium-section-title">Topping yêu thích</span>
                        <div className="topping-capsule-group">
                            {product.toppings.map(t => (
                                <div key={t} className={`topping-capsule-item ${options.toppings.includes(t) ? 'active' : ''}`} onClick={() => handleToppingToggle(t)}>{t}</div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="option-section mt-4 mb-5">
                    <span className="premium-section-title">Ghi chú cho quán</span>
                    <textarea className="premium-note-input" rows="2" placeholder="Ví dụ: Ít đường, không lấy ống hút..." value={note} onChange={(e) => setNote(e.target.value)}></textarea>
                </div>
            </div>

            <div className="premium-footer-container">
                <div className="footer-price-row">
                    <div className="premium-quantity-stepper">
                        <button onClick={() => quantity > 1 && setQuantity(quantity - 1)}>−</button>
                        <span className="quantity-num">{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)}>+</button>
                    </div>
                    <div className="final-price-display">{totalPrice.toLocaleString()}đ</div>
                </div>
                <div className="footer-button-row">
                    <button className="bag-icon-btn position-relative" onClick={() => navigate('/cart')}>
                        <i className="bi bi-bag-heart"></i>
                        {cartCount > 0 && <span className="cart-badge-dot">{cartCount}</span>}
                    </button>
                    <button className="btn-add-order-now" onClick={handleAddToCart}>Thêm vào giỏ</button>
                </div>
            </div>
        </div>
    );
};

export default Detail;