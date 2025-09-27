// Firebase 設定檔案
// 請在 Firebase Console 建立專案後，將設定資訊填入下方

const firebaseConfig = {
    // 請替換為你的 Firebase 專案設定
    apiKey: "your-api-key-here",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com/",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// 初始化 Firebase
let app, database;

async function initializeFirebaseApp(customConfig = null) {
    try {
        // 檢查是否已載入 Firebase SDK
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK 未載入');
        }

        // 使用提供的設定或預設設定
        const config = customConfig || firebaseConfig;
        
        // 檢查設定是否有效
        if (!config.apiKey || !config.projectId || config.apiKey === 'your-api-key-here') {
            throw new Error('無效的 Firebase 設定');
        }

        // 初始化 Firebase
        app = firebase.initializeApp(config);
        database = firebase.database();
        
        console.log('Firebase 初始化成功');
        return { app, database };
    } catch (error) {
        console.error('Firebase 初始化失敗:', error);
        
        // 回退到本地模擬模式
        console.log('使用本地模擬模式');
        return {
            app: null,
            database: createMockDatabase()
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

// 匯出設定
window.initializeFirebaseApp = initializeFirebaseApp;