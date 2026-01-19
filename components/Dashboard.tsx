
import React, { useState, useMemo, useEffect } from 'react';
import { Product, AIAction, DecisionLabel, IntegrationConfig, AppTab } from '../types';
import { ShoppingCart, TrendingUp, BrainCircuit, Sparkles, PackageSearch, RefreshCw, Eye, PlusCircle, Filter, MousePointerClick, AlertTriangle, ChevronRight, ListFilter, Layers, Link2, CheckCircle2, XCircle, Search, Info, Settings, Zap, ArrowUpRight, BarChart3, Target, Activity } from 'lucide-react';
import { getBatchProductDecisions, getOrderRecommendations, analyzePotentialProducts, GEMINI_QUOTA_EXHAUSTED, simulateOrderRec, simulateDecision } from '../services/gemini';
import * as trendyol from '../services/trendyolClient';

interface DashboardProps {
  products: Product[];
  integration: IntegrationConfig;
  onAddToCart: (product: Product, qty?: number) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateProducts: (products: Product[]) => void;
  onNavigateToTab?: (tab: AppTab) => void; 
}

const Dashboard: React.FC<DashboardProps> = ({ products, integration, onAddToCart, onFileUpload, onUpdateProducts, onNavigateToTab }) => {
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'warning', message: string, detail?: string } | null>(null);
  const [targetDays, setTargetDays] = useState(20);
  const [filter, setFilter] = useState<DecisionLabel | 'Potential' | 'All' | 'SelectedActions'>('All');
  const [activeActionProductIds, setActiveActionProductIds] = useState<string[]>([]);
  const [generatedActions, setGeneratedActions] = useState<AIAction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiQuotaExhausted, setAiQuotaExhausted] = useState(false);
  
  // Ping State
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (!error) return "Bilinmeyen bir hata oluştu";
    const msg = error.response?.data?.message || error.message;
    if (msg && typeof msg === 'string') return msg;
    return String(error) || "Bilinmeyen bir hata oluştu";
  };

  const handlePing = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      // Relative path kullanımı 'Failed to fetch' hatalarını önler.
      const res = await fetch("/api/ping");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPingResult(`OK: ${data.message}`);
    } catch (e: any) {
      setPingResult(`HATA: ${e.message}`);
    } finally {
      setPinging(false);
      setTimeout(() => setPingResult(null), 5000);
    }
  };

  const handleSync = async () => {
    if (!integration.isConnected) {
      setSyncStatus({ 
        type: 'error', 
        message: 'Entegrasyon Gerekli', 
        detail: 'Trendyol verilerini çekebilmek için önce API bağlantısını tamamlamalısınız.' 
      });
      return;
    }

    setSyncing(true);
    setSyncStatus(null);
    console.log("SYNC REQUEST STARTED");

    try {
      const res = await trendyol.syncData({
        supplierId: integration.supplierId,
        apiKey: integration.apiKey,
        apiSecret: integration.apiSecret
      });

      console.log("SYNC RESPONSE RECEIVED", res);

      if (res && res.ok) {
        const dummyUpdatedProducts: Product[] = products.map((p: any) => ({
          ...p,
          sales: Math.floor(Math.random() * 500),
          stock: Math.floor(Math.random() * 100),
          trend: Math.floor(Math.random() * 40 - 20)
        }));

        onUpdateProducts(dummyUpdatedProducts);
        setSyncStatus({ 
          type: 'success', 
          message: 'Senkronizasyon Tamamlandı', 
          detail: res.message || `${res.ordersCount} sipariş ve ${res.productsCount} ürün kontrol edildi.` 
        });
      } else {
        setSyncStatus({ 
          type: 'error', 
          message: 'Senkronizasyon Başarısız', 
          detail: res?.message || 'Senkronizasyon sırasında bir sorun oluştu.' 
        });
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      setSyncStatus({ 
        type: 'error', 
        message: 'Senkronizasyon Hatası', 
        detail: getErrorMessage(error)
      });
    } finally {
      setSyncing(false);
    }
  };

  const processAIInsights = async () => {
    setLoadingProcess(true);
    setAiQuotaExhausted(false);
    try {
      const [decisions, recs, potentials] = await Promise.all([
        getBatchProductDecisions(products),
        getOrderRecommendations(products, targetDays),
        analyzePotentialProducts(products)
      ]);

      const updated = products.map(p => {
        const d = decisions.find((x: any) => x.id === p.id);
        const r = recs.find((x: any) => x.id === p.id);
        const pot = potentials.find((x: any) => x.id === p.id);
        return {
          ...p,
          aiDecision: d || simulateDecision(p),
          orderRecommendation: r || simulateOrderRec(p, targetDays),
          potentialAnalysis: pot
        };
      });

      onUpdateProducts(updated);

      const actions: AIAction[] = [
        { 
          id: 'act_1', 
          title: "Stok Takviyesi Gerekenler", 
          description: "Stoku tükenmek üzere olan ve satış hızı yüksek 3 ürünü hemen sepete ekle.", 
          type: 'order', 
          relatedProductIds: updated.filter(u => u.aiDecision?.label === 'Sipariş Bas').map(u => u.id).slice(0, 3), 
          cta: "LİSTEYİ GÖR",
          filterBy: 'Sipariş Bas'
        },
        { 
          id: 'act_2', 
          title: "Düşük Dönüşüm / Yüksek Trafik", 
          description: "Görüntülenmesi çok yüksek ancak sepete ekleme oranı düşük ürünleri optimize et.", 
          type: 'opportunity', 
          relatedProductIds: updated.filter(u => u.potentialAnalysis).map(u => u.id).slice(0, 3), 
          cta: "ANALİZ ET",
          filterBy: 'Potential'
        }
      ];
      setGeneratedActions(actions);
    } catch (error: any) {
      if (error.message === GEMINI_QUOTA_EXHAUSTED) {
        setAiQuotaExhausted(true);
        const updated = products.map(p => ({
          ...p,
          aiDecision: simulateDecision(p),
          orderRecommendation: simulateOrderRec(p, targetDays)
        }));
        onUpdateProducts(updated);
      } else {
        console.error("AI Process error:", error);
        alert(`AI Analiz hatası: ${getErrorMessage(error)}`);
      }
    } finally {
      setLoadingProcess(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    if (searchTerm) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filter === 'Sipariş Bas' || filter === 'Optimize Et' || filter === 'Sipariş Verme') {
      result = result.filter(p => p.aiDecision?.label === filter);
    } else if (filter === 'Potential') {
      result = result.filter(p => !!p.potentialAnalysis);
    } else if (filter === 'SelectedActions') {
      result = result.filter(p => activeActionProductIds.includes(p.id));
    }
    return result;
  }, [products, filter, searchTerm, activeActionProductIds]);

  const stats = useMemo(() => {
    const totalSales = products.reduce((a, b) => a + b.sales, 0);
    const avgConv = products.length > 0 ? products.reduce((a, b) => a + b.conversion, 0) / products.length : 0;
    const totalStockVal = products.reduce((a, b) => a + (b.stock * b.cost), 0);
    return { totalSales, avgConv, totalStockVal };
  }, [products]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Performans Özeti</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Trendyol mağazanızın son 30 günlük verileri analiz ediliyor.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Debug: Ping Button */}
          <button 
            onClick={handlePing}
            disabled={pinging}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pingResult ? (pingResult.includes('HATA') ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            <Activity size={14} className={pinging ? 'animate-spin' : ''} />
            {pinging ? 'BEKLEYİN...' : pingResult || 'PING TEST'}
          </button>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Ürün veya SKU ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold w-64 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
          
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${syncing ? 'bg-slate-100 text-slate-400' : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 shadow-sm'}`}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'GÜNCELLENİYOR...' : 'TRENDYOL SENKRONİZE ET'}
          </button>
          
          <button 
            onClick={processAIInsights}
            disabled={loadingProcess}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {loadingProcess ? <RefreshCw size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
            {loadingProcess ? 'AI ANALİZ EDİYOR...' : 'AKILLI ANALİZ BAŞLAT'}
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between animate-in slide-in-from-top-4 duration-300 ${syncStatus.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
          <div className="flex items-center gap-3">
            {syncStatus.type === 'error' ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
            <div>
              <p className="text-sm font-black uppercase tracking-tight">{syncStatus.message}</p>
              <p className="text-xs font-medium opacity-80">{syncStatus.detail}</p>
            </div>
          </div>
          <button onClick={() => setSyncStatus(null)} className="p-1 hover:bg-black/5 rounded-lg"><XCircle size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Toplam Satış" value={stats.totalSales.toLocaleString()} icon={<TrendingUp size={20} />} color="indigo" sub="Son 30 Gün" />
        <StatCard label="Dönüşüm Oranı" value={`%${stats.avgConv.toFixed(1)}`} icon={<ArrowUpRight size={20} />} color="emerald" sub="Mağaza Ortalaması" />
        <StatCard label="Satın Alma Değeri" value={`${stats.totalStockVal.toLocaleString()} ₺`} icon={<PackageSearch size={20} />} color="amber" sub="Maliyet Bazlı" />
        <StatCard label="Aktif SKU" value={products.length.toString()} icon={<Layers size={20} />} color="blue" sub="Yayındaki Ürün" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {generatedActions.length > 0 ? (
          generatedActions.map(action => (
            <div key={action.id} className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                {action.type === 'order' ? <Zap size={80} /> : <Sparkles size={80} />}
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${action.type === 'order' ? 'bg-amber-400' : 'bg-indigo-400'} text-slate-900`}>
                    {action.type === 'order' ? <Target size={18} /> : <Sparkles size={18} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">AI Aksiyon Planı</span>
                </div>
                <h3 className="text-xl font-black mb-2">{action.title}</h3>
                <p className="text-sm text-indigo-100/70 font-medium mb-6 leading-relaxed">{action.description}</p>
                <button 
                  onClick={() => {
                    setFilter(action.filterBy as any);
                    setActiveActionProductIds(action.relatedProductIds);
                  }}
                  className="w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                >
                  {action.cta}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="lg:col-span-3 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
              <BrainCircuit size={32} />
            </div>
            <h3 className="text-slate-900 font-black uppercase tracking-widest text-sm mb-2">AI Stratejileri Bekleniyor</h3>
            <p className="text-slate-400 text-xs font-medium max-w-sm mx-auto">Verilerinizi analiz ederek size özel sipariş ve optimizasyon stratejileri üretmek için yukarıdaki "Akıllı Analiz Başlat" butonuna tıklayın.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Ürün Kataloğu</h3>
            <div className="flex gap-2">
              <FilterButton active={filter === 'All'} onClick={() => setFilter('All')} label="HEPSİ" />
              <FilterButton active={filter === 'Sipariş Bas'} onClick={() => setFilter('Sipariş Bas')} label="SİPARİŞ" color="rose" />
              <FilterButton active={filter === 'Optimize Et'} onClick={() => setFilter('Optimize Et')} label="OPTİMİZE" color="amber" />
              <FilterButton active={filter === 'Potential'} onClick={() => setFilter('Potential')} label="FIRSATLAR" color="indigo" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş Projeksiyonu:</span>
            <select 
              value={targetDays} 
              onChange={(e) => setTargetDays(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-slate-600 outline-none"
            >
              <option value={15}>15 GÜN</option>
              <option value={20}>20 GÜN</option>
              <option value={30}>30 GÜN</option>
              <option value={45}>45 GÜN</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Ürün Bilgisi</th>
                <th className="px-6 py-4 text-center">Satış / Stok</th>
                <th className="px-6 py-4 text-center">Metrikler</th>
                <th className="px-6 py-4">AI Kararı</th>
                <th className="px-6 py-4 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center text-slate-400">
                        <PackageSearch size={20} />
                      </div>
                      <div className="max-w-[200px] md:max-w-xs">
                        <p className="font-black text-slate-900 text-xs truncate uppercase leading-tight">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-mono font-bold text-slate-400 tracking-tighter">{product.sku}</span>
                          {product.trend > 10 && <span className="flex items-center gap-0.5 text-[8px] font-black text-emerald-600 uppercase"><TrendingUp size={10} /> Trend</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <div className="text-xs font-black text-slate-900">{product.sales} <span className="text-[10px] text-slate-400">Adet</span></div>
                      <div className={`mt-1.5 px-2 py-0.5 rounded text-[10px] font-black ${product.stock < 10 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                        {product.stock} STOK
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                       <Metric small label="GÖR" value={product.views} />
                       <Metric small label="DÖN" value={`%${product.conversion}`} color={product.conversion < 1 ? 'rose' : 'slate'} />
                       <Metric small label="SEP" value={product.addToCart} />
                       <Metric small label="FAV" value={product.favorites} />
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {product.aiDecision ? (
                      <div className="space-y-1">
                        <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block ${
                          product.aiDecision.label === 'Sipariş Bas' ? 'bg-rose-600 text-white' : 
                          product.aiDecision.label === 'Optimize Et' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                        }`}>
                          {product.aiDecision.label}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-tight line-clamp-2 max-w-[180px]">{product.aiDecision.justification}</p>
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-slate-300 italic">Analiz bekleniyor...</div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-col items-end gap-2">
                      {product.orderRecommendation && product.orderRecommendation.suggestedQty > 0 ? (
                        <button 
                          onClick={() => onAddToCart(product, product.orderRecommendation?.suggestedQty)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <PlusCircle size={14} />
                          {product.orderRecommendation.suggestedQty} ADET EKLE
                        </button>
                      ) : (
                        <button 
                           onClick={() => onAddToCart(product, 1)}
                           className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <PlusCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color, sub }: { label: string, value: string, icon: React.ReactNode, color: string, sub: string }) => {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100'
  };
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl border ${colors[color]}`}>
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sub}</span>
      </div>
      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</h4>
      <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
    </div>
  );
};

const FilterButton = ({ active, onClick, label, color = 'slate' }: { active: boolean, onClick: () => void, label: string, color?: string }) => {
  const activeColors: any = {
    slate: 'bg-slate-900 text-white',
    rose: 'bg-rose-600 text-white',
    amber: 'bg-amber-500 text-white',
    indigo: 'bg-indigo-600 text-white'
  };
  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all ${active ? activeColors[color] : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
    >
      {label}
    </button>
  );
};

const Metric = ({ label, value, color = 'slate', small = false }: { label: string, value: any, color?: string, small?: boolean }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}:</span>
    <span className={`text-[10px] font-black ${color === 'rose' ? 'text-rose-600' : 'text-slate-700'}`}>{value}</span>
  </div>
);

export default Dashboard;
