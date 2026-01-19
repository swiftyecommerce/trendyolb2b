
import * as trendyol from './trendyolClient';

/**
 * Varsayımsal Veritabanı Servisleri 
 * Gerçek projede bu fonksiyonlar Prisma, TypeORM veya doğrudan SQL sorguları ile çalışacaktır.
 */
const db = {
  getStore: async (storeId: string) => {
    // Örnek: select * from stores where id = storeId
    return {
      id: storeId,
      trendyolSupplierId: '156804',
      trendyolApiKey: 'aTHoNm8Fn4M7vJaZ3n28',
      trendyolApiSecret: '6kbNABHI2TTUspvtBleY'
    };
  },
  upsertOrder: async (orderData: any) => {
    // console.log('Sipariş Upsert Ediliyor:', orderData.orderNumber);
    return true;
  },
  upsertProduct: async (productData: any) => {
    // console.log('Ürün Upsert Ediliyor:', productData.barcode);
    return true;
  }
};

interface SyncParams {
  startDate?: number;
  endDate?: number;
}

/**
 * Belirli bir mağaza için Trendyol verilerini senkronize eder.
 */
export async function syncStoreFromTrendyol(storeId: string, { startDate, endDate }: SyncParams) {
  console.log(`[Sync] Mağaza (${storeId}) senkronizasyonu başlatılıyor...`);
  
  let syncStats = {
    ordersProcessed: 0,
    productsUpdated: 0,
    errors: 0
  };

  try {
    // 1. Mağaza Bilgilerini Çek
    const store = await db.getStore(storeId);
    if (!store) throw new Error(`Mağaza bulunamadı: ${storeId}`);

    const apiConfig = {
      supplierId: store.trendyolSupplierId,
      apiKey: store.trendyolApiKey,
      apiSecret: store.trendyolApiSecret
    };

    // 2. Siparişleri Çek (Shipment Packages)
    console.log(`[Sync] Siparişler çekiliyor...`);
    let ordersResponse;
    try {
      ordersResponse = await trendyol.getOrders({
        ...apiConfig,
        startDate,
        endDate,
        size: 100 // Tek seferde çekilecek miktar
      });
    } catch (err) {
      console.error('[Sync] Sipariş çekme başarısız:', err);
      throw err;
    }

    const orders = ordersResponse.content || [];
    const uniqueBarcodes = new Set<string>();

    // 3. Siparişleri İşle ve Upsert Et
    for (const orderPackage of orders) {
      try {
        await db.upsertOrder({
          orderId: orderPackage.orderNumber,
          orderDate: new Date(orderPackage.orderDate),
          status: orderPackage.status,
          totalPrice: orderPackage.totalPrice,
          storeId: storeId,
          rawJson: JSON.stringify(orderPackage)
        });
        
        syncStats.ordersProcessed++;

        // Siparişteki ürün barkodlarını topla
        orderPackage.items?.forEach((item: any) => {
          if (item.barcode) uniqueBarcodes.add(item.barcode);
        });
      } catch (err) {
        console.error(`[Sync] Sipariş (${orderPackage.orderNumber}) kaydedilemedi:`, err);
        syncStats.errors++;
      }
    }

    // 4. İlgili Ürünleri Çek ve Güncelle
    // Not: Trendyol'da ürünler barkod bazlı eşleştirilir. 
    // Tüm ürünleri çekmek büyük mağazalarda yavaş olabilir, 
    // burada sadece siparişi gelen ürünleri veya tüm listeyi güncelleyebiliriz.
    console.log(`[Sync] Ürün kataloğu senkronize ediliyor...`);
    try {
      const productsResponse = await trendyol.getProducts({
        ...apiConfig,
        size: 500 // Mağaza büyüklüğüne göre ayarlanmalı
      });

      const products = productsResponse.content || [];
      for (const product of products) {
        // Sadece siparişte olanları mı yoksa tümünü mü güncelleyeceğimiz tercihe bağlıdır.
        // Burada tüm kataloğu güncelliyoruz:
        try {
          await db.upsertProduct({
            productId: product.id,
            name: product.title,
            barcode: product.barcode,
            stock: product.quantity,
            price: product.salePrice,
            category: product.categoryName,
            brand: product.brandName,
            storeId: storeId,
            rawJson: JSON.stringify(product)
          });
          syncStats.productsUpdated++;
        } catch (err) {
          console.error(`[Sync] Ürün (${product.barcode}) kaydedilemedi:`, err);
        }
      }
    } catch (err) {
      console.error('[Sync] Ürün çekme başarısız:', err);
      // Ürünler çekilemezse siparişler bittiği için durmuyoruz.
    }

    // 5. Sonuç Özeti
    console.log(`
=========================================
SYNCHRONIZATION COMPLETED
-----------------------------------------
Store ID: ${storeId}
Orders Processed: ${syncStats.ordersProcessed}
Products Updated: ${syncStats.productsUpdated}
Total Errors: ${syncStats.errors}
Timestamp: ${new Date().toISOString()}
=========================================
    `);

    return syncStats;

  } catch (globalError) {
    console.error(`[Sync FATAL] Senkronizasyon tamamen durdu:`, globalError);
    throw globalError;
  }
}
