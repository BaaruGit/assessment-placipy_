import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle, CheckCircle, Megaphone, Clock } from 'lucide-react';
import type { Notification } from '../../services/notification.service';
import '../styles/Notifications.css';

interface NotificationPopupProps {
    notification: Notification;
    onClose: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({ notification, onClose }) => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);
    const [isClosing, setIsClosing] = useState(false);

    // Auto-hide after 4 seconds (slightly longer to read)
    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            onClose();
        }, 300); // Match CSS animation duration
    };

    const handleClick = () => {
        if (notification.link) {
            navigate(notification.link);
            onClose();
        }
    };

    // Get priority styles
    const getPriorityStyles = () => {
        switch (notification.priority) {
            case 'high':
                return {
                    color: 'var(--priority-high)',
                    bg: 'var(--priority-high-bg)'
                };
            case 'medium':
                return {
                    color: 'var(--priority-medium)',
                    bg: 'var(--priority-medium-bg)'
                };
            case 'low':
                return {
                    color: 'var(--priority-low)',
                    bg: 'var(--priority-low-bg)'
                };
            default:
                return {
                    color: 'var(--priority-default)',
                    bg: 'var(--priority-default-bg)'
                };
        }
    };

    const styles = getPriorityStyles();

    // Get icon based on type
    const getIcon = () => {
        const iconSize = 20;
        const color = styles.color;
        
        switch (notification.type) {
            case 'assessment_published':
                return <AlertCircle size={iconSize} color={color} />;
            case 'result_published':
                return <CheckCircle size={iconSize} color={color} />;
            case 'reminder':
                return <Clock size={iconSize} color={color} />;
            case 'announcement':
                return <Megaphone size={iconSize} color={color} />;
            default:
                return <AlertCircle size={iconSize} color={color} />;
        }
    };

    if (!isVisible) return null;

    return (
        <div className="notification-popup-container">
            <div 
                className={`notification-popup ${isClosing ? 'slide-out' : ''}`}
                onClick={handleClick}
                style={{ borderLeftColor: styles.color }}
            >
                <div 
                    className="notification-popup-icon"
                    style={{ backgroundColor: styles.bg }}
                >
                    {getIcon()}
                </div>
                
                <div className="notification-popup-body">
                    <div className="notification-popup-header">
                        <h4 className="notification-popup-title">
                            {notification.title}
                        </h4>
                        <button 
                            className="notification-popup-close"
                            onClick={handleClose}
                            aria-label="Close notification"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    
                    <p className="notification-popup-message">
                        {notification.message}
                    </p>
                    
                    {notification.link && (
                        <span 
                            className="notification-popup-link"
                            style={{ color: styles.color }}
                        >
                            View Details →
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPopup;

