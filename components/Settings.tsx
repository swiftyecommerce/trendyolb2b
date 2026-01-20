import React from 'react';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import { useAnalytics } from '../context/AnalyticsContext';

const Settings: React.FC = () => {
    const { settings, updateSettings } = useAnalytics();

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Ayarlar</h1>
                <p className="text-sm text-slate-500 mt-1">Analiz ve stok hesaplama parametreleri</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {/* Stock Target Days */}
                <div className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900">Stok Hedef Gün Sayısı</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Sipariş önerisi hesaplarken kaç günlük stok hedeflenmeli
                            </p>
                        </div>
                        <select
                            value={settings.targetStockDays}
                            onChange={(e) => updateSettings({ targetStockDays: Number(e.target.value) })}
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value={15}>15 gün</option>
                            <option value={20}>20 gün</option>
                            <option value={30}>30 gün</option>
                            <option value={45}>45 gün</option>
                            <option value={60}>60 gün</option>
                            <option value={90}>90 gün</option>
                        </select>
                    </div>
                </div>

                {/* Low Stock Threshold */}
                <div className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900">Düşük Stok Eşiği</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Bu değerin altındaki stoklar "düşük stok" olarak işaretlenir
                            </p>
                        </div>
                        <input
                            type="number"
                            value={settings.lowStockThreshold}
                            onChange={(e) => updateSettings({ lowStockThreshold: Number(e.target.value) })}
                            className="w-24 px-4 py-2 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Min Impressions for Opportunity */}
                <div className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900">Fırsat Analizi Min. Görüntülenme</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Fırsat analizinde değerlendirilmek için minimum görüntülenme sayısı
                            </p>
                        </div>
                        <input
                            type="number"
                            value={settings.minImpressionsForOpportunity}
                            onChange={(e) => updateSettings({ minImpressionsForOpportunity: Number(e.target.value) })}
                            className="w-24 px-4 py-2 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Currency */}
                <div className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900">Para Birimi</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Tüm fiyat ve ciro gösterimlerinde kullanılacak
                            </p>
                        </div>
                        <select
                            value={settings.currency}
                            onChange={(e) => updateSettings({ currency: e.target.value })}
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="TRY">Türk Lirası (₺)</option>
                            <option value="USD">US Dollar ($)</option>
                            <option value="EUR">Euro (€)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-700">
                    <strong>Not:</strong> Ayarlar otomatik olarak kaydedilir ve tarayıcı belleğinde saklanır.
                </p>
            </div>
        </div>
    );
};

export default Settings;
