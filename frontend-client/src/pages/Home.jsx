import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import API_URL from '../config';
import '../assets/css/style.css';
import SlotRecommendationSection from '../components/SlotRecommendationSection';
import BottomNav from '../components/BottomNav';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import LoginPersonalizationCard from '../components/LoginPersonalizationCard';
import { showToast, showConfirm } from '../utils/toast';
import { getTableContext, processUrlTableParams } from '../utils/tableContext';

const FALLBACK_IMAGE = '/fallback-product.svg';

// Hàm loại bỏ dấu tiếng Việt để phục vụ tìm kiếm không dấu
const removeAccents = (str) => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const Home = () => {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [favorites, setFavorites] = useState(JSON.parse(localStorage.getItem('favorites')) || []);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState({ favorites: [], newFlavors: [] });
  const [tableNumber, setTableNumber] = useState(() => {
    const ctx = getTableContext();
    return ctx.hasValidContext ? ctx.tableNumber : null;
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Lấy gợi ý món ngon cho thành viên đăng nhập
  useEffect(() => {
    const fetchRecs = async () => {
      const email = localStorage.getItem('userEmail');
      if (email && email !== 'Guest') {
        try {
          const res = await axios.get(`${API_URL}/api/products/recommendations?email=${email}`);
          setRecs(res.data);
        } catch (err) {
          console.error("Lỗi lấy gợi ý sản phẩm:", err);
        }
      }
    };
    fetchRecs();
  }, [userName]);

  // Xử lý thông tin số bàn và mã QR từ URL (ví dụ: ?table=12&tableToken=...)
  useEffect(() => {
    const result = processUrlTableParams(location.search);
    if (result.processed) {
      if (result.status === 'CONTEXT_SAVED') {
        showToast(result.message || `Đã kết nối Bàn ${result.tableNumber}`);
      } else if (result.status === 'PREVENTED_SWITCH') {
        showToast(result.message);
      } else if (result.status === 'MISSING_TOKEN' || result.status === 'INVALID_TABLE_NUMBER') {
        showToast(result.message);
      }
    }

    const ctx = getTableContext();
    setTableNumber(ctx.hasValidContext ? ctx.tableNumber : null);

    const handleContextUpdate = (e) => {
      const num = e.detail?.tableNumber;
      const tok = e.detail?.tableToken;
      setTableNumber(num && tok ? num : null);
    };

    window.addEventListener('tableContextUpdated', handleContextUpdate);
    return () => {
      window.removeEventListener('tableContextUpdated', handleContextUpdate);
    };
  }, [location]);

  // Danh mục tương ứng với ID trong Database
  const categoryMap = {
    "Cà phê": "69d362f64faad13bdcfb2de2",
    "Sinh tố": "69ce855ce29634cdd7933c0b",
    "Trà": "69ce856be29634cdd7933c0f",
    "Nước ép": "69ce8560e29634cdd7933c0d"
  };

  const getShortName = () => {
    if (!userName) return "bạn";
    return userName.trim().split(' ').pop();
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
      localStorage.removeItem('userRole');
      setUserName('');
      showToast("Hẹn gặp lại bạn nhé!");
      setTimeout(() => window.location.reload(), 800);
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `${API_URL}/api/products`;
        if (category !== 'all') {
          const catId = categoryMap[category];
          if (catId) url += `?category=${catId}`;
        }
        const res = await axios.get(url);
        setProducts(res.data);
      } catch (err) {
        console.error("Lỗi lấy dữ liệu món:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [category]);

  const toggleFavorite = (firstArg, secondArg) => {
    const e = secondArg ? firstArg : null;
    const product = secondArg || firstArg;
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (!product || !product._id) return;

    let currentFavs = JSON.parse(localStorage.getItem('favorites')) || [];
    const isExist = currentFavs.find(item => item._id === product._id);
    let updatedFavs = isExist
      ? currentFavs.filter(item => item._id !== product._id)
      : [...currentFavs, product];

    setFavorites(updatedFavs);
    localStorage.setItem('favorites', JSON.stringify(updatedFavs));
    showToast(isExist ? `Đã bỏ thích ${product.name}` : `Đã thích ${product.name}`);
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

  const categoriesList = ['all', 'Cà phê', 'Trà', 'Sinh tố', 'Nước ép'];

  return (
    <div className="cafe-app-container animate__animated animate__fadeIn">
      {/* 1. Header & Table Context */}
      <header className="cafe-header-wrapper d-flex justify-content-between align-items-start">
        <div>
          <h1 className="cafe-brand-title">CaféSync</h1>
          <p className="cafe-greeting-text">
            {userName ? `Chào ${getShortName()}, bạn muốn uống gì hôm nay?` : 'Xin chào, bạn muốn uống gì hôm nay?'}
          </p>
          {tableNumber && (
            <div className="cafe-table-chip">
              <i className="bi bi-geo-alt-fill text-muted"></i>
              <span>Đang gọi món tại Bàn {tableNumber}</span>
            </div>
          )}
        </div>

        <div className="d-flex gap-2 align-items-center">
          {(userName || localStorage.getItem('lastOrderDBId')) && (
            <button
              type="button"
              className="cafe-header-action-btn"
              onClick={handleStatusClick}
              aria-label="Theo dõi đơn hàng"
            >
              <i className="bi bi-clock-history fs-5"></i>
            </button>
          )}
          <button
            type="button"
            className="cafe-header-action-btn"
            onClick={userName ? handleLogout : () => navigate('/login')}
            aria-label={userName ? "Đăng xuất" : "Đăng nhập"}
          >
            <i className={`bi ${userName ? 'bi-box-arrow-right text-danger' : 'bi-person'} fs-5`}></i>
          </button>
        </div>
      </header>

      {/* 2. Search */}
      <div className="cafe-search-container">
        <div className="cafe-search-box">
          <i className="bi bi-search"></i>
          <input
            type="text"
            className="cafe-search-input"
            value={searchTerm}
            placeholder="Tìm món, topping hoặc danh mục..."
            aria-label="Tìm món ngon"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="btn btn-sm text-muted p-0 border-0"
              onClick={() => setSearchTerm('')}
              aria-label="Xóa tìm kiếm"
            >
              <i className="bi bi-x-circle-fill"></i>
            </button>
          )}
        </div>
      </div>

      {/* 3. Category Navigation Chips */}
      <nav className="cafe-category-bar" aria-label="Danh mục thực đơn">
        {categoriesList.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => { setCategory(cat); setIsPersonalized(false); }}
            className={`cafe-category-chip ${category === cat && !isPersonalized ? 'active' : ''}`}
          >
            {cat === 'all' ? 'Tất cả' : cat}
          </button>
        ))}
      </nav>

      {/* 4. Layer 1 Recommendation Section (Rule-based Time-slot Popularity) */}
      {(!isPersonalized && category === 'all' && !searchTerm) && (
        <SlotRecommendationSection onAddToCart={addToCart} />
      )}

      {/* 5. Login Personalization CTA Card */}
      {(!isPersonalized && category === 'all' && !searchTerm) && (
        <LoginPersonalizationCard isLoggedIn={!!userName} />
      )}

      {/* 6. Personalized Sliders (Khi thành viên bật Gu riêng) */}
      {isPersonalized && userName && recs.favorites?.length > 0 && (
        <section className="mb-4 px-3 animate__animated animate__fadeIn">
          <h5 className="cafe-section-title">
            Món tủ của {getShortName()}
          </h5>
          <div className="d-flex gap-3 overflow-auto pb-2 scrollbar-hidden" style={{ scrollSnapType: 'x mandatory' }}>
            {recs.favorites.map(p => (
              <div
                key={`fav-${p._id}`}
                className="slot-rec-card"
                style={{ flex: '0 0 170px', minWidth: '170px' }}
                onClick={() => navigate(`/product/${p._id}`)}
              >
                <div className="slot-rec-img-wrapper" style={{ height: '100px' }}>
                  <img
                    src={p.image ? `${API_URL}/images/${p.image}` : FALLBACK_IMAGE}
                    className="slot-rec-img"
                    alt={p.name}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                </div>
                <div className="p-2 text-center">
                  <h6 className="cafe-product-name mb-1" style={{ fontSize: '0.82rem', minHeight: 'auto' }}>{p.name}</h6>
                  <span className="cafe-product-price" style={{ fontSize: '0.85rem' }}>{p.price.toLocaleString()}đ</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Main Menu Section */}
      <section className="cafe-menu-section" aria-label="Thực đơn chính">
        <h5 className="cafe-section-title">
          {isPersonalized ? "Gợi ý thêm cho bạn" : "Thực đơn chính"}
        </h5>

        {loading ? (
          <div className="cafe-product-grid">
            {[1, 2, 3, 4].map(idx => (
              <div key={`skel-${idx}`} className="cafe-product-card" style={{ height: '240px' }}>
                <div className="skeleton-pulse" style={{ height: '135px' }}></div>
                <div className="p-3">
                  <div className="skeleton-pulse mb-2" style={{ height: '12px', width: '40%', borderRadius: '4px' }}></div>
                  <div className="skeleton-pulse mb-3" style={{ height: '14px', width: '80%', borderRadius: '4px' }}></div>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="skeleton-pulse" style={{ height: '16px', width: '35%', borderRadius: '4px' }}></div>
                    <div className="skeleton-pulse" style={{ width: '34px', height: '34px', borderRadius: '10px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          (() => {
            const filteredProducts = products
              .filter(p => {
                const nameNormalized = removeAccents(p.name.toLowerCase());
                const searchNormalized = removeAccents(searchTerm.toLowerCase());
                return nameNormalized.includes(searchNormalized);
              })
              .filter(p => {
                if (!isPersonalized) return true;
                const isFav = favorites.some(f => f._id === p._id);
                return isFav || p.price > 45000;
              });

            if (filteredProducts.length === 0) {
              return (
                <EmptyState
                  icon="bi-search"
                  title="Không tìm thấy món"
                  description="Không tìm thấy món phù hợp với từ khóa tìm kiếm của bạn. Hãy thử tìm theo danh mục khác nhé!"
                />
              );
            }

            return (
              <div className="cafe-product-grid">
                {filteredProducts.map(p => {
                  const isFav = favorites.some(f => f._id === p._id);
                  return (
                    <ProductCard
                      key={p._id}
                      product={p}
                      isFavorite={isFav}
                      onToggleFavorite={() => toggleFavorite(null, p)}
                      onAdd={() => addToCart(null, p)}
                    />
                  );
                })}
              </div>
            );
          })()
        )}
      </section>

      {/* 8. Unified Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Home;