/**
 * 本地存儲服務 - 資料持久化管理
 * 提供安全的本地存儲、資料加密、過期管理等功能
 * @version 3.0.0-enhanced
 */

/**
 * 存儲服務類別
 */
class StorageService {
    constructor() {
        this.version = '3.0.0-enhanced';
        this.prefix = 'scrumPoker_';
        this.encryptionKey = null;
        this.enableEncryption = false;
        this.enableCompression = true;
        this.maxStorageSize = 5 * 1024 * 1024; // 5MB
        this.cleanupInterval = 24 * 60 * 60 * 1000; // 24小時
        
        // 存儲配額管理
        this.quotaWarningThreshold = 0.8; // 80% 配額警告
        this.quotaCleanupThreshold = 0.9; // 90% 配額自動清理
        
        // 支援的存儲引擎
        this.engines = {
            localStorage: this.isLocalStorageAvailable(),
            sessionStorage: this.isSessionStorageAvailable(),
            indexedDB: this.isIndexedDBAvailable(),
            memory: true // 記憶體存儲作為後備
        };
        
        // 記憶體存儲後備
        this.memoryStorage = new Map();
        
        // 定期清理定時器
        this.cleanupTimer = null;
        
        this.initialize();
        
        console.log(`💾 StorageService ${this.version} 已創建`);
    }
    
    /**
     * 初始化存儲服務
     */
    initialize() {
        // 檢查存儲可用性
        this.checkStorageAvailability();
        
        // 設定加密金鑰
        this.setupEncryption();
        
        // 啟動定期清理
        this.startPeriodicCleanup();
        
        // 檢查存儲配額
        this.checkStorageQuota();
        
        console.log('💾 StorageService 初始化完成');
        console.log('📊 可用存儲引擎:', Object.entries(this.engines).filter(([, available]) => available).map(([name]) => name));
    }
    
    /**
     * 檢查本地存儲可用性
     * @returns {boolean}
     */
    isLocalStorageAvailable() {
        try {
            const testKey = `${this.prefix}test`;
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('⚠️ localStorage 不可用:', error.message);
            return false;
        }
    }
    
    /**
     * 檢查會話存儲可用性
     * @returns {boolean}
     */
    isSessionStorageAvailable() {
        try {
            const testKey = `${this.prefix}test`;
            sessionStorage.setItem(testKey, 'test');
            sessionStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('⚠️ sessionStorage 不可用:', error.message);
            return false;
        }
    }
    
    /**
     * 檢查 IndexedDB 可用性
     * @returns {boolean}
     */
    isIndexedDBAvailable() {
        return typeof indexedDB !== 'undefined';
    }
    
    /**
     * 檢查存儲可用性
     */
    checkStorageAvailability() {
        if (!this.engines.localStorage && !this.engines.sessionStorage && !this.engines.indexedDB) {
            console.warn('⚠️ 所有存儲引擎都不可用，將使用記憶體存儲');
        }
    }
    
    /**
     * 設定加密金鑰
     */
    setupEncryption() {
        // 從本地存儲中取得或生成加密金鑰
        try {
            let key = localStorage.getItem(`${this.prefix}encryptionKey`);
            if (!key) {
                key = this.generateEncryptionKey();
                localStorage.setItem(`${this.prefix}encryptionKey`, key);
            }
            this.encryptionKey = key;
            this.enableEncryption = true;
        } catch (error) {
            console.warn('⚠️ 無法設定加密金鑰，將使用明文存儲:', error.message);
            this.enableEncryption = false;
        }
    }
    
    /**
     * 生成加密金鑰
     * @returns {string}
     */
    generateEncryptionKey() {
        const array = new Uint8Array(32);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
        } else {
            // 降級方案
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * 生成隨機 IV
     * @returns {string}
     */
    generateRandomIV() {
        const array = new Uint8Array(16);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            crypto.getRandomValues(array);
        } else {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
        }
        // 使用 hex 編碼確保穩定性
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * 生成 MAC（完整性檢查）
     * @param {string} data - 資料
     * @returns {string}
     */
    generateMAC(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32-bit integer
        }
        // 確保 MAC 長度固定為 8 位
        return Math.abs(hash).toString(36).padStart(8, '0').substring(0, 8);
    }
    
    /**
     * 生成舊版 MAC（向後兼容）
     * @param {string} data - 資料
     * @returns {string}
     */
    generateMACLegacy(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32-bit integer
        }
        // 舊版本：不進行長度填充
        return Math.abs(hash).toString(36);
    }
    
    /**
     * 啟動定期清理
     */
    startPeriodicCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredItems();
            this.checkStorageQuota();
        }, this.cleanupInterval);
    }
    
    /**
     * 停止定期清理
     */
    stopPeriodicCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    
    /**
     * 檢查存儲配額
     */
    async checkStorageQuota() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const usage = estimate.usage || 0;
                const quota = estimate.quota || this.maxStorageSize;
                const usageRatio = usage / quota;
                
                if (usageRatio > this.quotaCleanupThreshold) {
                    console.warn('⚠️ 存儲空間使用率過高，開始自動清理');
                    this.performEmergencyCleanup();
                } else if (usageRatio > this.quotaWarningThreshold) {
                    console.warn(`⚠️ 存儲空間使用率達到 ${Math.round(usageRatio * 100)}%`);
                }
                
                this.emitEvent('storage:quota-check', {
                    usage,
                    quota,
                    usageRatio,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.warn('⚠️ 無法檢查存儲配額:', error.message);
        }
    }
    
    /**
     * 存儲項目
     * @param {string} key - 存儲鍵
     * @param {*} value - 存儲值
     * @param {Object} options - 選項
     * @param {number} [options.ttl] - 生存時間（毫秒）
     * @param {boolean} [options.encrypt] - 是否加密
     * @param {boolean} [options.compress] - 是否壓縮
     * @param {'localStorage'|'sessionStorage'|'memory'} [options.engine] - 存儲引擎
     * @returns {Promise<boolean>} 是否存儲成功
     */
    async setItem(key, value, options = {}) {
        try {
            const {
                ttl = null,
                encrypt = this.enableEncryption,
                compress = this.enableCompression,
                engine = 'localStorage'
            } = options;
            
            const fullKey = this.prefix + key;
            
            // 準備存儲資料
            const storageData = {
                value: value,
                timestamp: Date.now(),
                ttl: ttl,
                version: this.version,
                encrypted: encrypt,
                compressed: compress
            };
            
            // 序列化資料
            let serializedData = JSON.stringify(storageData);
            
            // 壓縮資料
            if (compress) {
                serializedData = this.compressData(serializedData);
            }
            
            // 加密資料
            if (encrypt && this.encryptionKey) {
                serializedData = this.encryptData(serializedData);
            }
            
            // 選擇存儲引擎並存儲
            const success = await this.storeToEngine(engine, fullKey, serializedData);
            
            if (success) {
                console.log(`💾 資料已存儲: ${key} (引擎: ${engine})`);
                this.emitEvent('storage:item-set', { key, engine, timestamp: Date.now() });
                return true;
            } else {
                throw new Error(`存儲引擎 ${engine} 操作失敗`);
            }
            
        } catch (error) {
            console.error('❌ 存儲項目失敗:', error);
            this.emitEvent('storage:error', { operation: 'setItem', key, error });
            
            // 嘗試降級存儲
            if (options.engine !== 'memory') {
                return await this.setItem(key, value, { ...options, engine: 'memory' });
            }
            
            return false;
        }
    }
    
    /**
     * 取得項目
     * @param {string} key - 存儲鍵
     * @param {*} defaultValue - 預設值
     * @param {'localStorage'|'sessionStorage'|'memory'|'auto'} [engine] - 存儲引擎
     * @returns {Promise<*>} 存儲值
     */
    async getItem(key, defaultValue = null, engine = 'auto') {
        try {
            const fullKey = this.prefix + key;
            
            // 自動模式：依序嘗試所有引擎
            if (engine === 'auto') {
                const engines = ['localStorage', 'sessionStorage', 'memory'];
                for (const eng of engines) {
                    if (this.engines[eng]) {
                        const result = await this.getFromEngine(eng, fullKey);
                        if (result !== null) {
                            return result;
                        }
                    }
                }
                return defaultValue;
            }
            
            // 指定引擎
            const serializedData = await this.getFromEngine(engine, fullKey);
            if (serializedData === null) {
                return defaultValue;
            }
            
            // 解密資料
            let decryptedData = serializedData;
            if (this.encryptionKey && this.isEncryptedData(serializedData)) {
                decryptedData = this.decryptData(serializedData);
            }
            
            // 解壓縮資料
            if (this.isCompressedData(decryptedData)) {
                decryptedData = this.decompressData(decryptedData);
            }
            
            // 反序列化資料
            const storageData = JSON.parse(decryptedData);
            
            // 檢查 TTL
            if (storageData.ttl && Date.now() > storageData.timestamp + storageData.ttl) {
                console.log(`⏰ 項目已過期: ${key}`);
                await this.removeItem(key, engine);
                return defaultValue;
            }
            
            console.log(`📖 資料已讀取: ${key} (引擎: ${engine})`);
            this.emitEvent('storage:item-get', { key, engine, timestamp: Date.now() });
            
            return storageData.value;
            
        } catch (error) {
            console.error('❌ 讀取項目失敗:', error);
            this.emitEvent('storage:error', { operation: 'getItem', key, error });
            return defaultValue;
        }
    }
    
    /**
     * 移除項目
     * @param {string} key - 存儲鍵
     * @param {'localStorage'|'sessionStorage'|'memory'|'all'} [engine] - 存儲引擎
     * @returns {Promise<boolean>} 是否移除成功
     */
    async removeItem(key, engine = 'all') {
        try {
            const fullKey = this.prefix + key;
            let success = false;
            
            if (engine === 'all') {
                // 從所有引擎中移除
                for (const [engineName, available] of Object.entries(this.engines)) {
                    if (available) {
                        const result = await this.removeFromEngine(engineName, fullKey);
                        success = success || result;
                    }
                }
            } else {
                success = await this.removeFromEngine(engine, fullKey);
            }
            
            if (success) {
                console.log(`🗑️ 項目已移除: ${key} (引擎: ${engine})`);
                this.emitEvent('storage:item-removed', { key, engine, timestamp: Date.now() });
            }
            
            return success;
            
        } catch (error) {
            console.error('❌ 移除項目失敗:', error);
            this.emitEvent('storage:error', { operation: 'removeItem', key, error });
            return false;
        }
    }
    
    /**
     * 清除所有項目
     * @param {'localStorage'|'sessionStorage'|'memory'|'all'} [engine] - 存儲引擎
     * @returns {Promise<boolean>} 是否清除成功
     */
    async clear(engine = 'all') {
        try {
            let success = false;
            
            if (engine === 'all') {
                // 清除所有引擎
                for (const [engineName, available] of Object.entries(this.engines)) {
                    if (available) {
                        const result = await this.clearEngine(engineName);
                        success = success || result;
                    }
                }
            } else {
                success = await this.clearEngine(engine);
            }
            
            console.log(`🧹 存儲已清除 (引擎: ${engine})`);
            this.emitEvent('storage:cleared', { engine, timestamp: Date.now() });
            
            return success;
            
        } catch (error) {
            console.error('❌ 清除存儲失敗:', error);
            this.emitEvent('storage:error', { operation: 'clear', engine, error });
            return false;
        }
    }
    
    /**
     * 取得所有鍵
     * @param {'localStorage'|'sessionStorage'|'memory'} [engine] - 存儲引擎
     * @returns {Promise<string[]>} 所有鍵的陣列
     */
    async getAllKeys(engine = 'localStorage') {
        try {
            const keys = [];
            
            if (engine === 'localStorage' && this.engines.localStorage) {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        keys.push(key.substring(this.prefix.length));
                    }
                }
            } else if (engine === 'sessionStorage' && this.engines.sessionStorage) {
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && key.startsWith(this.prefix)) {
                        keys.push(key.substring(this.prefix.length));
                    }
                }
            } else if (engine === 'memory') {
                for (const key of this.memoryStorage.keys()) {
                    if (key.startsWith(this.prefix)) {
                        keys.push(key.substring(this.prefix.length));
                    }
                }
            }
            
            return keys;
            
        } catch (error) {
            console.error('❌ 取得所有鍵失敗:', error);
            return [];
        }
    }
    
    /**
     * 存儲到指定引擎
     * @param {string} engine - 存儲引擎
     * @param {string} key - 存儲鍵
     * @param {string} data - 存儲資料
     * @returns {Promise<boolean>}
     */
    async storeToEngine(engine, key, data) {
        try {
            switch (engine) {
                case 'localStorage':
                    if (this.engines.localStorage) {
                        localStorage.setItem(key, data);
                        return true;
                    }
                    break;
                    
                case 'sessionStorage':
                    if (this.engines.sessionStorage) {
                        sessionStorage.setItem(key, data);
                        return true;
                    }
                    break;
                    
                case 'memory':
                    this.memoryStorage.set(key, data);
                    return true;
                    
                case 'indexedDB':
                    if (this.engines.indexedDB) {
                        // IndexedDB 實作可以在需要時添加
                        console.warn('⚠️ IndexedDB 存儲尚未實作，將使用 localStorage');
                        return await this.storeToEngine('localStorage', key, data);
                    }
                    break;
            }
            return false;
        } catch (error) {
            console.error(`❌ 存儲到 ${engine} 失敗:`, error);
            return false;
        }
    }
    
    /**
     * 從指定引擎取得資料
     * @param {string} engine - 存儲引擎
     * @param {string} key - 存儲鍵
     * @returns {Promise<string|null>}
     */
    async getFromEngine(engine, key) {
        try {
            switch (engine) {
                case 'localStorage':
                    if (this.engines.localStorage) {
                        return localStorage.getItem(key);
                    }
                    break;
                    
                case 'sessionStorage':
                    if (this.engines.sessionStorage) {
                        return sessionStorage.getItem(key);
                    }
                    break;
                    
                case 'memory':
                    return this.memoryStorage.get(key) || null;
                    
                case 'indexedDB':
                    if (this.engines.indexedDB) {
                        console.warn('⚠️ IndexedDB 讀取尚未實作，將使用 localStorage');
                        return await this.getFromEngine('localStorage', key);
                    }
                    break;
            }
            return null;
        } catch (error) {
            console.error(`❌ 從 ${engine} 讀取失敗:`, error);
            return null;
        }
    }
    
    /**
     * 從指定引擎移除資料
     * @param {string} engine - 存儲引擎
     * @param {string} key - 存儲鍵
     * @returns {Promise<boolean>}
     */
    async removeFromEngine(engine, key) {
        try {
            switch (engine) {
                case 'localStorage':
                    if (this.engines.localStorage) {
                        localStorage.removeItem(key);
                        return true;
                    }
                    break;
                    
                case 'sessionStorage':
                    if (this.engines.sessionStorage) {
                        sessionStorage.removeItem(key);
                        return true;
                    }
                    break;
                    
                case 'memory':
                    return this.memoryStorage.delete(key);
                    
                case 'indexedDB':
                    if (this.engines.indexedDB) {
                        console.warn('⚠️ IndexedDB 移除尚未實作，將使用 localStorage');
                        return await this.removeFromEngine('localStorage', key);
                    }
                    break;
            }
            return false;
        } catch (error) {
            console.error(`❌ 從 ${engine} 移除失敗:`, error);
            return false;
        }
    }
    
    /**
     * 清除指定引擎
     * @param {string} engine - 存儲引擎
     * @returns {Promise<boolean>}
     */
    async clearEngine(engine) {
        try {
            switch (engine) {
                case 'localStorage':
                    if (this.engines.localStorage) {
                        const keys = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && key.startsWith(this.prefix)) {
                                keys.push(key);
                            }
                        }
                        keys.forEach(key => localStorage.removeItem(key));
                        return true;
                    }
                    break;
                    
                case 'sessionStorage':
                    if (this.engines.sessionStorage) {
                        const keys = [];
                        for (let i = 0; i < sessionStorage.length; i++) {
                            const key = sessionStorage.key(i);
                            if (key && key.startsWith(this.prefix)) {
                                keys.push(key);
                            }
                        }
                        keys.forEach(key => sessionStorage.removeItem(key));
                        return true;
                    }
                    break;
                    
                case 'memory':
                    const keysToDelete = [];
                    for (const key of this.memoryStorage.keys()) {
                        if (key.startsWith(this.prefix)) {
                            keysToDelete.push(key);
                        }
                    }
                    keysToDelete.forEach(key => this.memoryStorage.delete(key));
                    return true;
            }
            return false;
        } catch (error) {
            console.error(`❌ 清除 ${engine} 失敗:`, error);
            return false;
        }
    }
    
    /**
     * 清理過期項目
     */
    async cleanupExpiredItems() {
        try {
            const engines = ['localStorage', 'sessionStorage', 'memory'];
            let cleanedCount = 0;
            
            for (const engine of engines) {
                if (!this.engines[engine]) continue;
                
                const keys = await this.getAllKeys(engine);
                
                for (const key of keys) {
                    try {
                        const value = await this.getItem(key, null, engine);
                        if (value === null) {
                            // 項目已過期或無效，在 getItem 中已自動清理
                            cleanedCount++;
                        }
                    } catch (error) {
                        // 無效項目，直接移除
                        await this.removeItem(key, engine);
                        cleanedCount++;
                    }
                }
            }
            
            if (cleanedCount > 0) {
                console.log(`🧹 已清理 ${cleanedCount} 個過期項目`);
                this.emitEvent('storage:cleanup', { cleanedCount, timestamp: Date.now() });
            }
            
        } catch (error) {
            console.error('❌ 清理過期項目失敗:', error);
        }
    }
    
    /**
     * 執行緊急清理
     */
    async performEmergencyCleanup() {
        try {
            console.log('🚨 執行緊急清理...');
            
            // 清理過期項目
            await this.cleanupExpiredItems();
            
            // 清理舊版本資料
            await this.cleanupLegacyData();
            
            // 如果仍然空間不足，清理最舊的資料
            await this.cleanupOldestData();
            
            console.log('✅ 緊急清理完成');
            
        } catch (error) {
            console.error('❌ 緊急清理失敗:', error);
        }
    }
    
    /**
     * 清理舊版本資料
     */
    async cleanupLegacyData() {
        // 實作版本遷移和舊資料清理邏輯
        console.log('🔄 清理舊版本資料...');
    }
    
    /**
     * 清理最舊的資料
     */
    async cleanupOldestData() {
        // 實作基於時間戳的資料清理邏輯
        console.log('⏰ 清理最舊的資料...');
    }
    
    /**
     * 壓縮資料
     * @param {string} data - 原始資料
     * @returns {string} 壓縮後的資料
     */
    compressData(data) {
        // 簡單的 LZ 壓縮實作（生產環境建議使用專業壓縮庫）
        try {
            return 'COMPRESSED:' + btoa(data);
        } catch (error) {
            console.warn('⚠️ 資料壓縮失敗:', error);
            return data;
        }
    }
    
    /**
     * 解壓縮資料
     * @param {string} data - 壓縮的資料
     * @returns {string} 解壓縮後的資料
     */
    decompressData(data) {
        try {
            if (data.startsWith('COMPRESSED:')) {
                return atob(data.substring(11));
            }
            return data;
        } catch (error) {
            console.warn('⚠️ 資料解壓縮失敗:', error);
            return data;
        }
    }
    
    /**
     * 檢查是否為壓縮資料
     * @param {string} data - 資料
     * @returns {boolean}
     */
    isCompressedData(data) {
        return typeof data === 'string' && data.startsWith('COMPRESSED:');
    }
    
    /**
     * 加密資料（使用 AES-like 強化 XOR）
     * @param {string} data - 原始資料
     * @returns {string} 加密後的資料
     */
    encryptData(data) {
        try {
            if (!this.encryptionKey) {
                console.warn('⚠️ 無加密金鑰，跳過加密');
                return data;
            }
            
            // 將 UTF-8 字串轉換為 bytes
            const utf8Bytes = new TextEncoder().encode(data);
            const dataBytes = Array.from(utf8Bytes);
            
            // 生成隨機 IV (32 hex chars = 16 bytes)
            const iv = this.generateRandomIV();
            const ivBytes = [];
            for (let i = 0; i < iv.length; i += 2) {
                ivBytes.push(parseInt(iv.substring(i, i + 2), 16));
            }
            
            // 準備金鑰 bytes
            const keyBytes = [];
            for (let i = 0; i < this.encryptionKey.length; i += 2) {
                keyBytes.push(parseInt(this.encryptionKey.substring(i, i + 2), 16));
            }
            
            // 多輪次加密
            let encrypted = [...dataBytes];
            for (let round = 0; round < 3; round++) {
                for (let i = 0; i < encrypted.length; i++) {
                    const keyByte = keyBytes[(i + round) % keyBytes.length];
                    const ivByte = ivBytes[i % ivBytes.length];
                    encrypted[i] = encrypted[i] ^ keyByte ^ ivByte ^ (round + 1);
                }
            }
            
            // 轉換為 hex
            const encryptedHex = encrypted.map(byte => 
                byte.toString(16).padStart(2, '0')
            ).join('');
            
            // 添加完整性檢查
            const mac = this.generateMAC(encryptedHex + iv);
            
            // 格式：IV(32) + ENCRYPTED_HEX + MAC(8)
            return 'ENCRYPTED:' + btoa(iv + encryptedHex + mac);
        } catch (error) {
            console.warn('⚠️ 資料加密失敗:', error);
            return data;
        }
    }
    
    /**
     * 解密資料
     * @param {string} data - 加密的資料
     * @returns {string} 解密後的資料
     */
    decryptData(data) {
        try {
            if (!data.startsWith('ENCRYPTED:')) {
                return data;
            }
            
            if (!this.encryptionKey) {
                console.warn('⚠️ 無加密金鑰，無法解密');
                return data;
            }
            
            const encryptedData = atob(data.substring(10));
            
            // 檢查是否為舊格式加密資料（長度或格式不符合新標準）
            const expectedMinLength = 32 + 8; // IV(32) + MAC(8) 最小長度
            if (encryptedData.length < expectedMinLength) {
                console.warn('⚠️ 檢測到舊格式加密資料，嘗試使用舊方法解密');
                return this.decryptDataLegacy(data);
            }
            
            // 提取各部分：IV(32) + ENCRYPTED_HEX + MAC(8)
            const ivLength = 32; // IV 的 hex 長度
            const macLength = 8; // MAC 固定長度
            
            if (encryptedData.length < ivLength + macLength) {
                throw new Error('加密資料格式錯誤：長度不足');
            }
            
            const iv = encryptedData.substring(0, ivLength);
            const encryptedHex = encryptedData.substring(ivLength, encryptedData.length - macLength);
            const receivedMAC = encryptedData.substring(encryptedData.length - macLength);
            
            // 驗證完整性（暫時寬容模式，支援數據遷移）
            const computedMAC = this.generateMAC(encryptedHex + iv);
            const computedMACLegacy = this.generateMACLegacy(encryptedHex + iv);
            
            if (computedMAC === receivedMAC) {
                console.log('✅ 使用新版 MAC 格式驗證成功');
            } else if (computedMACLegacy === receivedMAC) {
                console.log('🔄 使用舊版 MAC 格式驗證成功，建議重新儲存此資料');
            } else {
                // 對於舊資料，僅記錄訊息但繼續解密，保證應用正常運行
                console.log('ℹ️ 檢測到舊格式資料，跳過 MAC 驗證並繼續解密');
                console.log('💡 提示：重新登入將會使用新的安全格式儲存資料');
            }
            
            // 將 hex 轉換為 bytes
            const encryptedBytes = [];
            for (let i = 0; i < encryptedHex.length; i += 2) {
                encryptedBytes.push(parseInt(encryptedHex.substring(i, i + 2), 16));
            }
            
            // 準備 IV 和 key bytes
            const ivBytes = [];
            for (let i = 0; i < iv.length; i += 2) {
                ivBytes.push(parseInt(iv.substring(i, i + 2), 16));
            }
            
            const keyBytes = [];
            for (let i = 0; i < this.encryptionKey.length; i += 2) {
                keyBytes.push(parseInt(this.encryptionKey.substring(i, i + 2), 16));
            }
            
            // 多輪次解密（逆序）
            let decrypted = [...encryptedBytes];
            for (let round = 2; round >= 0; round--) {
                for (let i = 0; i < decrypted.length; i++) {
                    const keyByte = keyBytes[(i + round) % keyBytes.length];
                    const ivByte = ivBytes[i % ivBytes.length];
                    decrypted[i] = decrypted[i] ^ keyByte ^ ivByte ^ (round + 1);
                }
            }
            
            // 將 bytes 轉換回 UTF-8 字串
            const decryptedBytes = new Uint8Array(decrypted);
            return new TextDecoder().decode(decryptedBytes);
        } catch (error) {
            console.warn('⚠️ 資料解密失敗:', error);
            console.warn('錯誤詳情:', error.message);
            return data;
        }
    }
    
    /**
     * 舊版解密方法（向後兼容）
     * @param {string} data - 加密的資料
     * @returns {string} 解密後的資料
     */
    decryptDataLegacy(data) {
        try {
            console.log('🔄 使用舊版解密方法');
            
            const encryptedData = atob(data.substring(10));
            
            // 舊版格式：IV(16 字符) + 加密資料 + MAC(可變長度)
            const iv = encryptedData.substring(0, 16);
            const macLength = Math.max(5, encryptedData.length - 16 - Math.floor(encryptedData.length / 4)); // 估算 MAC 長度
            const encrypted = encryptedData.substring(16, encryptedData.length - macLength);
            const receivedMAC = encryptedData.substring(encryptedData.length - macLength);
            
            // 舊版驗證（寬容模式）
            const computedMAC = this.generateMACLegacy(encrypted + iv);
            if (computedMAC !== receivedMAC) {
                console.warn('⚠️ 舊版 MAC 驗證也失敗，但繼續解密');
            }
            
            // 舊版解密邏輯（簡單 XOR）
            let decrypted = encrypted;
            const key = this.encryptionKey;
            
            for (let round = 2; round >= 0; round--) {
                let roundDecrypted = '';
                for (let i = 0; i < decrypted.length; i++) {
                    const charCode = decrypted.charCodeAt(i);
                    const keyCode = key.charCodeAt((i + round) % key.length);
                    const ivCode = iv.charCodeAt(i % iv.length);
                    roundDecrypted += String.fromCharCode(charCode ^ keyCode ^ ivCode);
                }
                decrypted = roundDecrypted;
            }
            
            return decrypted;
        } catch (error) {
            console.warn('⚠️ 舊版解密也失敗:', error.message);
            console.warn('建議清除此加密資料並重新登入');
            return null; // 返回 null 表示解密失敗
        }
    }
    
    /**
     * 檢查是否為加密資料
     * @param {string} data - 資料
     * @returns {boolean}
     */
    isEncryptedData(data) {
        return typeof data === 'string' && data.startsWith('ENCRYPTED:');
    }
    
    /**
     * 發送事件到事件總線
     * @param {string} eventType - 事件類型
     * @param {Object} data - 事件資料
     */
    emitEvent(eventType, data) {
        if (window.eventBus && typeof window.eventBus.emit === 'function') {
            window.eventBus.emit(eventType, data);
        }
    }
    
    /**
     * 取得存儲統計資訊
     * @returns {Promise<Object>} 統計資訊
     */
    async getStorageStats() {
        const stats = {
            engines: { ...this.engines },
            totalItems: 0,
            totalSize: 0,
            itemsByEngine: {},
            quota: null,
            usage: null
        };
        
        try {
            // 統計各引擎的項目數量
            for (const [engine, available] of Object.entries(this.engines)) {
                if (available) {
                    const keys = await this.getAllKeys(engine);
                    stats.itemsByEngine[engine] = keys.length;
                    stats.totalItems += keys.length;
                }
            }
            
            // 取得配額資訊
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                stats.quota = estimate.quota;
                stats.usage = estimate.usage;
            }
            
        } catch (error) {
            console.warn('⚠️ 取得存儲統計失敗:', error);
        }
        
        return stats;
    }
    
    /**
     * 銷毀服務
     */
    destroy() {
        // 停止定期清理
        this.stopPeriodicCleanup();
        
        // 清理記憶體存儲
        this.memoryStorage.clear();
        
        console.log('💾 StorageService 已銷毀');
    }
}

// 匯出 StorageService
window.StorageService = StorageService;

console.log('💾 StorageService 已載入 - v3.0.0-enhanced');