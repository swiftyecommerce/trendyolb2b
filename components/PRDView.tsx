
import React from 'react';

const PRDView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 bg-white shadow-sm border border-slate-200 rounded-xl">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">PRD: VizyonExcel v1.0</h1>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">1. Problem Tanımı</h2>
        <p className="text-slate-600 mb-4">
          Trendyol satıcıları, platformun sağladığı Excel raporlarını analiz etmek için saatlerini harcamaktadır. Mevcut raporlar ham veri halindedir; hangi ürünün ne kadar sipariş edilmesi gerektiği, bütçe kısıtları dahilinde hangi ürünün daha karlı olduğu ve stok-satış dengesi manuel hesaplamalara dayanır. Bu durum hatalı siparişlere ve nakit akışı problemlerine yol açar.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">2. Hedef Kullanıcılar</h2>
        <ul className="list-disc pl-5 text-slate-600 space-y-1">
          <li><strong>KOBİ Satıcıları:</strong> Stok takibini manuel yapan küçük ve orta ölçekli mağazalar.</li>
          <li><strong>Kategori Yöneticileri:</strong> Büyük mağazalarda hangi ürün grubuna yatırım yapacağını seçen profesyoneller.</li>
          <li><strong>Tedarik Operasyon Sorumluları:</strong> Tedarikçiye sipariş listesi hazırlayan ekipler.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">3. Jobs-to-be-Done (JTBD)</h2>
        <p className="italic text-slate-500 mb-2">"Trendyol raporumu sisteme yüklediğimde, verileri görsel olarak anlamak ve bütçeme en uygun sipariş listesini PDF olarak alıp tedarikçime göndermek istiyorum."</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">4. Kapsam (Scope)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
            <h3 className="font-bold text-indigo-800 mb-2">MVP (4 Hafta)</h3>
            <ul className="text-xs space-y-1 text-indigo-900">
              <li>• Trendyol Excel/CSV İçe Aktarma</li>
              <li>• Temel Metrikler (Satış, Ciro, Dönüşüm)</li>
              <li>• Manuel Sipariş Sepeti</li>
              <li>• PDF Çıktısı (Sipariş Formu)</li>
              <li>• Bütçe Hesaplama</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2">v1.1 (Sonraki)</h3>
            <ul className="text-xs space-y-1 text-slate-600">
              <li>• Akıllı Stok Tahminleme (AI)</li>
              <li>• Geçmiş Rapor Karşılaştırma</li>
              <li>• Çoklu Tedarikçi Yönetimi</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2">v2.0 (Gelecek)</h3>
            <ul className="text-xs space-y-1 text-slate-600">
              <li>• Hepsiburada/Amazon Entegrasyonu</li>
              <li>• API Üzerinden Otomatik Veri Çekimi</li>
              <li>• Kargo ve İade Analizi</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">5. Başarı Metrikleri</h2>
        <ul className="list-disc pl-5 text-slate-600 space-y-1">
          <li><strong>Report-to-Order Conversion:</strong> Rapor yükleyen kullanıcıların yüzde kaçı sipariş listesi oluşturdu?</li>
          <li><strong>Time Saved:</strong> Kullanıcının analizden PDF alımına kadar geçen süresi (Hedef: &lt; 5 dk).</li>
          <li><strong>Retention:</strong> Haftalık aktif kullanıcı oranı.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 border-b pb-2">6. Riskler ve Bağımlılıklar</h2>
        <ul className="list-disc pl-5 text-slate-600 space-y-1">
          <li><strong>Veri Formatı Değişikliği:</strong> Trendyol'un rapor formatını değiştirmesi (Parsing risk).</li>
          <li><strong>Veri Gizliliği:</strong> Ticari verilerin bulutta saklanması (Güvenlik endişesi).</li>
        </ul>
      </section>

      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm text-amber-800">
        <strong>Not:</strong> MVP süreci 4 haftadır. İlk sürümde sadece Trendyol .xlsx/.csv formatı desteklenecektir.
      </div>
    </div>
  );
};

export default PRDView;
