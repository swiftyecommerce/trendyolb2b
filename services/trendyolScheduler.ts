
/**
 * VizyonExcel - Trendyol Otomatik Senkronizasyon Zamanlayıcısı
 * Bu modül, arka planda periyodik veri çekme işlemlerini yönetir.
 */

// Not: Gerçek ortamda 'npm install node-cron' yapılmış olmalıdır.
// Import syntax'ı runtime ortamınıza göre ayarlanabilir.
import cron from 'node-cron';
import { syncStoreFromTrendyol } from './syncTrendyolData';

/**
 * Varsayımsal Veritabanı Servisi - Aktif mağaza listesini getirir.
 */
const db = {
  getActiveStores: async () => {
    console.log('[Scheduler] Aktif mağazalar veritabanından çekiliyor...');
    // Örnek: select id from stores where status = 'active'
    return [
      { id: 'store_001', name: 'Ana Mağaza' },
      { id: 'store_002', name: 'Outlet Mağaza' }
    ];
  }
};

/**
 * Günlük Senkronizasyon İşlemi
 * Son 24 saatlik veriyi tüm mağazalar için çeker.
 */
export async function startDailySyncJob() {
  const now = new Date();
  console.log(`[Scheduler] --- GÜNLÜK SENKRONİZASYON BAŞLADI (${now.toISOString()}) ---`);

  try {
    const activeStores = await db.getActiveStores();
    
    // Zaman Aralığı Hesaplama: Dün 03:00 - Bugün 03:00 (yaklaşık)
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const endDate = now.getTime();
    const startDate = endDate - oneDayInMs;

    console.log(`[Scheduler] ${activeStores.length} mağaza için işlem yapılacak.`);
    console.log(`[Scheduler] Aralık: ${new Date(startDate).toLocaleString()} - ${new Date(endDate).toLocaleString()}`);

    for (const store of activeStores) {
      try {
        console.log(`[Scheduler] İşleniyor: ${store.name} (${store.id})`);
        
        // Ana senkronizasyon fonksiyonunu çağır
        await syncStoreFromTrendyol(store.id, { startDate, endDate });
        
        console.log(`[Scheduler] BAŞARILI: ${store.name}`);
      } catch (storeError) {
        // Bir mağaza hata alsa bile döngü devam etmeli
        console.error(`[Scheduler] HATA: ${store.name} işlenirken bir sorun oluştu:`, storeError);
      }
    }

    console.log(`[Scheduler] --- GÜNLÜK SENKRONİZASYON TAMAMLANDI (${new Date().toISOString()}) ---`);
  } catch (globalError) {
    console.error(`[Scheduler] KRİTİK HATA: Zamanlanmış görev başlatılamadı:`, globalError);
  }
}

/**
 * Cron Job Tanımlaması
 * '0 3 * * *' -> Her gün saat 03:00'te çalışır.
 */
export function initScheduler() {
  console.log('[Scheduler] Trendyol Senkronizasyon Zamanlayıcısı Başlatıldı (Her gece 03:00)');
  
  cron.schedule('0 3 * * *', () => {
    startDailySyncJob();
  });

  // Geliştirme aşamasında test etmek isterseniz hemen çalıştırmak için:
  // startDailySyncJob();
}
