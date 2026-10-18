import React, { useState, useEffect } from 'react';
import '../assets/css/style.css';
import { showToast, showConfirm } from '../utils/toast';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ProductCard from '../components/ProductCard';
import BottomNav from '../components/BottomNav';

const Favorites = () => {
    const [favorites, setFavorites] = useState([]);
    const [userName] = useState(localStorage.getItem('userName') || '');
    const [cartCount, setCartCount] = useState(0);

    const getFriendlyName = () => {
        if (!userName) return "bạn";
        return userName.trim().split(' ').pop();
    };

    const updateCartCount = () => {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(count);
    };

    useEffect(() => {
        const savedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
        setFavorites(savedFavorites);
        updateCartCount();

        window.addEventListener('cartUpdated', updateCartCount);
        return () => window.removeEventListener('cartUpdated', updateCartCount);
    }, []);

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

    const addToCart = (firstArg, secondArg) => {
        const e = secondArg ? firstArg : null;
        const product = secondArg || firstArg;
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }
        if (!product || !product._id) return;

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
        <div className="cafe-app-container">
            {/* 1. Shared Page Header */}
            <PageHeader
                title="Món yêu thích"
                subtitle="Danh sách các món bạn đã thả tim"
            />

            <div className="px-3" style={{ paddingBottom: '90px' }}>
                {favorites.length === 0 ? (
                    /* 2. Shared Empty State */
                    <EmptyState
                        icon="bi-heart"
                        title="Danh sách đang trống"
                        description={`${getFriendlyName()} chưa thả tim món nào. Hãy khám phá menu và lưu lại những thức uống bạn thích nhé!`}
                        actionText="Khám phá thực đơn"
                        actionHref="/"
                    />
                ) : (
                    /* 3. Shared ProductCard Grid */
                    <div className="cafe-product-grid">
                        {favorites.map(p => (
                            <ProductCard
                                key={p._id}
                                product={p}
                                isFavorite={true}
                                onToggleFavorite={() => removeFromFavorites(p._id, p.name)}
                                onAdd={(e) => addToCart(e, p)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 4. Shared Bottom Navigation */}
            <BottomNav cartCount={cartCount} />
        </div>
    );
};

export default Favorites;