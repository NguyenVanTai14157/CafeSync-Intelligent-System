import React from 'react';
import { Link } from 'react-router-dom';

const EmptyState = ({
    icon = 'bi-inbox',
    title = 'Chưa có dữ liệu',
    description,
    actionText,
    onAction,
    actionHref,
    className = '',
    ...props
}) => {
    return (
        <div className={`cafe-empty-state ${className}`.trim()} {...props}>
            <div className="cafe-empty-icon-wrap" aria-hidden="true">
                {typeof icon === 'string' ? <i className={`bi ${icon}`}></i> : icon}
            </div>
            <h2 className="cafe-empty-title">{title}</h2>
            {description && <p className="cafe-empty-desc">{description}</p>}
            {actionText && (
                actionHref ? (
                    <Link to={actionHref} className="cafe-btn-primary cafe-empty-action">
                        {actionText}
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={onAction}
                        className="cafe-btn-primary cafe-empty-action"
                    >
                        {actionText}
                    </button>
                )
            )}
        </div>
    );
};

export default EmptyState;
