import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useNotifications } from '../../contexts/useNotifications';
import type { Notification } from '../../services/notification.service';
import Pagination from './Pagination';

type TabKey = 'all' | 'assessments' | 'results' | 'reminders' | 'general';

const PAGE_SIZE = 8;

const Notifications: React.FC = () => {
  const { notifications, markAllAsRead, removeNotification, loading } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [removedNotifications, setRemovedNotifications] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
      default:
        return '#6B7280';
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
    <div className="notifications-page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h2>Notifications</h2>
        {notifications.length > 0 && (
          <button
            className="mark-read-btn"
          onClick={handleMarkAllAsRead}
            style={{ padding: '6px 12px', fontSize: '14px' }}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
        </button>
        <button
          className={`tab-btn ${activeTab === 'assessments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assessments')}
        >
          Assessments
        </button>
        <button
          className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>

        <button
          className={`tab-btn ${activeTab === 'reminders' ? 'active' : ''}`}
          onClick={() => setActiveTab('reminders')}
        >
          Reminders
        </button>

        <button
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
      </div>

      <div className="tab-content">
        {loading && (
          <div className="notifications-list">
            <div className="notification-item">
              <div className="notification-content">
                <p>Loading notifications...</p>
              </div>
            </div>
          </div>
        )}

        {!loading && filteredNotifications.length === 0 && (
          <div className="notifications-list">
            <div className="notification-item">
              <div className="notification-content">
                <p>No notifications found in this category.</p>
              </div>
            </div>
          </div>
        )}

        {!loading && filteredNotifications.length > 0 && (
          <>
            <div className="notifications-list">
            {paginatedNotifications.map((notification, index) => {
              const borderColor = getPriorityColor(notification.priority);
              const isUnread = !notification.isRead;
            
              return (
                <div
                  key={`${notification.SK || notification.createdAt}-${notification.title}-${index}`}
                  className={`notification-item ${isUnread ? 'unread' : ''}`}
                  style={
                    {
                      borderLeft: `4px solid ${borderColor}`,
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }
                  }
                >
                  <div className="notification-content" style={{ flex: 1 }}>
                    <h4 style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{notification.title}</span>
                      {isUnread && (
                        <span className="unread-indicator" style={{ fontSize: '11px' }}>
                          Unread
                        </span>
                      )}
                    </h4>
                    <p style={{ marginTop: 0, marginBottom: '4px' }}>{notification.message}</p>
                    <div
                      className="notification-meta"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span className="time">{getRelativeTime(notification.createdAt)}</span>
                      <div className="notification-actions" style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="mark-read-btn"
                          onClick={() => handleView(notification)}
                          style={{ padding: '4px 10px', fontSize: '13px' }}
                        >
                          View
                        </button>
                        {isUnread && (
                          <button
                            className="mark-read-btn"
                            onClick={() => handleMarkAsRead(notification)}
                            style={{ padding: '4px 10px', fontSize: '13px' }}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={safeCurrentPage}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;