import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';
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
  Database, Settings as SettingsIcon, ChevronDown, Lightbulb, ShoppingBag, LogOut, Menu, X
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [analysisFilter, setAnalysisFilter] = useState<NotificationAction | undefined>();
  const { cart, state } = useAnalytics();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

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
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
    if (tab === AppTab.ANALYSIS && actionRoute) {
      setAnalysisFilter(actionRoute);
    } else {
      setAnalysisFilter(undefined);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64 bg-white border-r border-slate-200 
        transform transition-transform duration-300 ease-in-out shrink-0 flex flex-col shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#0f172a] tracking-tighter">ty.rendPanel</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Analitik Panel</p>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-2">
          <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-2 rounded-lg flex items-center gap-2">
            <span>👤</span>
            <div className="flex flex-col">
              <span className="font-bold text-[#0f172a]">{user?.username}</span>
              <span className="text-[10px] uppercase tracking-wider">{user?.type === 'persistent' ? 'Kalıcı Veri' : 'Demo Modu'}</span>
            </div>
          </div>
        </div>

        <nav className="mt-4 px-4 space-y-1.5 flex-grow overflow-y-auto">
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

        {/* User / Data Status */}
        <div className="p-6 space-y-4 bg-slate-50/50">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Yüklü Veri</p>
            <p className="text-lg font-black text-slate-900">{state.products.length.toLocaleString()} ürün</p>
            <p className="text-xs text-slate-500 mt-1">{state.loadedReports.length} rapor yüklü</p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-bold text-sm"
          >
            <LogOut size={16} />
            Çıkış Yap
          </button>
        </div>
      </div>

      <main className="flex-grow overflow-y-auto h-screen w-full relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>

            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#0f172a] animate-pulse hidden md:block"></div>
              <span className="text-sm font-black uppercase tracking-widest text-slate-400 hidden md:inline">ty.rendPanel /</span>
              <span className="text-sm font-black text-[#0f172a] uppercase tracking-widest">{tabLabels[activeTab]}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* ... existing header content ... */}
            <NotificationPanel onNavigateToTab={handleNavigateToTab} />

            {cart.length > 0 && (
              <button
                onClick={() => handleNavigateToTab(AppTab.CART)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <ShoppingCart size={14} className="text-[#0f172a]" />
                <span className="text-xs font-bold text-[#0f172a]">{cart.length} ürün</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-4 md:p-8 pb-32 max-w-7xl mx-auto">
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
    className={`w-full flex items-center justify-between transition-all ${isSubItem ? 'p-2.5 pl-6' : 'p-3.5'} rounded-xl ${active ? 'bg-[#0f172a] text-white shadow-xl shadow-slate-200 font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className={`tracking-wider ${isSubItem ? 'text-[11px]' : 'text-xs uppercase'}`}>{label}</span>
    </div>
    {badge !== undefined && (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${active ? 'bg-white text-[#0f172a]' : 'bg-[#0f172a] text-white shadow-md'}`}>
        {badge}
      </span>
    )}
  </button>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AnalyticsProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AnalyticsProvider>
    </AuthProvider>
  );
};


export default App;
