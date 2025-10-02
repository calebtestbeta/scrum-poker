// Firebase 設定檔案
// 支援本地開發環境和雲端部署的動態配置

// 雲端 Firebase 設定
const firebaseConfig = {
    // 請替換為你的 Firebase 專案設定
    // 如果未設定，將自動回退到本地模擬模式
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:demo-app-id"
};

// 本地開發環境設定
const firebaseConfigLocal = {
    apiKey: "demo-api-key",
    authDomain: "demo-scrum-poker.firebaseapp.com",
    databaseURL: "http://localhost:9000?ns=demo-scrum-poker",
    projectId: "demo-scrum-poker",
    storageBucket: "demo-scrum-poker.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:demo-app-id"
};

// 檢測本地環境
function isLocalEnvironment() {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.');

    console.log(`🌐 環境檢測: hostname="${hostname}", isLocal=${isLocal}`);
    return isLocal;
}

// 獲取適當的 Firebase 設定
function getFirebaseConfig() {
    if (isLocalEnvironment()) {
        console.log('🏠 本機開發環境檢測完成');
        console.log('🔥 Firebase 模擬器設定已載入');
        console.log('📍 Database URL:', firebaseConfigLocal.databaseURL);
        return firebaseConfigLocal;
    } else {
        console.log('☁️ 雲端環境檢測完成');
        console.log('🔥 Firebase 雲端設定已載入');
        return firebaseConfig;
    }
}

// 初始化 Firebase
let app, database;

async function initializeFirebaseApp(customConfig = null) {
    try {
        // 檢查是否已載入 Firebase SDK
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK 未載入');
        }

        // 自動選擇適當的設定
        const config = customConfig || getFirebaseConfig();

        // 本地環境特殊處理
        if (isLocalEnvironment()) {
            // 直接使用本地模擬模式，不嘗試連接模擬器
            console.log('🏠 本地環境檢測到，使用內建模擬模式');
            console.log('🔧 跳過 Firebase 模擬器連接，直接使用記憶體模擬');
            return {
                app: null,
                database: createMockDatabase(),
                auth: createMockAuth()
            };
        }

        // 雲端環境處理
        if (!config.apiKey || !config.projectId || config.apiKey === 'your-api-key-here') {
            console.warn('⚠️ 雲端 Firebase 設定未配置，自動回退到本地模擬模式');
            console.log('🔧 使用本地模擬模式（無需 Firebase 專案）');
            return {
                app: null,
                database: createMockDatabase(),
                auth: createMockAuth()
            };
        }

        // 初始化雲端 Firebase
        app = firebase.initializeApp(config);
        database = firebase.database();

        console.log('☁️ Firebase 雲端服務初始化成功（無身份驗證模式）');
        return { app, database };
    } catch (error) {
        console.error('Firebase 初始化失敗:', error);

        // 最後的回退：使用本地模擬模式
        console.log('🔧 使用本地模擬模式');
        return {
            app: null,
            database: createMockDatabase(),
            auth: createMockAuth()
        };
    }
}

// 建立模擬資料庫（用於開發和測試）
function createMockDatabase() {
    const mockData = {};

    return {
        ref: (path) => ({
            set: async (data) => {
                console.log(`模擬設定 ${path}:`, data);
                setNestedProperty(mockData, path, data);

                // 觸發監聽器
                setTimeout(() => {
                    triggerListeners(path, data);
                }, 100);

                return Promise.resolve();
            },

            child: (childPath) => {
                const fullPath = `${path}/${childPath}`;
                return {
                    set: async (data) => {
                        console.log(`模擬設定 ${fullPath}:`, data);
                        setNestedProperty(mockData, fullPath, data);

                        // 觸發父級監聽器
                        setTimeout(() => {
                            const parentData = getNestedProperty(mockData, path);
                            if (parentData) {
                                triggerListeners(path, parentData);
                            }
                        }, 100);

                        return Promise.resolve();
                    },

                    update: async (updates) => {
                        console.log(`模擬更新 ${fullPath}:`, updates);
                        Object.entries(updates).forEach(([key, value]) => {
                            setNestedProperty(mockData, `${fullPath}/${key}`, value);
                        });

                        setTimeout(() => {
                            const parentData = getNestedProperty(mockData, path);
                            if (parentData) {
                                triggerListeners(path, parentData);
                            }
                        }, 100);

                        return Promise.resolve();
                    }
                };
            },

            on: (event, callback) => {
                console.log(`模擬監聽 ${path} 的 ${event} 事件`);

                // 註冊監聽器
                if (!window.mockListeners) window.mockListeners = {};
                if (!window.mockListeners[path]) window.mockListeners[path] = [];
                window.mockListeners[path].push(callback);

                // 立即觸發一次
                setTimeout(() => {
                    const data = getNestedProperty(mockData, path);
                    callback({
                        val: () => data || null
                    });
                }, 50);
            },

            off: (event, callback) => {
                console.log(`移除 ${path} 的監聽器`);
                if (window.mockListeners && window.mockListeners[path]) {
                    const index = window.mockListeners[path].indexOf(callback);
                    if (index > -1) {
                        window.mockListeners[path].splice(index, 1);
                    }
                }
            },

            once: async (event) => {
                const data = getNestedProperty(mockData, path);
                return Promise.resolve({
                    val: () => data || {}
                });
            }
        })
    };
}

// 輔助函數：設定嵌套屬性
function setNestedProperty(obj, path, value) {
    const keys = path.split('/').filter(key => key);
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }

    if (keys.length > 0) {
        current[keys[keys.length - 1]] = value;
    }
}

// 輔助函數：獲取嵌套屬性
function getNestedProperty(obj, path) {
    const keys = path.split('/').filter(key => key);
    let current = obj;

    for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return null;
        }
    }

    return current;
}

// 觸發所有相關監聽器
function triggerListeners(path, data) {
    if (!window.mockListeners) return;

    Object.keys(window.mockListeners).forEach(listenerPath => {
        if (path.startsWith(listenerPath) || listenerPath.startsWith(path)) {
            const listeners = window.mockListeners[listenerPath];
            const relevantData = listenerPath === path ? data : getNestedProperty({ [path]: data }, listenerPath);

            listeners.forEach(callback => {
                callback({
                    val: () => relevantData
                });
            });
        }
    });
}

// 建立模擬 Authentication（用於開發和測試）
function createMockAuth() {
    return {
        signInAnonymously: async () => {
            console.log('模擬匿名登入');
            return Promise.resolve({
                user: {
                    uid: 'mock-user-' + Math.random().toString(36).substr(2, 9),
                    isAnonymous: true
                }
            });
        },

        onAuthStateChanged: (callback) => {
            console.log('模擬 Auth 狀態監聽');
            // 模擬用戶已登入
            setTimeout(() => {
                callback({
                    uid: 'mock-user-' + Math.random().toString(36).substr(2, 9),
                    isAnonymous: true
                });
            }, 100);
        },

        signOut: async () => {
            console.log('模擬登出');
            return Promise.resolve();
        }
    };
}

// Firebase 診斷工具
function diagnoseFirebaseConfig() {
    console.group('🔍 Firebase 設定診斷');

    // 環境檢測
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    const isLocal = isLocalEnvironment();

    console.log(`📍 當前位置: ${protocol}//${hostname}${port ? ':' + port : ''}`);
    console.log(`🏠 本地環境: ${isLocal ? '是' : '否'}`);

    // Firebase SDK 檢測
    const hasFirebaseSDK = typeof firebase !== 'undefined';
    console.log(`📚 Firebase SDK: ${hasFirebaseSDK ? '已載入' : '❌ 未載入'}`);

    // 設定檢測
    const config = getFirebaseConfig();
    console.log('⚙️ 使用的設定:', isLocal ? '本地模擬器' : '雲端 Firebase');

    if (!isLocal) {
        const hasValidConfig = config.apiKey !== 'your-api-key-here' &&
            config.projectId !== 'your-project-id';
        console.log(`🔑 雲端設定狀態: ${hasValidConfig ? '✅ 已配置' : '❌ 未配置（使用範例值）'}`);

        if (!hasValidConfig) {
            console.warn('💡 解決方案:');
            console.warn('1. 如果要測試，請使用 http://localhost:xxxx 訪問');
            console.warn('2. 或者配置真實的 Firebase 專案設定');
            console.warn('3. 系統將自動回退到本地模擬模式');
        }
    }

    console.groupEnd();

    return {
        hostname,
        isLocal,
        hasFirebaseSDK,
        config,
        hasValidCloudConfig: !isLocal && config.apiKey !== 'your-api-key-here'
    };
}

// 匯出設定和函數
window.initializeFirebaseApp = initializeFirebaseApp;
window.getFirebaseConfig = getFirebaseConfig;
window.isLocalEnvironment = isLocalEnvironment;
window.diagnoseFirebaseConfig = diagnoseFirebaseConfig;

// 自動初始化（可選）
if (typeof window.AUTO_INIT_FIREBASE !== 'undefined' && window.AUTO_INIT_FIREBASE) {
    document.addEventListener('DOMContentLoaded', () => {
        initializeFirebaseApp().then(({ app, database }) => {
            window.firebaseApp = app;
            window.firebaseDatabase = database;
            console.log('✅ Firebase 自動初始化完成');
        });
    });
}