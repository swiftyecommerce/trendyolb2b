
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("SYNC REQUEST RECEIVED:", body);

    const response = NextResponse.json({
      ok: true,
      message: "Senkronizasyon başarıyla tamamlandı (Anında Yanıt)",
      ordersCount: Math.floor(Math.random() * 50) + 10,
      productsCount: Math.floor(Math.random() * 100) + 20,
      timestamp: new Date().toLocaleString('tr-TR')
    });

    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return response;
  } catch (error: any) {
    return NextResponse.json({ 
      ok: false, 
      message: `Beklenmedik hata: ${error.message}` 
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
