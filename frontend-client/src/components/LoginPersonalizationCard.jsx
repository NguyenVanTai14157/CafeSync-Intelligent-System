import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * LoginPersonalizationCard
 * Warm Modern Café invitation card blending seamlessly with Home page styling.
 * Soft cream & light caramel background with an espresso title and a compact right-side coffee vignette.
 */
const LoginPersonalizationCard = ({ isLoggedIn }) => {
  const navigate = useNavigate();

  // Check login state via prop or localStorage
  const hasUser = isLoggedIn ?? !!(
    localStorage.getItem('userToken') ||
    localStorage.getItem('userName') ||
    (localStorage.getItem('userEmail') && localStorage.getItem('userEmail') !== 'Guest')
  );

  // Behavior 1: Completely hide the card for logged-in users to avoid redundancy
  if (hasUser) {
    return null;
  }

  return (
    <section
      className="login-personalization-card"
      aria-label="Cá nhân hóa trải nghiệm gọi món"
    >
      {/* Decorative subtle latte art concentric rings */}
      <svg
        className="login-personalization-card-accent-rings"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="140" cy="20" r="90" stroke="rgba(196, 151, 106, 0.15)" strokeWidth="1.5" />
        <circle cx="140" cy="20" r="60" stroke="rgba(196, 151, 106, 0.2)" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="140" cy="20" r="30" stroke="rgba(196, 151, 106, 0.25)" strokeWidth="1.5" />
      </svg>

      <div className="login-personalization-card-layout">
        {/* Left Column: Text & CTA */}
        <div className="login-personalization-card-main-col">
          <div className="login-personalization-card-badge">
            <span className="login-personalization-badge-dot"></span>
            <span>Cá nhân hóa trải nghiệm gọi món</span>
          </div>

          <h3 className="login-personalization-card-title">
            Gọi món hợp gu hơn
          </h3>

          <p className="login-personalization-card-desc">
            Đăng nhập để CaféSync ghi nhớ khẩu vị và gợi ý món phù hợp với bạn hơn.
          </p>

          <div className="login-personalization-card-action-row">
            <button
              type="button"
              className="login-personalization-card-btn"
              onClick={() => navigate('/login')}
            >
              <span>Đăng nhập</span>
              <i className="bi bi-arrow-right"></i>
            </button>
            <span className="login-personalization-card-subtext">
              Bạn vẫn có thể gọi món mà không cần đăng nhập.
            </span>
          </div>
        </div>

        {/* Right Column: Elegant Compact Coffee Vignette */}
        <div className="login-personalization-card-visual" aria-hidden="true">
          <div className="login-personalization-visual-frame">
            <img
              src="/auth-hero.jpg"
              alt=""
              className="login-personalization-visual-img"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/fallback-product.svg';
              }}
            />
            <div className="login-personalization-visual-glow"></div>
            <div className="login-personalization-visual-cup-badge">
              <i className="bi bi-cup-hot-fill"></i>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPersonalizationCard;
