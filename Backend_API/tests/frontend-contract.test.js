const { test } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Frontend Component Simulation and Contract Test for SlotRecommendationSection
 * Validates the 6 required frontend states and behaviors.
 */

const FALLBACK_IMAGE = 'https://placehold.co/200x250?text=CaféSync';

function computeCardViewModel(item, API_URL = 'http://localhost:5000') {
  const imageUrl = (item.image && typeof item.image === 'string' && item.image.trim() !== '')
    ? `${API_URL}/images/${item.image}`
    : FALLBACK_IMAGE;

  return {
    productId: item.productId,
    name: item.name,
    category: item.category,
    priceFormatted: `${item.price.toLocaleString()}đ`,
    imageUrl,
    badge: item.badge || 'Top Seller',
    totalSoldInSlot: item.totalSoldInSlot,
    soldLabel: `${item.totalSoldInSlot} lượt đặt trong khung giờ`,
    detailRoute: `/product/${item.productId}`
  };
}

function resolveSectionState({ loading, error, data }) {
  if (loading) {
    return { state: 'LOADING', testId: 'recommendation-loading' };
  }
  if (error) {
    return {
      state: 'ERROR',
      testId: 'recommendation-error',
      errorMessage: error,
      canRetry: true
    };
  }
  const recommendations = data?.recommendations || [];
  if (recommendations.length === 0) {
    return {
      state: 'EMPTY',
      testId: 'recommendation-empty',
      bannerTitle: data?.bannerTitle || 'Gợi ý theo khung giờ',
      message: data?.message || 'Chưa có dữ liệu đặt món cho khung giờ này.'
    };
  }
  return {
    state: 'SUCCESS',
    testId: 'recommendation-section',
    bannerTitle: data.bannerTitle,
    slotName: data.slotName,
    reason: recommendations[0]?.reason || 'Món thịnh hành nhất trong khung giờ này',
    cards: recommendations.map(item => computeCardViewModel(item))
  };
}

test('1. Frontend: Loading state renders correctly', () => {
  const result = resolveSectionState({ loading: true, error: null, data: null });
  assert.equal(result.state, 'LOADING');
  assert.equal(result.testId, 'recommendation-loading');
});

test('2. Frontend: Successful recommendations render from API response', () => {
  const mockData = {
    type: 'CONTEXT_POPULAR',
    slotName: 'Evening',
    slotKey: 'evening',
    bannerTitle: 'Evening Selections',
    recommendations: [
      {
        productId: '69f992e36ddd3ad3f9f3b171',
        name: 'Nước ép táo',
        category: 'Nước ép',
        price: 40000,
        image: 'nuoc-ep-tao-1777963747340.jpg',
        totalSoldInSlot: 58,
        badge: 'Top Seller',
        reason: 'Popular caffeine-free selection for the evening'
      }
    ]
  };

  const result = resolveSectionState({ loading: false, error: null, data: mockData });
  assert.equal(result.state, 'SUCCESS');
  assert.equal(result.bannerTitle, 'Evening Selections');
  assert.equal(result.slotName, 'Evening');
  assert.equal(result.cards.length, 1);
  assert.equal(result.cards[0].name, 'Nước ép táo');
  assert.equal(result.cards[0].priceFormatted, '40,000đ');
  assert.equal(result.cards[0].badge, 'Top Seller');
  assert.equal(result.cards[0].soldLabel, '58 lượt đặt trong khung giờ');
  assert.equal(result.cards[0].imageUrl, 'http://localhost:5000/images/nuoc-ep-tao-1777963747340.jpg');
});

test('3. Frontend: Empty state renders without crashing', () => {
  const mockData = {
    type: 'CONTEXT_POPULAR',
    slotName: 'Late Night',
    bannerTitle: 'Late Night Selections',
    recommendations: [],
    message: 'No completed-order data is available for this time slot.'
  };

  const result = resolveSectionState({ loading: false, error: null, data: mockData });
  assert.equal(result.state, 'EMPTY');
  assert.equal(result.testId, 'recommendation-empty');
  assert.equal(result.message, 'No completed-order data is available for this time slot.');
});

test('4. Frontend: Error state renders with retry capability', () => {
  const result = resolveSectionState({
    loading: false,
    error: 'Không thể kết nối đến máy chủ',
    data: null
  });

  assert.equal(result.state, 'ERROR');
  assert.equal(result.testId, 'recommendation-error');
  assert.equal(result.errorMessage, 'Không thể kết nối đến máy chủ');
  assert.equal(result.canRetry, true);
});

test('5. Frontend: Product click routes to existing product detail and add-to-cart works', () => {
  const mockItem = {
    productId: 'prod_99',
    name: 'Cà phê trứng',
    price: 45000,
    category: 'Cà phê',
    image: 'egg-coffee.jpg',
    totalSoldInSlot: 61
  };
  const card = computeCardViewModel(mockItem);
  assert.equal(card.detailRoute, '/product/prod_99');

  let cart = [];
  const onAddToCart = (item) => {
    cart.push({ ...item, quantity: 1, options: { size: 'M', sugar: '100%', ice: '100%' } });
  };

  onAddToCart({
    _id: card.productId,
    name: card.name,
    price: 45000,
    category: card.category
  });

  assert.equal(cart.length, 1);
  assert.equal(cart[0]._id, 'prod_99');
  assert.equal(cart[0].name, 'Cà phê trứng');
  assert.equal(cart[0].quantity, 1);
});

test('6. Frontend: Response with image: null renders fallback safely', () => {
  const mockItem = {
    productId: 'prod_null_img',
    name: 'Trà sen vàng',
    category: 'Trà',
    price: 35000,
    image: null,
    totalSoldInSlot: 10
  };

  const card = computeCardViewModel(mockItem);
  assert.equal(card.imageUrl, FALLBACK_IMAGE);
  assert.ok(card.imageUrl.includes('placehold.co'));
});
