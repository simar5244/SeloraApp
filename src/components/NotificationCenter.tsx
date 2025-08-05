'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, CheckCircle, Users, Target, MessageSquare, Crown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface Notification {
  _id: string;
  userId: string;
  type: 'project_member' | 'profile_approved' | 'feedback_received' | 'user_limit_warning' | 'admin_new_content';
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
  entityId?: string;
  entityType?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'project_member':
      return <Users className="h-4 w-4 text-blue-600" />;
    case 'profile_approved':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'feedback_received':
      return <MessageSquare className="h-4 w-4 text-purple-600" />;
    case 'user_limit_warning':
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case 'admin_new_content':
      return <Target className="h-4 w-4 text-indigo-600" />;
    default:
      return <Bell className="h-4 w-4 text-gray-600" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'project_member':
      return 'border-l-blue-500 bg-blue-50';
    case 'profile_approved':
      return 'border-l-green-500 bg-green-50';
    case 'feedback_received':
      return 'border-l-purple-500 bg-purple-50';
    case 'user_limit_warning':
      return 'border-l-orange-500 bg-orange-50';
    case 'admin_new_content':
      return 'border-l-indigo-500 bg-indigo-50';
    default:
      return 'border-l-gray-500 bg-gray-50';
  }
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.isRead).length || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    if (notification.link) {
      router.push(notification.link);
      setIsOpen(false);
    }
  };

  const deleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const wasUnread = notifications.find(n => n._id === notificationId)?.isRead === false;
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed top-6 right-6 z-[100]" ref={dropdownRef}>
      <div className="relative">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          className="group relative h-12 w-12 rounded-full bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <Bell className="h-5 w-5 text-gray-600 transition-transform duration-200 group-hover:rotate-12" />
          
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Notifications
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </Button>

        {isOpen && (
          <Card className="absolute top-full right-0 mt-2 w-96 max-h-96 overflow-hidden shadow-2xl border-gray-200 bg-white">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <Button
                      onClick={markAllAsRead}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <CardContent className="p-0 max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <Bell className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150 border-l-4 ${
                        !notification.isRead ? 'bg-blue-25' + getNotificationColor(notification.type) : 'border-l-transparent'
                      } ${!notification.isRead ? 'bg-opacity-30' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {formatTimeAgo(notification.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                              <Button
                                onClick={(e) => deleteNotification(notification._id, e)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}