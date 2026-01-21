import React, { useState, useMemo } from 'react';
import {
    Database, Upload, FileSpreadsheet, Clock, Trash2,
    CheckCircle, AlertCircle, X, RefreshCw, Calendar,
    ChevronLeft, ChevronRight, AlertTriangle, Info
} from 'lucide-react';
import { useAnalytics } from '../context/AnalyticsContext';
import { formatDate, formatNumber, formatCurrency } from '../lib/excelParser';
import type { ReportPeriod } from '../types';

// ============================================
// CONSTANTS
// ============================================

const MONTH_NAMES = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

import { CloudUpload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CURRENT_PERIODS: { value: ReportPeriod; label: string; days: number }[] = [
    { value: 'daily', label: '1 Günlük', days: 1 },
    { value: 'weekly', label: '7 Günlük', days: 7 },
    { value: 'monthly', label: '30 Günlük', days: 30 },
];

// ============================================
// MAIN COMPONENT
// ============================================

const DataManagement: React.FC = () => {
    const { state, uploadProductList, uploadSalesReport, clearAllData, refreshData, isLoading, saveData } = useAnalytics();
    const { user } = useAuth();

    // View state
    const [activeSection, setActiveSection] = useState<'current' | 'historical'>('current');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Upload state
    const [uploadType, setUploadType] = useState<'products' | 'report'>('products');
    const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('monthly');
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{
        status: 'idle' | 'loading' | 'success' | 'error';
        message: string;
    }>({ status: 'idle', message: '' });

    // Current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Get loaded months from state
    const loadedMonths = useMemo(() => {
        // Extract month info from loaded reports
        const months: Map<string, { year: number; month: number; rowCount: number; uploadDate: string }> = new Map();

        state.loadedReports.forEach(report => {
            // Parse if it's a monthly report with year/month info
            if (report.period === 'monthly' && report.year && report.month) {
                const key = `${report.year}-${report.month}`;
                months.set(key, {
                    year: report.year,
                    month: report.month,
                    rowCount: report.rowCount,
                    uploadDate: report.uploadDate
                });
            }
        });

        return months;
    }, [state.loadedReports]);

    // Calculate which months are missing for YoY comparison
    const missingMonths = useMemo(() => {
        const missing: Array<{ year: number; month: number; reason: string }> = [];

        // Check if current month of last year is missing
        const lastYearKey = `${currentYear - 1}-${currentMonth}`;
        if (!loadedMonths.has(lastYearKey)) {
            missing.push({
                year: currentYear - 1,
                month: currentMonth,
                reason: 'YoY karşılaştırma için gerekli'
            });
        }

        return missing;
    }, [loadedMonths, currentYear, currentMonth]);

    // Handle file upload
    const handleFile = async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            setUploadStatus({ status: 'error', message: 'Sadece Excel dosyaları (.xlsx, .xls) kabul edilir' });
            return;
        }

        setUploadStatus({ status: 'loading', message: 'Dosya işleniyor...' });

        try {
            const buffer = await file.arrayBuffer();

            if (uploadType === 'products') {
                // Upload product list (for stock, price info)
                const count = await uploadProductList(buffer);
                setUploadStatus({ status: 'success', message: `${formatNumber(count)} ürün yüklendi!` });
            } else {
                // Upload sales report
                const count = await uploadSalesReport(buffer, selectedPeriod, selectedMonth ? {
                    year: selectedYear,
                    month: selectedMonth
                } : undefined);

                const periodLabel = selectedMonth
                    ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                    : CURRENT_PERIODS.find(p => p.value === selectedPeriod)?.label;

                setUploadStatus({ status: 'success', message: `${periodLabel}: ${formatNumber(count)} kayıt yüklendi!` });
                setSelectedMonth(null);
            }
        } catch (error) {
            setUploadStatus({
                status: 'error',
                message: error instanceof Error ? error.message : 'Dosya yüklenirken bir hata oluştu'
            });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    };

    const handleClearAll = () => {
        if (confirm('Tüm yüklenen veriler silinecek. Emin misiniz?')) {
            clearAllData();
            setUploadStatus({ status: 'idle', message: '' });
        }
    };

    return (
        <div className="max-w-5xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Veri Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Tarihsel ve güncel satış verilerini yönetin
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={refreshData}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Yenile
                    </button>
                    {user?.type === 'persistent' && (
                        <button
                            onClick={() => {
                                if (confirm('Veriler manuel olarak buluta yedeklensin mi?')) {
                                    saveData();
                                    alert('Yedekleme başlatıldı.');
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                            <CloudUpload className="w-4 h-4" />
                            Buluta Yedekle
                        </button>
                    )}
                    <button
                        onClick={handleClearAll}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Tümünü Sil
                    </button>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                    onClick={() => setActiveSection('current')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${activeSection === 'current'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    <Clock className="w-4 h-4" />
                    Güncel Veriler
                </button>
                <button
                    onClick={() => setActiveSection('historical')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${activeSection === 'historical'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    <Calendar className="w-4 h-4" />
                    Aylık Tarihsel Veri
                </button>
            </div>

            {/* Missing Data Warning */}
            {missingMonths.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-amber-900">Eksik Veri Uyarısı</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                YoY karşılaştırma için şu verilere ihtiyaç var:
                            </p>
                            <ul className="mt-2 space-y-1">
                                {missingMonths.map((m, idx) => (
                                    <li key={idx} className="text-sm text-amber-700">
                                        • {MONTH_NAMES[m.month - 1]} {m.year} - {m.reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Current Data Section */}
            {activeSection === 'current' && (
                <div className="grid grid-cols-2 gap-6">
                    {/* Upload Section */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                            Excel Yükleme
                        </h2>

                        {/* Upload Type Selection */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setUploadType('products')}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${uploadType === 'products'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                Ürün Listesi
                            </button>
                            <button
                                onClick={() => setUploadType('report')}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${uploadType === 'report'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                Satış Raporu
                            </button>
                        </div>

                        {/* Period Selection - only for sales report */}
                        {uploadType === 'report' && (
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {CURRENT_PERIODS.map(period => (
                                    <button
                                        key={period.value}
                                        onClick={() => setSelectedPeriod(period.value)}
                                        className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${selectedPeriod === period.value
                                            ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {period.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Drop Zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging
                                ? 'border-indigo-400 bg-indigo-50'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileInput}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />

                            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                            <p className="text-sm text-slate-600 mb-1">
                                Excel dosyasını sürükleyin
                            </p>
                            <p className="text-xs text-slate-400">veya tıklayarak seçin</p>
                        </div>

                        {/* Status Message */}
                        {uploadStatus.status !== 'idle' && (
                            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${uploadStatus.status === 'loading' ? 'bg-blue-50 text-blue-700' :
                                uploadStatus.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                                    'bg-red-50 text-red-700'
                                }`}>
                                {uploadStatus.status === 'loading' && (
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                )}
                                {uploadStatus.status === 'success' && <CheckCircle className="w-4 h-4" />}
                                {uploadStatus.status === 'error' && <AlertCircle className="w-4 h-4" />}
                                <span className="flex-1">{uploadStatus.message}</span>
                                {uploadStatus.status !== 'loading' && (
                                    <button onClick={() => setUploadStatus({ status: 'idle', message: '' })}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Current Data Status */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Database className="w-5 h-5 text-emerald-600" />
                            Yüklü Güncel Veriler
                        </h2>

                        {state.loadedReports.length === 0 && state.products.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p>Henüz veri yüklenmedi</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Product count */}
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">Toplam Ürün</span>
                                    </div>
                                    <span className="text-lg font-bold text-slate-900">{formatNumber(state.products.length)}</span>
                                </div>

                                {/* Current period reports */}
                                {state.loadedReports.filter(r => ['daily', 'weekly', 'monthly'].includes(r.period)).map((report, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">
                                                    {CURRENT_PERIODS.find(p => p.value === report.period)?.label}
                                                </p>
                                                <p className="text-xs text-slate-400">{formatDate(report.uploadDate)}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-600">
                                            {formatNumber(report.rowCount)} kayıt
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Historical Data Section */}
            {activeSection === 'historical' && (
                <div className="space-y-6">
                    {/* Year Selector */}
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => setSelectedYear(y => y - 1)}
                            className="p-2 hover:bg-slate-100 rounded-lg"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex gap-2">
                            {[currentYear - 1, currentYear].map(year => (
                                <button
                                    key={year}
                                    onClick={() => setSelectedYear(year)}
                                    className={`px-6 py-2 rounded-lg font-bold transition-all ${selectedYear === year
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setSelectedYear(y => y + 1)}
                            disabled={selectedYear >= currentYear}
                            className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Monthly Grid */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">
                            {selectedYear} Aylık Veriler
                        </h3>

                        <div className="grid grid-cols-4 gap-3">
                            {MONTH_NAMES.map((monthName, idx) => {
                                const monthNum = idx + 1;
                                const key = `${selectedYear}-${monthNum}`;
                                const data = loadedMonths.get(key);
                                const isCurrentMonth = selectedYear === currentYear && monthNum === currentMonth;
                                const isFutureMonth = selectedYear === currentYear && monthNum > currentMonth;
                                const isPastYear = selectedYear < currentYear;
                                const needsForYoY = isPastYear && monthNum === currentMonth;

                                return (
                                    <div
                                        key={monthNum}
                                        onClick={() => {
                                            if (!isFutureMonth && !data) {
                                                setSelectedMonth(monthNum);
                                                setSelectedPeriod('monthly');
                                            }
                                        }}
                                        className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${data
                                            ? 'border-emerald-200 bg-emerald-50'
                                            : isFutureMonth
                                                ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-50'
                                                : needsForYoY
                                                    ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
                                                    : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                                            } ${selectedMonth === monthNum ? 'ring-2 ring-indigo-500' : ''}`}
                                    >
                                        {/* Status indicator */}
                                        {data && (
                                            <div className="absolute top-2 right-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            </div>
                                        )}
                                        {!data && needsForYoY && (
                                            <div className="absolute top-2 right-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                            </div>
                                        )}

                                        <p className={`text-sm font-semibold ${isCurrentMonth ? 'text-indigo-600' : 'text-slate-700'
                                            }`}>
                                            {monthName}
                                            {isCurrentMonth && (
                                                <span className="ml-1 text-xs font-normal text-indigo-400">(şu an)</span>
                                            )}
                                        </p>

                                        {data ? (
                                            <div className="mt-2">
                                                <p className="text-lg font-bold text-emerald-700">
                                                    {formatNumber(data.rowCount)}
                                                </p>
                                                <p className="text-xs text-slate-500">kayıt</p>
                                            </div>
                                        ) : (
                                            <div className="mt-2">
                                                <p className="text-xs text-slate-400">
                                                    {isFutureMonth ? 'Gelecek ay' : 'Veri yok'}
                                                </p>
                                                {!isFutureMonth && (
                                                    <p className="text-xs text-indigo-500 mt-1">
                                                        Yüklemek için tıkla
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Upload for selected month */}
                    {selectedMonth && (
                        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6">
                            <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                                <Upload className="w-5 h-5" />
                                {MONTH_NAMES[selectedMonth - 1]} {selectedYear} Verisi Yükle
                            </h3>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging
                                    ? 'border-indigo-400 bg-white'
                                    : 'border-indigo-300 bg-white/50 hover:bg-white'
                                    }`}
                            >
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileInput}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />

                                <Upload className="w-10 h-10 mx-auto mb-3 text-indigo-400" />
                                <p className="text-sm text-indigo-700 mb-1">
                                    {MONTH_NAMES[selectedMonth - 1]} {selectedYear} Excel dosyasını sürükleyin
                                </p>
                                <p className="text-xs text-indigo-400">veya tıklayarak seçin</p>
                            </div>

                            <button
                                onClick={() => setSelectedMonth(null)}
                                className="mt-4 text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                İptal
                            </button>

                            {/* Status Message */}
                            {uploadStatus.status !== 'idle' && (
                                <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${uploadStatus.status === 'loading' ? 'bg-blue-50 text-blue-700' :
                                    uploadStatus.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                                        'bg-red-50 text-red-700'
                                    }`}>
                                    {uploadStatus.status === 'loading' && (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {uploadStatus.status === 'success' && <CheckCircle className="w-4 h-4" />}
                                    {uploadStatus.status === 'error' && <AlertCircle className="w-4 h-4" />}
                                    <span className="flex-1">{uploadStatus.message}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Info box */}
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-blue-900">Tarihsel Veri Neden Önemli?</h4>
                                <ul className="mt-2 space-y-1 text-sm text-blue-700">
                                    <li>• Yıl bazlı karşılaştırma (YoY) için geçen yılın aynı ayına ihtiyaç var</li>
                                    <li>• Mevsimsellik analizi için birden fazla ay verisi gerekli</li>
                                    <li>• Trend tespiti için uzun dönem verisi önemli</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataManagement;
