/**
 * Firebase 設定記憶功能服務
 * 簡單的 localStorage 包裝器，專門處理 Firebase 設定的儲存和還原
 * @version 3.0.0-firebase-memory
 */

/**
 * Firebase 設定儲存服務類別
 */
class FirebaseConfigStorage {
    constructor() {
        this.version = '3.0.0-firebase-memory';
        this.storageKey = 'scrumPoker_firebaseConfig';
        this.isAvailable = this.checkStorageAvailability();
        
        console.log(`🔧 FirebaseConfigStorage 已初始化 - 版本: ${this.version}`);
        console.log(`📦 localStorage 可用性: ${this.isAvailable ? '✅ 可用' : '❌ 不可用'}`);
    }
    
    /**
     * 檢查 localStorage 可用性
     * @returns {boolean} 是否可用
     */
    checkStorageAvailability() {
        try {
            const testKey = 'localStorage_test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('⚠️ localStorage 不可用:', error);
            return false;
        }
    }
    
    /**
     * 儲存 Firebase 設定
     * @param {string} projectId - Firebase Project ID
     * @param {string} apiKey - Firebase API Key
     * @returns {boolean} 是否儲存成功
     */
    saveFirebaseConfig(projectId, apiKey) {
        if (!this.isAvailable) {
            console.warn('⚠️ localStorage 不可用，跳過儲存');
            return false;
        }
        
        if (!projectId || !apiKey) {
            console.warn('⚠️ projectId 或 apiKey 為空，跳過儲存');
            return false;
        }
        
        try {
            const config = {
                projectId: projectId.trim(),
                apiKey: apiKey.trim(),
                timestamp: Date.now(),
                version: this.version
            };
            
            const jsonString = JSON.stringify(config);
            localStorage.setItem(this.storageKey, jsonString);
            
            console.log('✅ Firebase 設定已儲存到 localStorage');
            console.log('📊 儲存的設定:', {
                projectId: projectId.substring(0, 10) + '...',
                apiKey: apiKey.substring(0, 10) + '...',
                timestamp: new Date(config.timestamp).toLocaleString()
            });
            
            return true;
        } catch (error) {
            console.error('❌ 儲存 Firebase 設定失敗:', error);
            return false;
        }
    }
    
    /**
     * 還原 Firebase 設定
     * @returns {Object|null} 設定物件或 null
     */
    restoreFirebaseConfig() {
        if (!this.isAvailable) {
            console.warn('⚠️ localStorage 不可用，無法還原設定');
            return null;
        }
        
        try {
            const jsonString = localStorage.getItem(this.storageKey);
            if (!jsonString) {
                console.log('ℹ️ 未找到儲存的 Firebase 設定');
                return null;
            }
            
            const config = JSON.parse(jsonString);
            
            // 驗證設定結構
            if (!config.projectId || !config.apiKey) {
                console.warn('⚠️ 儲存的設定格式無效');
                this.clearFirebaseConfig(); // 清除無效設定
                return null;
            }
            
            // 檢查設定時效性（30天）
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
            if (config.timestamp && (Date.now() - config.timestamp) > maxAge) {
                console.warn('⚠️ 儲存的設定已過期，自動清除');
                this.clearFirebaseConfig();
                return null;
            }
            
            console.log('✅ 成功還原 Firebase 設定');
            console.log('📊 還原的設定:', {
                projectId: config.projectId.substring(0, 10) + '...',
                apiKey: config.apiKey.substring(0, 10) + '...',
                savedAt: config.timestamp ? new Date(config.timestamp).toLocaleString() : '未知'
            });
            
            return {
                projectId: config.projectId,
                apiKey: config.apiKey
            };
        } catch (error) {
            console.error('❌ 還原 Firebase 設定失敗:', error);
            // 清除損壞的設定
            this.clearFirebaseConfig();
            return null;
        }
    }
    
    /**
     * 清除 Firebase 設定
     * @returns {boolean} 是否清除成功
     */
    clearFirebaseConfig() {
        if (!this.isAvailable) {
            console.warn('⚠️ localStorage 不可用，無法清除設定');
            return false;
        }
        
        try {
            localStorage.removeItem(this.storageKey);
            console.log('✅ Firebase 設定已清除');
            return true;
        } catch (error) {
            console.error('❌ 清除 Firebase 設定失敗:', error);
            return false;
        }
    }
    
    /**
     * 檢查是否有儲存的設定
     * @returns {boolean} 是否有設定
     */
    hasStoredConfig() {
        if (!this.isAvailable) {
            return false;
        }
        
        try {
            const jsonString = localStorage.getItem(this.storageKey);
            return !!jsonString;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * 取得儲存的設定資訊（不包含敏感資料）
     * @returns {Object|null} 設定資訊
     */
    getConfigInfo() {
        if (!this.isAvailable) {
            return null;
        }
        
        try {
            const jsonString = localStorage.getItem(this.storageKey);
            if (!jsonString) {
                return null;
            }
            
            const config = JSON.parse(jsonString);
            
            return {
                hasProjectId: !!config.projectId,
                hasApiKey: !!config.apiKey,
                savedAt: config.timestamp ? new Date(config.timestamp).toLocaleString() : '未知',
                version: config.version || '未知'
            };
        } catch (error) {
            console.error('❌ 取得設定資訊失敗:', error);
            return null;
        }
    }
    
    /**
     * 驗證 Firebase 設定格式
     * @param {string} projectId - Project ID
     * @param {string} apiKey - API Key
     * @returns {Object} 驗證結果
     */
    validateConfig(projectId, apiKey) {
        const result = {
            valid: true,
            errors: []
        };
        
        // 驗證 Project ID
        if (!projectId || typeof projectId !== 'string') {
            result.valid = false;
            result.errors.push('Project ID 不能為空');
        } else if (!/^[a-z0-9-]+$/.test(projectId)) {
            result.valid = false;
            result.errors.push('Project ID 格式無效（只能包含小寫字母、數字和連字符）');
        } else if (projectId.length < 6 || projectId.length > 30) {
            result.valid = false;
            result.errors.push('Project ID 長度必須在 6-30 字符之間');
        }
        
        // 驗證 API Key
        if (!apiKey || typeof apiKey !== 'string') {
            result.valid = false;
            result.errors.push('API Key 不能為空');
        } else if (!/^AIza[a-zA-Z0-9_-]{35,}$/.test(apiKey)) {
            result.valid = false;
            result.errors.push('API Key 格式無效（應以 AIza 開頭）');
        }
        
        return result;
    }
}

// 建立全域實例
const firebaseConfigStorage = new FirebaseConfigStorage();

// 掛載到 window 物件供其他模組使用
window.firebaseConfigStorage = firebaseConfigStorage;

// 匯出類別和實例
window.FirebaseConfigStorage = FirebaseConfigStorage;

console.log('🔧 FirebaseConfigStorage 模組已載入');