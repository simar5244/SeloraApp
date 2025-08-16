'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaBell as FaSolidBell, FaCheck, FaTrash, FaCheckDouble, FaProjectDiagram, FaUsers, FaExclamationTriangle } from 'react-icons/fa';
import { FaRegBell } from 'react-icons/fa';
import { FiCheck, FiTrash2, FiX } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

// Define notification type
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'project' | 'employee';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationCenterProps {
  onNavigate?: (path: string) => void;
}

export default function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(5);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/notifications', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }
        
        const data = await response.json();
        const items = Array.isArray(data.notifications) ? data.notifications : [];
        const normalized: Notification[] = items.map((n: any) => ({
          id: String(n.id || n._id),
          title: n.title || 'Notification',
          message: n.message || '',
          type: (n.type || 'info') as Notification['type'],
          isRead: Boolean(n.isRead),
          createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date(n.createdAt).toISOString(),
          link: n.link || undefined,
        }));

        setNotifications(normalized);
        setUnreadCount(normalized.filter((notification: Notification) => !notification.isRead).length);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications');
        
        // Use demo notifications for development
        const demoNotifications = getDemoNotifications();
        setNotifications(demoNotifications);
        setUnreadCount(demoNotifications.filter(notification => !notification.isRead).length);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
    
    // Poll for new notifications frequently
    const intervalId = setInterval(fetchNotifications, 20000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Mark a notification as read
  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/notifications/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'markAsRead', ids: [id] }),
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      // Update unread count
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };
  
  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const ids = notifications.map(n => n.id).filter(Boolean);
      if (ids.length > 0) {
        await fetch('/api/notifications', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ ids }),
        });
      }
      
      // Update local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };
  
  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.link) {
      if (onNavigate) onNavigate(notification.link);
      else window.location.href = notification.link;
      setShowNotifications(false);
    }
  };
  
  // Get icon based on notification type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return <FaBell className="text-blue-500" />;
      case 'success':
        return <FaCheck className="text-green-500" />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500" />;
      case 'error':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'project':
        return <FaProjectDiagram className="text-purple-500" />;
      case 'employee':
        return <FaUsers className="text-indigo-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };
  
  // Demo notifications for development/testing
  const getDemoNotifications = (): Notification[] => {
    return [
      {
        id: '1',
        title: 'New Project Created',
        message: 'Mobile App Redesign project has been created and assigned to your team.',
        type: 'project',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        link: '/dashboard/projects/1'
      },
      {
        id: '2',
        title: 'New Team Member',
        message: 'Sarah Johnson has joined the Engineering department.',
        type: 'employee',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        link: '/dashboard/employees/E001'
      },
      {
        id: '3',
        title: 'Project Update',
        message: 'Customer Dashboard is now 75% complete. 3 tasks remaining.',
        type: 'project',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        link: '/dashboard/projects/2'
      },
      {
        id: '4',
        title: 'Warning: Overutilized Resources',
        message: '3 employees have been working more than 45 hours per week.',
        type: 'warning',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
        link: '/dashboard'
      }
    ];
  };
  
  // Format timestamp to relative time
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'some time ago';
    }
  };

  
  // Reset visible slice when opening panel or when list changes length
  useEffect(() => {
    if (showNotifications) setVisibleCount(5);
  }, [showNotifications, notifications.length]);

  return (
    <div className="relative inline-block text-left">
      {/* Floating button */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(prev => !prev)}
          className="relative flex items-center justify-center w-10 h-10 md:w-10 md:h-10 rounded-full bg-white text-purple-600 border border-purple-200 shadow-lg hover:shadow-xl hover:bg-purple-50 transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none overflow-hidden"
          aria-label="Notifications"
        >
          <FaRegBell className="h-5 w-5" />
        </button>
        {/* Unread indicator (dot) */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-purple-600 ring-2 ring-white shadow-sm"
            aria-label="Unread notifications indicator"
          />
        )}
        {/* Tooltip */}
        <div className="absolute right-0 mt-2 opacity-0 hover:opacity-100 focus-within:opacity-100 transition pointer-events-none">
          <div className="bg-gray-900/90 text-white text-[11px] px-2 py-1 rounded-md shadow-sm max-w-[12rem] whitespace-nowrap">
            Notifications
          </div>
        </div>
      </div>
      
      {/* Notification dropdown */}
      {showNotifications && (
        <div className="absolute top-0 right-0 w-96 bg-white rounded-xl shadow-2xl overflow-hidden z-[10000] max-h-[32rem] flex flex-col border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/70 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-gray-900">Notifications</div>
              {unreadCount > 0 && (
                <span
                  className="ml-1 h-2.5 w-2.5 rounded-full bg-purple-600 inline-block"
                  aria-label="Unread notifications"
                />
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={markAllAsRead}
                className="p-1.5 rounded hover:bg-gray-100 text-black"
                aria-label="Mark all as read"
                title="Mark all as read"
              >
                <FiCheck className="h-4 w-4" />
              </button>
              <button
                onClick={clearAllNotifications}
                className="p-1.5 rounded hover:bg-gray-100 text-black"
                aria-label="Clear all notifications"
                title="Clear all notifications"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1.5 rounded hover:bg-gray-100 text-black"
                aria-label="Close panel"
                title="Close"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto flex-grow bg-gray-50/50">
            {loading && (
              <div className="py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-purple-600 mb-3"></div>
                <p className="text-sm text-gray-600 font-medium">Loading notifications...</p>
              </div>
            )}
            
            {error && !loading && notifications.length === 0 && (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <p className="text-sm text-gray-600 font-medium">{error}</p>
                <p className="text-xs text-gray-500 mt-1">Please try again later</p>
              </div>
            )}
            
            {!loading && notifications.length === 0 && !error && (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaBell className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">No notifications</p>
                <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
              </div>
            )}
            
            {notifications.slice(0, visibleCount).map((notification, index) => (
              <div 
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`relative px-6 py-4 cursor-pointer transition-all duration-200 group ${
                  notification.isRead 
                    ? 'bg-white hover:bg-gray-50' 
                    : 'bg-purple-50/50 hover:bg-purple-100/50 border-l-4 border-purple-500'
                } ${index !== Math.min(visibleCount, notifications.length) - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    notification.isRead ? 'bg-gray-100' : 'bg-white shadow-sm'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className={`text-sm font-semibold leading-tight ${
                        notification.isRead ? 'text-gray-800' : 'text-purple-900'
                      }`}>
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full ml-2 mt-1"></div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 leading-relaxed mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">
                        {formatTimestamp(notification.createdAt)}
                      </span>
                      {notification.link && (
                        <span className="text-xs text-purple-600 font-medium group-hover:text-purple-700">
                          View →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Mark as read button */}
                {!notification.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    aria-label="Mark as read"
                    title="Mark as read"
                  >
                    <FaCheck className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Show more */}
            {!loading && !error && notifications.length > visibleCount && (
              <div className="px-6 py-3 bg-white/60 text-center">
                <button
                  onClick={() => setVisibleCount(v => Math.min(v + 5, notifications.length))}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-purple-700 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-all duration-200"
                >
                  Show more
                </button>
              </div>
            )}
          </div>
          
          
        </div>
      )}
    </div>
  );
} 