import React, { useState } from 'react';
import API_URL from '../config';

const FALLBACK_IMAGE = '/fallback-product.svg';

export const getProductImageUrl = (image) => {
    if (!image) return FALLBACK_IMAGE;
    if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('/'))) {
        return image;
    }
    return `${API_URL}/images/${image}`;
};

const ProductImage = ({
    src,
    alt = 'Sản phẩm CaféSync',
    className = '',
    style = {},
    loading = 'lazy',
    ...props
}) => {
    const [imgSrc, setImgSrc] = useState(getProductImageUrl(src));

    // Cập nhật khi prop src thay đổi
    React.useEffect(() => {
        setImgSrc(getProductImageUrl(src));
    }, [src]);

    const handleError = () => {
        if (imgSrc !== FALLBACK_IMAGE) {
            setImgSrc(FALLBACK_IMAGE);
        }
    };

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={`cafe-product-img ${className}`.trim()}
            style={style}
            loading={loading}
            onError={handleError}
            {...props}
        />
    );
};

export default ProductImage;
