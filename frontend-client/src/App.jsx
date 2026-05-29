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

function App() {
  const [cartCount, setCartCount] = useState(0);
  const [tableNumber, setTableNumber] = useState(localStorage.getItem('tableNumber'));

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    setCartCount(count);
  };

  useEffect(() => {
    // Lưu số bàn từ URL nếu có
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
      localStorage.setItem('tableNumber', tableParam);
      setTableNumber(tableParam);
    }

    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cartUpdated', updateCartCount);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  return (
    <Router>
      <div className="cafesync-client">
        <Routes>
          <Route path="/" element={<Home cartCount={cartCount} />} />
          <Route path="/product/:id" element={<Detail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/history" element={<OrderHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/favorites" element={<Favorites />} />
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