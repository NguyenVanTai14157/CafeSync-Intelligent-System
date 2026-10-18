import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './assets/css/style.css';

// --- IMPORT CÁC TRANG ---
import Home from './pages/Home.jsx';
import Detail from './pages/Detail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import TrackOrder from './pages/TrackOrder.jsx';
import Login from './pages/Login.jsx';
import Favorites from './pages/Favorites.jsx';
import OrderHistory from './pages/OrderHistory.jsx';
import Profile from './pages/Profile.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Chatbot from './components/ChatBot.jsx';
import CustomerRouteGuard from './components/CustomerRouteGuard.jsx';
import { purgeIfStaffSession } from './utils/authGuard';
import { processUrlTableParams, getTableContext } from './utils/tableContext';

function App() {
  const [cartCount, setCartCount] = useState(0);
  const [tableNumber, setTableNumber] = useState(() => {
    const ctx = getTableContext();
    return ctx.hasValidContext ? ctx.tableNumber : null;
  });

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    setCartCount(count);
  };

  useEffect(() => {
    // Tự động kiểm tra và dọn dẹp nếu phát hiện token/role của nhân viên
    purgeIfStaffSession();

    // Xử lý thông tin số bàn và token từ URL (nếu có) và xóa khỏi query
    processUrlTableParams();
    const ctx = getTableContext();
    setTableNumber(ctx.hasValidContext ? ctx.tableNumber : null);

    const handleTableContextUpdated = (e) => {
      const num = e.detail?.tableNumber;
      const tok = e.detail?.tableToken;
      setTableNumber(num && tok ? num : null);
    };

    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cartUpdated', updateCartCount);
    window.addEventListener('tableContextUpdated', handleTableContextUpdated);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('tableContextUpdated', handleTableContextUpdated);
    };
  }, []);

  return (
    <Router>
      <div className="cafesync-client">
        <Routes>
          <Route path="/" element={<Home cartCount={cartCount} />} />
          <Route path="/product/:id" element={<Detail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<CustomerRouteGuard><Checkout /></CustomerRouteGuard>} />
          <Route path="/track-order" element={<CustomerRouteGuard><TrackOrder /></CustomerRouteGuard>} />
          <Route path="/history" element={<CustomerRouteGuard requireAuth={true}><OrderHistory /></CustomerRouteGuard>} />
          <Route path="/profile" element={<CustomerRouteGuard requireAuth={true}><Profile /></CustomerRouteGuard>} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/favorites" element={<CustomerRouteGuard requireAuth={true}><Favorites /></CustomerRouteGuard>} />
        </Routes>

        {/* 2. CHATBOT NẰM Ở ĐÂY: Sẽ hiện trên tất cả các trang */}
        <Chatbot />

        {/* Banner thông báo Bàn */}
        {tableNumber && (
          <div style={{
            position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(217, 160, 91, 0.9)', color: 'white', padding: '6px 16px',
            borderRadius: '20px', fontWeight: 'bold', fontSize: '12px', zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
          }}>
            <i className="bi bi-geo-alt-fill"></i> Sẵn sàng phục vụ Bàn {tableNumber} !
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;