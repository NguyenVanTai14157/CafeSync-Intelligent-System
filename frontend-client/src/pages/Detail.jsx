import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';
import '../assets/css/detail.css';
import { showToast } from '../utils/toast'; // Import bộ thông báo xịn

const Detail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

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
                
                // Sử dụng thói quen cũ (habit) nếu có, nếu không thì lấy giá trị mặc định
                const defaultSize = data.habit?.size || data.sizes?.[1] || data.sizes?.[0] || 'M';
                const defaultSugar = data.habit?.sugar || data.sugarOptions?.[data.sugarOptions.length - 1] || '100%';
                const defaultIce = data.habit?.ice || data.iceOptions?.[data.iceOptions.length - 1] || '100%';
                const defaultToppings = data.habit?.toppings || [];

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

    // Định nghĩa giá tiền của từng topping
    const getToppingPrice = (toppingName) => {
        const nameLower = toppingName.toLowerCase();
        if (nameLower.includes("kem phô mai") || nameLower.includes("cream cheese") || nameLower.includes("cheese") || nameLower.includes("macchiato")) return 10000;
        if (nameLower.includes("trân châu") || nameLower.includes("thạch") || nameLower.includes("pudding")) return 5000;
        if (nameLower.includes("hạt chia") || nameLower.includes("basil")) return 3000;
        return 5000; // Mặc định
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
        if (options.size === 'S') extra = 0;
        else if (options.size === 'L') extra = 10000;
        else extra = 5000; // Size M

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

    return (
        <div className="detail-page-premium">
            <div className="hero-image-wrapper">
                <img src={`${API_URL}/images/${product.image}`} className="product-hero-image-new" alt={product.name} />
                
                {/* Các nút điều hướng nổi đè trên ảnh */}
                <button className="floating-back-btn" onClick={() => navigate(-1)}>
                    <i className="bi bi-chevron-left"></i>
                </button>
                <div className="floating-right-actions">
                    <button className="floating-action-btn me-2" onClick={toggleFavorite}>
                        <i className={`bi ${isFavorite ? 'bi-heart-fill text-danger' : 'bi-heart'}`}></i>
                    </button>
                    <button className="floating-action-btn position-relative" onClick={() => navigate('/cart')}>
                        <i className="bi bi-bag-heart"></i>
                        {cartCount > 0 && <span className="cart-badge-dot-new">{cartCount}</span>}
                    </button>
                </div>

                {/* Huy hiệu Phổ biến */}
                <span className="popular-badge-float">Phổ biến</span>
            </div>

            <div className="detail-info-wrapper-new">
                <div className="detail-content-sheet-new">
                    <div className="name-price-row">
                        <h1 className="premium-item-name-new">{product.name}</h1>
                        <span className="premium-item-price-new">{(product.price + getExtraPrice()).toLocaleString()}đ</span>
                    </div>

                    {/* Chỉ số calo giống như bản mẫu */}
                    <div className="calorie-badge">
                        <span>{getCalories()} CALORIES</span>
                    </div>

                    {/* Chọn Size dạng viên thuốc rời */}
                    <div className="option-section mt-4">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="premium-section-title mb-0">Kích cỡ ly</span>
                            {product.habit?.size && <span className="habit-title-badge">Khẩu vị quen thuộc</span>}
                        </div>
                        <div className="pill-selector-group">
                            {product.sizes?.map(s => (
                                <button 
                                    key={s} 
                                    className={`pill-selector-item ${options.size === s ? 'active' : ''} ${product.habit?.size === s ? 'habit-item' : ''}`} 
                                    onClick={() => setOptions({ ...options, size: s })}
                                >
                                    {sizeMap[s] || s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mức đường dạng viên thuốc rời */}
                    <div className="option-section mt-4">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="premium-section-title mb-0">Mức đường</span>
                            {product.habit?.sugar && <span className="habit-title-badge">Khẩu vị quen thuộc</span>}
                        </div>
                        <div className="pill-selector-group">
                            {product.sugarOptions?.map(opt => (
                                <button 
                                    key={opt} 
                                    className={`pill-selector-item ${options.sugar === opt ? 'active' : ''} ${product.habit?.sugar === opt ? 'habit-item' : ''}`} 
                                    onClick={() => setOptions({ ...options, sugar: opt })}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mức đá dạng viên thuốc rời */}
                    <div className="option-section mt-4">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className="premium-section-title mb-0">Mức đá</span>
                            {product.habit?.ice && <span className="habit-title-badge">Khẩu vị quen thuộc</span>}
                        </div>
                        <div className="pill-selector-group">
                            {product.iceOptions?.map(opt => (
                                <button 
                                    key={opt} 
                                    className={`pill-selector-item ${options.ice === opt ? 'active' : ''} ${product.habit?.ice === opt ? 'habit-item' : ''}`} 
                                    onClick={() => setOptions({ ...options, ice: opt })}
                                >
                                    {iceMap[opt] || opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Topping dạng Checkbox list căn đều */}
                    {product.toppings?.length > 0 && (
                        <div className="option-section mt-4">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="premium-section-title mb-0">Topping yêu thích</span>
                                {product.habit?.toppings?.length > 0 && <span className="habit-title-badge">Thường chọn</span>}
                            </div>
                            <div className="topping-checkbox-list">
                                {product.toppings.map(t => {
                                    const isSelected = options.toppings.includes(t);
                                    const toppingPrice = getToppingPrice(t);
                                    const isHabitTopping = product.habit?.toppings?.includes(t);
                                    return (
                                        <div 
                                            key={t} 
                                            className={`topping-checkbox-row ${isHabitTopping ? 'habit-item' : ''}`} 
                                            onClick={() => handleToppingToggle(t)}
                                        >
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="topping-checkbox-icon">
                                                    {isSelected ? (
                                                        <i className="bi bi-check-square-fill text-dark fs-5"></i>
                                                    ) : (
                                                        <i className="bi bi-square fs-5" style={{ color: '#ccc' }}></i>
                                                    )}
                                                </span>
                                                <span className="topping-name text-dark fw-semibold">{t}</span>
                                            </div>
                                            <span className="topping-price text-muted fw-bold">+{toppingPrice.toLocaleString()}đ</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Ghi chú */}
                    <div className="option-section mt-4 mb-5 pb-5">
                        <span className="premium-section-title">Ghi chú đặc biệt</span>
                        <textarea 
                            className="premium-note-input" 
                            rows="2" 
                            placeholder="Ví dụ: Ít ngọt, không lấy ống hút, dị ứng hạt..." 
                            value={note} 
                            onChange={(e) => setNote(e.target.value)}
                        ></textarea>
                    </div>
                </div>

                {/* Footer dạng thanh đơn mỏng gọn giống thiết kế */}
                <div className="premium-footer-container-new">
                    <div className="footer-layout-new">
                        <div className="premium-quantity-stepper-new">
                            <button onClick={() => quantity > 1 && setQuantity(quantity - 1)}>−</button>
                            <span className="quantity-num-new">{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)}>+</button>
                        </div>
                        <button className="btn-add-order-now-new" onClick={handleAddToCart}>
                            Thêm vào giỏ | {totalPrice.toLocaleString()}đ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Detail;