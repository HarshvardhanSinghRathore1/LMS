'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  Trash2,
  ExternalLink,
  Info,
  AlertTriangle,
  CheckCircle,
  Award,
  Zap,
  RefreshCw,
  Filter,
} from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  NotificationItem,
  NotificationType,
} from '../../lib/notifications';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'ACTION_REQUIRED' | 'ACHIEVEMENT'>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchList = async (pageNum = 1) => {
    setLoading(true);
    try {
      const filters: any = { page: pageNum, limit: 15 };
      if (activeTab === 'UNREAD') filters.isRead = false;
      else if (activeTab === 'ACTION_REQUIRED') filters.type = 'ACTION_REQUIRED';
      else if (activeTab === 'ACHIEVEMENT') filters.type = 'ACHIEVEMENT';

      const data = await getNotifications(filters);
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1);
  }, [activeTab]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'ACHIEVEMENT':
        return <Award className="w-5 h-5 text-amber-400" />;
      case 'SUCCESS':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'ACTION_REQUIRED':
        return <Zap className="w-5 h-5 text-strawberry-red" />;
      default:
        return <Info className="w-5 h-5 text-sky-400" />;
    }
  };

  const getTypeBadge = (type: NotificationType) => {
    switch (type) {
      case 'ACHIEVEMENT':
        return (
          <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-medium">
            Achievement
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-medium">
            Success
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full font-medium">
            Alert
          </span>
        );
      case 'ACTION_REQUIRED':
        return (
          <span className="px-2 py-0.5 text-xs bg-mahogany-red/20 text-strawberry-red border border-mahogany-red/40 rounded-full font-medium">
            Action Required
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-full font-medium">
            Info
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-strawberry-red" />
            Notification Center
          </h1>
          <p className="text-sm text-silver mt-1">
            Real-time activity events, course milestones, trainer sessions, and verified achievements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchList(page)}
            className="px-3 py-1.5 rounded-lg bg-carbon-black border border-white/10 text-dust-grey hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-1.5 rounded-lg bg-mahogany-red hover:bg-strawberry-red text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'ALL'
              ? 'bg-mahogany-red text-white shadow-md'
              : 'bg-carbon-black/60 text-dust-grey hover:text-white border border-white/5'
          }`}
        >
          All ({total})
        </button>
        <button
          onClick={() => setActiveTab('UNREAD')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'UNREAD'
              ? 'bg-mahogany-red text-white shadow-md'
              : 'bg-carbon-black/60 text-dust-grey hover:text-white border border-white/5'
          }`}
        >
          Unread
        </button>
        <button
          onClick={() => setActiveTab('ACTION_REQUIRED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'ACTION_REQUIRED'
              ? 'bg-mahogany-red text-white shadow-md'
              : 'bg-carbon-black/60 text-dust-grey hover:text-white border border-white/5'
          }`}
        >
          Action Required
        </button>
        <button
          onClick={() => setActiveTab('ACHIEVEMENT')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'ACHIEVEMENT'
              ? 'bg-mahogany-red text-white shadow-md'
              : 'bg-carbon-black/60 text-dust-grey hover:text-white border border-white/5'
          }`}
        >
          Achievements
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-silver text-sm">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-silver flex flex-col items-center gap-3 bg-carbon-black/40 border border-white/5 rounded-xl">
            <Bell className="w-10 h-10 text-white/20" />
            <p className="text-base font-medium text-dust-grey">No notifications found</p>
            <p className="text-xs text-silver max-w-sm">
              You will receive notifications here as you enroll in courses, complete assessments, and achieve competencies.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                !notif.is_read
                  ? 'bg-carbon-black/90 border-mahogany-red/30 shadow-[0_0_15px_rgba(164,22,26,0.1)]'
                  : 'bg-carbon-black/40 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 shrink-0 mt-0.5">
                  {getTypeIcon(notif.type)}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-sm font-semibold ${!notif.is_read ? 'text-white' : 'text-dust-grey'}`}>
                      {notif.title}
                    </h3>
                    {getTypeBadge(notif.type)}
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-strawberry-red inline-block" />
                    )}
                  </div>
                  <p className="text-xs text-silver leading-relaxed">{notif.message}</p>
                  <p className="text-[11px] text-silver/80">
                    {new Date(notif.created_at).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {notif.link && (
                  <Link
                    href={notif.link}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-strawberry-red hover:text-white font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-dust-grey hover:text-white font-medium flex items-center gap-1.5 transition-colors"
                    title="Mark as Read"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Read</span>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notif.id)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-dust-grey hover:text-red-400 border border-white/10 transition-colors"
                  title="Delete notification"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-xs text-silver">
            Page {page} of {totalPages} ({total} notifications)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchList(page - 1)}
              className="px-3 py-1.5 rounded-lg bg-carbon-black border border-white/10 text-xs text-dust-grey disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchList(page + 1)}
              className="px-3 py-1.5 rounded-lg bg-carbon-black border border-white/10 text-xs text-dust-grey disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
