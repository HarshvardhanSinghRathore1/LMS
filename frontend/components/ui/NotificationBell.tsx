'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check, ExternalLink, Info, AlertTriangle, CheckCircle, Award, Zap } from 'lucide-react';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem,
} from '../../lib/notifications';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    try {
      const data = await getUnreadNotificationCount();
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Ignore background poll errors if unauthenticated
    }
  };

  const fetchRecent = async () => {
    setLoading(true);
    try {
      const data = await getNotifications({ limit: 5 });
      setRecentNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to load recent notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
    // Near-real-time polling every 45s
    const interval = setInterval(fetchCount, 45000);

    const onFocus = () => fetchCount();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRecent();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setRecentNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ACHIEVEMENT':
        return <Award className="w-4 h-4 text-amber-400" />;
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'ACTION_REQUIRED':
        return <Zap className="w-4 h-4 text-mahogany-red" />;
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-dust-grey hover:text-white hover:bg-carbon-black transition-colors"
        aria-label="View Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-mahogany-red rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-onyx border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-carbon-black/60">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-mahogany-red/20 text-strawberry-red border border-mahogany-red/40 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-dust-grey hover:text-white transition-colors flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="py-8 text-center text-silver text-xs">Loading notifications...</div>
            ) : recentNotifications.length === 0 ? (
              <div className="py-8 text-center text-silver text-xs flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-white/20" />
                <p>No notifications yet</p>
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 hover:bg-carbon-black/80 transition-colors flex gap-3 items-start ${
                    !notif.is_read ? 'bg-white/[0.03]' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-black/40 border border-white/5 shrink-0">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          !notif.is_read ? 'text-white' : 'text-dust-grey'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-silver shrink-0">
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-silver leading-relaxed line-clamp-2 mb-1.5">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {notif.link ? (
                        <Link
                          href={notif.link}
                          onClick={() => setIsOpen(false)}
                          className="text-[11px] text-strawberry-red hover:underline flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : <span />}
                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="text-[11px] text-dust-grey hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-white/10 bg-carbon-black/60 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-strawberry-red hover:text-white font-medium transition-colors inline-block w-full py-1"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
