import React, { useState } from 'react';
import { AppTab, NotificationAction } from './types';
import { AnalyticsProvider, useAnalytics } from './context/AnalyticsContext';
import { NotificationProvider } from './context/NotificationContext';
import Dashboard from './components/Dashboard';
import AnalysisView from './components/AnalysisView';
import ProductsView from './components/ProductsView';
import CartView from './components/CartView';
import DataManagement from './components/DataManagement';
import Settings from './components/Settings';
import NotificationPanel from './components/NotificationPanel';
import AIRecommendationsView from './components/AIRecommendationsView';
import PurchaseAdvisorView from './components/PurchaseAdvisorView';
import {
  LayoutDashboard, ShoppingCart, BarChart3, Package,
  Database, Settings as SettingsIcon, ChevronDown, Lightbulb, ShoppingBag
} from 'lucide-react';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [analysisFilter, setAnalysisFilter] = useState<NotificationAction | undefined>();
  const { cart, state } = useAnalytics();

  const navItems = [
    { tab: AppTab.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { tab: AppTab.ANALYSIS, label: 'Analiz', icon: BarChart3 },
    { tab: AppTab.PRODUCTS, label: 'Ürünler', icon: Package },
    { tab: AppTab.AI_RECOMMENDATIONS, label: 'AI Önerileri', icon: Lightbulb },
    { tab: AppTab.PURCHASE_ADVISOR, label: 'Sipariş Danışmanı', icon: ShoppingBag },
    { tab: AppTab.CART, label: 'Sepet', icon: ShoppingCart, badge: cart.length > 0 ? cart.length : undefined },
  ];

  const settingsItems = [
    { tab: AppTab.DATA_MANAGEMENT, label: 'Veri Yönetimi', icon: Database },
    { tab: AppTab.SETTINGS, label: 'Ayarlar', icon: SettingsIcon },
  ];

  const tabLabels: Record<AppTab, string> = {
    [AppTab.DASHBOARD]: 'Dashboard',
    [AppTab.ANALYSIS]: 'Analiz',
    [AppTab.PRODUCTS]: 'Ürünler',
    [AppTab.CART]: 'Sipariş Sepeti',
    [AppTab.AI_RECOMMENDATIONS]: 'AI Önerileri',
    [AppTab.PURCHASE_ADVISOR]: 'Sipariş Danışmanı',
    [AppTab.DATA_MANAGEMENT]: 'Veri Yönetimi',
    [AppTab.SETTINGS]: 'Ayarlar',
  };

  // Navigation handler with actionRoute support for notifications
  const handleNavigateToTab = (tab: AppTab, actionRoute?: NotificationAction) => {
    setActiveTab(tab);
    if (tab === AppTab.ANALYSIS && actionRoute) {
      setAnalysisFilter(actionRoute);
    } else {
      setAnalysisFilter(undefined);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-white shrink-0 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-black text-indigo-700 tracking-tighter">ty.rendPanel</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Analitik Panel</p>
        </div>

        <nav className="mt-4 px-4 space-y-1.5 flex-grow">
          {navItems.map(item => (
            <NavItem
              key={item.tab}
              active={activeTab === item.tab}
              onClick={() => handleNavigateToTab(item.tab)}
              icon={<item.icon size={18} />}
              label={item.label}
              badge={item.badge}
            />
          ))}

          <div className="pt-4">
            <div
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center justify-between px-3.5 py-2 text-slate-400 font-black uppercase tracking-[0.1em] text-[10px] cursor-pointer hover:text-slate-600 transition-colors"
            >
              Ayarlar
              <ChevronDown size={14} className={`transition-transform duration-300 ${isSettingsOpen ? '' : '-rotate-90'}`} />
            </div>

            {isSettingsOpen && (
              <div className="mt-2 space-y-1 ml-2 border-l border-slate-100">
                {settingsItems.map(item => (
                  <NavItem
                    key={item.tab}
                    active={activeTab === item.tab}
                    onClick={() => handleNavigateToTab(item.tab)}
                    icon={<item.icon size={16} />}
                    label={item.label}
                    isSubItem
                  />
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Data Status */}
        <div className="p-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Yüklü Veri</p>
            <p className="text-lg font-black text-slate-900">{state.products.length.toLocaleString()} ürün</p>
            <p className="text-xs text-slate-500 mt-1">{state.loadedReports.length} rapor yüklü</p>
          </div>
        </div>
      </div>

      <main className="flex-grow overflow-y-auto h-screen">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>
            <span className="text-sm font-black uppercase tracking-widest text-slate-400">ty.rendPanel /</span>
            <span className="text-sm font-black text-indigo-700 uppercase tracking-widest">{tabLabels[activeTab]}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Panel */}
            <NotificationPanel onNavigateToTab={handleNavigateToTab} />

            {cart.length > 0 && (
              <button
                onClick={() => handleNavigateToTab(AppTab.CART)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <ShoppingCart size={14} className="text-indigo-600" />
                <span className="text-xs font-bold text-indigo-700">{cart.length} ürün</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-8 pb-32">
          {activeTab === AppTab.DASHBOARD && <Dashboard onNavigateToTab={handleNavigateToTab} />}
          {activeTab === AppTab.ANALYSIS && <AnalysisView initialFilter={analysisFilter} />}
          {activeTab === AppTab.PRODUCTS && <ProductsView />}
          {activeTab === AppTab.CART && <CartView />}
          {activeTab === AppTab.AI_RECOMMENDATIONS && <AIRecommendationsView />}
          {activeTab === AppTab.PURCHASE_ADVISOR && <PurchaseAdvisorView />}
          {activeTab === AppTab.DATA_MANAGEMENT && <DataManagement />}
          {activeTab === AppTab.SETTINGS && <Settings />}
        </div>
      </main>
    </div>
  );
};

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  isSubItem?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label, badge, isSubItem }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between transition-all ${isSubItem ? 'p-2.5 pl-6' : 'p-3.5'} rounded-xl ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className={`tracking-wider ${isSubItem ? 'text-[11px]' : 'text-xs uppercase'}`}>{label}</span>
    </div>
    {badge !== undefined && (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${active ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white shadow-md'}`}>
        {badge}
      </span>
    )}
  </button>
);

const App: React.FC = () => {
  return (
    <AnalyticsProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AnalyticsProvider>
  );
};

export default App;
