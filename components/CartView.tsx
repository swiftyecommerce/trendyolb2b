
import React, { useMemo } from 'react';
import { CartItem } from '../types';
import { Trash2, FileDown, Plus, Minus, Receipt, AlertCircle, ShoppingCart, Info, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

interface CartViewProps {
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
}

const CartView: React.FC<CartViewProps> = ({ items, onRemove, onUpdateQty }) => {
  const totalCost = items.reduce((acc, curr) => acc + (curr.cost * curr.orderQuantity), 0);
  const totalItems = items.reduce((acc, curr) => acc + curr.orderQuantity, 0);

  const riskiestProduct = useMemo(() => {
    return [...items].sort((a, b) => {
      const aRisk = a.aiDecision?.riskLabel === 'Kritik' ? 3 : a.aiDecision?.riskLabel === 'Orta' ? 2 : 1;
      const bRisk = b.aiDecision?.riskLabel === 'Kritik' ? 3 : b.aiDecision?.riskLabel === 'Orta' ? 2 : 1;
      return bRisk - aRisk;
    })[0];
  }, [items]);

  const avgROI = useMemo(() => {
    if (items.length === 0) return 0;
    const totalDays = items.reduce((acc, curr) => acc + (curr.orderRecommendation?.targetDays || 20), 0);
    return Math.round(totalDays / items.length);
  }, [items]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Global Decision Header */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-xl shadow-indigo-100 flex flex-col justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4">Toplam Yatırım</h4>
            <div className="text-3xl font-black">{totalCost.toLocaleString()} ₺</div>
            <p className="text-[10px] mt-4 font-bold opacity-60 italic">Tedarikçi bazlı brüt maliyet tahminidir.</p>
          </div>
          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Clock size={14} className="text-indigo-600" /> Tahmini Geri Dönüş
            </h4>
            <div className="text-3xl font-black text-slate-900">~{avgROI} GÜN</div>
            <p className="text-[10px] mt-4 font-bold text-slate-400">Mevcut satış hızına göre stok erime süresi.</p>
          </div>
          {riskiestProduct && (
            <div className={`p-6 rounded-2xl border flex flex-col justify-between ${riskiestProduct.aiDecision?.riskLabel === 'Kritik' ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-200'}`}>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-4 flex items-center gap-2">
                <AlertTriangle size={14} /> En Riskli Kalem
              </h4>
              <div className="text-sm font-black text-slate-900 truncate uppercase">{riskiestProduct.name}</div>
              <p className="text-[10px] mt-4 font-bold text-rose-700 italic">Risk Seviyesi: {riskiestProduct.aiDecision?.riskLabel}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-grow space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-black flex items-center gap-2 text-indigo-900 uppercase tracking-widest text-xs">
                Sipariş Karar Ekranı
              </h3>
              <div className="flex gap-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{items.length} SKU</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{totalItems} TOPLAM ADET</span>
              </div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {items.length > 0 ? items.map(item => (
                <div key={item.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex-grow max-w-md">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-black text-slate-900 leading-tight uppercase text-sm">{item.name}</h4>
                      {item.aiDecision?.riskLabel === 'Kritik' && (
                        <span className="bg-rose-100 text-rose-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">KRİTİK RİSK</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                       <span className="text-[10px] text-slate-400 font-mono font-bold tracking-tighter">{item.sku}</span>
                       <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                         <Info size={10} /> {item.orderRecommendation?.reasoning || "Otomatik hesaplanan miktar."}
                       </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    <div className="flex flex-col items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1.5">Sipariş Miktarı</p>
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <button onClick={() => onUpdateQty(item.id, Math.max(0, item.orderQuantity - 1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><Minus size={14} /></button>
                        <input type="number" value={item.orderQuantity} onChange={(e) => onUpdateQty(item.id, parseInt(e.target.value) || 0)} className="w-12 text-center font-black text-sm bg-transparent outline-none tabular-nums" />
                        <button onClick={() => onUpdateQty(item.id, item.orderQuantity + 1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><Plus size={14} /></button>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                         {item.isOverridden && <span className="text-[8px] font-black text-amber-500 uppercase">Manuel Müdahale</span>}
                      </div>
                    </div>
                    
                    <div className="text-right min-w-[100px]">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Satır Toplamı</p>
                      <div className="text-lg font-black text-slate-900">{(item.cost * item.orderQuantity).toLocaleString()} ₺</div>
                    </div>
                    
                    <button onClick={() => onRemove(item.id)} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
              )) : (
                <div className="py-24 text-center">
                  <div className="mb-4 text-slate-100 flex justify-center"><ShoppingCart size={80} strokeWidth={1} /></div>
                  <p className="text-slate-400 text-sm font-black uppercase tracking-widest">Sipariş Listesi Boş</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full md:w-96 space-y-4 no-print">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm sticky top-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-900 leading-none">Kesinleşen Sipariş</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Maliyet + Vergi Tahmini</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-10 border-b border-dashed border-slate-100 pb-8">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400 uppercase tracking-tighter">Net Maliyet:</span>
                <span className="text-slate-900">{totalCost.toLocaleString()} ₺</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400 uppercase tracking-tighter">KDV (%20):</span>
                <span className="text-slate-900">{(totalCost * 0.2).toLocaleString()} ₺</span>
              </div>
              <div className="pt-2 flex justify-between items-baseline">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Genel Toplam:</span>
                <span className="text-3xl font-black text-indigo-600 tabular-nums">{(totalCost * 1.2).toLocaleString()} ₺</span>
              </div>
            </div>

            <button 
              onClick={handlePrint}
              disabled={items.length === 0}
              className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-5 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 disabled:opacity-50 active:scale-95 text-xs uppercase tracking-widest"
            >
              <FileDown size={20} /> TEDARİK RAPORUNU ONAYLA
            </button>
            
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
               <div className="flex gap-3">
                  <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                    Bu rapor, stok devir hızınıza göre optimize edilmiştir. Tahmini ROI süresi <strong>{avgROI} gündür.</strong> Yazdırılan belge resmi sipariş formu formatındadır.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print View Refined */}
      <div className="hidden print-only p-12 bg-white text-slate-900 min-h-screen">
        <div className="flex justify-between items-start mb-16 border-b-8 border-indigo-700 pb-8">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter text-indigo-700">VIZYONEXCEL</h1>
            <p className="text-sm font-black text-slate-500 mt-2 uppercase tracking-widest italic">Profesyonel Tedarik ve Stok Karar Formu</p>
          </div>
          <div className="text-right font-mono text-sm">
            <div className="font-black bg-slate-900 text-white px-3 py-1 inline-block mb-2">VX-ORDER-{Date.now().toString().slice(-6)}</div>
            <div className="font-bold">Düzenleme: {new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        <div className="mb-12">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-4 border-slate-900 text-left text-[11px] uppercase font-black text-slate-900">
                <th className="py-4 px-2">Ürün Tanımı / SKU</th>
                <th className="py-4 px-2 text-right">Birim Maliyet</th>
                <th className="py-4 px-2 text-center">Talep Edilen</th>
                <th className="py-4 px-2 text-right">Ara Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="py-5 px-2">
                    <div className="font-black text-slate-900 uppercase">{item.name}</div>
                    <div className="text-[10px] font-mono text-slate-500 font-bold mt-1">REF: {item.sku}</div>
                  </td>
                  <td className="py-5 px-2 text-right font-bold tabular-nums">{item.cost.toLocaleString()} ₺</td>
                  <td className="py-5 px-2 text-center font-black tabular-nums text-lg">{item.orderQuantity}</td>
                  <td className="py-5 px-2 text-right font-black tabular-nums">{(item.cost * item.orderQuantity).toLocaleString()} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-24">
          <div className="w-96 space-y-4 bg-slate-50 p-8 rounded-2xl border-2 border-slate-200">
            <div className="flex justify-between text-sm font-bold text-slate-500">
              <span className="uppercase tracking-widest">Sipariş Toplamı:</span>
              <span>{totalCost.toLocaleString()} ₺</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-500 border-b border-slate-200 pb-4">
              <span className="uppercase tracking-widest">KDV Dahil (%20):</span>
              <span>{(totalCost * 0.2).toLocaleString()} ₺</span>
            </div>
            <div className="pt-2 flex justify-between items-baseline">
              <span className="font-black text-lg uppercase tracking-widest">Genel Toplam:</span>
              <span className="text-4xl font-black text-indigo-700 tabular-nums">{(totalCost * 1.2).toLocaleString()} ₺</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-40 mt-32 px-12">
          <div className="text-center">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-20 tracking-widest">Satınalma / Onay Mercisi</div>
            <div className="h-px bg-slate-900 mb-3"></div>
            <div className="text-sm font-black text-slate-900 uppercase">Kaşe & İmza</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-20 tracking-widest">Tedarikçi Onay Birimi</div>
            <div className="h-px bg-slate-900 mb-3"></div>
            <div className="text-sm font-black text-slate-900 uppercase">Kaşe & İmza</div>
          </div>
        </div>
        
        <div className="absolute bottom-12 left-12 right-12 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] border-t-2 border-slate-100 pt-10">
          Bu sipariş formu VizyonExcel AI Stok Yönetimi Sistemi tarafından oluşturulmuştur • Kayıt No: {Math.random().toString(36).substring(7).toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default CartView;
