import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle, CheckCircle, Megaphone } from 'lucide-react';
import type { Notification } from '../../services/notification.service';

interface NotificationPopupProps {
    notification: Notification;
    onClose: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({ notification, onClose }) => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);

    // Auto-hide after 4 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade out animation
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    // Get priority colors
    const getPriorityStyles = () => {
        switch (notification.priority) {
            case 'high':
                return {
                    backgroundColor: '#FEE2E2',
                    borderColor: '#EF4444',
                    iconColor: '#EF4444'
                };
            case 'medium':
                return {
                    backgroundColor: '#FEF3C7',
                    borderColor: '#F59E0B',
                    iconColor: '#F59E0B'
                };
            case 'low':
                return {
                    backgroundColor: '#DBEAFE',
                    borderColor: '#3B82F6',
                    iconColor: '#3B82F6'
                };
            default:
                return {
                    backgroundColor: '#F3F4F6',
                    borderColor: '#6B7280',
                    iconColor: '#6B7280'
                };
        }
    };

    // Get icon based on type
    const getIcon = () => {
        switch (notification.type) {
            case 'assessment_published':
                return <AlertCircle size={20} color={getPriorityStyles().iconColor} />;
            case 'result_published':
                return <CheckCircle size={20} color={getPriorityStyles().iconColor} />;

            case 'announcement':
                return <Megaphone size={20} color={getPriorityStyles().iconColor} />;
            default:
                return <AlertCircle size={20} color={getPriorityStyles().iconColor} />;
        }
    };

    const styles = getPriorityStyles();

    const handleClick = () => {
        if (notification.link) {
            navigate(notification.link);
        }
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                width: '350px',
                maxWidth: '90vw',
                backgroundColor: styles.backgroundColor,
                border: `2px solid ${styles.borderColor}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10000,
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(400px)',
                transition: 'all 0.3s ease',
                cursor: notification.link ? 'pointer' : 'default'
            }}
            onClick={handleClick}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                    {getIcon()}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ 
                            margin: 0, 
                            fontSize: '16px', 
                            fontWeight: 600, 
                            color: '#111827' 
                        }}>
                            {notification.title}
                        </h4>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsVisible(false);
                                setTimeout(onClose, 300);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                            }}
                        >
                            <X size={16} color="#6B7280" />
                        </button>
                    </div>
                    <p style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        color: '#374151',
                        lineHeight: '1.5'
                    }}>
                        {notification.message}
                    </p>
                    {notification.link && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: styles.iconColor, fontWeight: 500 }}>
                            Click to view →
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationPopup;

