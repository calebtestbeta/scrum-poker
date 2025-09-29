/**
 * Scrum Poker Service Worker
 * 提供快取策略和離線支援，提升應用效能
 * @version 3.0.0-performance
 */

const CACHE_NAME = 'scrum-poker-v3.0.0';
const CACHE_VERSION = '20241229_performance';

// 需要快取的核心資源
const CORE_ASSETS = [
    './',
    './index-new.html',
    './src/styles/variables.css',
    './src/styles/main.css',
    './src/core/EventBus.js',
    './src/core/GameState.js',
    './src/core/Utils.js',
    './src/services/FirebaseService.js',
    './src/services/StorageService.js',
    './src/core/TouchManager.js',
    './src/components/Card.js',
    './src/components/Player.js',
    './src/components/GameTable.js',
    './src/app.js',
    './firebase-config.js'
];

// 外部資源（CDN）
const EXTERNAL_ASSETS = [
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// 快取策略設定
const CACHE_STRATEGIES = {
    // 核心資源：Cache First (優先使用快取)
    CORE: 'cache-first',
    // 外部資源：Stale While Revalidate (使用快取但在背景更新)
    EXTERNAL: 'stale-while-revalidate',
    // API 請求：Network First (優先使用網路)
    API: 'network-first'
};

/**
 * Service Worker 安裝事件
 */
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker 安裝中...', CACHE_NAME);
    
    event.waitUntil(
        Promise.all([
            // 快取核心資源
            caches.open(CACHE_NAME).then(cache => {
                console.log('📦 快取核心資源...');
                return cache.addAll(CORE_ASSETS);
            }),
            // 快取外部資源
            caches.open(`${CACHE_NAME}-external`).then(cache => {
                console.log('🌐 快取外部資源...');
                return cache.addAll(EXTERNAL_ASSETS);
            })
        ]).then(() => {
            console.log('✅ Service Worker 安裝完成');
            // 強制啟用新的 Service Worker
            return self.skipWaiting();
        }).catch(error => {
            console.error('❌ Service Worker 安裝失敗:', error);
        })
    );
});

/**
 * Service Worker 啟用事件
 */
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker 啟用中...', CACHE_NAME);
    
    event.waitUntil(
        Promise.all([
            // 清理舊快取
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && 
                            cacheName !== `${CACHE_NAME}-external` &&
                            cacheName.startsWith('scrum-poker-')) {
                            console.log('🗑️ 清理舊快取:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // 立即控制所有頁面
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker 啟用完成');
        })
    );
});

/**
 * 攔截網路請求
 */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // 跳過非 GET 請求
    if (event.request.method !== 'GET') {
        return;
    }
    
    // 跳過 Chrome Extension 請求
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // 跳過開發工具請求
    if (url.pathname.includes('__webpack') || url.pathname.includes('hot-update')) {
        return;
    }
    
    event.respondWith(handleRequest(event.request));
});

/**
 * 處理請求的主要邏輯
 * @param {Request} request 
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Firebase API 請求 - Network First
        if (url.hostname.includes('firebaseio.com') || 
            url.hostname.includes('googleapis.com')) {
            return await networkFirst(request, `${CACHE_NAME}-api`);
        }
        
        // 外部資源 - Stale While Revalidate
        if (url.origin !== location.origin) {
            return await staleWhileRevalidate(request, `${CACHE_NAME}-external`);
        }
        
        // 核心應用資源 - Cache First
        if (CORE_ASSETS.some(asset => url.pathname.endsWith(asset.replace('./', '')))) {
            return await cacheFirst(request, CACHE_NAME);
        }
        
        // HTML 頁面 - Network First with Cache Fallback
        if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
            return await networkFirstWithCacheFallback(request, CACHE_NAME);
        }
        
        // 其他資源 - Stale While Revalidate
        return await staleWhileRevalidate(request, CACHE_NAME);
        
    } catch (error) {
        console.error('❌ 請求處理失敗:', error);
        
        // 回退到離線頁面（如果有的話）
        if (request.mode === 'navigate') {
            const cache = await caches.open(CACHE_NAME);
            return await cache.match('./index-new.html') || 
                   new Response('離線模式：無法連接到伺服器', {
                       status: 503,
                       headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                   });
        }
        
        throw error;
    }
}

/**
 * Cache First 策略：優先使用快取
 */
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // 背景更新快取
        fetch(request).then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
        }).catch(() => {
            // 忽略背景更新失敗
        });
        
        return cachedResponse;
    }
    
    // 快取中沒有，從網路取得
    const response = await fetch(request);
    
    if (response.ok) {
        cache.put(request, response.clone());
    }
    
    return response;
}

/**
 * Network First 策略：優先使用網路
 */
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        // 網路失敗，嘗試從快取取得
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

/**
 * Network First with Cache Fallback：網路優先，快取備援
 */
async function networkFirstWithCacheFallback(request, cacheName) {
    const cache = await caches.open(cacheName);
    
    try {
        const response = await fetch(request);
        
        if (response.ok) {
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        // 網路失敗，回退到任何可用的 HTML 頁面
        const cachedResponse = await cache.match(request) ||
                              await cache.match('./index-new.html') ||
                              await cache.match('./');
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 如果沒有快取，返回離線頁面
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>離線模式 - Scrum Poker</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        font-family: -apple-system, sans-serif; 
                        text-align: center; 
                        padding: 50px; 
                        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                        color: white;
                        min-height: 100vh;
                        margin: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                    }
                    h1 { font-size: 2.5em; margin-bottom: 20px; }
                    p { font-size: 1.2em; line-height: 1.6; }
                    button {
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        cursor: pointer;
                        margin-top: 20px;
                    }
                    button:hover {
                        background: rgba(255,255,255,0.3);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🎮 Scrum Poker</h1>
                    <h2>🔌 離線模式</h2>
                    <p>目前無法連接到網路，但您仍可以使用基本功能。</p>
                    <p>請檢查網路連線並重新整理頁面。</p>
                    <button onclick="location.reload()">🔄 重新整理</button>
                </div>
            </body>
            </html>
        `, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
}

/**
 * Stale While Revalidate 策略：使用快取但背景更新
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // 背景更新
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => {
        // 忽略背景更新失敗
    });
    
    // 如果有快取，立即返回；否則等待網路回應
    return cachedResponse || await fetchPromise;
}

/**
 * 處理訊息事件（來自主執行緒）
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
                
            case 'GET_CACHE_INFO':
                getCacheInfo().then(info => {
                    event.ports[0].postMessage(info);
                });
                break;
                
            case 'CLEAR_CACHE':
                clearCache(event.data.cacheName).then(success => {
                    event.ports[0].postMessage({ success });
                });
                break;
                
            default:
                console.log('未知訊息類型:', event.data.type);
        }
    }
});

/**
 * 取得快取資訊
 */
async function getCacheInfo() {
    const cacheNames = await caches.keys();
    const cacheInfo = {};
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheInfo[cacheName] = {
            count: keys.length,
            keys: keys.map(key => key.url)
        };
    }
    
    return cacheInfo;
}

/**
 * 清除指定快取
 */
async function clearCache(cacheName) {
    if (cacheName) {
        return await caches.delete(cacheName);
    } else {
        // 清除所有快取
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames.map(name => caches.delete(name));
        await Promise.all(deletePromises);
        return true;
    }
}

/**
 * 效能監控
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'performance-sync') {
        event.waitUntil(syncPerformanceData());
    }
});

async function syncPerformanceData() {
    // 這裡可以實作效能資料同步邏輯
    console.log('📊 同步效能資料...');
}

console.log('🎮 Scrum Poker Service Worker v3.0.0 已載入');