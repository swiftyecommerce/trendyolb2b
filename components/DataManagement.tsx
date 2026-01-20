import React, { useState } from 'react';
import {
    Database, Upload, FileSpreadsheet, Clock, Trash2,
    CheckCircle, AlertCircle, X, RefreshCw
} from 'lucide-react';
import { useAnalytics } from '../context/AnalyticsContext';
import { formatDate, formatNumber } from '../lib/excelParser';
import type { ReportPeriod } from '../types';

const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
    { value: 'daily', label: '1 Günlük' },
    { value: 'weekly', label: '7 Günlük' },
    { value: 'monthly', label: '1 Aylık' },
    { value: 'yearly', label: '1 Yıllık' },
];

const DataManagement: React.FC = () => {
    const { state, uploadProductList, uploadSalesReport, clearAllData, refreshData, isLoading } = useAnalytics();
    const [uploadType, setUploadType] = useState<'products' | 'report'>('products');
    const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('monthly');
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{
        status: 'idle' | 'loading' | 'success' | 'error';
        message: string;
    }>({ status: 'idle', message: '' });

    const handleFile = async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            setUploadStatus({ status: 'error', message: 'Sadece Excel dosyaları (.xlsx, .xls) kabul edilir' });
            return;
        }

        setUploadStatus({ status: 'loading', message: 'Dosya işleniyor...' });

        try {
            const buffer = await file.arrayBuffer();

            if (uploadType === 'products') {
                const count = await uploadProductList(buffer);
                setUploadStatus({ status: 'success', message: `${formatNumber(count)} ürün yüklendi!` });
            } else {
                const count = await uploadSalesReport(buffer, selectedPeriod);
                const periodLabel = REPORT_PERIODS.find(p => p.value === selectedPeriod)?.label;
                setUploadStatus({ status: 'success', message: `${periodLabel} raporu: ${formatNumber(count)} kayıt yüklendi!` });
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
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Veri Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-1">Excel dosyalarından veri yükleyin</p>
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
                    <button
                        onClick={handleClearAll}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Tümünü Sil
                    </button>
                </div>
            </div>

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

                    {/* Period Selection */}
                    {uploadType === 'report' && (
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {REPORT_PERIODS.map(period => (
                                <button
                                    key={period.value}
                                    onClick={() => setSelectedPeriod(period.value)}
                                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${selectedPeriod === period.value
                                            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
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

                {/* Loaded Data Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-emerald-600" />
                        Yüklü Veriler
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

                            {/* Loaded reports */}
                            {state.loadedReports.map((report, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">
                                                {REPORT_PERIODS.find(p => p.value === report.period)?.label} Raporu
                                            </p>
                                            <p className="text-xs text-slate-400">{formatDate(report.uploadDate)}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-600">{formatNumber(report.rowCount)} kayıt</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-sm text-amber-800">
                    <strong>Not:</strong> Aynı dönem raporu tekrar yüklendiğinde eski veri silinir ve yenisiyle değiştirilir.
                    Farklı dönem raporları birlikte saklanabilir.
                </p>
            </div>
        </div>
    );
};

export default DataManagement;
