/**
 * Firebase 設定與連線管理統一模組
 * 負責 Firebase 初始化、設定儲存、連線狀態追蹤與錯誤處理
 * @version 3.1.0-unified-firebase-manager
 * @author Claude AI Assistant
 */

/**
 * Firebase 設定與連線管理器
 * 新架構遷移中：統一原本分散在 app.js、StorageService、Utils 的 Firebase 設定邏輯
 */
class FirebaseConfigManager {
    constructor() {
        this.version = '3.1.0-unified-firebase-manager';
        this.storageKey = 'scrumPoker_firebaseConfig';
        this.cookieKey = 'scrumPoker_firebaseConfig'; // 向後兼容
        
        // Firebase 狀態追蹤
        this.status = 'uninitialized'; // 'uninitialized' | 'initializing' | 'connected' | 'disconnected' | 'error'
        this.app = null;
        this.database = null;
        this.connectionRef = null;
        this.connectionListener = null;
        
        // 錯誤狀態
        this.lastError = null;
        this.initializationAttempts = 0;
        this.maxRetries = 3;
        
        console.log(`🔧 FirebaseConfigManager 已初始化 - 版本: ${this.version}`);
        this.logStatus();
    }
    
    // ========================================
    // 🔧 1. 設定資料管理
    // ========================================
    
    /**
     * 儲存 Firebase 設定
     * 新架構遷移中：統一儲存邏輯，取代原本分散的 Cookie/localStorage 操作
     * @param {Object} configObj - Firebase 設定物件
     * @param {string} configObj.projectId - Firebase Project ID
     * @param {string} configObj.apiKey - Firebase API Key
     * @param {boolean} remember - 是否記住設定（預設 true）
     * @returns {boolean} 是否儲存成功
     */
    saveConfig(configObj, remember = true) {
        try {
            console.log('💾 [FirebaseConfigManager] 開始儲存 Firebase 設定...');
            
            // 驗證設定格式
            const validation = this.validateConfig(configObj);
            if (!validation.valid) {
                console.error('❌ [FirebaseConfigManager] 設定驗證失敗:', validation.errors);
                return false;
            }
            
            const config = {
                projectId: configObj.projectId.trim(),
                apiKey: configObj.apiKey.trim(),
                remember: remember,
                lastSaved: Date.now(),
                version: this.version
            };
            
            let saveSuccess = false;
            
            // 主要儲存：localStorage
            if (this.isLocalStorageAvailable()) {
                try {
                    localStorage.setItem(this.storageKey, JSON.stringify(config));
                    console.log('✅ [FirebaseConfigManager] 設定已儲存到 localStorage');
                    saveSuccess = true;
                } catch (error) {
                    console.error('❌ [FirebaseConfigManager] localStorage 儲存失敗:', error);
                }
            }
            
            // 備援儲存：Cookie（向後兼容）
            if (typeof Utils !== 'undefined' && Utils.Cookie) {
                try {
                    const cookieSuccess = Utils.Cookie.setCookie(this.cookieKey, config, {
                        days: 30,
                        secure: window.location.protocol === 'https:',
                        sameSite: 'Lax'
                    });
                    if (cookieSuccess) {
                        console.log('✅ [FirebaseConfigManager] 設定已備援到 Cookie');
                        saveSuccess = true;
                    }
                } catch (error) {
                    console.warn('⚠️ [FirebaseConfigManager] Cookie 備援儲存失敗:', error);
                }
            }
            
            if (saveSuccess) {
                console.log('💾 [FirebaseConfigManager] Firebase 設定儲存完成');
                return true;
            } else {
                console.error('❌ [FirebaseConfigManager] 所有儲存方式都失敗');
                return false;
            }
            
        } catch (error) {
            console.error('❌ [FirebaseConfigManager] saveConfig 執行失敗:', error);
            return false;
        }
    }
    
    /**
     * 載入 Firebase 設定
     * 新架構遷移中：統一載入邏輯，優先順序 localStorage → Cookie → Utils.Storage
     * @returns {Object|null} 設定物件或 null
     */
    loadConfig() {
        try {
            console.log('📂 [FirebaseConfigManager] 開始載入 Firebase 設定...');
            
            let config = null;
            
            // 1. 優先從 localStorage 載入
            if (this.isLocalStorageAvailable()) {
                try {
                    const stored = localStorage.getItem(this.storageKey);
                    if (stored) {
                        config = JSON.parse(stored);
                        console.log('✅ [FirebaseConfigManager] 從 localStorage 載入設定');
                    }
                } catch (error) {
                    console.warn('⚠️ [FirebaseConfigManager] localStorage 載入失敗:', error);
                }
            }
            
            // 2. 備援從 Cookie 載入（向後兼容）
            if (!config && typeof Utils !== 'undefined' && Utils.Cookie) {
                try {
                    config = Utils.Cookie.getCookie(this.cookieKey);
                    if (config) {
                        console.log('✅ [FirebaseConfigManager] 從 Cookie 載入設定（向後兼容）');
                    }
                } catch (error) {
                    console.warn('⚠️ [FirebaseConfigManager] Cookie 載入失敗:', error);
                }
            }
            
            // 3. 向下兼容：從 Utils.Storage 載入
            if (!config && typeof Utils !== 'undefined' && Utils.Storage) {
                try {
                    config = Utils.Storage.getItem(this.storageKey);
                    if (config) {
                        console.log('✅ [FirebaseConfigManager] 從 Utils.Storage 載入設定（舊架構兼容）');
                    }
                } catch (error) {
                    console.warn('⚠️ [FirebaseConfigManager] Utils.Storage 載入失敗:', error);
                }
            }
            
            // 驗證載入的設定
            if (config) {
                // 檢查設定時效性（30天）
                const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
                if (config.lastSaved && (Date.now() - config.lastSaved) > maxAge) {
                    console.warn('⚠️ [FirebaseConfigManager] 設定已過期，自動清除');
                    this.clearConfig();
                    return null;
                }
                
                // 驗證設定完整性
                const validation = this.validateConfig(config);
                if (!validation.valid) {
                    console.warn('⚠️ [FirebaseConfigManager] 載入的設定格式無效，自動清除');
                    this.clearConfig();
                    return null;
                }
                
                console.log('📂 [FirebaseConfigManager] Firebase 設定載入成功');
                return {
                    projectId: config.projectId,
                    apiKey: config.apiKey
                };
            }
            
            console.log('ℹ️ [FirebaseConfigManager] 未找到有效的 Firebase 設定');
            return null;
            
        } catch (error) {
            console.error('❌ [FirebaseConfigManager] loadConfig 執行失敗:', error);
            return null;
        }
    }
    
    /**
     * 清除 Firebase 設定
     * 新架構遷移中：統一清除邏輯，清除所有儲存位置的設定
     * @returns {boolean} 是否清除成功
     */
    clearConfig() {
        try {
            console.log('🧹 [FirebaseConfigManager] 開始清除 Firebase 設定...');
            
            let clearCount = 0;
            
            // 清除 localStorage
            if (this.isLocalStorageAvailable()) {
                try {
                    localStorage.removeItem(this.storageKey);
                    console.log('✅ [FirebaseConfigManager] localStorage 設定已清除');
                    clearCount++;
                } catch (error) {
                    console.warn('⚠️ [FirebaseConfigManager] localStorage 清除失敗:', error);
                }
            }
            
            // 清除 Cookie（向後兼容）
            if (typeof Utils !== 'undefined' && Utils.Cookie) {
                try {
                    const cookieCleared = Utils.Cookie.deleteCookie(this.cookieKey);
                    if (cookieCleared) {
                        console.log('✅ [FirebaseConfigManager] Cookie 設定已清除');
                        clearCount++;
                    }
                } catch (error) {
                    console.warn('⚠️ [FirebaseConfigManager] Cookie 清除失敗:', error);
                }
            }
            
            // 清除 Utils.Storage（向下兼容）
            if (typeof Utils !== 'undefined' && Utils.Storage) {
                try {
                    Utils.Storage.removeItem(this.storageKey);
                    console.log('✅ [FirebaseConfigManager] Utils.Storage 設定已清除');
                    clearCount++;
                } catch (error) {
                    console.warn('⚠️ [FirebaseConfigManager] Utils.Storage 清除失敗:', error);
                }
            }
            
            console.log(`🧹 [FirebaseConfigManager] Firebase 設定清除完成（清除 ${clearCount} 項）`);
            return clearCount > 0;
            
        } catch (error) {
            console.error('❌ [FirebaseConfigManager] clearConfig 執行失敗:', error);
            return false;
        }
    }
    
    // ========================================
    // 🌐 2. Firebase 初始化與狀態追蹤
    // ========================================
    
    /**
     * 建構完整的 Firebase 設定物件
     * @param {Object} config - 基本設定物件 {projectId, apiKey}
     * @returns {Object} 完整的 Firebase 設定物件
     */
    buildConfig(config) {
        if (!config || !config.projectId || !config.apiKey) {
            throw new Error('缺少必要的 Firebase 設定 (projectId, apiKey)');
        }
        
        return {
            apiKey: config.apiKey,
            projectId: config.projectId,
            databaseURL: `https://${config.projectId}-default-rtdb.firebaseio.com/`,
            authDomain: `${config.projectId}.firebaseapp.com`,
            storageBucket: `${config.projectId}.appspot.com`,
            messagingSenderId: "123456789012", // 預設值，可由設定覆蓋
            appId: `1:123456789012:web:${config.projectId}`  // 預設值，可由設定覆蓋
        };
    }
    
    /**
     * 初始化 Firebase 應用
     * 新架構遷移中：統一初始化邏輯，避免重複初始化問題
     * @param {Object} configObj - Firebase 設定物件
     * @returns {Promise<boolean>} 是否初始化成功
     */
    async initialize(configObj) {
        try {
            console.log('🚀 [FirebaseConfigManager] 開始初始化 Firebase...');
            this.status = 'initializing';
            this.initializationAttempts++;
            
            // 驗證設定
            const validation = this.validateConfig(configObj);
            if (!validation.valid) {
                throw new Error(`Firebase 設定無效: ${validation.errors.join(', ')}`);
            }
            
            // 檢查 Firebase SDK 可用性
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK 未載入');
            }
            
            // 建構 Firebase 配置
            const firebaseConfig = this.buildConfig(configObj);
            
            // 🛡️ 防止重複初始化 - 新架構核心邏輯
            if (firebase.apps.length > 0) {
                console.log('♻️ [FirebaseConfigManager] Firebase 應用已存在，檢查配置匹配性...');
                
                const existingApp = firebase.app();
                if (existingApp.options.projectId === configObj.projectId) {
                    console.log('✅ [FirebaseConfigManager] 使用現有的 Firebase 應用實例');
                    this.app = existingApp;
                } else {
                    console.warn('⚠️ [FirebaseConfigManager] 專案 ID 不匹配，需要重新初始化');
                    console.warn(`現有: ${existingApp.options.projectId}, 新的: ${configObj.projectId}`);
                    
                    // 銷毀現有應用（謹慎操作）
                    await this.destroy();
                    
                    // 重新初始化
                    console.log('🔄 [FirebaseConfigManager] 重新初始化 Firebase 應用...');
                    this.app = firebase.initializeApp(firebaseConfig);
                }
            } else {
                console.log('🆕 [FirebaseConfigManager] 首次初始化 Firebase 應用...');
                this.app = firebase.initializeApp(firebaseConfig);
            }
            
            // 初始化資料庫
            this.database = firebase.database();
            
            // 設置連線狀態監聽
            this.setupConnectionListener();
            
            // 等待連線確認
            const connected = await this.waitForConnection();
            if (connected) {
                this.status = 'connected';
                console.log('✅ [FirebaseConfigManager] Firebase 初始化完成並已連線');
                return true;
            } else {
                this.status = 'disconnected';
                console.warn('⚠️ [FirebaseConfigManager] Firebase 初始化完成但連線失敗');
                return false;
            }
            
        } catch (error) {
            this.status = 'error';
            this.lastError = error;
            console.error('❌ [FirebaseConfigManager] Firebase 初始化失敗:', error);
            return false;
        }
    }
    
    /**
     * 取得 Firebase 連線狀態
     * @returns {string} 狀態字串
     */
    getStatus() {
        return this.status;
    }
    
    /**
     * 取得 Firebase 應用實例
     * @returns {Object|null} Firebase 應用實例
     */
    getApp() {
        return this.app;
    }
    
    /**
     * 取得 Firebase 資料庫實例
     * @returns {Object|null} Firebase 資料庫實例
     */
    getDatabase() {
        return this.database;
    }
    
    /**
     * 判斷 Firebase 是否準備好進行資料庫操作
     * 新架構遷移中：防呆機制，避免 joinRoom 早於 Firebase 連線
     * @returns {boolean} 是否準備好
     */
    isReady() {
        const ready = this.status === 'connected' && 
                     this.app !== null && 
                     this.database !== null;
        
        if (!ready) {
            console.warn('⚠️ [FirebaseConfigManager] Firebase 尚未準備好:', {
                status: this.status,
                hasApp: !!this.app,
                hasDatabase: !!this.database
            });
        }
        
        return ready;
    }
    
    /**
     * 設置連線狀態監聽器
     * 新架構遷移中：自動狀態切換機制
     */
    setupConnectionListener() {
        if (!this.database) return;
        
        try {
            this.connectionRef = this.database.ref('.info/connected');
            this.connectionListener = this.connectionRef.on('value', (snapshot) => {
                const connected = snapshot.val();
                
                if (connected) {
                    if (this.status !== 'connected') {
                        this.status = 'connected';
                        console.log('🔗 [FirebaseConfigManager] Firebase 已連線');
                        this.logStatus();
                    }
                } else {
                    if (this.status === 'connected') {
                        this.status = 'disconnected';
                        console.log('📡 [FirebaseConfigManager] Firebase 連線中斷');
                        this.logStatus();
                    }
                }
            });
            
            console.log('👂 [FirebaseConfigManager] 連線狀態監聽器已設置');
        } catch (error) {
            console.error('❌ [FirebaseConfigManager] 設置連線監聽器失敗:', error);
        }
    }
    
    /**
     * 等待 Firebase 連線
     * @param {number} timeout - 超時時間（毫秒）
     * @returns {Promise<boolean>} 是否連線成功
     */
    waitForConnection(timeout = 10000) {
        return new Promise((resolve) => {
            if (!this.database) {
                resolve(false);
                return;
            }
            
            const timeoutId = setTimeout(() => {
                console.warn('⏰ [FirebaseConfigManager] 等待連線超時');
                resolve(false);
            }, timeout);
            
            const connectedRef = this.database.ref('.info/connected');
            const listener = connectedRef.on('value', (snapshot) => {
                const connected = snapshot.val();
                if (connected) {
                    clearTimeout(timeoutId);
                    connectedRef.off('value', listener);
                    resolve(true);
                }
            });
        });
    }
    
    // ========================================
    // 🧪 3. Firebase 連線測試與錯誤處理
    // ========================================
    
    /**
     * 測試 Firebase 連線
     * 新架構遷移中：統一連線測試邏輯
     * @returns {Promise<Object>} 測試結果 { success: boolean, error?: string }
     */
    async testConnection() {
        try {
            console.log('🔍 [FirebaseConfigManager] 開始測試 Firebase 連線...');
            
            // 前置檢查
            if (!this.app) {
                return { success: false, error: 'Firebase 應用未初始化' };
            }
            
            if (!this.database) {
                return { success: false, error: 'Firebase 資料庫未初始化' };
            }
            
            // 連線狀態測試
            const testRef = this.database.ref('.info/connected');
            const snapshot = await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('連線測試超時（8秒）'));
                }, 8000);
                
                testRef.once('value', (snapshot) => {
                    clearTimeout(timeoutId);
                    resolve(snapshot);
                }, (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
            });
            
            const connected = snapshot.val();
            
            if (connected) {
                console.log('✅ [FirebaseConfigManager] Firebase 連線測試成功');
                return { success: true };
            } else {
                console.warn('[Firebase] 連線測試失敗：資料庫顯示未連線狀態');
                return { success: false, error: '資料庫顯示未連線狀態' };
            }
            
        } catch (error) {
            const errorMsg = error.code || error.message || '未知錯誤';
            console.warn('[Firebase] 連線測試失敗：', errorMsg);
            return { success: false, error: errorMsg };
        }
    }
    
    // ========================================
    // 🧹 4. 清理資源與銷毀
    // ========================================
    
    /**
     * 銷毀 Firebase 資源
     * 新架構遷移中：避免 ghost instance 造成 ref 無效
     * @returns {Promise<boolean>} 是否銷毀成功
     */
    async destroy() {
        try {
            console.log('🧹 [FirebaseConfigManager] 開始銷毀 Firebase 資源...');
            
            // 移除連線監聽器
            if (this.connectionRef && this.connectionListener) {
                this.connectionRef.off('value', this.connectionListener);
                this.connectionRef = null;
                this.connectionListener = null;
                console.log('👂 [FirebaseConfigManager] 連線監聽器已移除');
            }
            
            // 銷毀 Firebase 應用
            if (this.app) {
                try {
                    await this.app.delete();
                    console.log('🗑️ [FirebaseConfigManager] Firebase 應用已銷毀');
                } catch (error) {
                    console.warn('⚠️ [FirebaseConfigManager] Firebase 應用銷毀警告:', error);
                }
            }
            
            // 重置狀態
            this.status = 'uninitialized';
            this.app = null;
            this.database = null;
            this.lastError = null;
            this.initializationAttempts = 0;
            
            console.log('🧹 [FirebaseConfigManager] Firebase 資源銷毀完成');
            return true;
            
        } catch (error) {
            console.error('❌ [FirebaseConfigManager] 銷毀資源失敗:', error);
            return false;
        }
    }
    
    // ========================================
    // 🛠️ 工具方法
    // ========================================
    
    /**
     * 驗證 Firebase 設定格式
     * @param {Object} config - 設定物件
     * @returns {Object} 驗證結果
     */
    validateConfig(config) {
        const result = {
            valid: true,
            errors: []
        };
        
        if (!config || typeof config !== 'object') {
            result.valid = false;
            result.errors.push('設定物件無效');
            return result;
        }
        
        // 驗證 Project ID
        if (!config.projectId || typeof config.projectId !== 'string') {
            result.valid = false;
            result.errors.push('Project ID 不能為空');
        } else if (!/^[a-z0-9-]+$/.test(config.projectId)) {
            result.valid = false;
            result.errors.push('Project ID 格式無效');
        }
        
        // 驗證 API Key
        if (!config.apiKey || typeof config.apiKey !== 'string') {
            result.valid = false;
            result.errors.push('API Key 不能為空');
        } else if (!/^AIza[a-zA-Z0-9_-]{35,}$/.test(config.apiKey)) {
            result.valid = false;
            result.errors.push('API Key 格式無效');
        }
        
        return result;
    }
    
    /**
     * 檢查 localStorage 可用性
     * @returns {boolean} 是否可用
     */
    isLocalStorageAvailable() {
        try {
            const testKey = 'localStorage_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 記錄狀態資訊
     */
    logStatus() {
        console.log(`📊 [FirebaseConfigManager] 當前狀態: ${this.status}`, {
            hasApp: !!this.app,
            hasDatabase: !!this.database,
            initAttempts: this.initializationAttempts,
            lastError: this.lastError?.message
        });
    }
    
    /**
     * 取得管理器資訊
     * @returns {Object} 管理器狀態資訊
     */
    getManagerInfo() {
        return {
            version: this.version,
            status: this.status,
            hasApp: !!this.app,
            hasDatabase: !!this.database,
            isReady: this.isReady(),
            initializationAttempts: this.initializationAttempts,
            lastError: this.lastError?.message || null
        };
    }
}

// 建立全域實例
const firebaseConfigManager = new FirebaseConfigManager();

// 掛載到 window 物件供其他模組使用
window.firebaseConfigManager = firebaseConfigManager;
window.FirebaseConfigManager = FirebaseConfigManager;

console.log('🔧 FirebaseConfigManager 模組已載入 - 統一 Firebase 設定與連線管理');