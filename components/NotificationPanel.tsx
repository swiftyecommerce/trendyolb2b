import React, { useState, useRef, useEffect } from 'react';
import {
    Bell, X, Check, AlertTriangle, TrendingDown, TrendingUp,
    Package, ShoppingCart, Target, Database, ChevronRight,
    CheckCircle, Clock, Info
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency } from '../lib/excelParser';
import type { Notification, NotificationSeverity, NotificationCategory, AppTab, NotificationAction } from '../types';

interface NotificationPanelProps {
    onNavigateToTab?: (tab: AppTab, actionRoute?: NotificationAction) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onNavigateToTab }) => {
    const {
        notifications,
        unreadCount,
        criticalCount,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        getTopNotifications
    } = useNotifications();

    const [isOpen, setIsOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | NotificationSeverity>('all');
    const panelRef = useRef<HTMLDivElement>(null);

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredNotifications = activeFilter === 'all'
        ? notifications
        : notifications.filter(n => n.severity === activeFilter);

    const handleNotificationClick = (notification: Notification) => {
        markAsRead(notification.id);

        if (notification.actionRoute && onNavigateToTab) {
            // Pass the full actionRoute (including analysisType and relatedProducts)
            onNavigateToTab(notification.actionRoute.tab, notification.actionRoute);
        }
        setIsOpen(false);
    };

    const getSeverityStyles = (severity: NotificationSeverity) => {
        switch (severity) {
            case 'critical':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    icon: 'text-red-600',
                    badge: 'bg-red-100 text-red-700'
                };
            case 'high':
                return {
                    bg: 'bg-amber-50',
                    border: 'border-amber-200',
                    icon: 'text-amber-600',
                    badge: 'bg-amber-100 text-amber-700'
                };
            default:
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    icon: 'text-blue-600',
                    badge: 'bg-blue-100 text-blue-700'
                };
        }
    };

    const getCategoryIcon = (category: NotificationCategory) => {
        switch (category) {
            case 'stock': return Package;
            case 'sales': return ShoppingCart;
            case 'conversion': return Target;
            case 'trend': return TrendingDown;
            case 'data': return Database;
            default: return Info;
        }
    };

    const getSeverityLabel = (severity: NotificationSeverity) => {
        switch (severity) {
            case 'critical': return 'Kritik';
            case 'high': return 'Yüksek';
            default: return 'Bilgi';
        }
    };

    return (
        <div ref={panelRef} className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-indigo-600' : 'text-slate-400'}`} />

                {unreadCount > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center text-xs font-bold text-white rounded-full ${criticalCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'
                        }`}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">Bildirimler</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    Tümünü okundu işaretle
                                </button>
                            )}
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-1 mt-2">
                            {(['all', 'critical', 'high', 'info'] as const).map(filter => {
                                const count = filter === 'all'
                                    ? notifications.length
                                    : notifications.filter(n => n.severity === filter).length;

                                return (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}
                                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${activeFilter === filter
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {filter === 'all' ? 'Tümü' : getSeverityLabel(filter as NotificationSeverity)}
                                        {count > 0 && (
                                            <span className="ml-1 text-slate-400">({count})</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-96 overflow-y-auto">
                        {filteredNotifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <CheckCircle className="w-12 h-12 mx-auto text-emerald-300 mb-3" />
                                <p className="text-slate-500">Bildirim yok</p>
                                <p className="text-xs text-slate-400 mt-1">Her şey yolunda görünüyor!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredNotifications.map(notification => {
                                    const styles = getSeverityStyles(notification.severity);
                                    const CategoryIcon = getCategoryIcon(notification.category);
                                    const isUnread = !notification.readAt;

                                    return (
                                        <div
                                            key={notification.id}
                                            className={`relative p-4 cursor-pointer transition-colors hover:bg-slate-50 ${isUnread ? styles.bg : 'bg-white'
                                                }`}
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            {/* Unread indicator */}
                                            {isUnread && (
                                                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                            )}

                                            <div className="flex gap-3">
                                                {/* Icon */}
                                                <div className={`w-10 h-10 rounded-xl ${styles.bg} border ${styles.border} flex items-center justify-center flex-shrink-0`}>
                                                    <CategoryIcon className={`w-5 h-5 ${styles.icon}`} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className={`text-sm font-medium ${isUnread ? 'text-slate-900' : 'text-slate-700'} line-clamp-1`}>
                                                            {notification.title}
                                                        </h4>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                dismissNotification(notification.id);
                                                            }}
                                                            className="p-1 hover:bg-slate-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                    </div>

                                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                        {notification.description}
                                                    </p>

                                                    {/* Metric Badge */}
                                                    {notification.metric && (
                                                        <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
                                                            {notification.severity === 'critical' && <AlertTriangle className="w-3 h-3" />}
                                                            {notification.metric}
                                                        </div>
                                                    )}

                                                    {/* Impact */}
                                                    {notification.impact && (
                                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                            {notification.impact.estimatedLostRevenue && (
                                                                <span className="flex items-center gap-1 text-red-600">
                                                                    <TrendingDown className="w-3 h-3" />
                                                                    Kayıp: {formatCurrency(notification.impact.estimatedLostRevenue)}
                                                                </span>
                                                            )}
                                                            {notification.impact.potentialRevenue && (
                                                                <span className="flex items-center gap-1 text-emerald-600">
                                                                    <TrendingUp className="w-3 h-3" />
                                                                    Potansiyel: {formatCurrency(notification.impact.potentialRevenue)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Action Link */}
                                                    {notification.actionRoute && (
                                                        <div className="flex items-center gap-1 mt-2 text-xs text-indigo-600 font-medium">
                                                            Analizi Gör
                                                            <ChevronRight className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Priority Score (debug, can be removed) */}
                                            <div className="absolute top-2 right-2">
                                                <span className="text-[10px] text-slate-400" title="Öncelik Skoru">
                                                    P{notification.priorityScore}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                            <p className="text-xs text-slate-500 text-center">
                                Bildirimler öncelik skoruna göre sıralanmıştır
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
