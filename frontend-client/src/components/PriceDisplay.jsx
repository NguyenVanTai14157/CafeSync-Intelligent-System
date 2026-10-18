import React from 'react';

export const formatPrice = (amount) => {
    const num = Number(amount) || 0;
    return num.toLocaleString('vi-VN');
};

const PriceDisplay = ({
    amount,
    price,
    suffix = 'đ',
    className = '',
    style = {},
    ...props
}) => {
    const value = amount !== undefined ? amount : price;
    return (
        <span
            className={`cafe-price-display ${className}`.trim()}
            style={style}
            {...props}
        >
            {formatPrice(value)}{suffix}
        </span>
    );
};

export default PriceDisplay;
