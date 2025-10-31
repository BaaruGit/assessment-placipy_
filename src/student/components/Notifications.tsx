import React, { useState } from 'react';

const Notifications: React.FC = () => {
  const [activeTab, setActiveTab] = useState('alerts');
  
  // Mock notifications data
  const alerts = [
    { id: 1, title: 'New Assessment Available', message: 'Mathematics Quiz is now available. Deadline: 2025-11-15', time: '2 hours ago', unread: true },
    { id: 2, title: 'Results Published', message: 'Your Physics Test results are now available.', time: '1 day ago', unread: true },
    { id: 3, title: 'System Maintenance', message: 'Scheduled maintenance on Sunday 2 AM - 4 AM.', time: '3 days ago', unread: false },
  ];

  const announcements = [
    { id: 1, title: 'College Fest Announcement', message: 'Annual college fest will be held on December 15th.', time: '1 week ago', author: 'Admin' },
    { id: 2, title: 'Library Hours Extended', message: 'Library will be open until 10 PM during exam weeks.', time: '2 weeks ago', author: 'Librarian' },
  ];

  const messages = [
    { id: 1, sender: 'Dr. Smith', title: 'Regarding Mathematics Quiz', message: 'Please review the quiz instructions carefully.', time: '1 day ago', unread: true },
    { id: 2, sender: 'Placement Officer', title: 'Internship Opportunities', message: 'New internship opportunities posted on the portal.', time: '3 days ago', unread: false },
  ];

  const markAsRead = (id: number) => {
    // In a real app, this would update the notification status
    alert(`Marked notification #${id} as read`);
  };

  const deleteNotification = (id: number) => {
    // In a real app, this would delete the notification
    alert(`Deleted notification #${id}`);
  };

  return (
    <div className="notifications-page">
      <h2>Notifications</h2>
      
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          Alerts
        </button>
        <button 
          className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          Announcements
        </button>
        <button 
          className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'alerts' && (
          <div className="alerts-tab">
            <h3>Assessment Alerts</h3>
            <div className="notifications-list">
              {alerts.map(alert => (
                <div key={alert.id} className={`notification-item ${alert.unread ? 'unread' : ''}`}>
                  <div className="notification-content">
                    <h4>{alert.title}</h4>
                    <p>{alert.message}</p>
                    <div className="notification-meta">
                      <span className="time">{alert.time}</span>
                      {alert.unread && <span className="unread-indicator">Unread</span>}
                    </div>
                  </div>
                  <div className="notification-actions">
                    {alert.unread && (
                      <button 
                        className="mark-read-btn"
                        onClick={() => markAsRead(alert.id)}
                      >
                        Mark as Read
                      </button>
                    )}
                    <button 
                      className="delete-btn"
                      onClick={() => deleteNotification(alert.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="announcements-tab">
            <h3>College-wide Announcements</h3>
            <div className="notifications-list">
              {announcements.map(announcement => (
                <div key={announcement.id} className="notification-item">
                  <div className="notification-content">
                    <h4>{announcement.title}</h4>
                    <p>{announcement.message}</p>
                    <div className="notification-meta">
                      <span className="time">{announcement.time}</span>
                      <span className="author">By {announcement.author}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="messages-tab">
            <h3>Messages from Staff</h3>
            <div className="notifications-list">
              {messages.map(message => (
                <div key={message.id} className={`notification-item ${message.unread ? 'unread' : ''}`}>
                  <div className="notification-content">
                    <h4>{message.title}</h4>
                    <p><strong>From: {message.sender}</strong></p>
                    <p>{message.message}</p>
                    <div className="notification-meta">
                      <span className="time">{message.time}</span>
                      {message.unread && <span className="unread-indicator">Unread</span>}
                    </div>
                  </div>
                  <div className="notification-actions">
                    {message.unread && (
                      <button 
                        className="mark-read-btn"
                        onClick={() => markAsRead(message.id)}
                      >
                        Mark as Read
                      </button>
                    )}
                    <button 
                      className="delete-btn"
                      onClick={() => deleteNotification(message.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;