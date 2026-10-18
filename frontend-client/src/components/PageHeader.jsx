import React from 'react';
import { useNavigate } from 'react-router-dom';

const PageHeader = ({
    title,
    subtitle,
    onBack,
    showBack = true,
    rightAction,
    className = '',
    ...props
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <header className={`cafe-page-header ${className}`.trim()} {...props}>
            {showBack && (
                <button
                    type="button"
                    onClick={handleBack}
                    className="cafe-back-btn"
                    aria-label="Quay lại"
                >
                    <i className="bi bi-chevron-left"></i>
                </button>
            )}
            <div className="cafe-page-header-text">
                <h1 className="cafe-page-title">{title}</h1>
                {subtitle && <p className="cafe-page-subtitle">{subtitle}</p>}
            </div>
            {rightAction && (
                <div className="cafe-page-header-right">
                    {rightAction}
                </div>
            )}
        </header>
    );
};

export default PageHeader;
