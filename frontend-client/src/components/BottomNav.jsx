import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);

  const updateCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCount();
    window.addEventListener('storage', updateCount);
    window.addEventListener('cartUpdated', updateCount);
    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('cartUpdated', updateCount);
    };
  }, []);

  const path = location.pathname;
  const isHome = path === '/';
  const isOrders = path === '/history' || path === '/track-order';
  const isCart = path === '/cart';
  const isFavorites = path === '/favorites';
  const isAccount = path === '/profile' || path === '/login';

  const handleOrdersClick = () => {
    const lastOrderId = localStorage.getItem('lastOrderDBId');
    if (lastOrderId && lastOrderId !== 'null') {
      navigate('/track-order');
    } else {
      navigate('/history');
    }
  };

  const handleAccountClick = () => {
    const token = localStorage.getItem('userToken');
    if (token) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };

  return (
    <nav className="cafe-bottom-nav" aria-label="Điều hướng chính">
      <button
        type="button"
        className={`cafe-bottom-nav-item ${isHome ? 'active' : ''}`}
        onClick={() => navigate('/')}
        aria-label="Trang chủ"
        aria-current={isHome ? 'page' : undefined}
      >
        <i className={`bi ${isHome ? 'bi-house-door-fill' : 'bi-house-door'}`}></i>
        <span>Trang chủ</span>
      </button>

      <button
        type="button"
        className={`cafe-bottom-nav-item ${isOrders ? 'active' : ''}`}
        onClick={handleOrdersClick}
        aria-label="Đơn hàng"
        aria-current={isOrders ? 'page' : undefined}
      >
        <i className={`bi ${isOrders ? 'bi-clock-history' : 'bi-clock'}`}></i>
        <span>Đơn hàng</span>
      </button>

      <button
        type="button"
        className={`cafe-bottom-nav-item ${isCart ? 'active' : ''}`}
        onClick={() => navigate('/cart')}
        aria-label={`Giỏ hàng ${cartCount > 0 ? `(${cartCount} món)` : ''}`}
        aria-current={isCart ? 'page' : undefined}
      >
        <div className="position-relative d-inline-flex">
          <i className={`bi ${isCart ? 'bi-bag-fill' : 'bi-bag'}`}></i>
          {cartCount > 0 && (
            <span className="cafe-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>
          )}
        </div>
        <span>Giỏ hàng</span>
      </button>

      <button
        type="button"
        className={`cafe-bottom-nav-item ${isFavorites ? 'active' : ''}`}
        onClick={() => navigate('/favorites')}
        aria-label="Yêu thích"
        aria-current={isFavorites ? 'page' : undefined}
      >
        <i className={`bi ${isFavorites ? 'bi-heart-fill' : 'bi-heart'}`}></i>
        <span>Yêu thích</span>
      </button>

      <button
        type="button"
        className={`cafe-bottom-nav-item ${isAccount ? 'active' : ''}`}
        onClick={handleAccountClick}
        aria-label="Tài khoản"
        aria-current={isAccount ? 'page' : undefined}
      >
        <i className={`bi ${isAccount ? 'bi-person-fill' : 'bi-person'}`}></i>
        <span>Tài khoản</span>
      </button>
    </nav>
  );
};

export default BottomNav;
