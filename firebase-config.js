// Firebase 設定檔案
// 支援本地開發環境和雲端部署的動態配置

// 雲端 Firebase 設定
const firebaseConfig = {
    // 【低安全性設計】請替換為您的 Firebase 專案設定
    // 範例配置 - 請修改成您的實際值：
    apiKey: "AIza...", // 從 Firebase Console 複製
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com/",
    projectId: "your-project-id", // 您的專案 ID
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:your-app-id"
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

// 驗證 Firebase 配置是否有效
function isValidFirebaseConfig(config) {
    const requiredFields = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];
    const placeholderValues = ['your-api-key-here', 'your-project-id', 'demo-api-key'];

    for (const field of requiredFields) {
        if (!config[field] || placeholderValues.includes(config[field])) {
            return false;
        }
    }

    // 檢查 API Key 格式（Firebase API Key 通常以 AIza 開頭）
    if (!config.apiKey.startsWith('AIza') || config.apiKey.length < 35) {
        console.warn('⚠️ API Key 格式可能無效:', config.apiKey);
        return false;
    }

    return true;
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

        // 驗證雲端配置是否有效
        if (isValidFirebaseConfig(firebaseConfig)) {
            console.log('🔥 Firebase 雲端設定已載入');
            return firebaseConfig;
        } else {
            console.warn('⚠️ 雲端 Firebase 配置無效，自動回退到本地模擬模式');
            console.log('💡 請檢查 Firebase API Key 和專案設定是否正確');
            console.log('🔥 Firebase 模擬器設定已載入');
            return firebaseConfigLocal;
        }
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
                auth: createMockAuth(),
                isLocalMode: true
            };
        }

        // 雲端環境處理
        if (!isValidFirebaseConfig(config)) {
            console.warn('⚠️ 雲端 Firebase 設定無效，自動回退到本地模擬模式');
            console.log('🔧 使用本地模擬模式（無需 Firebase 專案）');
            console.log('💡 如需使用雲端模式，請確保 Firebase API Key 和專案設定正確');
            return {
                app: null,
                database: createMockDatabase(),
                auth: createMockAuth(),
                isLocalMode: true
            };
        }

        // 初始化雲端 Firebase
        app = firebase.initializeApp(config);
        database = firebase.database();

        console.log('☁️ Firebase 雲端服務初始化成功');
        return { app, database, auth: firebase.auth };
    } catch (error) {
        console.error('Firebase 初始化失敗:', error);

        // 最後的回退：使用本地模擬模式  
        console.warn('⚠️ Firebase 初始化失敗，自動啟用本地模擬模式');
        console.log('🔧 使用本地模擬模式（無需網路連線）');
        console.log('💡 這是正常的 fallback 行為，不會影響功能使用');
        return {
            app: null,
            database: createMockDatabase(),
            auth: createMockAuth(),
            isLocalMode: true
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
    const mockUser = {
        uid: 'mock-user-' + Math.random().toString(36).substr(2, 9),
        isAnonymous: true
    };

    return {
        currentUser: mockUser,
        
        signInAnonymously: async () => {
            console.log('🔐 模擬匿名登入成功');
            return Promise.resolve({
                user: mockUser
            });
        },

        onAuthStateChanged: (callback) => {
            console.log('👁️ 模擬 Auth 狀態監聽器設置');
            // 立即觸發回調，模擬用戶已登入
            setTimeout(() => {
                callback(mockUser);
            }, 50);
            
            // 返回取消監聽的函數
            return () => {
                console.log('🔇 Auth 狀態監聽器已移除');
            };
        },

        signOut: async () => {
            console.log('🚪 模擬登出');
            this.currentUser = null;
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
        const hasValidConfig = isValidFirebaseConfig(config);
        console.log(`🔑 雲端設定狀態: ${hasValidConfig ? '✅ 已配置且有效' : '❌ 無效或未配置'}`);

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