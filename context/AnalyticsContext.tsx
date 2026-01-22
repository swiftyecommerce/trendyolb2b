import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type {
    AnalyticsState,
    AppSettings,
    CartItem,
    RawSaleRow,
    ReportPeriod,
    ProductStats,
    StockRecommendation
} from '../types';
import {
    buildAnalyticsState,
    loadSettings,
    saveSettings,
    loadStoredData,
    saveReport,
    saveProductList,
    clearAllData as clearStorage,
    parseProductExcel,
    parseSalesReportExcel,
    calculateStockRecommendations,
    aggregateByProduct
} from '../lib/excelParser';

// Map dateRange (days) to report period
function daysToReportPeriod(days: number): ReportPeriod {
    if (days <= 1) return 'daily';
    if (days <= 7) return 'weekly';
    if (days <= 30) return 'monthly';
    return 'yearly';
}

interface AnalyticsContextType {
    // State
    state: AnalyticsState;
    settings: AppSettings;
    cart: CartItem[];
    isLoading: boolean;
    categories: string[];

    // Actions
    refreshData: () => void;
    saveData: () => Promise<void>;
    restoreData: () => Promise<void>;
    uploadProductList: (file: ArrayBuffer) => Promise<number>;
    uploadSalesReport: (file: ArrayBuffer, period: ReportPeriod, monthInfo?: { year: number; month: number }) => Promise<number>;
    clearAllData: () => void;
    updateSettings: (settings: Partial<AppSettings>) => void;

    // Cart actions
    addToCart: (product: ProductStats, quantity: number) => void;
    removeFromCart: (modelKodu: string) => void;
    updateCartQuantity: (modelKodu: string, quantity: number) => void;
    clearCart: () => void;

    // Computed - now accepts dateRange
    getProductsByPeriod: (days: number, category?: string) => ProductStats[];
    getStockRecommendations: (days: number, category?: string) => StockRecommendation[];
    getKPIsForPeriod: (days: number, category?: string) => {
        totalRevenue: number;
        totalQuantity: number;
        totalImpressions: number;
        totalAddToCart: number;
        conversionRate: number;
        aov: number;
        productCount: number;
        lowStockCount: number;
    };
    hasDataForPeriod: (days: number) => boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

const CART_STORAGE_KEY = 'vizyonexcel_cart';

function loadCart(): CartItem[] {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveCart(cart: CartItem[]): void {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AnalyticsState>(() => buildAnalyticsState());
    const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
    const [cart, setCart] = useState<CartItem[]>(() => loadCart());
    const [isLoading, setIsLoading] = useState(false);

    // Auth integration
    const { user } = useAuth();
    const isInitialLoad = useRef(true);

    // Load data from server when user logs in (if persistent)
    useEffect(() => {
        const loadUserData = async () => {
            if (user?.type === 'persistent') {
                setIsLoading(true);
                try {
                    const response = await fetch(`/api/data/load/${user.username}`);
                    const result = await response.json();

                    if (result.ok && result.data) {
                        // 1. Restore localStorage first (Source of Truth)
                        if (result.data.store) {
                            localStorage.setItem('vizyonexcel_data', JSON.stringify(result.data.store));
                        }

                        // 2. Restore Cart
                        if (result.data.cart) {
                            setCart(result.data.cart);
                        }

                        // 3. Rebuild State from restored localStorage
                        // We don't need to manually set state from result.data.state anymore
                        // because refreshData() will read from the localStorage we just restored.
                        refreshData();

                        console.log('Data loaded and restored from server for', user.username);
                    }
                } catch (error) {
                    console.error('Failed to load user data:', error);
                    // Mobile debug: Show alert on load failure
                    if (confirm('Veriler sunucudan otomatik yüklenemedi. Tekrar denemek ister misiniz?')) {
                        window.location.reload();
                    }
                } finally {
                    setIsLoading(false);
                }
            }
        };

        if (user) {
            loadUserData();
        }
    }, [user]);

    // Save data to server when it changes (debounced)
    useEffect(() => {
        if (isInitialLoad.current) {
            isInitialLoad.current = false;
            return;
        }

        if (user?.type === 'persistent') {
            const saveData = async () => {
                try {
                    // We save the essential parts of state to reconstruct it
                    // AND the raw storage so excelParser works on other devices
                    const currentStore = loadStoredData();

                    const dataToSave = {
                        store: currentStore, // Sync the raw storage
                        state: {
                            // Keep saving state just in case, or for faster lightweight loads later
                            lastUpdatedAt: state.lastUpdatedAt
                        },
                        cart: cart
                    };

                    await supabase
                        .from('user_data')
                        .upsert({
                            username: user.username,
                            data: dataToSave,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'username' });

                    console.log('Data saved (Direct Supabase) for', user.username);
                } catch (error) {
                    console.error('Failed to save user data:', error);
                }
            };

            const timeoutId = setTimeout(saveData, 2000); // 2 second debounce
            return () => clearTimeout(timeoutId);
        }
    }, [state, cart, user]);

    // Force Manual Save Function exposed to context
    const saveData = useCallback(async () => {
        if (user?.type !== 'persistent') return;

        try {
            const currentStore = loadStoredData();
            const dataToSave = {
                store: currentStore,
                state: { lastUpdatedAt: state.lastUpdatedAt },
                cart: cart
            };

            const { error } = await supabase
                .from('user_data')
                .upsert({
                    username: user.username,
                    data: dataToSave,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'username' });

            if (error) throw error;

            console.log('Manual save completed for', user.username);
            alert('Buluta yedekleme başarıyla tamamlandı! ✅\nŞimdi diğer cihazınızdan sayfayı yenileyebilirsiniz.');
        } catch (error) {
            console.error('Manual save failed:', error);
            alert(`Yedekleme başarısız oldu! ❌\nHata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
            throw error;
        }
    }, [user, state, cart]);

    const restoreData = useCallback(async () => {
        if (!user?.username) return;
        setIsLoading(true);
        try {
            // Direct Supabase Load
            const { data: dbData, error } = await supabase
                .from('user_data')
                .select('data')
                .eq('username', user.username)
                .single();

            if (error) throw error;

            if (dbData && dbData.data) {
                const loadedData = dbData.data;

                // 1. Restore localStorage
                if (loadedData.store) {
                    localStorage.setItem('vizyonexcel_data', JSON.stringify(loadedData.store));
                }

                // 2. Restore Cart
                if (loadedData.cart) {
                    setCart(loadedData.cart);
                }

                // 3. Rebuild State
                refreshData();
                alert('Veriler buluttan başarıyla indirildi! ✅');
            } else {
                alert('Bulutta kayıtlı veri bulunamadı.');
            }
        } catch (error) {
            console.error('Restore failed:', error);
            alert(`Veri indirme başarısız! ❌\nHata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}\nDepolama alanı dolmuş olabilir.`);
        } finally {
            setIsLoading(false);
        }
    }, [user, refreshData]);

    // Cached report data by period
    const reportDataByPeriod = useMemo(() => {
        const store = loadStoredData();
        return store.reports;
    }, [state.lastUpdatedAt]);

    // Product list for stock info
    const productListData = useMemo(() => {
        const store = loadStoredData();
        return store.productList?.products;
    }, [state.lastUpdatedAt]);

    // All categories
    const categories = useMemo(() => {
        const cats = new Set<string>();
        for (const p of state.products) {
            if (p.category) cats.add(p.category);
        }
        return Array.from(cats).sort();
    }, [state.products]);

    // Save cart to localStorage when it changes
    useEffect(() => {
        saveCart(cart);
    }, [cart]);

    const refreshData = useCallback(() => {
        setIsLoading(true);
        try {
            const newState = buildAnalyticsState();
            setState(newState);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const uploadProductList = useCallback(async (file: ArrayBuffer): Promise<number> => {
        setIsLoading(true);
        try {
            const rows = parseProductExcel(file);
            if (rows.length === 0) {
                throw new Error('Dosyada geçerli ürün bulunamadı');
            }
            saveProductList(rows);
            refreshData();
            return rows.length;
        } finally {
            setIsLoading(false);
        }
    }, [refreshData]);

    const uploadSalesReport = useCallback(async (
        file: ArrayBuffer,
        period: ReportPeriod,
        monthInfo?: { year: number; month: number }
    ): Promise<number> => {
        setIsLoading(true);
        try {
            const rows = parseSalesReportExcel(file, period);
            if (rows.length === 0) {
                throw new Error('Dosyada geçerli satış verisi bulunamadı');
            }
            saveReport(period, rows, monthInfo);
            refreshData();
            return rows.length;
        } finally {
            setIsLoading(false);
        }
    }, [refreshData]);

    const clearAllData = useCallback(() => {
        clearStorage();
        setState({
            rawRows: [],
            byProduct: {},
            byDate: {},
            products: [],
            loadedReports: []
        });
    }, []);

    const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            saveSettings(updated);
            return updated;
        });
    }, []);

    // Cart actions
    const addToCart = useCallback((product: ProductStats, quantity: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.modelKodu === product.modelKodu);
            if (existing) {
                return prev.map(item =>
                    item.modelKodu === product.modelKodu
                        ? { ...item, quantity: item.quantity + quantity, totalCost: (item.quantity + quantity) * (item.unitCost || 0) }
                        : item
                );
            }
            return [...prev, {
                modelKodu: product.modelKodu,
                productName: product.productName,
                imageUrl: product.imageUrl,
                quantity,
                unitCost: product.avgUnitPrice,
                totalCost: quantity * product.avgUnitPrice
            }];
        });
    }, []);

    const removeFromCart = useCallback((modelKodu: string) => {
        setCart(prev => prev.filter(item => item.modelKodu !== modelKodu));
    }, []);

    const updateCartQuantity = useCallback((modelKodu: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(modelKodu);
            return;
        }
        setCart(prev => prev.map(item =>
            item.modelKodu === modelKodu
                ? { ...item, quantity, totalCost: quantity * (item.unitCost || 0) }
                : item
        ));
    }, [removeFromCart]);

    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    // Check if data exists for a period
    const hasDataForPeriod = useCallback((days: number): boolean => {
        const period = daysToReportPeriod(days);
        return !!reportDataByPeriod[period]?.data?.length;
    }, [reportDataByPeriod]);

    // Get products filtered by period and category
    const getProductsByPeriod = useCallback((days: number, category?: string): ProductStats[] => {
        const period = daysToReportPeriod(days);
        const reportData = reportDataByPeriod[period]?.data;

        if (!reportData || reportData.length === 0) {
            // Fallback to all data if specific period not available
            let products = state.products;
            if (category) {
                products = products.filter(p => p.category === category);
            }
            return products;
        }

        // Aggregate only for the selected period
        const byProduct = aggregateByProduct(reportData, productListData);
        let products = Object.values(byProduct).sort((a, b) => b.totalRevenue - a.totalRevenue);

        if (category) {
            products = products.filter(p => p.category === category);
        }

        return products;
    }, [reportDataByPeriod, productListData, state.products]);

    // Get KPIs for a specific period
    const getKPIsForPeriod = useCallback((days: number, category?: string) => {
        const products = getProductsByPeriod(days, category);

        const totalRevenue = products.reduce((sum, p) => sum + p.totalRevenue, 0);
        const totalQuantity = products.reduce((sum, p) => sum + p.totalQuantity, 0);
        const totalImpressions = products.reduce((sum, p) => sum + p.totalImpressions, 0);
        const totalAddToCart = products.reduce((sum, p) => sum + p.totalAddToCart, 0);

        const conversionRate = totalImpressions > 0 ? (totalQuantity / totalImpressions) * 100 : 0;
        const aov = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

        const lowStockCount = products.filter(p =>
            p.currentStock !== null && p.currentStock < settings.lowStockThreshold
        ).length;

        return {
            totalRevenue,
            totalQuantity,
            totalImpressions,
            totalAddToCart,
            conversionRate,
            aov,
            productCount: products.length,
            lowStockCount
        };
    }, [getProductsByPeriod, settings.lowStockThreshold]);

    // Get stock recommendations for a period
    const getStockRecommendations = useCallback((days: number, category?: string): StockRecommendation[] => {
        const products = getProductsByPeriod(days, category);
        return calculateStockRecommendations(products, days, settings);
    }, [getProductsByPeriod, settings]);

    const value: AnalyticsContextType = {
        state,
        settings,
        cart,
        isLoading,
        categories,
        refreshData,
        saveData,
        restoreData,
        uploadProductList,
        uploadSalesReport,
        clearAllData,
        updateSettings,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        getProductsByPeriod,
        getStockRecommendations,
        getKPIsForPeriod,
        hasDataForPeriod
    };

    return (
        <AnalyticsContext.Provider value={value}>
            {children}
        </AnalyticsContext.Provider>
    );
}

export function useAnalytics(): AnalyticsContextType {
    const context = useContext(AnalyticsContext);
    if (!context) {
        throw new Error('useAnalytics must be used within an AnalyticsProvider');
    }
    return context;
}
