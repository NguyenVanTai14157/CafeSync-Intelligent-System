import React from 'react';

const QuantityStepper = ({
    quantity = 1,
    onIncrease,
    onDecrease,
    min = 1,
    max = 99,
    size = 'md',
    className = '',
    ariaLabelPrefix = 'số lượng',
    ...props
}) => {
    return (
        <div
            className={`cafe-quantity-stepper cafe-stepper-${size} ${className}`.trim()}
            {...props}
        >
            <button
                type="button"
                className="cafe-stepper-btn cafe-stepper-minus"
                onClick={onDecrease}
                disabled={quantity <= min}
                aria-label={`Giảm ${ariaLabelPrefix}`}
            >
                −
            </button>
            <span className="cafe-stepper-value" aria-live="polite">
                {quantity}
            </span>
            <button
                type="button"
                className="cafe-stepper-btn cafe-stepper-plus"
                onClick={onIncrease}
                disabled={quantity >= max}
                aria-label={`Tăng ${ariaLabelPrefix}`}
            >
                +
            </button>
        </div>
    );
};

export default QuantityStepper;
