import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import type { ReportPeriod } from '../types';

interface ExcelUploadProps {
    onProductUpload: (file: File) => Promise<void>;
    onReportUpload: (file: File, period: ReportPeriod) => Promise<void>;
}

const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
    { value: 'daily', label: '1 Günlük' },
    { value: 'weekly', label: '7 Günlük' },
    { value: 'monthly', label: '1 Aylık' },
    { value: 'yearly', label: '1 Yıllık' },
];

export const ExcelUpload: React.FC<ExcelUploadProps> = ({ onProductUpload, onReportUpload }) => {
    const [uploadType, setUploadType] = useState<'products' | 'report'>('products');
    const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('daily');
    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{
        status: 'idle' | 'loading' | 'success' | 'error';
        message: string;
    }>({ status: 'idle', message: '' });

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFile = async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            setUploadStatus({ status: 'error', message: 'Sadece Excel dosyaları (.xlsx, .xls) kabul edilir' });
            return;
        }

        setUploadStatus({ status: 'loading', message: 'Dosya işleniyor...' });

        try {
            if (uploadType === 'products') {
                await onProductUpload(file);
                setUploadStatus({ status: 'success', message: 'Ürün listesi başarıyla yüklendi!' });
            } else {
                await onReportUpload(file, selectedPeriod);
                setUploadStatus({
                    status: 'success',
                    message: `${REPORT_PERIODS.find(p => p.value === selectedPeriod)?.label} raporu başarıyla yüklendi!`
                });
            }
        } catch (error) {
            setUploadStatus({
                status: 'error',
                message: error instanceof Error ? error.message : 'Dosya yüklenirken bir hata oluştu'
            });
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [uploadType, selectedPeriod]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = '';
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-orange-400" />
                Excel Yükleme
            </h2>

            {/* Upload Type Selection */}
            <div className="flex gap-4 mb-6">
                <button
                    onClick={() => setUploadType('products')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${uploadType === 'products'
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    Ürün Listesi
                </button>
                <button
                    onClick={() => setUploadType('report')}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${uploadType === 'report'
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                >
                    Satış Raporu
                </button>
            </div>

            {/* Period Selection for Reports */}
            {uploadType === 'report' && (
                <div className="grid grid-cols-4 gap-2 mb-6">
                    {REPORT_PERIODS.map(period => (
                        <button
                            key={period.value}
                            onClick={() => setSelectedPeriod(period.value)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${selectedPeriod === period.value
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging
                        ? 'border-orange-400 bg-orange-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
            >
                <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-orange-400' : 'text-gray-500'}`} />
                <p className="text-gray-300 mb-2">
                    {uploadType === 'products' ? 'Trendyol ürün listesi Excel' : 'Satış raporu Excel'} dosyasını sürükleyin
                </p>
                <p className="text-gray-500 text-sm">veya dosya seçmek için tıklayın</p>
            </div>

            {/* Upload Status */}
            {uploadStatus.status !== 'idle' && (
                <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 ${uploadStatus.status === 'loading' ? 'bg-blue-500/20 text-blue-300' :
                        uploadStatus.status === 'success' ? 'bg-green-500/20 text-green-300' :
                            'bg-red-500/20 text-red-300'
                    }`}>
                    {uploadStatus.status === 'loading' && (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    )}
                    {uploadStatus.status === 'success' && <CheckCircle className="w-5 h-5" />}
                    {uploadStatus.status === 'error' && <AlertCircle className="w-5 h-5" />}
                    <span className="flex-1">{uploadStatus.message}</span>
                    {uploadStatus.status !== 'loading' && (
                        <button
                            onClick={() => setUploadStatus({ status: 'idle', message: '' })}
                            className="p-1 hover:bg-white/10 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
