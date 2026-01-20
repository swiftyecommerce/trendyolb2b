
import React, { useState, useEffect } from 'react';
import { AppTab, Product, CartItem, IntegrationConfig } from './types';
import Dashboard from './components/Dashboard';
import CartView from './components/CartView';
import PRDView from './components/PRDView';
import IntegrationView from './components/IntegrationView';
import { LayoutDashboard, ShoppingCart, FileText, Bell, Zap, Terminal, Globe, Share2, Link2, Settings, ChevronDown, Store } from 'lucide-react';

const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Oversize Siyah Basic Tişört', sku: 'TS-BLK-01', sales: 450, turnover: 112500, views: 15000, addToCart: 1200, favorites: 4500, conversion: 3.0, cost: 85, stock: 15, trend: 25 },
  { id: '2', name: 'Mavi Yırtık Kot Pantolon', sku: 'JN-BLU-02', sales: 210, turnover: 147000, views: 8000, addToCart: 450, favorites: 1200, conversion: 2.6, cost: 220, stock: 12, trend: -5 },
  { id: '3', name: 'Beyaz Sneaker Ayakkabı', sku: 'SH-WHT-03', sales: 89, turnover: 133500, views: 22000, addToCart: 120, favorites: 3800, conversion: 0.8, cost: 450, stock: 5, trend: 2 },
  { id: '4', name: 'Deriden Kahverengi Kemer', sku: 'BL-BRW-04', sales: 620, turnover: 93000, views: 12000, addToCart: 1500, favorites: 3200, conversion: 5.2, cost: 45, stock: 150, trend: 22 },
  { id: '5', name: 'Lacivert Kapüşonlu Sweatshirt', sku: 'SW-NVY-05', sales: 340, turnover: 187000, views: 9500, addToCart: 680, favorites: 2100, conversion: 3.6, cost: 180, stock: 8, trend: -12 },
  { id: '6', name: 'Kırmızı Spor Çanta', sku: 'BG-RED-06', sales: 15, turnover: 15000, views: 18000, addToCart: 900, favorites: 5500, conversion: 0.1, cost: 120, stock: 40, trend: 45 },
];

const INITIAL_INTEGRATION: IntegrationConfig = {
  supplierId: '',
  apiKey: '',
  apiSecret: '',
  isConnected: false,
  lastSync: '',
  corsProxy: ''
};

// Load integration config from localStorage
function loadIntegrationConfig(): IntegrationConfig {
  try {
    const saved = localStorage.getItem('trendyol_integration');
    if (saved) {
      return { ...INITIAL_INTEGRATION, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load integration config:', e);
  }
  return INITIAL_INTEGRATION;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [integration, setIntegration] = useState<IntegrationConfig>(() => loadIntegrationConfig());
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  // Save integration config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('trendyol_integration', JSON.stringify(integration));
  }, [integration]);

  useEffect(() => {
    if (process.env.API_KEY && process.env.API_KEY !== "") {
      setIsDemoMode(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`${file.name} başarıyla yüklendi! Rapor analiz için hazır.`);
      const updated = MOCK_PRODUCTS.map(p => ({
        ...p,
        id: Math.random().toString(36).substr(2, 9),
        sales: Math.floor(p.sales * (0.8 + Math.random() * 0.4)),
        turnover: Math.floor(p.turnover * (0.8 + Math.random() * 0.4)),
        stock: Math.floor(Math.random() * 100),
        trend: Math.floor(Math.random() * 60 - 30),
        isStockEstimated: Math.random() > 0.8,
        aiDecision: undefined,
        orderRecommendation: undefined,
        potentialAnalysis: undefined
      }));
      setProducts(updated);
    }
  };

  const addToCart = (product: Product, suggestedQty?: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const qtyToAdd = suggestedQty || 10;

      if (existing) {
        return prev.map(item => item.id === product.id
          ? { ...item, orderQuantity: item.orderQuantity + qtyToAdd }
          : item
        );
      }
      return [...prev, {
        ...product,
        orderQuantity: qtyToAdd,
        isOverridden: false,
        roiEstimate: product.orderRecommendation?.targetDays || 20
      }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartQty = (id: string, qty: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const rec = item.orderRecommendation?.suggestedQty;
        return {
          ...item,
          orderQuantity: qty,
          isOverridden: rec !== undefined && qty !== rec
        };
      }
      return item;
    }));
  };

  const totalCartCost = cart.reduce((acc, curr) => acc + (curr.cost * curr.orderQuantity), 0);
  const budgetLimit = 125000;

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 bg-white no-print shrink-0 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-black text-indigo-700 tracking-tighter italic">VizyonExcel</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">SaaS Karar Destek</p>
        </div>

        <nav className="mt-4 px-4 space-y-1.5 flex-grow">
          <NavItem
            active={activeTab === AppTab.DASHBOARD}
            onClick={() => setActiveTab(AppTab.DASHBOARD)}
            icon={<LayoutDashboard size={18} />}
            label="Analiz & Dashboard"
          />
          <NavItem
            active={activeTab === AppTab.CART}
            onClick={() => setActiveTab(AppTab.CART)}
            icon={<ShoppingCart size={18} />}
            label="Sipariş Sepeti"
            badge={cart.length > 0 ? cart.length : undefined}
          />
          <NavItem
            active={activeTab === AppTab.PRD}
            onClick={() => setActiveTab(AppTab.PRD)}
            icon={<FileText size={18} />}
            label="Ürün Stratejisi"
          />

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
                <NavItem
                  active={activeTab === AppTab.INTEGRATION}
                  onClick={() => setActiveTab(AppTab.INTEGRATION)}
                  icon={<Globe size={16} />}
                  label="Pazar Entegrasyonları"
                  isSubItem
                />
              </div>
            )}
          </div>
        </nav>

        <div className="p-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Cari Limit</p>
            <p className="text-lg font-black text-slate-900">{budgetLimit.toLocaleString()} ₺</p>
            <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-1000 ${totalCartCost > budgetLimit ? 'bg-rose-500' : 'bg-indigo-600'}`}
                style={{ width: `${Math.min(100, (totalCartCost / budgetLimit) * 100)}%` }}
              ></div>
            </div>
            <p className="text-[10px] mt-2 font-bold text-slate-400">Harcanan: {totalCartCost.toLocaleString()} ₺</p>
          </div>
        </div>
      </div>

      <main className="flex-grow overflow-y-auto h-screen">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-40 no-print">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>
            <span className="text-sm font-black uppercase tracking-widest text-slate-400">VizyonExcel /</span>
            <span className="text-sm font-black text-indigo-700 uppercase tracking-widest">{activeTab === AppTab.INTEGRATION ? 'Market Entegrasyonları' : activeTab}</span>
          </div>

          <div className="flex items-center gap-4">
            {integration.isConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                <Link2 size={14} className="text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-700 uppercase">Trendyol Bağlı</span>
              </div>
            )}
            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative bg-slate-50 rounded-full">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-black text-slate-900 leading-none">Trendyol Merchant</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">ID: {integration.supplierId}</p>
              </div>
              <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-indigo-100">
                TM
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 pb-32">
          {activeTab === AppTab.DASHBOARD && (
            <Dashboard
              products={products}
              integration={integration}
              onAddToCart={addToCart}
              onFileUpload={handleFileUpload}
              onUpdateProducts={setProducts}
              onNavigateToTab={setActiveTab}
            />
          )}
          {activeTab === AppTab.CART && (
            <CartView
              items={cart}
              onRemove={removeFromCart}
              onUpdateQty={updateCartQty}
            />
          )}
          {activeTab === AppTab.PRD && <PRDView />}
          {activeTab === AppTab.INTEGRATION && (
            <IntegrationView config={integration} onUpdate={setIntegration} />
          )}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, badge, isSubItem }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number, isSubItem?: boolean }) => (
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

export default App;
