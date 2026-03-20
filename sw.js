const CACHE_NAME = 'quran-full-text-v26';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
   './icon.png',
  'https://fonts.googleapis.com/css2?family=Amiri&display=swap'
  
];

// دالة لجلب وتخزين كافة نصوص السور عند التثبيت
async function cacheAllSurahs(cache) {
    console.log('جاري تخزين نصوص المصحف كاملاً للعمل بدون إنترنت...');
    // جلب قائمة السور أولاً لمعرفة عددها
    try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        const surahs = data.data;

        // إنشاء روابط كافة السور (نص مجمع لكل سورة)
        const surahRequests = surahs.map(surah => 
            `https://api.alquran.cloud/v1/surah/${surah.number}/ar.minshawi`
        );

        // تخزين الروابط في الكاش
        // ملاحظة: تم استخدام حلقة لتجنب الضغط العالي على المتصفح
        for (const url of surahRequests) {
            try {
                const res = await fetch(url);
                if (res.ok) await cache.put(url, res);
            } catch (err) {
                console.warn('فشل تخزين سورة:', url);
            }
        }
        console.log('تم تخزين كافة النصوص بنجاح.');
    } catch (error) {
        console.error('فشل جلب قائمة السور:', error);
    }
}

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // تخزين الملفات الأساسية
            cache.addAll(ASSETS);
            // ابدأ تخزين السور في الخلفية
            return cacheAllSurahs(cache);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                // تخزين أي طلب جديد لم نقم بتخزينه مسبقاً (مثل نتائج البحث أو التفسير)
                if (event.request.url.includes('api.alquran.cloud')) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            });
        })
    );
});