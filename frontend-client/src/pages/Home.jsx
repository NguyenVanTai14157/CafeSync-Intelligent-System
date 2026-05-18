import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import '../assets/css/style.css';
import Chatbot from '../components/ChatBot';
import { showToast, showConfirm } from '../utils/toast'; // Import bộ thông báo xịn

const Home = ({ cartCount }) => {
    const [products, setProducts] = useState([]);
    const [category, setCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
    const [favorites, setFavorites] = useState(JSON.parse(localStorage.getItem('favorites')) || []);
    const [isPersonalized, setIsPersonalized] = useState(false);

    const navigate = useNavigate();
    const API_URL = "https://cafesync-intelligent-system-sntf.onrender.com";

    // Danh mục tương ứng với ID trong Database của Yến
    const categoryMap = {
        "Cà Phê": "69d362f64faad13bdcfb2de2",
        "Sinh tố": "69ce855ce29634cdd7933c0b",
        "Trà": "69ce856be29634cdd7933c0f",
        "Nước ép": "69ce8560e29634cdd7933c0d"
    };

    // Tự động bóc tách tên gọi thân mật (Lý Thị Yến -> Yến)
    const getShortName = () => {
        if (!userName) return "bạn";
        return userName.trim().split(' ').pop();
    };

    // --- HÀM AI GỢI Ý THEO THỜI GIAN (CONTEXT-AWARE) ---
    const getContextMessage = () => {
        const hour = new Date().getHours();
        const name = getShortName();
        if (hour >= 5 && hour < 12) return `Sáng sớm tỉnh táo với Cà phê nhé ${name}!`;
        if (hour >= 12 && hour < 18) return `Chiều năng lượng với Trà & Sinh tố nhé ${name}!`;
        return `Tối nhẹ nhàng với Nước ép thanh mát nhé ${name}!`;
    };

    const handleLogout = async () => {
        const result = await showConfirm(
            `${getShortName()} ơi...`,
            "Bạn muốn đăng xuất khỏi CaféSync sao?"
        );
        if (result.isConfirmed) {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userName');
            localStorage.removeItem('userEmail');
            setUserName('');
            showToast("Hẹn gặp lại bạn nhé!");
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    const handleStatusClick = () => {
        const lastOrderId = localStorage.getItem('lastOrderDBId');
        if (lastOrderId && lastOrderId !== "null") {
            navigate('/track-order');
        } else {
            navigate('/history');
        }
    };

    const handleShowPersonalized = () => {
        setIsPersonalized(!isPersonalized);
        if (!isPersonalized) {
            setCategory('all');
            setSearchTerm('');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                let url = `${API_URL}/api/products`;
                // Logic lọc theo danh mục chuẩn xác
                if (category !== 'all') {
                    const catId = categoryMap[category];
                    if (catId) url += `?category=${catId}`;
                }
                const res = await axios.get(url);
                setProducts(res.data);
            } catch (err) {
                console.error("Lỗi lấy dữ liệu:", err);
            }
        };
        fetchData();
    }, [category]);

    const toggleFavorite = (e, product) => {
        e.stopPropagation();
        let currentFavs = JSON.parse(localStorage.getItem('favorites')) || [];
        const isExist = currentFavs.find(item => item._id === product._id);
        let updatedFavs = isExist
            ? currentFavs.filter(item => item._id !== product._id)
            : [...currentFavs, product];

        setFavorites(updatedFavs);
        localStorage.setItem('favorites', JSON.stringify(updatedFavs));

        if (!isExist) showToast(`Đã thích ${product.name}`);
    };

    const addToCart = (e, product) => {
        e.stopPropagation();
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cart.find(item => item._id === product._id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1, options: { size: "M", sugar: "100%", ice: "100%" } });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('cartUpdated'));
        showToast(`Đã thêm ${product.name} vào giỏ!`);
    };

    return (
        <div className="home-container pb-5 mb-5 animate__animated animate__fadeIn">
            {/* Header */}
            <div className="container pt-4 d-flex justify-content-between align-items-center mb-1">
                <div>
                    <h4 className="fw-bold mb-0" style={{ fontFamily: 'Playfair Display', color: '#826644' }}>CaféSync</h4>
                    <small className="text-muted">{userName ? `Chào ${userName} ` : "Chào bạn "}</small>
                </div>
                <div className="d-flex gap-2">
                    {(userName || localStorage.getItem('lastOrderDBId')) && (
                        <div className="icon-circle bg-white shadow-sm p-2 rounded-circle"
                            style={{ cursor: 'pointer', color: '#826644' }}
                            onClick={handleStatusClick} title="Lịch sử & Theo dõi">
                            <i className="bi bi-clock-history fs-5"></i>
                        </div>
                    )}
                    <div className="icon-circle bg-white shadow-sm p-2 rounded-circle text-danger"
                        style={{ cursor: 'pointer' }} onClick={userName ? handleLogout : () => navigate('/login')}>
                        <i className={userName ? "bi bi-box-arrow-right fs-5" : "bi bi-person fs-5"}></i>
                    </div>
                </div>
            </div>

            {/* Smart Promo Banner */}
            <div className="container mt-3">
                {userName ? (
                    <div className="promo-banner shadow-sm" style={{ background: 'linear-gradient(135deg, #826644 0%, #a47551 100%)', color: 'white' }}>
                        <div>
                            <span className="badge bg-white text-dark rounded-pill mb-2 px-3 py-2 small">
                                {isPersonalized ? `Gu riêng của ${getShortName()}` : "Gợi ý riêng cho bạn"}
                            </span>
                            <h3 className="fw-bold mb-0">{isPersonalized ? "THỰC ĐƠN SMART" : "MÓN 'RUỘT' HÔM NAY"}</h3>
                            <button
                                className={`btn btn-sm rounded-pill mt-2 px-4 fw-bold ${isPersonalized ? 'btn-warning text-dark shadow' : 'btn-light'}`}
                                onClick={handleShowPersonalized}
                            >
                                {isPersonalized ? "Đang hiện Smart Menu" : "Xem ngay"}
                            </button>
                        </div>
                        <i className={`bi ${isPersonalized ? 'bi-cpu-fill' : 'bi-stars'} fs-1 opacity-50`}></i>
                    </div>
                ) : (
                    <div className="promo-banner shadow-sm">
                        <div>
                            <span className="badge bg-white text-dark rounded-pill mb-2 px-3 py-2 small">Ưu đãi hôm nay</span>
                            <h3 className="fw-bold mb-0">GIẢM 50%</h3>
                            <button className="btn btn-dark btn-sm rounded-pill mt-2 px-4" onClick={() => navigate('/login')}>Đặt Ngay</button>
                        </div>
                        <img src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80"
                            className="rounded-circle shadow" style={{ width: '90px', height: '90px', objectFit: 'cover' }} alt="promo" />
                    </div>
                )}
            </div>

            {/* Search */}
            <div className="container mb-4 mt-3">
                <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border-0">
                    <span className="input-group-text bg-white border-0 ps-3"><i className="bi bi-search text-muted"></i></span>
                    <input type="text" value={searchTerm} className="form-control border-0 py-3 shadow-none text-dark" placeholder="Tìm món ngon..."
                        onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* Categories */}
            <div className="container mb-4 overflow-auto d-flex gap-2 scrollbar-hidden">
                {['all', 'Cà Phê', 'Sinh tố', 'Nước ép', 'Trà'].map(cat => (
                    <button key={cat} onClick={() => { setCategory(cat); setIsPersonalized(false); }}
                        className={`btn rounded-pill px-4 fw-bold text-nowrap border-0 ${category === cat && !isPersonalized ? 'btn-dark' : 'bg-white shadow-sm'}`}>
                        {cat === 'all' ? 'Tất cả' : cat}
                    </button>
                ))}
            </div>

            {/* Product List with Intelligence */}
            <div className="container">
                {isPersonalized && (
                    <div className="alert bg-white border-0 shadow-sm rounded-4 mb-4 animate__animated animate__fadeIn">
                        <small className="fw-bold text-brown"><i className="bi bi-lightning-charge-fill me-2"></i>{getContextMessage()}</small>
                    </div>
                )}

                <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
                    {products
                        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .filter(p => {
                            if (!isPersonalized) return true;
                            const hour = new Date().getHours();
                            const isFav = favorites.some(f => f._id === p._id);

                            // 1. Món đã thả tim luôn hiện
                            if (isFav) return true;

                            // 2. Logic dự phòng: Hiện Best Seller hoặc món giá cao
                            const isSpecial = p.name.includes("đặc biệt") || p.name.includes("muối") || p.price > 55000;

                            if (hour >= 5 && hour < 12) return p.category === categoryMap["Cà Phê"] || isSpecial;
                            if (hour >= 12 && hour < 18) return p.category === categoryMap["Sinh tố"] || p.category === categoryMap["Trà"] || isSpecial;
                            return p.category === categoryMap["Nước ép"] || isSpecial;
                        })
                        .map(p => (
                            <div key={p._id} className="col mb-2 animate__animated animate__fadeInUp">
                                <div className="card h-100 premium-card shadow-sm position-relative" onClick={() => navigate(`/product/${p._id}`)}>
                                    <button className="btn-favorite-float" onClick={(e) => toggleFavorite(e, p)}>
                                        <i className={`bi ${favorites.find(f => f._id === p._id) ? 'bi-heart-fill text-danger' : 'bi-heart'}`}></i>
                                    </button>
                                    <img src={`${API_URL}/images/${p.image}`} className="card-img-top" alt={p.name}
                                        onError={(e) => e.target.src = 'https://placehold.co/200x250?text=CaféSync'} />
                                    <div className="card-body p-3">
                                        <h6 className="card-title text-truncate fw-bold">{p.name}</h6>
                                        <div className="d-flex justify-content-between align-items-center mt-2">
                                            <span className="fw-bold" style={{ color: '#D9A673' }}>{p.price.toLocaleString()}đ</span>
                                            <button className="btn-cart-small shadow-sm" onClick={(e) => addToCart(e, p)}><i className="bi bi-plus"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="bottom-nav shadow-lg d-flex justify-content-around align-items-center">
                <i className="bi bi-house-door-fill active" onClick={() => navigate('/')}></i>
                <div className="position-relative" onClick={() => navigate('/cart')} style={{ cursor: 'pointer' }}>
                    <i className="bi bi-cart3 fs-4"></i>
                    {cartCount > 0 && <span className="badge-cart">{cartCount}</span>}
                </div>
                <i className="bi bi-heart" onClick={() => navigate('/favorites')}></i>
                <i className="bi bi-person-circle" onClick={() => navigate('/profile')}></i>
            </div>
            <Chatbot />
        </div>
    );
};

export default Home;