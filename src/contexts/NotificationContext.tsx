import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Notification } from '../services/notification.service';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    lastNotificationId: string | null;
    // Add method to add temporary notifications
    addTemporaryNotification: (notification: Omit<Notification, 'createdAt' | 'isRead' | 'SK' | 'PK'>) => void;
    addNotification: (notification: Omit<Notification, 'createdAt' | 'isRead' | 'SK' | 'PK'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
export { NotificationContext };

interface NotificationProviderProps {
    children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const reminderIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const popupShownRef = useRef<Set<string>>(new Set());
    const tempNotificationsRef = useRef<Notification[]>([]);
    const sessionIdRef = useRef<string>('');

    const STORAGE_NOTIFS = 'student_local_notifications';
    const STORAGE_UPCOMING = 'student_upcoming_assessments';

    const loadStoredNotifications = (): Notification[] => {
        try {
            const raw = localStorage.getItem(STORAGE_NOTIFS);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return [];
            return arr;
        } catch (e) {
            console.error('Failed to parse local notifications', e);
            return [];
        }
    };

    const saveStoredNotifications = (arr: Notification[]) => {
        try {
            localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(arr.slice(0, 200)));
        } catch (e) {
            console.error('Failed to save local notifications', e);
        }
    };

    // Add temporary notification (not stored in DB)
    const addTemporaryNotification = useCallback((notificationData: Omit<Notification, 'createdAt' | 'isRead' | 'SK' | 'PK'>) => {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 9);
        const tempNotification: Notification = {
            ...notificationData,
            createdAt: new Date().toISOString(),
            isRead: false,
            SK: `TEMP_NOTIF#${timestamp}-${randomSuffix}`,
            PK: 'TEMP'
        };
        const current = [tempNotification, ...loadStoredNotifications()];
        saveStoredNotifications(current);
        tempNotificationsRef.current = current;
        setNotifications(current);
        setUnreadCount(current.filter(n => !n.isRead).length);
        window.dispatchEvent(new CustomEvent('newNotification', { detail: tempNotification }));
        return tempNotification;
    }, []);

    const addNotification = useCallback((notificationData: Omit<Notification, 'createdAt' | 'isRead' | 'SK' | 'PK'>) => {
        return addTemporaryNotification(notificationData);
    }, [addTemporaryNotification]);

    // Fetch notifications (will return empty since we're not storing in DB)
    const fetchNotifications = useCallback(async () => {
        try {
            // Since notifications are not stored in DB, we'll use temporary notifications
            const tempNotifications = loadStoredNotifications();
            
            // Sort by createdAt descending (newest first)
            const sortedNotifications = [...tempNotifications].sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA;
            });

            // Check for new notifications
            if (lastNotificationId && sortedNotifications.length > 0) {
                const newestId = sortedNotifications[0].SK || sortedNotifications[0].createdAt;
                if (newestId !== lastNotificationId) {
                    // Find new notifications
                    const newNotifications = sortedNotifications.filter(notif => {
                        const notifId = notif.SK || notif.createdAt;
                        return notifId !== lastNotificationId && !notif.isRead && !popupShownRef.current.has(notifId);
                    });

                    // Show popup for new unread notifications
                    if (newNotifications.length > 0) {
                        const newest = newNotifications[0];
                        const notifId = newest.SK || newest.createdAt;
                        if (!popupShownRef.current.has(notifId)) {
                            popupShownRef.current.add(notifId);
                            // Trigger popup event
                            window.dispatchEvent(new CustomEvent('newNotification', { detail: newest }));
                        }
                    }
                }
            } else if (sortedNotifications.length > 0) {
                // First load - set last notification ID
                const newestId = sortedNotifications[0].SK || sortedNotifications[0].createdAt;
                setLastNotificationId(newestId);
            }

            setNotifications(sortedNotifications);
            setUnreadCount(sortedNotifications.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [lastNotificationId]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            const updated = loadStoredNotifications().map(notif => {
                if (notif.SK === notificationId) {
                    return { ...notif, isRead: true };
                }
                return notif;
            });
            saveStoredNotifications(updated);
            tempNotificationsRef.current = updated;
            setNotifications(updated);
            setUnreadCount(updated.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            const updated = loadStoredNotifications().map(notif => ({ ...notif, isRead: true }));
            saveStoredNotifications(updated);
            tempNotificationsRef.current = updated;
            setNotifications(updated);
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }, []);

    // Initialize session and load notifications
    useEffect(() => {
        let sid = localStorage.getItem('notif_session_id');
        if (!sid) {
            sid = String(Date.now());
            localStorage.setItem('notif_session_id', sid);
        }
        sessionIdRef.current = sid;
        fetchNotifications();
    }, []);

    // Poll for new notifications every 20 seconds
    useEffect(() => {
        pollingIntervalRef.current = setInterval(() => {
            fetchNotifications();
        }, 20000); // 20 seconds

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [fetchNotifications]);

    // Reminder checking every 1 minute
    useEffect(() => {
        const makeKey = (assessmentId: string, minutes: number) => `notif_reminder_${assessmentId}_${minutes}_${sessionIdRef.current}`;
        const shouldFire = (key: string) => !localStorage.getItem(key);
        const markFired = (key: string) => localStorage.setItem(key, '1');

        const checkReminders = () => {
            try {
                const raw = localStorage.getItem(STORAGE_UPCOMING);
                if (!raw) return;
                const arr = JSON.parse(raw) as Array<{ assessmentId: string; scheduledAt: string }>;
                if (!Array.isArray(arr)) return;
                const now = Date.now();
                arr.forEach(item => {
                    if (!item || !item.assessmentId || !item.scheduledAt) return;
                    const target = new Date(item.scheduledAt).getTime();
                    const diffMin = Math.floor((target - now) / 60000);
                    [10, 5, 1].forEach(m => {
                        if (diffMin === m) {
                            const key = makeKey(item.assessmentId, m);
                            if (shouldFire(key)) {
                                markFired(key);
                                addNotification({
                                    type: 'reminder',
                                    title: m === 10 ? 'Test starts in 10 minutes' : m === 5 ? 'Test starts in 5 minutes' : 'Test starts in 1 minute',
                                    message: 'Get ready to begin your assessment.',
                                    link: `/student/assessments`,
                                    priority: 'high'
                                });
                            }
                        }
                    });
                });
            } catch (e) {
                console.error('Reminder check failed', e);
            }
        };

        checkReminders();
        reminderIntervalRef.current = setInterval(checkReminders, 60000);
        return () => {
            if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
        };
    }, [addNotification]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                fetchNotifications,
                markAsRead,
                markAllAsRead,
                lastNotificationId,
                addTemporaryNotification,
                addNotification
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

