import React from 'react';
import { ShoppingCart, Trash2, Minus, Plus, FileDown, X, Package, FileText, ExternalLink } from 'lucide-react';
import { useAnalytics } from '../context/AnalyticsContext';
import { formatCurrency, formatNumber } from '../lib/excelParser';

const QuantityInput: React.FC<{
  value: number;
  onChange: (val: number) => void;
}> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = React.useState<string>(value.toString());

  React.useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    if (val === '') return; // Don't update parent if empty

    const numVal = Number(val);
    if (!isNaN(numVal)) {
      onChange(numVal);
    }
  };

  const handleBlur = () => {
    if (localValue === '' || isNaN(Number(localValue))) {
      setLocalValue(value.toString()); // Revert to valid value on blur if invalid
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(value - 1)}
        className="p-1 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
      >
        <Minus className="w-4 h-4 text-slate-600" />
      </button>
      <input
        type="number"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-16 text-center border border-slate-200 rounded-lg py-1 text-sm"
      />
      <button
        onClick={() => onChange(value + 1)}
        className="p-1 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
      >
        <Plus className="w-4 h-4 text-slate-600" />
      </button>
    </div>
  );
};

const CartView: React.FC = () => {
  const { cart, removeFromCart, updateCartQuantity, clearCart, state } = useAnalytics();

  const totalCost = cart.reduce((sum, item) => sum + item.totalCost, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleExportCSV = () => {
    if (cart.length === 0) return;

    const headers = ['Model Kodu', 'Ürün Adı', 'Adet', 'Birim Fiyat', 'Toplam'];
    const rows = cart.map(item => [
      item.modelKodu,
      `"${item.productName?.replace(/"/g, '""') || ''}"`,
      item.quantity,
      item.unitCost || 0,
      item.totalCost
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `siparis_listesi_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (cart.length === 0) return;

    const today = new Date().toLocaleDateString('tr-TR');

    // Create PDF content as HTML for printing
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sipariş Listesi - ${today}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      padding: 40px;
      color: #1e293b;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
    }
    .logo { 
      font-size: 28px; 
      font-weight: 900; 
      color: #4f46e5;
      font-style: italic;
    }
    .logo-sub { 
      font-size: 10px; 
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 4px;
    }
    .date { 
      text-align: right;
      font-size: 14px;
      color: #64748b;
    }
    .date strong {
      display: block;
      font-size: 16px;
      color: #1e293b;
    }
    h1 { 
      font-size: 24px; 
      margin-bottom: 8px;
      color: #1e293b;
    }
    .summary {
      display: flex;
      gap: 40px;
      margin-bottom: 30px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 12px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: #4f46e5;
      margin-top: 4px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 20px;
    }
    th { 
      background: #f1f5f9; 
      padding: 14px 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
    }
    th:last-child { text-align: center; }
    td { 
      padding: 16px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    td:last-child { text-align: center; font-weight: 600; }
    .product-name { 
      font-weight: 600;
      color: #1e293b;
    }
    .model-code { 
      font-size: 12px; 
      color: #94a3b8;
      margin-top: 2px;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">VizyonExcel</div>
      <div class="logo-sub">Sipariş Listesi</div>
    </div>
    <div class="date">
      <strong>${today}</strong>
      Oluşturulma Tarihi
    </div>
  </div>
  
  <div class="summary">
    <div class="summary-item">
      <div class="summary-label">Toplam Ürün</div>
      <div class="summary-value">${cart.length}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Toplam Adet</div>
      <div class="summary-value">${totalItems.toLocaleString('tr-TR')}</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th>Ürün</th>
        <th class="text-center" style="width: 100px;">Adet</th>
      </tr>
    </thead>
    <tbody>
      ${cart.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <div class="product-name">${item.productName || '-'}</div>
            <div class="model-code">${item.modelKodu}</div>
          </td>
          <td class="text-center">${item.quantity.toLocaleString('tr-TR')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    Bu belge VizyonExcel tarafından otomatik olarak oluşturulmuştur.
  </div>
</body>
</html>`;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load then trigger print
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sipariş Sepeti</h1>
          <p className="text-sm text-slate-500 mt-1">
            {cart.length > 0
              ? `${formatNumber(cart.length)} ürün, toplam ${formatNumber(totalItems)} adet`
              : 'Sepetiniz boş'
            }
          </p>
        </div>

        {cart.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF Çıktı
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              CSV İndir
            </button>
            <button
              onClick={clearCart}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Temizle
            </button>
          </div>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
          <ShoppingCart className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Sepet Boş</h3>
          <p className="text-slate-500">
            Ürünler veya Analiz sayfasından ürün ekleyebilirsiniz
          </p>
        </div>
      ) : (
        <>
          {/* Cart Items */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-slate-600">Ürün</th>
                  <th className="text-center p-4 text-sm font-semibold text-slate-600">Adet</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-600">Birim Fiyat</th>
                  <th className="text-right p-4 text-sm font-semibold text-slate-600">Toplam</th>
                  <th className="text-center p-4 text-sm font-semibold text-slate-600 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map(item => {
                  const product = state.products.find(p => p.modelKodu === item.modelKodu);
                  const productUrl = item.productUrl || product?.productUrl;

                  return (
                    <tr key={item.modelKodu} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-12 h-12 object-cover rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900 line-clamp-1">{item.productName}</p>
                            <div className="flex items-center gap-1">
                              <p className="text-xs text-slate-500">{item.modelKodu}</p>
                              {productUrl && (
                                <a
                                  href={productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-500 hover:text-indigo-600"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <QuantityInput
                          value={item.quantity}
                          onChange={(val) => updateCartQuantity(item.modelKodu, val)}
                        />
                      </td>
                      <td className="p-4 text-right text-slate-600">
                        {item.unitCost ? formatCurrency(item.unitCost) : '—'}
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-900">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => removeFromCart(item.modelKodu)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                })}
              </tbody>
            </table>
          </div>

          {/* Total Summary */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-indigo-100 text-sm">Toplam Sipariş Tutarı</p>
                <p className="text-4xl font-bold mt-1">{formatCurrency(totalCost)}</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-100 text-sm">{formatNumber(cart.length)} ürün</p>
                <p className="text-2xl font-semibold">{formatNumber(totalItems)} adet</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CartView;
