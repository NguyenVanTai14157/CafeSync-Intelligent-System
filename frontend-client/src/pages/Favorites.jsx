import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/style.css';
import { showToast, showConfirm } from '../utils/toast';

const Favorites = () => {
    const [favorites, setFavorites] = useState([]);
    const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
    const [cartCount, setCartCount] = useState(0); // Khai báo để tránh lỗi undefined
    const navigate = useNavigate();
    const API_URL = "https://cafesync-intelligent-system-sntf.onrender.com";

    // 1. Tự động lấy tên người dùng để cá nhân hóa lời chào
    const getFriendlyName = () => {
        if (!userName) return "bạn";
        return userName.trim().split(' ').pop();
    };

    // 2. Hàm cập nhật số lượng món trong giỏ hàng (hiển thị trên Badge)
    const updateCartCount = () => {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(count);
    };

    useEffect(() => {
        // Tải danh sách yêu thích từ LocalStorage
        const savedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
        setFavorites(savedFavorites);

        // Cập nhật số lượng giỏ hàng ban đầu
        updateCartCount();

        // Lắng nghe sự kiện nếu các trang khác có thay đổi giỏ hàng
        window.addEventListener('cartUpdated', updateCartCount);
        return () => window.removeEventListener('cartUpdated', updateCartCount);
    }, []);

    // 3. Hàm xóa món khỏi danh sách yêu thích (Sử dụng SweetAlert2)
    const removeFromFavorites = async (id, productName) => {
        const result = await showConfirm(
            "Bỏ yêu thích?",
            `Bạn không muốn lưu ${productName} vào danh sách nữa sao?`
        );

        if (result.isConfirmed) {
            const updated = favorites.filter(item => item._id !== id);
            setFavorites(updated);
            localStorage.setItem('favorites', JSON.stringify(updated));
            showToast("Đã xóa khỏi danh sách yêu thích", "info");
        }
    };

    return (
        <div className="favorites-page bg-light-custom min-vh-100 pb-5">
            {/* Header với nút quay lại */}
            <div className="container pt-4 d-flex align-items-center mb-4">
                <button
                    onClick={() => navigate('/')}
                    className="btn bg-white shadow-sm rounded-circle p-2 me-3"
                    style={{ width: '40px', height: '40px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <i className="bi bi-chevron-left text-dark"></i>
                </button>
                <h4 className="fw-bold mb-0">Món yêu thích</h4>
            </div>

            <div className="container" style={{ paddingBottom: '100px' }}>
                {favorites.length === 0 ? (
                    /* Giao diện khi danh sách trống */
                    <div className="text-center py-5 animate__animated animate__fadeIn">
                        <div className="mb-4">
                            <i className="bi bi-heart text-muted opacity-25" style={{ fontSize: '5rem' }}></i>
                        </div>
                        <h5 className="fw-bold">Danh sách đang trống</h5>
                        <p className="text-muted small">{getFriendlyName()} chưa thả tim món nào hết!</p>
                        <button onClick={() => navigate('/')} className="btn btn-dark rounded-pill px-4 mt-3 shadow-sm">Khám phá Menu</button>
                    </div>
                ) : (
                    /* Danh sách món yêu thích dạng Grid */
                    <div className="row row-cols-2 row-cols-md-3 g-3">
                        {favorites.map(p => (
                            <div key={p._id} className="col animate__animated animate__fadeInUp">
                                <div className="card h-100 premium-card shadow-sm border-0 position-relative overflow-hidden" style={{ borderRadius: '20px' }}>
                                    {/* Nút xóa món yêu thích */}
                                    <button
                                        className="btn btn-sm position-absolute top-0 end-0 m-2 bg-white rounded-circle shadow-sm text-danger"
                                        style={{ zIndex: 2, width: '30px', height: '30px', padding: 0, border: 'none' }}
                                        onClick={() => removeFromFavorites(p._id, p.name)}
                                    >
                                        <i className="bi bi-x-lg" style={{ fontSize: '0.8rem' }}></i>
                                    </button>

                                    {/* Nội dung sản phẩm */}
                                    <div onClick={() => navigate(`/product/${p._id}`)} style={{ cursor: 'pointer' }}>
                                        <img
                                            src={`${API_URL}/images/${p.image}`}
                                            className="card-img-top"
                                            alt={p.name}
                                            style={{ height: '160px', objectFit: 'cover' }}
                                            onError={(e) => e.target.src = 'https://placehold.co/200x200?text=CaféSync'}
                                        />
                                        <div className="card-body p-3">
                                            <h6 className="card-title text-truncate small fw-bold mb-1">{p.name}</h6>
                                            <span className="fw-bold" style={{ color: '#826644' }}>{p.price.toLocaleString()}đ</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Navigation đồng bộ với toàn hệ thống */}
            <div className="bottom-nav shadow-lg d-flex justify-content-around align-items-center bg-white py-2 fixed-bottom">
                <i className="bi bi-house-door fs-4 text-muted" onClick={() => navigate('/')}></i>

                <div className="position-relative" onClick={() => navigate('/cart')} style={{ cursor: 'pointer' }}>
                    <i className="bi bi-cart3 fs-4 text-muted"></i>
                    {cartCount > 0 && <span className="badge-cart">{cartCount}</span>}
                </div>

                {/* Icon Favorite đang active sẽ có màu nâu đặc trưng */}
                <i className="bi bi-heart-fill fs-4" style={{ color: '#826644' }} onClick={() => navigate('/favorites')}></i>

                <i className="bi bi-person-circle fs-4 text-muted" onClick={() => navigate('/profile')}></i>
            </div>
        </div>
    );
};

export default Favorites;