import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProductImage from './ProductImage';
import PriceDisplay from './PriceDisplay';

const ProductCard = ({
    product,
    onClick,
    isFavorite,
    onToggleFavorite,
    onAdd,
    badge,
    subLabel,
    className = '',
    ...props
}) => {
    const navigate = useNavigate();

    if (!product) return null;

    const categoryName = typeof product.category === 'object'
        ? product.category?.name
        : product.category;

    const handleCardClick = () => {
        if (onClick) {
            onClick(product);
        } else {
            navigate(`/product/${product._id}`);
        }
    };

    const handleFavClick = (e) => {
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }
        if (onToggleFavorite) {
            onToggleFavorite(e, product);
        }
    };

    const handleAddClick = (e) => {
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }
        if (onAdd) {
            onAdd(e, product);
        } else {
            navigate(`/product/${product._id}`);
        }
    };

    return (
        <article
            className={`cafe-product-card ${className}`.trim()}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick();
                }
            }}
            {...props}
        >
            <div className="cafe-card-media">
                <ProductImage
                    src={product.image}
                    alt={product.name}
                    className="cafe-card-image"
                />
                {badge && (
                    <span className="cafe-card-badge">{badge}</span>
                )}
                {onToggleFavorite && (
                    <button
                        type="button"
                        className="cafe-card-fav-btn"
                        onClick={handleFavClick}
                        aria-label={isFavorite ? `Bỏ thích ${product.name}` : `Yêu thích ${product.name}`}
                    >
                        <i className={`bi ${isFavorite ? 'bi-heart-fill is-active' : 'bi-heart'}`}></i>
                    </button>
                )}
            </div>

            <div className="cafe-card-content">
                <div className="cafe-card-info">
                    {categoryName && (
                        <span className="cafe-card-category">{categoryName}</span>
                    )}
                    <h3 className="cafe-card-name">{product.name}</h3>
                    {subLabel && (
                        <span className="cafe-card-sublabel">{subLabel}</span>
                    )}
                </div>

                <div className="cafe-card-footer">
                    <PriceDisplay price={product.price} className="cafe-card-price" />
                    <button
                        type="button"
                        className="cafe-card-add-btn"
                        onClick={handleAddClick}
                        aria-label={`Chọn món ${product.name}`}
                    >
                        <i className="bi bi-plus-lg"></i>
                    </button>
                </div>
            </div>
        </article>
    );
};

export default ProductCard;
