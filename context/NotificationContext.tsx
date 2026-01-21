import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import type { Notification, NotificationStatus, ProductTrend } from '../types';
import { useAnalytics } from './AnalyticsContext';
import {
    generateAllNotifications,
    calculateProductTrends
} from '../lib/notificationEngine';

interface NotificationContextType {
    // State
    notifications: Notification[];
    unreadCount: number;
    criticalCount: number;

    // Actions
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    updateStatus: (id: string, status: NotificationStatus) => void;
    refreshNotifications: () => void;
    dismissNotification: (id: string) => void;

    // Computed
    getNotificationsByCategory: (category: string) => Notification[];
    getTopNotifications: (limit?: number) => Notification[];
    trends: ProductTrend[];
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const STORAGE_KEY = 'vizyonexcel_notification_state';

interface StoredNotificationState {
    readIds: string[];
    dismissedIds: string[];
    statusMap: Record<string, NotificationStatus>;
}

function loadStoredState(): StoredNotificationState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : { readIds: [], dismissedIds: [], statusMap: {} };
    } catch {
        return { readIds: [], dismissedIds: [], statusMap: {} };
    }
}

function saveStoredState(state: StoredNotificationState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const {
        state,
        getProductsByPeriod,
        getStockRecommendations,
        settings,
        hasDataForPeriod
    } = useAnalytics();

    const [storedState, setStoredState] = useState<StoredNotificationState>(() => loadStoredState());
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [trends, setTrends] = useState<ProductTrend[]>([]);

    // Save state to localStorage when it changes
    useEffect(() => {
        saveStoredState(storedState);
    }, [storedState]);

    // Generate notifications when data changes
    const refreshNotifications = useCallback(() => {
        if (state.products.length === 0) {
            setNotifications([]);
            setTrends([]);
            return;
        }

        // Get products for different periods
        const products30 = getProductsByPeriod(30);
        const products7 = getProductsByPeriod(7);
        const stockRecs = getStockRecommendations(30);

        // Calculate trends
        const productTrends = calculateProductTrends(products7, products30);
        setTrends(productTrends);

        // Get loaded months (simplified - in real app would track actual months)
        const now = new Date();
        const loadedMonths: Array<{ year: number; month: number }> = [];
        if (hasDataForPeriod(30)) {
            loadedMonths.push({ year: now.getFullYear(), month: now.getMonth() + 1 });
        }

        // Generate all notifications
        const newNotifications = generateAllNotifications({
            products: products30,
            previousProducts: products7, // Using 7-day as "previous" for comparison
            stockRecommendations: stockRecs,
            trends: productTrends,
            settings,
            loadedMonths
        });

        // Apply stored state (read, dismissed, status)
        const processedNotifications = newNotifications
            .filter(n => !storedState.dismissedIds.includes(n.id.split('_')[1])) // Filter dismissed
            .map(n => ({
                ...n,
                status: storedState.statusMap[n.id] || n.status,
                readAt: storedState.readIds.includes(n.id.split('_')[1]) ? new Date().toISOString() : undefined
            }));

        setNotifications(processedNotifications);
    }, [state.products, getProductsByPeriod, getStockRecommendations, settings, hasDataForPeriod, storedState]);

    // Refresh notifications when data changes
    useEffect(() => {
        // Only generate notifications if we have products
        if (state.products.length > 0) {
            try {
                // Get products for different periods
                const products30 = getProductsByPeriod(30);
                const products7 = getProductsByPeriod(7);
                const stockRecs = getStockRecommendations(30);

                // Calculate trends
                const productTrends = calculateProductTrends(products7, products30);
                setTrends(productTrends);

                // Get loaded months
                const now = new Date();
                const loadedMonths: Array<{ year: number; month: number }> = [];
                if (hasDataForPeriod(30)) {
                    loadedMonths.push({ year: now.getFullYear(), month: now.getMonth() + 1 });
                }

                // Generate all notifications
                const newNotifications = generateAllNotifications({
                    products: products30,
                    previousProducts: products7,
                    stockRecommendations: stockRecs,
                    trends: productTrends,
                    settings,
                    loadedMonths
                });

                // Apply stored state (read, dismissed, status)
                const processedNotifications = newNotifications
                    .filter(n => !storedState.dismissedIds.includes(n.id.split('_')[1] || ''))
                    .map(n => ({
                        ...n,
                        status: storedState.statusMap[n.id] || n.status,
                        readAt: storedState.readIds.includes(n.id.split('_')[1] || '') ? new Date().toISOString() : undefined
                    }));

                setNotifications(processedNotifications);
            } catch (error) {
                console.error('Error generating notifications:', error);
                setNotifications([]);
            }
        } else {
            setNotifications([]);
            setTrends([]);
        }
    }, [state.lastUpdatedAt, state.products.length]);

    // Computed values
    const unreadCount = useMemo(() =>
        notifications.filter(n => !n.readAt).length,
        [notifications]
    );

    const criticalCount = useMemo(() =>
        notifications.filter(n => n.severity === 'critical' && !n.readAt).length,
        [notifications]
    );

    // Actions
    const markAsRead = useCallback((id: string) => {
        const notifKey = id.split('_').slice(1).join('_');
        setStoredState(prev => ({
            ...prev,
            readIds: [...new Set([...prev.readIds, notifKey])]
        }));
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        ));
    }, []);

    const markAllAsRead = useCallback(() => {
        const allKeys = notifications.map(n => n.id.split('_').slice(1).join('_'));
        setStoredState(prev => ({
            ...prev,
            readIds: [...new Set([...prev.readIds, ...allKeys])]
        }));
        setNotifications(prev => prev.map(n => ({
            ...n,
            readAt: new Date().toISOString()
        })));
    }, [notifications]);

    const updateStatus = useCallback((id: string, status: NotificationStatus) => {
        setStoredState(prev => ({
            ...prev,
            statusMap: { ...prev.statusMap, [id]: status }
        }));
        setNotifications(prev => prev.map(n =>
            n.id === id ? {
                ...n,
                status,
                resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined
            } : n
        ));
    }, []);

    const dismissNotification = useCallback((id: string) => {
        const notifKey = id.split('_').slice(1).join('_');
        setStoredState(prev => ({
            ...prev,
            dismissedIds: [...new Set([...prev.dismissedIds, notifKey])]
        }));
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const getNotificationsByCategory = useCallback((category: string) => {
        return notifications.filter(n => n.category === category);
    }, [notifications]);

    const getTopNotifications = useCallback((limit: number = 5) => {
        return notifications.slice(0, limit);
    }, [notifications]);

    const value: NotificationContextType = {
        notifications,
        unreadCount,
        criticalCount,
        markAsRead,
        markAllAsRead,
        updateStatus,
        refreshNotifications,
        dismissNotification,
        getNotificationsByCategory,
        getTopNotifications,
        trends
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications(): NotificationContextType {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
