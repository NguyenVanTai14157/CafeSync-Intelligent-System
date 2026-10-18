import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_URL from '../config';
import PriceDisplay from './PriceDisplay';

const FALLBACK_IMAGE = '/fallback-product.svg';

const SLOT_TITLE_MAP = {
  morning: 'Gợi ý buổi sáng',
  afternoon: 'Gợi ý buổi chiều',
  evening: 'Gợi ý buổi tối',
  late_night: 'Gợi ý nhẹ buổi đêm'
};

const REASON_MAP = {
  'Most ordered during morning hours': 'Được gọi nhiều trong buổi sáng',
  'Top trending refreshing choice this afternoon': 'Lựa chọn giải nhiệt được yêu thích',
  'Popular caffeine-free selection for the evening': 'Lựa chọn nhẹ, phù hợp buổi tối',
  'Light and refreshing choice for late night': 'Thanh mát, nhẹ bụng đêm muộn'
};

const getVietnameseTitle = (slotKey, bannerTitle) => {
  if (slotKey && SLOT_TITLE_MAP[slotKey]) return SLOT_TITLE_MAP[slotKey];
  if (bannerTitle) {
    if (bannerTitle.includes('Morning')) return 'Gợi ý buổi sáng';
    if (bannerTitle.includes('Afternoon')) return 'Gợi ý buổi chiều';
    if (bannerTitle.includes('Evening')) return 'Gợi ý buổi tối';
    if (bannerTitle.includes('Late Night')) return 'Gợi ý nhẹ buổi đêm';
  }
  return 'Gợi ý theo khung giờ';
};

const getVietnameseReason = (reason) => {
  return REASON_MAP[reason] || reason || 'Được nhiều khách lựa chọn trong khung giờ này';
};

const SlotRecommendationSection = ({ onAddToCart, testHour }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      // Xác định email: member đã đăng nhập → gửi email thật, guest → "Guest"
      const userEmail = localStorage.getItem('userEmail');
      const email = (userEmail && userEmail !== 'Guest') ? userEmail : 'Guest';

      let url = `${API_URL}/api/recommendations?email=${encodeURIComponent(email)}&topK=5`;
      if (testHour !== undefined && testHour !== null) {
        url += `&hour=${testHour}`;
      }
      const res = await axios.get(url);
      setData(res.data);
    } catch (err) {
      console.error('Lỗi khi tải gợi ý:', err);
      setError(err?.response?.data?.message || 'Không thể tải danh sách gợi ý.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [testHour]);

  // Lắng nghe sự kiện đăng nhập/đăng xuất để refresh recommendations
  useEffect(() => {
    const handleStorageChange = () => {
      fetchRecommendations();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 1. Trạng thái Loading
  if (loading) {
    return (
      <div className="slot-rec-section" data-testid="recommendation-loading">
        <div className="slot-rec-header">
          <div className="skeleton-pulse" style={{ width: '150px', height: '20px', borderRadius: '4px', backgroundColor: '#e8ded4', marginBottom: '6px' }}></div>
          <div className="skeleton-pulse" style={{ width: '220px', height: '14px', borderRadius: '4px', backgroundColor: '#f0e8e0' }}></div>
        </div>
        <div className="slot-rec-container">
          {[1, 2, 3].map((idx) => (
            <div key={`slot-skeleton-${idx}`} className="slot-rec-skeleton-card">
              <div className="skeleton-pulse" style={{ height: '110px', backgroundColor: '#e8ded4' }}></div>
              <div className="p-3">
                <div className="skeleton-pulse mb-2" style={{ height: '12px', width: '45%', borderRadius: '4px', backgroundColor: '#f0e8e0' }}></div>
                <div className="skeleton-pulse mb-3" style={{ height: '14px', width: '75%', borderRadius: '4px', backgroundColor: '#e8ded4' }}></div>
                <div className="d-flex justify-content-between align-items-center mt-3 pt-2">
                  <div className="skeleton-pulse" style={{ height: '16px', width: '40%', borderRadius: '4px', backgroundColor: '#e8ded4' }}></div>
                  <div className="skeleton-pulse" style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#e8ded4' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Trạng thái Lỗi
  if (error) {
    return (
      <div className="alert bg-white border-0 shadow-sm rounded-4 mb-3 text-center py-2 px-3 slot-rec-section" data-testid="recommendation-error">
        <p className="text-muted mb-1 small" style={{ fontSize: '0.82rem' }}>{error}</p>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-0"
          style={{ fontSize: '0.75rem' }}
          onClick={fetchRecommendations}
        >
          Thử lại
        </button>
      </div>
    );
  }

  // 3. Trạng thái Trống (Empty)
  const recommendations = data?.recommendations || [];
  if (recommendations.length === 0) {
    return (
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-3 bg-white text-center slot-rec-section" data-testid="recommendation-empty">
        <p className="text-muted mb-0 small" style={{ fontSize: '0.82rem' }}>
          {data?.message || 'Chưa có dữ liệu đặt món cho khung giờ này.'}
        </p>
      </div>
    );
  }

  // ── Xác định Layer: personalized (Layer 2) hay popularity (Layer 1) ──
  const isPersonalized = data?.type === 'PERSONALIZED_CONTENT_BASED';

  // Tiêu đề phụ thuộc vào Layer
  const sectionTitle = isPersonalized
    ? 'Gợi ý riêng cho bạn'
    : getVietnameseTitle(data.slotKey, data.bannerTitle);

  const sectionSubtitle = isPersonalized
    ? 'Dựa trên khẩu vị của bạn'
    : 'Được nhiều khách lựa chọn trong khung giờ này';

  // 4. Trạng thái Thành công (Success)
  return (
    <section className="slot-rec-section animate__animated animate__fadeIn" aria-label={sectionTitle} data-testid="recommendation-section">
      {/* Tiêu đề & Subtitle */}
      <div className="slot-rec-header">
        <h5 className="slot-rec-title">
          {sectionTitle}
        </h5>
        <p className="slot-rec-subtitle">
          {sectionSubtitle}
        </p>
      </div>

      {/* Danh sách thẻ món */}
      <div className="slot-rec-container" role="region" aria-label="Danh sách món gợi ý">
        {recommendations.map((item, index) => {
          const imageUrl = item.image ? `${API_URL}/images/${item.image}` : FALLBACK_IMAGE;
          const isTopItem = index === 0;

          return (
            <article
              key={`rec-${item.productId}`}
              className="slot-rec-card"
              onClick={() => navigate(`/product/${item.productId}`, {
                state: {
                  preferredSugar: isPersonalized ? data?.preferredSugar : undefined,
                  preferredIce: isPersonalized ? data?.preferredIce : undefined
                }
              })}
              aria-label={`${item.name} - ${item.category}`}
            >
              {/* Hình ảnh & Badge */}
              <div className="slot-rec-img-wrapper">
                {isTopItem && (
                  <span className="slot-rec-badge">
                    {isPersonalized ? 'Hợp gu' : 'Bán chạy'}
                  </span>
                )}
                <img
                  src={imageUrl}
                  alt={item.name}
                  className="slot-rec-img"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
              </div>

              {/* Thông tin món */}
              <div className="slot-rec-body">
                <div>
                  <div className="slot-rec-category text-truncate">
                    {item.category}
                  </div>
                  <h6 className="slot-rec-name">
                    {item.name}
                  </h6>
                  <div className="slot-rec-sold">
                    {isPersonalized
                      ? getVietnameseReason(item.reason)
                      : `${item.totalSoldInSlot} lượt trong khung giờ`
                    }
                  </div>
                </div>

                {/* Giá tiền và nút thêm vào giỏ */}
                <div className="slot-rec-footer">
                  <span className="slot-rec-price">
                    <PriceDisplay amount={item.price} />
                  </span>
                  <button
                    type="button"
                    className="slot-rec-btn-cart"
                    aria-label={`Thêm ${item.name} vào giỏ hàng`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddToCart) {
                        onAddToCart(e, {
                          _id: item.productId,
                          name: item.name,
                          price: item.price,
                          image: item.image,
                          category: item.category
                        });
                      }
                    }}
                  >
                    <i className="bi bi-plus fs-5"></i>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default SlotRecommendationSection;
