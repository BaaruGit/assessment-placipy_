import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock, Megaphone, Inbox } from 'lucide-react';

import { useNotifications } from '../../contexts/useNotifications';
import type { Notification } from '../../services/notification.service';
import Pagination from './Pagination';
import '../styles/Notifications.css';

type TabKey = 'all' | 'assessments' | 'results' | 'reminders' | 'general';

const PAGE_SIZE = 8;

const Notifications: React.FC = () => {
  const { notifications, markAllAsRead, removeNotification, loading } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [removedNotifications, setRemovedNotifications] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const getPriorityStyles = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return {
          color: 'var(--priority-high)',
          bg: 'var(--priority-high-bg)',
          borderColor: 'var(--priority-high)'
        };
      case 'medium':
        return {
          color: 'var(--priority-medium)',
          bg: 'var(--priority-medium-bg)',
          borderColor: 'var(--priority-medium)'
        };
      case 'low':
        return {
          color: 'var(--priority-low)',
          bg: 'var(--priority-low-bg)',
          borderColor: 'var(--priority-low)'
        };
      default:
        return {
          color: 'var(--priority-default)',
          bg: 'var(--priority-default-bg)',
          borderColor: 'var(--priority-default)'
        };
    }
  };

  const getIcon = (type: string, color: string) => {
    const size = 24;
    switch (type) {
      case 'assessment_published':
        return <AlertCircle size={size} color={color} />;
      case 'result_published':
        return <CheckCircle size={size} color={color} />;
      case 'reminder':
        return <Clock size={size} color={color} />;
      case 'announcement':
        return <Megaphone size={size} color={color} />;
      default:
        return <AlertCircle size={size} color={color} />;
    }
  };

  const getRelativeTime = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    if (isNaN(created)) return '';
    const diffMs = Date.now() - created;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  };

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    if (activeTab === 'all') filtered = notifications;
    else if (activeTab === 'assessments') {
      filtered = notifications.filter((n) => n.type === 'assessment_published');
    }
    else if (activeTab === 'results') {
      filtered = notifications.filter((n) => n.type === 'result_published');
    }
    else if (activeTab === 'general') {
      filtered = notifications.filter((n) => n.type === 'announcement');
    }
    else if (activeTab === 'reminders') {
      filtered = notifications.filter((n) => n.type === 'reminder');
    }

    // Filter out removed notifications
    return filtered.filter(notification => {
      const id = notification.SK ? String(notification.SK).replace('NOTIF#', '') : notification.createdAt;
      return !removedNotifications.has(id);
    });
  }, [notifications, activeTab, removedNotifications]);

  const handleView = (notification: Notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    const id = notification.SK ? String(notification.SK).replace('NOTIF#', '') : notification.createdAt;
    setRemovedNotifications(prev => new Set(prev).add(id));
    await removeNotification(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const [currentPage, setCurrentPage] = useState(1);
  const totalItems = filteredNotifications.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedNotifications = filteredNotifications.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  return (
    <div className="notifications-page-container">
      <div className="notifications-header">
        <h2>Notifications</h2>
        {notifications.length > 0 && (
          <button
            className="mark-all-btn"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="notifications-tabs">
        {(['all', 'assessments', 'results', 'reminders', 'general'] as TabKey[]).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="notifications-content">
        {loading && (
          <div className="notifications-empty">
            <div className="spinner">Loading...</div>
          </div>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <div className="notifications-empty">
            <Inbox className="empty-icon" />
            <p>No notifications found in this category.</p>
          </div>
        )}

        {!loading && filteredNotifications.length > 0 && (
          <div className="notifications-grid">
            {paginatedNotifications.map((notification, index) => {
              const isUnread = !notification.isRead;
              const priorityStyles = getPriorityStyles(notification.priority);
              const id = notification.SK || notification.createdAt;

              return (
                <div
                  key={`${id}-${index}`}
                  className={`notification-card ${isUnread ? 'unread' : ''}`}
                  // Use inline style for dynamic border color only for unread
                  style={isUnread ? { borderColor: 'transparent' } : {}}
                >
                  {isUnread && (
                    <style>{`
                                            .notification-card.unread:before {
                                                background-color: ${priorityStyles.borderColor};
                                            }
                                        `}</style>
                  )}

                  <div
                    className="notification-icon-wrapper"
                    style={{ backgroundColor: priorityStyles.bg }}
                  >
                    {getIcon(notification.type, priorityStyles.color)}
                  </div>

                  <div className="notification-content">
                    <div className="notification-header-row">
                      <h4 className="notification-title">
                        {notification.title}
                        {isUnread && <span className="unread-dot" style={{ backgroundColor: priorityStyles.borderColor }} />}
                      </h4>
                      <span className="notification-time">
                        {getRelativeTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="notification-message">
                      {notification.message}
                    </p>

                    <div className="notification-actions">
                      {notification.link && (
                        <button
                          className="action-btn action-btn-primary"
                          onClick={() => handleView(notification)}
                          style={{ color: priorityStyles.color, backgroundColor: priorityStyles.bg }}
                        >
                          View Details
                        </button>
                      )}
                      {isUnread && (
                        <button
                          className="action-btn action-btn-secondary"
                          onClick={() => handleMarkAsRead(notification)}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && totalItems > PAGE_SIZE && (
          <Pagination
            currentPage={safeCurrentPage}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
};

export default Notifications;