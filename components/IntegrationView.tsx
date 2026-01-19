
import React, { useState } from 'react';
import { IntegrationConfig } from '../types';
import { Key, ShieldCheck, Database, RefreshCcw, Copy, ExternalLink, CheckCircle2, Globe, HelpCircle, Zap, Activity, Info, Lock, Save, AlertCircle, Store, ChevronDown } from 'lucide-react';
import * as trendyol from '../services/trendyolClient';

interface IntegrationViewProps {
  config: IntegrationConfig;
  onUpdate: (config: IntegrationConfig) => void;
}

const IntegrationView: React.FC<IntegrationViewProps> = ({ config, onUpdate }) => {
  const [form, setForm] = useState(formFromConfig(config));
  const [isSaved, setIsSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; detail?: string } | null>(null);

  function formFromConfig(c: IntegrationConfig) {
    return {
      supplierId: c.supplierId || '',
      apiKey: c.apiKey || '',
      apiSecret: c.apiSecret || '',
      corsProxy: c.corsProxy || '',
      integrationReferenceCode: c.integrationReferenceCode || '',
      token: c.token || ''
    };
  }

  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (!error) return "Bilinmeyen bir hata oluştu";
    const msg = error.response?.data?.message || error.message;
    if (msg && typeof msg === 'string') return msg;
    return String(error) || "Bilinmeyen bir hata oluştu";
  };

  const handleSave = () => {
    onUpdate({
      ...form,
      isConnected: true,
      lastSync: new Date().toLocaleString('tr-TR')
    });
    setIsSaved(true);
    setTestResult(null);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    if (!form.supplierId || !form.apiKey || !form.apiSecret) {
      setTestResult({
        success: false,
        message: "Eksik Bilgi",
        detail: "Lütfen tüm zorunlu alanları doldurun."
      });
      setIsTesting(false);
      return;
    }

    try {
      const response = await fetch("/api/trendyol/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: form.supplierId,
          apiKey: form.apiKey,
          apiSecret: form.apiSecret,
          integrationReferenceCode: form.integrationReferenceCode,
          token: form.token
        }),
      });

      // Safe Parsing Logic
      const text = await response.text();
      let res;
      try {
        res = JSON.parse(text);
      } catch (e) {
        // If backend didn't return JSON (e.g. Vercel error page 500/404/504)
        console.error("JSON PARSE ERROR. Raw text:", text);
        setTestResult({
          success: false,
          message: "Backend Yanıt Formatı Hatası",
          detail: "Sunucu JSON döndürmedi.",
          rawBodyPreview: text.substring(0, 300)
        });
        return;
      }

      // Check if backend returned valid object
      if (!res || typeof res !== 'object') {
        setTestResult({
          success: false,
          message: "Geçersiz Yanıt",
          detail: "Sunucu boş veya bozuk veri döndürdü.",
          rawBodyPreview: String(text)
        });
        return;
      }

      if (res.ok) {
        setTestResult({
          success: true,
          message: res.message || "Bağlantı Başarılı",
          detail: `Status: ${res.status}`,
          debug: res
        } as any);
      } else {
        setTestResult({
          success: false,
          message: res.error || "Bağlantı Başarısız",
          detail: `Status: ${res.status}${res.contentType ? ` | Content-Type: ${res.contentType}` : ''}`,
          rawBodyPreview: res.rawSnippet,
          debug: res
        } as any);
      }
    } catch (e: any) {
      console.error("Network/Client Error:", e);
      setTestResult({
        success: false,
        message: "Ağ veya İstemci Hatası",
        detail: getErrorMessage(e)
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col gap-1 mb-4">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span>Ayarlar</span>
          <div className="h-1 -1 rounded-full bg-slate-300"></div>
          <span>Market Entegrasyonları</span>
          <div className="h-1 -1 rounded-full bg-slate-300"></div>
          <span className="text-indigo-600">Trendyol</span>
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Trendyol API Entegrasyonu</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
                  <Store size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">Trendyol Satıcı Bilgileri</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Bu bilgiler backend üzerinden güvenli bir şekilde işlenir.</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Satıcı ID (Supplier ID) *</label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={form.supplierId}
                      onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all group-hover:border-indigo-300"
                      placeholder="Örn: 123456"
                    />
                    <div className="absolute right-4 top-3.5 text-slate-300"><Info size={16} /></div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">API Key / Kullanıcı Adı *</label>
                  <input
                    type="text"
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-indigo-300"
                    placeholder="Trendyol panelinden alınır"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">API Secret / Şifre *</label>
                <div className="relative group">
                  <input
                    type="password"
                    value={form.apiSecret}
                    onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-indigo-300"
                    placeholder="••••••••••••••••"
                  />
                  <div className="absolute left-4 top-3.5 text-slate-400"><Lock size={16} /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Entegrasyon Referans Kodu (Opsiyonel)</label>
                  <input
                    type="text"
                    value={form.integrationReferenceCode || ''}
                    onChange={(e) => setForm({ ...form, integrationReferenceCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-indigo-300"
                    placeholder="Varsa giriniz"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Token (Opsiyonel)</label>
                  <input
                    type="text"
                    value={form.token || ''}
                    onChange={(e) => setForm({ ...form, token: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:border-indigo-300"
                    placeholder="Varsa giriniz"
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col md:flex-row gap-4">
                <button
                  onClick={testConnection}
                  disabled={isTesting}
                  className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-500 hover:text-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isTesting ? <Activity size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
                  {isTesting ? 'BAĞLANTI TEST EDİLİYOR...' : 'TEST BAĞLANTISI'}
                </button>

                <button
                  onClick={handleSave}
                  className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 ${isSaved ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'}`}
                >
                  {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                  {isSaved ? 'KAYDEDİLDİ' : 'BİLGİLERİ KAYDET'}
                </button>
              </div>

              {testResult && (
                <div className={`p-6 rounded-2xl border animate-in slide-in-from-top-4 duration-300 flex flex-col gap-4 ${testResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                  <div className="flex gap-4">
                    <div className="mt-1">
                      {testResult.success ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                    </div>
                    <div className="flex-1 w-full min-w-0">
                      <p className="text-sm font-black uppercase tracking-tight leading-none mb-1">{testResult.message}</p>
                      {(testResult as any).detail && (
                        <p className="text-xs font-medium opacity-80 mt-1 break-all">{(testResult as any).detail}</p>
                      )}

                      {/* Trendyol JSON Body Error */}
                      {(testResult as any).debug?.body && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Trendyol Hata Gövdesi</p>
                          <pre className="text-[10px] bg-white/50 border border-slate-200 p-2 rounded-lg overflow-auto max-h-40">
                            {JSON.stringify((testResult as any).debug.body, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Trendyol Raw (HTML/Text) Error */}
                      {(testResult as any).debug?.raw && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Trendyol Ham Cevap</p>
                          <div className="text-[10px] font-mono bg-rose-100/50 border border-rose-200 p-2 rounded-lg overflow-auto max-h-40 break-all whitespace-pre-wrap text-rose-800">
                            {(testResult as any).debug.raw}
                          </div>
                        </div>
                      )}

                      {/* 403 Warning */}
                      {testResult.message && testResult.message.includes('403') && (
                        <div className="mt-3 p-3 bg-rose-100 text-rose-900 rounded-lg text-xs font-bold border border-rose-200">
                          ⚠️ User-Agent veya Yetki Hatası! <br />
                          Lütfen API Key/Secret doğruluğunu, IP engeli olup olmadığını ve User-Agent header'ının gittiğini kontrol edin.
                        </div>
                      )}

                      {(testResult as any).rawBodyPreview && (
                        <p className="mt-2 text-[10px] font-mono opacity-70 bg-black/5 p-1.5 rounded">
                          Raw: {(testResult as any).rawBodyPreview}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Debug Info - Only in Development */}
                  {import.meta.env.DEV && (testResult as any).debug && (
                    <div className="mt-2 p-3 bg-black/5 rounded-xl text-[10px] font-mono whitespace-pre-wrap overflow-auto max-h-40 border border-black/5">
                      <strong>DEBUG INFO (Dev Only):</strong>
                      {JSON.stringify((testResult as any).debug, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8">
            <div className="flex items-center gap-2 text-indigo-700 mb-4">
              <ShieldCheck size={20} />
              <h4 className="text-xs font-black uppercase tracking-widest">Güvenli Bağlantı</h4>
            </div>
            <p className="text-[11px] text-indigo-800 font-medium mb-4 leading-relaxed">
              Tüm Trendyol API istekleri CORS engellerini aşmak ve güvenliği sağlamak için sunucu taraflı proxy katmanımız üzerinden geçmektedir.
            </p>
            <div className="p-3 bg-white/50 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase mb-1">
                <Activity size={12} /> Durum: Aktif
              </div>
              <p className="text-[9px] text-indigo-400">Sunucu: VizyonExcel Secure Proxy v2.1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationView;
