/**
 * Firebase 服務 - 即時資料庫整合
 * 提供房間管理、玩家同步、投票狀態同步等功能
 * @version 3.0.0-enhanced
 */

/**
 * Firebase 服務類別
 */
class FirebaseService {
    constructor(options = {}) {
        this.version = '3.0.0-unified';
        this.db = null;
        this.app = null; // Firebase 應用實例
        this.currentRoomRef = null;
        this.currentPlayerId = null;
        this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
        this.listeners = new Map(); // 追蹤所有監聽器以便清理
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        // 事件監聽器註冊
        this.eventListeners = new Map();
        
        // 速率限制
        this.rateLimiter = new Map(); // 儲存每個操作的時間戳記
        this.rateLimits = {
            joinRoom: { interval: 5000, maxAttempts: 3 }, // 5秒內最多3次
            submitVote: { interval: 1000, maxAttempts: 5 }, // 1秒內最多5次
            revealVotes: { interval: 2000, maxAttempts: 2 }, // 2秒內最多2次
            clearVotes: { interval: 2000, maxAttempts: 2 }, // 2秒內最多2次
            leaveRoom: { interval: 1000, maxAttempts: 3 }, // 1秒內最多3次
            saveStatistics: { interval: 3000, maxAttempts: 2 } // 3秒內最多2次
        };
        
        // 統一架構：支援預初始化的 Firebase 實例
        if (options.preInitialized) {
            console.log('🔄 FirebaseService 使用預初始化的 Firebase 實例');
            
            if (!options.app || !options.database) {
                console.error('❌ [FirebaseService] 預初始化模式缺少 app 或 database 參數');
                console.error('❌ [FirebaseService] options.app:', !!options.app, 'options.database:', !!options.database);
                throw new Error('預初始化模式需要提供 app 和 database 參數');
            }
            
            const success = this.usePreInitializedFirebase(options.app, options.database);
            if (!success) {
                throw new Error('使用預初始化 Firebase 實例失敗');
            }
        } else if (options.config) {
            // 向後兼容：舊方式初始化
            console.log('🔄 FirebaseService 使用傳統初始化方式（向後兼容）');
            this.initialize(options.config).catch(error => {
                console.error('❌ 自動初始化失敗:', error);
            });
        }
        
        // 配置選項
        this.config = {
            enablePersistence: true,
            enableLogging: false,
            retryInterval: 30000,
            heartbeatInterval: 30000 // 改為 30 秒心跳
        };
        
        // 心跳定時器
        this.heartbeatTimer = null;
        
        console.log(`🔥 FirebaseService ${this.version} 已創建`);
    }
    
    /**
     * 使用預初始化的 Firebase 實例（新架構）
     * @param {Object} app - Firebase 應用實例
     * @param {Object} database - Firebase 資料庫實例
     * @returns {boolean} 設置是否成功
     */
    usePreInitializedFirebase(app, database) {
        try {
            console.log('🔧 FirebaseService 接受預初始化的 Firebase 實例...');
            
            if (!app || !database) {
                throw new Error('預初始化的 Firebase 實例不完整');
            }
            
            // 使用預初始化的實例
            this.app = app;
            this.db = database;
            this.connectionState = 'connected';
            
            // 設置連線狀態監聽
            this.setupConnectionMonitoring();
            
            console.log('✅ FirebaseService 已成功使用預初始化的 Firebase 實例');
            this.emitEvent('firebase:connected', { timestamp: Date.now() });
            
            return true;
            
        } catch (error) {
            console.error('❌ 使用預初始化 Firebase 實例失敗:', error);
            this.connectionState = 'error';
            this.emitEvent('firebase:error', { error, timestamp: Date.now() });
            return false;
        }
    }
    
    /**
     * 初始化 Firebase 連線（舊版本向後兼容）
     * @param {Object} config - Firebase 配置
     * @param {string} config.projectId - Firebase 專案 ID
     * @param {string} config.apiKey - Firebase API 金鑰
     * @param {string} [config.databaseURL] - 資料庫 URL（可選）
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize(config) {
        console.warn('⚠️ 使用舊版 FirebaseService.initialize()，建議升級到使用 FirebaseConfigManager');
        
        try {
            console.log('🔥 正在初始化 Firebase（向後兼容模式）...');
            this.connectionState = 'connecting';
            
            // 檢查是否可以使用 FirebaseConfigManager
            if (window.firebaseConfigManager && window.firebaseConfigManager.isReady()) {
                console.log('🔄 發現可用的 FirebaseConfigManager，使用統一管理實例');
                
                const app = window.firebaseConfigManager.getApp();
                const database = window.firebaseConfigManager.getDatabase();
                
                return this.usePreInitializedFirebase(app, database);
            }
            
            // 傳統初始化邏輯（向後兼容）
            console.log('🔄 使用傳統 Firebase 初始化邏輯');
            
            // 驗證配置
            if (!config || !config.projectId || !config.apiKey) {
                throw new Error('Firebase 配置不完整：需要 projectId 和 apiKey');
            }
            
            // 構建 Firebase 配置
            const firebaseConfig = {
                apiKey: config.apiKey,
                projectId: config.projectId,
                databaseURL: config.databaseURL || `https://${config.projectId}-default-rtdb.firebaseio.com/`,
                authDomain: `${config.projectId}.firebaseapp.com`,
                storageBucket: `${config.projectId}.appspot.com`,
                messagingSenderId: '123456789',
                appId: '1:123456789:web:abcdef123456'
            };
            
            // 檢查 Firebase SDK 是否已載入
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK 未載入');
            }
            
            // 初始化 Firebase 應用（防止重複初始化）
            if (!firebase.apps.length) {
                console.log('🔥 首次初始化 Firebase 應用...');
                this.app = firebase.initializeApp(firebaseConfig);
            } else {
                console.log('♻️ Firebase 應用已存在，跳過重複初始化');
                // 檢查現有應用配置是否匹配
                const existingApp = firebase.app();
                if (existingApp.options.projectId !== config.projectId) {
                    console.warn(`⚠️ 專案 ID 不匹配: 現有=${existingApp.options.projectId}, 新的=${config.projectId}`);
                }
                this.app = existingApp;
            }
            
            // 取得資料庫參考
            this.db = firebase.database();
            
            // 【低安全性設計】跳過身份驗證 - 僅供內部使用
            console.log('🔓 低安全性模式：跳過身份驗證步驟');
            console.log('⚠️ 注意：此配置僅適用於內部環境，請勿用於生產環境');
            
            // 啟用離線持久化
            if (this.config.enablePersistence) {
                try {
                    await this.db.goOffline();
                    await this.db.goOnline();
                } catch (error) {
                    console.warn('⚠️ Firebase 離線持久化設置失敗:', error);
                }
            }
            
            // 設置連線狀態監聽
            this.setupConnectionMonitoring();
            
            this.connectionState = 'connected';
            this.retryCount = 0;
            
            console.log('✅ Firebase 初始化成功（向後兼容模式）');
            this.emitEvent('firebase:connected', { timestamp: Date.now() });
            
            return true;
            
        } catch (error) {
            console.error('❌ Firebase 初始化失敗:', error);
            this.connectionState = 'error';
            this.emitEvent('firebase:error', { error, timestamp: Date.now() });
            
            // 自動重試
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Firebase 重試連線 (${this.retryCount}/${this.maxRetries})...`);
                
                setTimeout(() => {
                    this.initialize(config);
                }, this.retryDelay * this.retryCount);
            }
            
            return false;
        }
    }
    
    /**
     * 提供 database 屬性的 getter，保持 API 一致性
     */
    get database() {
        return this.db;
    }
    
    /**
     * 設置連線狀態監聽
     */
    setupConnectionMonitoring() {
        const connectedRef = this.db.ref('.info/connected');
        const connectionListener = connectedRef.on('value', (snapshot) => {
            const isConnected = snapshot.val();
            
            if (isConnected) {
                console.log('🔗 Firebase 已連線');
                this.connectionState = 'connected';
                this.retryCount = 0;
                this.emitEvent('firebase:connected', { timestamp: Date.now() });
            } else {
                console.log('📡 Firebase 連線中斷');
                this.connectionState = 'disconnected';
                this.emitEvent('firebase:disconnected', { timestamp: Date.now() });
            }
        });
        
        this.listeners.set('connection', { ref: connectedRef, listener: connectionListener });
    }
    
    /**
     * 啟動心跳機制
     */
    startHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        
        this.heartbeatTimer = setInterval(() => {
            if (this.connectionState === 'connected' && this.currentRoomRef && this.currentPlayerId) {
                this.updatePlayerHeartbeat();
            }
        }, this.config.heartbeatInterval);
        
    }
    
    /**
     * 停止心跳機制
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    /**
     * 設置強化的斷線清理機制
     * @param {string} roomId - 房間 ID
     * @param {string} playerId - 玩家 ID  
     * @param {Object} playerRef - 玩家 Firebase 參考
     * @param {Object} voteRef - 投票 Firebase 參考
     */
    async setupDisconnectCleanup(roomId, playerId, playerRef, voteRef) {
        try {
            // 方案 1: 立即標記離線狀態（保持現有邏輯）
            await playerRef.onDisconnect().update({
                online: false,
                lastSeen: Date.now(),
                disconnectedAt: Date.now()
            });
            
            // 方案 2: 清除投票（確保遊戲邏輯乾淨）
            await voteRef.onDisconnect().remove();
            
            // 方案 3: 延遲完全移除玩家（避免快速重連時的資料遺失）
            // 使用 Firebase Cloud Functions 或客戶端定時器實現
            this.schedulePlayerCleanup(roomId, playerId);
            
            console.log(`[Firebase] 已設定斷線清理 for player ${playerId}`);
            
        } catch (error) {
            console.error(`❌ 設置斷線清理失敗 [${roomId}][${playerId}]:`, error);
        }
    }
    
    /**
     * 安排玩家清理任務（延遲移除機制）
     * @param {string} roomId - 房間 ID
     * @param {string} playerId - 玩家 ID
     */
    schedulePlayerCleanup(roomId, playerId) {
        // 5分鐘後檢查玩家是否仍離線，如果是則完全移除
        setTimeout(async () => {
            try {
                const playerSnapshot = await this.db.ref(`rooms/${roomId}/players/${playerId}`).once('value');
                const playerData = playerSnapshot.val();
                
                if (playerData && !playerData.online) {
                    const offlineTime = Date.now() - (playerData.disconnectedAt || playerData.lastSeen || 0);
                    
                    // 如果離線超過 5 分鐘，完全移除玩家
                    if (offlineTime > 5 * 60 * 1000) {
                        console.log(`🧹 自動移除長時間離線玩家: ${playerId} (離線 ${Math.round(offlineTime/60000)} 分鐘)`);
                        await this.leaveRoom(roomId, playerId, true);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ 清理離線玩家檢查失敗 [${roomId}][${playerId}]:`, error);
            }
        }, 5 * 60 * 1000); // 5分鐘延遲
    }
    
    /**
     * 更新玩家心跳（強化版）
     */
    async updatePlayerHeartbeat() {
        try {
            if (!this.currentRoomRef || !this.currentPlayerId) {
                console.warn('⚠️ 心跳更新跳過: 房間或玩家信息未設置');
                return;
            }
            
            if (this.connectionState !== 'connected') {
                console.warn('⚠️ 心跳更新跳過: Firebase 未連線');
                return;
            }
            
            const heartbeatTime = Date.now();
            const updates = {};
            updates[`players/${this.currentPlayerId}/lastHeartbeat`] = heartbeatTime;
            updates[`players/${this.currentPlayerId}/online`] = true;
            updates[`players/${this.currentPlayerId}/lastSeen`] = heartbeatTime;
            
            await this.currentRoomRef.update(updates);
            
            // 🎯 心跳成功：重置失敗計數器
            if (this.heartbeatFailCount > 0) {
                console.log(`✅ 心跳恢復正常，重置失敗計數器 (之前失敗 ${this.heartbeatFailCount} 次)`);
                this.heartbeatFailCount = 0;
            }
            
            // 每 10 次心跳才記錄一次日誌，避免日誌過多
            if (!this.heartbeatCount) this.heartbeatCount = 0;
            this.heartbeatCount++;
            
            if (this.heartbeatCount % 10 === 1) {
                console.log(`💓 [${this.getCurrentRoomId()}][${this.currentPlayerId}] 心跳更新 #${this.heartbeatCount}`);
            }
            
        } catch (error) {
            console.warn(`⚠️ 玩家心跳更新失敗 [${this.getCurrentRoomId()}][${this.currentPlayerId}]:`, error);
            
            // 🎯 增強容錯：心跳失敗計數和重試機制
            if (!this.heartbeatFailCount) this.heartbeatFailCount = 0;
            this.heartbeatFailCount++;
            
            // 分級處理心跳失敗
            if (this.heartbeatFailCount === 3) {
                console.warn('⚠️ 心跳失敗 3 次，可能網路不穩定');
            } else if (this.heartbeatFailCount === 5) {
                console.warn('🔄 心跳失敗 5 次，嘗試重新連線');
                this.emitEvent('firebase:heartbeat-failed', { 
                    roomId: this.getCurrentRoomId(), 
                    playerId: this.currentPlayerId,
                    failCount: this.heartbeatFailCount,
                    level: 'warning'
                });
            } else if (this.heartbeatFailCount >= 10) {
                console.error('💔 連續心跳失敗過多，連線可能中斷');
                this.emitEvent('firebase:heartbeat-failed', { 
                    roomId: this.getCurrentRoomId(), 
                    playerId: this.currentPlayerId,
                    failCount: this.heartbeatFailCount,
                    level: 'critical' 
                });
                
                // 嘗試重新建立連線
                if (this.connectionState === 'connected') {
                    console.log('🔄 嘗試重新啟動心跳機制');
                    this.stopHeartbeat();
                    setTimeout(() => this.startHeartbeat(), 5000);
                }
            }
        }
    }
    
    /**
     * 檢查速率限制
     * @param {string} operation - 操作名稱
     * @param {string} identifier - 識別符（如玩家ID）
     * @returns {boolean} 是否允許操作
     */
    checkRateLimit(operation, identifier = 'global') {
        const now = Date.now();
        const key = `${operation}_${identifier}`;
        const limit = this.rateLimits[operation];
        
        if (!limit) {
            return true; // 沒有設定限制
        }
        
        if (!this.rateLimiter.has(key)) {
            this.rateLimiter.set(key, []);
        }
        
        const attempts = this.rateLimiter.get(key);
        
        // 清理過期的嘗試記錄
        const validAttempts = attempts.filter(timestamp => now - timestamp < limit.interval);
        
        // 檢查是否超過限制
        if (validAttempts.length >= limit.maxAttempts) {
            console.warn(`⚠️ 速率限制: ${operation} 操作過於頻繁 (${identifier})`);
            return false;
        }
        
        // 記錄這次嘗試
        validAttempts.push(now);
        this.rateLimiter.set(key, validAttempts);
        
        return true;
    }
    
    /**
     * 確保身份驗證已完成
     * @returns {Promise<void>}
     */
    async ensureAuthenticated() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            console.log('🏠 本地模擬模式，跳過身份驗證');
            return;
        }
        
        // 檢查當前是否已有用戶
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            console.log('✅ 身份驗證已存在:', currentUser.uid);
            return;
        }
        
        console.log('🔄 開始匿名身份驗證...');
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('身份驗證超時'));
            }, 15000); // 延長到 15 秒超時
            
            // 直接進行匿名登入，不依賴 onAuthStateChanged
            firebase.auth().signInAnonymously()
                .then((result) => {
                    clearTimeout(timeout);
                    console.log('✅ 匿名身份驗證成功:', result.user.uid);
                    
                    // 等待一下確保 auth state 完全更新
                    setTimeout(() => {
                        resolve();
                    }, 500);
                })
                .catch((error) => {
                    clearTimeout(timeout);
                    console.error('❌ 匿名身份驗證失敗:', error);
                    reject(error);
                });
        });
    }

    /**
     * 生成有效的玩家 ID
     * @returns {string} 有效的玩家 ID
     */
    generateValidPlayerId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `player_${timestamp}_${random}`;
    }
    
    /**
     * 測試玩家 ID 驗證功能
     * @returns {Object} 測試結果
     */
    testPlayerIdValidation() {
        console.log('🧪 開始測試玩家 ID 驗證功能...');
        
        const testResults = {
            validIds: [],
            invalidIds: [],
            autoGenerated: []
        };
        
        // 測試有效的 ID
        const validIds = [
            'player_1234567_abcdef',
            'player_abc123_xyz789',
            this.generateValidPlayerId(),
            this.generateValidPlayerId(),
            this.generateValidPlayerId()
        ];
        
        validIds.forEach(id => {
            try {
                const result = this.validateAndSanitizeInput(id, 50, 'playerId');
                testResults.validIds.push({ id, result, status: '✅ 通過' });
            } catch (error) {
                testResults.validIds.push({ id, error: error.message, status: '❌ 失敗' });
            }
        });
        
        // 測試無效的 ID
        const invalidIds = [
            'player_123',           // 缺少第三部分
            'invalid_123_abc',      // 不以 player 開頭
            'player_123_',          // 第三部分為空
            'player__abc',          // 第二部分為空
            'player_123_ABC@#$',    // 包含特殊字符
            'player_123456789012345_abc', // 時間戳太長
            'player_12_a'           // 部分太短
        ];
        
        invalidIds.forEach(id => {
            try {
                const result = this.validateAndSanitizeInput(id, 50, 'playerId');
                testResults.invalidIds.push({ id, result, status: '⚠️ 意外通過' });
            } catch (error) {
                testResults.invalidIds.push({ id, error: error.message, status: '✅ 正確拒絕' });
            }
        });
        
        // 測試自動生成功能
        for (let i = 0; i < 5; i++) {
            const generated = this.generateValidPlayerId();
            try {
                const result = this.validateAndSanitizeInput(generated, 50, 'playerId');
                testResults.autoGenerated.push({ id: generated, result, status: '✅ 生成有效' });
            } catch (error) {
                testResults.autoGenerated.push({ id: generated, error: error.message, status: '❌ 生成無效' });
            }
        }
        
        console.log('🧪 玩家 ID 驗證測試結果:', testResults);
        return testResults;
    }
    
    /**
     * 輸入驗證和清理
     * @param {string} input - 輸入字串
     * @param {number} maxLength - 最大長度
     * @param {string} type - 驗證類型
     * @returns {string} 清理後的輸入
     */
    validateAndSanitizeInput(input, maxLength = 50, type = 'general') {
        if (typeof input !== 'string') {
            throw new Error('輸入必須是字串');
        }
        
        // 基本長度檢查
        if (input.length === 0 || input.length > maxLength) {
            throw new Error(`輸入長度必須在 1-${maxLength} 字符之間`);
        }
        
        // 移除潛在的惡意字符
        let sanitized = input
            .replace(/[<>\"'&]/g, '') // 移除 HTML 字符
            .replace(/javascript:/gi, '') // 移除 JavaScript 協議
            .replace(/data:/gi, '') // 移除 data 協議
            .replace(/vbscript:/gi, '') // 移除 VBScript 協議
            .trim();
        
        // 根據類型進行特定驗證
        switch (type) {
            case 'roomId':
                // 房間 ID 只允許字母、數字、連字符和底線
                if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
                    throw new Error('房間 ID 只能包含字母、數字、連字符和底線');
                }
                break;
            case 'playerName':
                // 玩家名稱不允許特殊字符
                if (!/^[a-zA-Z0-9\u4e00-\u9fff\s_-]+$/.test(sanitized)) {
                    throw new Error('玩家名稱包含不允許的字符');
                }
                break;
            case 'playerId':
                // 玩家 ID 格式檢查 - 支援 base36 時間戳格式
                // 格式：player_時間戳(base36)_隨機字符(base36)
                if (!/^player_[a-z0-9]+_[a-z0-9]+$/.test(sanitized)) {
                    throw new Error(`玩家 ID 格式無效，期望格式：player_時間戳_隨機字符，收到：${sanitized}`);
                }
                
                // 額外檢查：確保有三個部分用底線分隔
                const parts = sanitized.split('_');
                if (parts.length !== 3) {
                    throw new Error(`玩家 ID 必須包含三個部分（player_時間戳_隨機字符），收到：${sanitized}`);
                }
                
                // 檢查每個部分的長度合理性
                if (parts[0] !== 'player') {
                    throw new Error(`玩家 ID 必須以 'player' 開頭，收到：${parts[0]}`);
                }
                if (parts[1].length < 6 || parts[1].length > 15) {
                    throw new Error(`玩家 ID 時間戳部分長度異常，收到：${parts[1]}`);
                }
                if (parts[2].length < 4 || parts[2].length > 10) {
                    throw new Error(`玩家 ID 隨機字符部分長度異常，收到：${parts[2]}`);
                }
                break;
        }
        
        return sanitized;
    }
    
    /**
     * 驗證投票值
     * @param {*} vote - 投票值
     * @returns {number|string} 驗證後的投票值
     */
    validateVoteValue(vote) {
        // 允許的 Fibonacci 數列
        const allowedNumbers = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 100];
        // 允許的特殊值 (包含多種表示方式)
        const allowedSpecial = ['?', '❓', 'question', '☕', 'coffee', '∞', 'infinity'];
        
        // 數字類型驗證
        if (typeof vote === 'number' && allowedNumbers.includes(vote)) {
            if (vote === 0) {
                console.log(`✅ 特別驗證：0 值投票 - 類型: ${typeof vote}, 值: ${vote}, 在允許列表中: ${allowedNumbers.includes(vote)}`);
            }
            console.log(`✅ 有效數字投票值: ${vote}`);
            return vote;
        }
        
        // 字串類型驗證 (支援多種表示方式)
        if (typeof vote === 'string') {
            console.log(`🔍 檢查字串投票值: "${vote}" (Unicode: ${vote.charCodeAt(0)})`);
            console.log(`🔍 允許的特殊值:`, allowedSpecial);
            console.log(`🔍 包含檢查結果:`, allowedSpecial.includes(vote));
            
            if (allowedSpecial.includes(vote)) {
                console.log(`✅ 有效特殊投票值: ${vote}`);
                return vote;
            }
        }
        
        // 詳細錯誤日誌
        console.error(`❌ 無效的投票值:`, {
            value: vote,
            type: typeof vote,
            allowedNumbers,
            allowedSpecial
        });
        
        throw new Error(`無效的投票值: ${vote} (類型: ${typeof vote})`);
    }

    /**
     * 加入或創建房間
     * @param {string} roomId - 房間 ID
     * @param {Object} player - 玩家資訊
     * @param {string} player.id - 玩家 ID
     * @param {string} player.name - 玩家名稱
     * @param {string} player.role - 玩家角色
     * @returns {Promise<Object>} 房間資訊
     */
    async joinRoom(roomId, player) {
        try {
            if (this.connectionState !== 'connected') {
                throw new Error('Firebase 未連線');
            }
            
            if (!roomId || !player || !player.id || !player.name) {
                throw new Error('房間 ID 或玩家資訊不完整');
            }
            
            // 速率限制檢查
            if (!this.checkRateLimit('joinRoom', player.id)) {
                throw new Error('操作過於頻繁，請稍後再試');
            }
            
            // 輸入驗證和清理（帶友善錯誤處理）
            try {
                roomId = this.validateAndSanitizeInput(roomId, 20, 'roomId');
            } catch (error) {
                console.error('❌ 房間 ID 驗證失敗:', error.message);
                throw new Error(`房間 ID 格式錯誤：${error.message}`);
            }
            
            try {
                player.id = this.validateAndSanitizeInput(player.id, 50, 'playerId');
            } catch (error) {
                console.error('❌ 玩家 ID 驗證失敗:', error.message, '原始 ID:', player.id);
                // 自動重新生成玩家 ID
                console.log('🔄 自動重新生成玩家 ID...');
                player.id = this.generateValidPlayerId();
                console.log('✅ 新的玩家 ID:', player.id);
            }
            
            try {
                player.name = this.validateAndSanitizeInput(player.name, 20, 'playerName');
            } catch (error) {
                console.error('❌ 玩家名稱驗證失敗:', error.message);
                throw new Error(`玩家名稱格式錯誤：${error.message}`);
            }
            
            // 角色驗證
            const allowedRoles = ['dev', 'qa', 'scrum_master', 'po', 'other'];
            if (!allowedRoles.includes(player.role)) {
                throw new Error('無效的玩家角色');
            }
            
            console.log(`🏠 正在加入房間: ${roomId}`);
            
            // 確保身份驗證完成
            await this.ensureAuthenticated();
            
            // 取得房間參考
            const roomRef = this.db.ref(`rooms/${roomId}`);
            this.currentRoomRef = roomRef;
            this.currentPlayerId = player.id;
            
            // 檢查房間是否存在
            const roomSnapshot = await roomRef.once('value');
            const roomExists = roomSnapshot.exists();
            
            if (!roomExists) {
                // 創建新房間
                await this.createRoom(roomId, player);
                console.log(`🆕 已創建新房間: ${roomId}`);
            } else {
                // 檢查房間是否已滿或被鎖定
                const roomData = roomSnapshot.val();
                
                if (roomData.locked) {
                    throw new Error('房間已被鎖定');
                }
                
                // 獲取實際活躍玩家數量（包含清理超時玩家）
                const activePlayerCount = await this.getActivePlayerCount(roomId);
                console.log(`👥 房間 ${roomId} 當前活躍玩家數: ${activePlayerCount}/50`);
                
                if (activePlayerCount >= 50) { // 最大玩家數限制
                    throw new Error(`房間已達到最大容量 (${activePlayerCount}/50 位玩家)。請等待其他玩家離開或建立新房間。`);
                }
                
                // 檢查該玩家是否已經在房間中（增強復原機制）
                if (roomData.players && roomData.players[player.id]) {
                    console.log(`🔄 玩家 ${player.name} 重新加入房間 - 執行增強復原`);
                    
                    // 保存原有狀態
                    const existingPlayer = roomData.players[player.id];
                    const existingVote = roomData.votes && roomData.votes[player.id];
                    
                    console.log(`📋 復原玩家狀態:`, {
                        name: existingPlayer.name,
                        role: existingPlayer.role,
                        isAdmin: existingPlayer.isAdmin,
                        hasVoted: existingPlayer.hasVoted,
                        vote: existingVote?.value
                    });
                    
                    // 更新心跳和線上狀態，但保留其他資料
                    const recoveryUpdates = {};
                    recoveryUpdates[`rooms/${roomId}/players/${player.id}/lastHeartbeat`] = Date.now();
                    recoveryUpdates[`rooms/${roomId}/players/${player.id}/online`] = true;
                    recoveryUpdates[`rooms/${roomId}/players/${player.id}/joinedAt`] = existingPlayer.joinedAt || Date.now();
                    
                    // 保留管理員狀態
                    if (existingPlayer.isAdmin) {
                        recoveryUpdates[`rooms/${roomId}/players/${player.id}/isAdmin`] = true;
                        console.log(`👑 復原管理員身份: ${player.name}`);
                    }
                    
                    await this.db.ref().update(recoveryUpdates);
                    
                    // 發送復原事件
                    this.emitEvent('room:player-recovered', { 
                        roomId, 
                        player: {
                            ...player,
                            isAdmin: existingPlayer.isAdmin,
                            hasVoted: existingPlayer.hasVoted,
                            vote: existingVote?.value
                        }
                    });
                    
                    console.log(`✅ 玩家 ${player.name} 狀態已完全復原`);
                }
            }
            
            // 添加玩家到房間
            await this.addPlayerToRoom(roomId, player);
            
            // 檢查並設置管理員身份
            await this.checkAndSetAdminStatus(roomId, player.id);
            
            // 設置房間監聽器
            this.setupRoomListeners(roomId);
            
            // 現在房間信息已設置，重新啟動心跳機制
            this.startHeartbeat();
            
            // 取得更新後的房間資料
            const updatedSnapshot = await roomRef.once('value');
            const roomData = updatedSnapshot.val();
            
            console.log(`✅ 成功加入房間: ${roomId}`);
            this.emitEvent('room:joined', { roomId, player, roomData });
            
            return {
                roomId,
                roomData,
                isNewRoom: !roomExists,
                playerCount: roomData.players ? Object.keys(roomData.players).length : 0
            };
            
        } catch (error) {
            console.error('❌ 加入房間失敗:', error);
            this.emitEvent('room:join-error', { roomId, player, error });
            throw error;
        }
    }
    
    /**
     * 創建新房間
     * @param {string} roomId - 房間 ID
     * @param {Object} creator - 創建者資訊
     */
    async createRoom(roomId, creator) {
        const roomData = {
            id: roomId,
            createdAt: Date.now(),
            createdBy: creator.id,
            adminId: creator.id, // 創建者自動成為管理員
            phase: 'waiting', // waiting, voting, revealing, revealed, finished, resetting
            phaseVersion: 0, // 版本控制
            phaseTimestamp: Date.now(),
            locked: false,
            settings: {
                allowSpectators: true,
                autoReveal: false,
                cardSet: 'fibonacci', // fibonacci, tshirt, custom
                maxPlayers: 50,
                timeLimit: null
            },
            statistics: {
                rounds: 0,
                totalVotes: 0,
                averageTime: 0
            },
            players: {},
            votes: {},
            history: [],
            // 廣播控制系統
            broadcasts: {
                reveal: {
                    version: 0,
                    timestamp: 0,
                    triggeredBy: null
                },
                reset: {
                    version: 0,
                    timestamp: 0,
                    triggeredBy: null
                },
                phase: {
                    version: 0,
                    timestamp: 0,
                    triggeredBy: null,
                    targetPhase: null
                }
            }
        };
        
        await this.db.ref(`rooms/${roomId}`).set(roomData);
    }
    
    /**
     * 添加玩家到房間
     * @param {string} roomId - 房間 ID
     * @param {Object} player - 玩家資訊
     */
    async addPlayerToRoom(roomId, player) {
        console.log(`🔄 [${roomId}] [${player.id}] 正在添加玩家到房間: ${player.name}`);
        
        const playerRef = this.db.ref(`rooms/${roomId}/players/${player.id}`);
        const voteRef = this.db.ref(`rooms/${roomId}/votes/${player.id}`);
        
        // 檢查玩家是否已存在（復原機制）
        const existingPlayerSnapshot = await playerRef.once('value');
        const existingPlayer = existingPlayerSnapshot.val();
        
        let playerData;
        if (existingPlayer) {
            // 復原模式：保留原有狀態，只更新必要欄位
            console.log(`🔄 [${roomId}] [${player.id}] 復原模式 - 保留原有狀態`);
            
            playerData = {
                ...existingPlayer,
                name: player.name, // 更新名稱（可能有變更）
                role: player.role, // 更新角色（可能有變更）
                lastHeartbeat: Date.now(),
                online: true,
                // 保留 joinedAt, hasVoted, spectator, isAdmin 等狀態
                joinedAt: existingPlayer.joinedAt || Date.now()
            };
            
            console.log(`📋 [${roomId}] [${player.id}] 保留狀態:`, {
                isAdmin: existingPlayer.isAdmin,
                hasVoted: existingPlayer.hasVoted,
                joinedAt: new Date(existingPlayer.joinedAt).toLocaleString()
            });
        } else {
            // 新玩家模式：建立全新狀態
            console.log(`🆕 [${roomId}] [${player.id}] 新玩家模式 - 建立全新狀態`);
            
            playerData = {
                id: player.id,
                name: player.name,
                role: player.role,
                joinedAt: Date.now(),
                lastHeartbeat: Date.now(),
                online: true,
                hasVoted: false,
                vote: null,
                spectator: false,
                isAdmin: false, // 預設非管理員，需要在房間邏輯中判斷
                revealedAt: null, // 開牌時間戳，null = 未開牌
                revealPhaseVersion: null // 開牌時的階段版本
            };
        }
        
        // 批次更新，確保原子性
        const updates = {};
        updates[`rooms/${roomId}/players/${player.id}`] = playerData;
        updates[`rooms/${roomId}/lastActivity`] = Date.now();
        
        await this.db.ref().update(updates);
        
        // 強化斷線自動清理機制
        await this.setupDisconnectCleanup(roomId, player.id, playerRef, voteRef);
        
        console.log(`🔗 [${roomId}] [${player.id}] 已設置強化斷線自動清理`);
        
        // 記錄玩家加入事件
        await this.addRoomEvent(roomId, {
            type: 'player_joined',
            playerId: player.id,
            playerName: player.name,
            timestamp: Date.now()
        });
        
        // 通知其他玩家
        this.emitEvent('room:player-joined', {
            roomId,
            player: playerData,
            timestamp: Date.now()
        });
    }
    
    /**
     * 增強復原玩家完整狀態（包含投票和管理員權限）
     * @param {string} roomId - 房間 ID  
     * @param {string} playerId - 玩家 ID
     * @param {Object} playerInfo - 基本玩家資訊
     * @returns {Promise<Object>} 復原後的完整玩家狀態
     */
    async enhancedPlayerRecovery(roomId, playerId, playerInfo) {
        try {
            console.log(`🔧 執行增強玩家復原: ${playerInfo.name} (${playerId})`);
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            const roomSnapshot = await roomRef.once('value');
            const roomData = roomSnapshot.val();
            
            if (!roomData) {
                throw new Error('房間不存在');
            }
            
            const existingPlayer = roomData.players && roomData.players[playerId];
            const existingVote = roomData.votes && roomData.votes[playerId];
            
            if (!existingPlayer) {
                console.log(`ℹ️ 玩家 ${playerId} 不存在於房間中，無需復原`);
                return null;
            }
            
            // 構建復原狀態
            const recoveredState = {
                player: {
                    ...existingPlayer,
                    name: playerInfo.name, // 允許名稱更新
                    role: playerInfo.role, // 允許角色更新  
                    online: true,
                    lastHeartbeat: Date.now()
                },
                vote: existingVote ? {
                    value: existingVote.value,
                    timestamp: existingVote.timestamp,
                    player_role: existingVote.player_role
                } : null,
                wasAdmin: existingPlayer.isAdmin || false,
                previousJoinTime: existingPlayer.joinedAt
            };
            
            // 執行狀態復原
            const updates = {};
            updates[`rooms/${roomId}/players/${playerId}`] = recoveredState.player;
            
            // 如果有投票狀態，也要復原
            if (recoveredState.vote) {
                updates[`rooms/${roomId}/votes/${playerId}`] = recoveredState.vote;
                console.log(`🗳️ 復原投票狀態: ${recoveredState.vote.value}`);
            }
            
            updates[`rooms/${roomId}/lastActivity`] = Date.now();
            
            await this.db.ref().update(updates);
            
            console.log(`✅ 玩家 ${playerInfo.name} 完整狀態復原成功`, {
                isAdmin: recoveredState.wasAdmin,
                hasVote: !!recoveredState.vote,
                joinTime: new Date(recoveredState.previousJoinTime).toLocaleString()
            });
            
            // 發送復原完成事件
            this.emitEvent('room:player-fully-recovered', {
                roomId,
                playerId,
                recoveredState,
                timestamp: Date.now()
            });
            
            return recoveredState;
            
        } catch (error) {
            console.error(`❌ 增強玩家復原失敗: ${playerId}`, error);
            throw error;
        }
    }
    
    /**
     * 檢查並設置管理員身份
     * @param {string} roomId - 房間 ID
     * @param {string} playerId - 玩家 ID
     */
    async checkAndSetAdminStatus(roomId, playerId) {
        try {
            const roomRef = this.db.ref(`rooms/${roomId}`);
            const roomSnapshot = await roomRef.once('value');
            const roomData = roomSnapshot.val();
            
            if (roomData && roomData.adminId === playerId) {
                // 設置玩家為管理員
                await roomRef.child(`players/${playerId}/isAdmin`).set(true);
                console.log(`👑 玩家 ${playerId} 已設置為房間管理員`);
                
                // 發送管理員設置事件
                this.emitEvent('room:admin-set', { 
                    roomId, 
                    adminId: playerId, 
                    timestamp: Date.now() 
                });
            }
        } catch (error) {
            console.error('❌ 檢查管理員身份失敗:', error);
        }
    }
    
    /**
     * 設置房間監聽器
     * @param {string} roomId - 房間 ID
     */
    setupRoomListeners(roomId) {
        const roomRef = this.db.ref(`rooms/${roomId}`);
        
        // 玩家變更監聽
        const playersRef = roomRef.child('players');
        const playersListener = playersRef.on('value', (snapshot) => {
            const players = snapshot.val() || {};
            this.handlePlayersUpdate(roomId, players);
        });
        this.listeners.set('players', { ref: playersRef, listener: playersListener });
        
        // 投票變更監聽
        const votesRef = roomRef.child('votes');
        const votesListener = votesRef.on('value', (snapshot) => {
            const votes = snapshot.val() || {};
            this.handleVotesUpdate(roomId, votes);
        });
        this.listeners.set('votes', { ref: votesRef, listener: votesListener });
        
        // 遊戲階段變更監聽（增強版本控制）
        const phaseRef = roomRef.child('phase');
        const phaseListener = phaseRef.on('value', (snapshot) => {
            const phase = snapshot.val();
            this.emitEvent('room:phase-changed', { roomId, phase });
        });
        this.listeners.set('phase', { ref: phaseRef, listener: phaseListener });
        
        // 版本控制監聽
        const phaseVersionRef = roomRef.child('phaseVersion');
        const phaseVersionListener = phaseVersionRef.on('value', (snapshot) => {
            const version = snapshot.val();
            if (version !== null) {
                this.emitEvent('room:phase-version-changed', { roomId, version });
            }
        });
        this.listeners.set('phaseVersion', { ref: phaseVersionRef, listener: phaseVersionListener });
        
        // 廣播監聽器
        const broadcastsRef = roomRef.child('broadcasts');
        const broadcastsListener = broadcastsRef.on('value', (snapshot) => {
            const broadcasts = snapshot.val() || {};
            this.handleBroadcastsUpdate(roomId, broadcasts);
        });
        this.listeners.set('broadcasts', { ref: broadcastsRef, listener: broadcastsListener });
        
        // 房間設定變更監聽
        const settingsRef = roomRef.child('settings');
        const settingsListener = settingsRef.on('value', (snapshot) => {
            const settings = snapshot.val() || {};
            this.emitEvent('room:settings-updated', { roomId, settings });
        });
        this.listeners.set('settings', { ref: settingsRef, listener: settingsListener });
        
        // 統計資料變更監聽
        const statisticsRef = roomRef.child('statistics');
        const statisticsListener = statisticsRef.on('value', (snapshot) => {
            const statistics = snapshot.val();
            if (statistics) {
                console.log('📊 Firebase 統計資料更新:', statistics);
                this.emitEvent('statistics:saved', { roomId, statistics });
            }
        });
        this.listeners.set('statistics', { ref: statisticsRef, listener: statisticsListener });
    }
    
    /**
     * 提交投票
     * @param {string} roomId - 房間 ID
     * @param {string} playerId - 玩家 ID
     * @param {*} vote - 投票值
     * @returns {Promise<void>}
     */
    async submitVote(roomId, playerId, vote) {
        try {
            if (this.connectionState !== 'connected') {
                throw new Error('Firebase 未連線');
            }
            
            // 速率限制檢查
            if (!this.checkRateLimit('submitVote', playerId)) {
                throw new Error('投票過於頻繁，請稍後再試');
            }
            
            // 輸入驗證和清理（帶友善錯誤處理）
            try {
                roomId = this.validateAndSanitizeInput(roomId, 20, 'roomId');
            } catch (error) {
                console.error('❌ 房間 ID 驗證失敗:', error.message);
                throw new Error(`房間 ID 格式錯誤：${error.message}`);
            }
            
            try {
                playerId = this.validateAndSanitizeInput(playerId, 50, 'playerId');
            } catch (error) {
                console.error('❌ 玩家 ID 驗證失敗:', error.message, '原始 ID:', playerId);
                throw new Error(`玩家 ID 格式錯誤：${error.message}。請重新加入房間以獲取新的玩家 ID。`);
            }
            
            // 投票值驗證（帶詳細日誌）
            console.log(`🎯 正在處理投票:`, {
                roomId,
                playerId,
                rawVote: vote,
                voteType: typeof vote
            });
            
            try {
                vote = this.validateVoteValue(vote);
                console.log(`✅ 投票值驗證成功:`, vote);
            } catch (error) {
                console.error('❌ 投票值驗證失敗:', error.message);
                throw new Error(`投票值驗證失敗: ${error.message}`);
            }
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            
            // 原子性更新投票和玩家狀態
            const updates = {};
            updates[`votes/${playerId}`] = {
                value: vote,
                timestamp: Date.now(),
                playerId: playerId
            };
            updates[`players/${playerId}/hasVoted`] = true;
            updates[`players/${playerId}/vote`] = vote;
            updates[`players/${playerId}/lastActivity`] = Date.now();
            
            await roomRef.update(updates);
            
            // 記錄投票事件
            await this.addRoomEvent(roomId, {
                type: 'vote_submitted',
                playerId: playerId,
                vote: vote,
                timestamp: Date.now()
            });
            
            console.log(`✅ 投票已提交: ${playerId} -> ${vote}`);
            this.emitEvent('vote:submitted', { roomId, playerId, vote });
            
        } catch (error) {
            // 詳細錯誤日誌記錄
            console.error('❌ 提交投票失敗:', {
                error: error.message,
                roomId,
                playerId,
                vote,
                voteType: typeof vote,
                connectionState: this.connectionState,
                stack: error.stack
            });
            
            // 發送錯誤事件
            this.emitEvent('vote:error', { 
                roomId, 
                playerId, 
                vote, 
                error: error.message,
                timestamp: Date.now()
            });
            
            // 根據錯誤類型提供更友善的錯誤訊息
            if (error.message.includes('無效的投票值')) {
                throw new Error(`投票失敗：選擇的卡牌值無效 (${vote})。請重新選擇有效的卡牌。`);
            } else if (error.message.includes('Firebase 未連線')) {
                throw new Error('投票失敗：網路連線中斷。請檢查網路連線後重試。');
            } else if (error.message.includes('投票過於頻繁')) {
                throw new Error('投票失敗：操作過於頻繁。請稍等片刻後重試。');
            } else {
                throw new Error(`投票失敗：${error.message}`);
            }
        }
    }
    
    /**
     * 揭曉所有投票
     * @param {string} roomId - 房間 ID
     * @returns {Promise<void>}
     */
    async revealVotes(roomId) {
        try {
            if (this.connectionState !== 'connected') {
                throw new Error('Firebase 未連線');
            }
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            
            // 更新遊戲階段為揭曉
            await roomRef.child('phase').set('revealing');
            
            // 記錄揭曉事件
            await this.addRoomEvent(roomId, {
                type: 'votes_revealed',
                timestamp: Date.now()
            });
            
            console.log(`🎭 房間 ${roomId} 的投票已揭曉`);
            this.emitEvent('votes:revealed', { roomId });
            
        } catch (error) {
            console.error('❌ 揭曉投票失敗:', error);
            this.emitEvent('votes:reveal-error', { roomId, error });
            throw error;
        }
    }
    
    /**
     * 清除所有投票
     * @param {string} roomId - 房間 ID
     * @returns {Promise<void>}
     */
    async clearVotes(roomId) {
        try {
            if (this.connectionState !== 'connected') {
                throw new Error('Firebase 未連線');
            }
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            
            // 取得所有玩家
            const playersSnapshot = await roomRef.child('players').once('value');
            const players = playersSnapshot.val() || {};
            
            // 準備批量更新
            const updates = {};
            updates['votes'] = null; // 清除所有投票
            updates['phase'] = 'voting'; // 重設為投票階段
            
            // 重設所有玩家的投票狀態
            Object.keys(players).forEach(playerId => {
                updates[`players/${playerId}/hasVoted`] = false;
                updates[`players/${playerId}/vote`] = null;
            });
            
            await roomRef.update(updates);
            
            // 更新統計
            await this.updateRoomStatistics(roomId);
            
            // 記錄清除事件
            await this.addRoomEvent(roomId, {
                type: 'votes_cleared',
                timestamp: Date.now()
            });
            
            console.log(`🔄 房間 ${roomId} 的投票已清除`);
            this.emitEvent('votes:cleared', { roomId });
            
        } catch (error) {
            console.error('❌ 清除投票失敗:', error);
            this.emitEvent('votes:clear-error', { roomId, error });
            throw error;
        }
    }
    
    /**
     * 離開房間
     * @param {string} roomId - 房間 ID
     * @param {string} playerId - 玩家 ID
     * @param {boolean} forceCleanup - 強制清理（即使連線中斷）
     * @returns {Promise<void>}
     */
    async leaveRoom(roomId, playerId, forceCleanup = false) {
        try {
            if (!roomId || !playerId) {
                console.warn('⚠️ 房間 ID 或玩家 ID 不完整，跳過離開房間');
                return;
            }
            
            console.log(`🚪 [${roomId}] [${playerId}] 玩家正在離開房間 (forceCleanup: ${forceCleanup})`);
            
            // 允許強制清理，即使連線中斷
            if (this.connectionState !== 'connected' && !forceCleanup) {
                console.warn('⚠️ Firebase 未連線，嘗試強制清理');
                return this.leaveRoom(roomId, playerId, true);
            }
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            
            // 速率限制檢查
            if (!forceCleanup && !this.checkRateLimit('leaveRoom', playerId)) {
                console.warn('⚠️ 離開房間操作過於頻繁，跳過');
                return;
            }
            
            // 清理 onDisconnect 處理器，避免重複清理
            try {
                await this.db.ref(`rooms/${roomId}/players/${playerId}`).onDisconnect().cancel();
                await this.db.ref(`rooms/${roomId}/votes/${playerId}`).onDisconnect().cancel();
            } catch (error) {
                console.warn('⚠️ 取消 onDisconnect 處理器失敗:', error);
            }
            
            // 使用原子性事務移除玩家數據
            const updates = {};
            updates[`rooms/${roomId}/players/${playerId}`] = null;
            updates[`rooms/${roomId}/votes/${playerId}`] = null;
            updates[`rooms/${roomId}/lastActivity`] = Date.now();
            
            await this.db.ref().update(updates);
            
            // 記錄離開事件
            try {
                await this.addRoomEvent(roomId, {
                    type: 'player_left',
                    playerId: playerId,
                    timestamp: Date.now()
                });
            } catch (eventError) {
                console.warn('⚠️ 記錄離開事件失敗:', eventError);
            }
            
            // 使用事務檢查並清理空房間
            await this.cleanupEmptyRoom(roomId);
            
            console.log(`👋 玩家 ${playerId} 已離開房間 ${roomId}`);
            this.emitEvent('room:left', { roomId, playerId });
            
        } catch (error) {
            console.error('❌ 離開房間失敗:', error);
            this.emitEvent('room:leave-error', { roomId, playerId, error });
        } finally {
            // 清理監聽器和參考
            this.cleanup();
        }
    }
    
    /**
     * 管理員移除玩家
     * @param {string} roomId - 房間 ID
     * @param {string} targetPlayerId - 要移除的玩家 ID
     * @param {string} adminId - 執行移除的管理員 ID
     * @returns {Promise<void>}
     */
    async removePlayerByAdmin(roomId, targetPlayerId, adminId) {
        try {
            if (!roomId || !targetPlayerId || !adminId) {
                throw new Error('參數不完整：需要房間 ID、目標玩家 ID 和管理員 ID');
            }
            
            // 驗證管理員權限
            const roomRef = this.db.ref(`rooms/${roomId}`);
            const roomSnapshot = await roomRef.once('value');
            const roomData = roomSnapshot.val();
            
            if (!roomData) {
                throw new Error('房間不存在');
            }
            
            if (roomData.adminId !== adminId) {
                throw new Error('無權限：只有房間管理員可以移除玩家');
            }
            
            // 防止管理員移除自己
            if (targetPlayerId === adminId) {
                throw new Error('管理員無法移除自己');
            }
            
            // 檢查目標玩家是否存在
            if (!roomData.players || !roomData.players[targetPlayerId]) {
                throw new Error('目標玩家不在房間中');
            }
            
            const targetPlayerName = roomData.players[targetPlayerId].name;
            
            console.log(`👑 管理員 ${adminId} 正在移除玩家: ${targetPlayerName} (${targetPlayerId})`);
            
            // 使用原子性事務移除玩家數據
            const updates = {};
            updates[`rooms/${roomId}/players/${targetPlayerId}`] = null;
            updates[`rooms/${roomId}/votes/${targetPlayerId}`] = null;
            updates[`rooms/${roomId}/lastActivity`] = Date.now();
            
            await this.db.ref().update(updates);
            
            // 記錄管理員移除事件
            await this.addRoomEvent(roomId, {
                type: 'player_removed_by_admin',
                targetPlayerId: targetPlayerId,
                targetPlayerName: targetPlayerName,
                adminId: adminId,
                timestamp: Date.now()
            });
            
            console.log(`✅ 管理員已成功移除玩家: ${targetPlayerName}`);
            this.emitEvent('room:player-removed', { 
                roomId, 
                targetPlayerId, 
                targetPlayerName, 
                adminId,
                timestamp: Date.now() 
            });
            
        } catch (error) {
            console.error('❌ 管理員移除玩家失敗:', error);
            this.emitEvent('room:remove-player-error', { roomId, targetPlayerId, adminId, error });
            throw error;
        }
    }
    
    /**
     * 添加房間事件到歷史記錄
     * @param {string} roomId - 房間 ID
     * @param {Object} event - 事件資料
     */
    async addRoomEvent(roomId, event) {
        try {
            const eventRef = this.db.ref(`rooms/${roomId}/history`);
            await eventRef.push(event);
        } catch (error) {
            console.warn('⚠️ 添加房間事件失敗:', error);
        }
    }
    
    /**
     * 更新房間統計（帶數據驗證）
     * @param {string} roomId - 房間 ID
     */
    async updateRoomStatistics(roomId) {
        try {
            const roomRef = this.db.ref(`rooms/${roomId}`);
            const statisticsRef = roomRef.child('statistics');
            
            // 取得當前統計
            const statsSnapshot = await statisticsRef.once('value');
            const rawStats = statsSnapshot.val() || {};
            
            // 安全的數值處理函數
            const safeNumber = (value, fallback = 0) => {
                if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
                    return value;
                }
                return fallback;
            };
            
            // 構建安全的當前統計資料
            const currentStats = {
                rounds: safeNumber(rawStats.rounds, 0),
                totalVotes: safeNumber(rawStats.totalVotes, 0),
                averageTime: safeNumber(rawStats.averageTime, 0),
                lastRoundAt: safeNumber(rawStats.lastRoundAt, Date.now())
            };
            
            console.log(`📊 房間 ${roomId} 統計數據驗證:`, {
                原始: rawStats,
                清理後: currentStats
            });
            
            // 更新輪次（安全計算）
            const updatedStats = {
                ...currentStats,
                rounds: currentStats.rounds + 1,
                lastRoundAt: Date.now()
            };
            
            // 最終驗證：確保沒有 NaN 或無效值
            const finalStats = this.validateStatisticsData(updatedStats);
            
            await statisticsRef.set(finalStats);
            console.log(`✅ 房間統計已更新: 輪次 ${finalStats.rounds}`);
            
        } catch (error) {
            console.warn('⚠️ 更新房間統計失敗:', error);
        }
    }

    /**
     * 驗證統計數據，確保所有數值都是安全的
     * @param {Object} stats - 統計數據
     * @returns {Object} 驗證後的統計數據
     */
    validateStatisticsData(stats) {
        const safeStats = {};
        
        // 數值欄位列表
        const numericFields = [
            'rounds', 'totalVotes', 'averageTime', 'lastRoundAt',
            'averagePoints', 'consensus', 'devAverage', 'qaAverage'
        ];
        
        // 驗證數值欄位
        numericFields.forEach(field => {
            if (field in stats) {
                const value = stats[field];
                if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
                    safeStats[field] = value;
                } else {
                    console.warn(`⚠️ 統計欄位 ${field} 包含無效值: ${value}，設為 0`);
                    safeStats[field] = 0;
                }
            }
        });
        
        // 複製其他非數值欄位
        Object.keys(stats).forEach(key => {
            if (!numericFields.includes(key)) {
                safeStats[key] = stats[key];
            }
        });
        
        return safeStats;
    }
    
    /**
     * 保存統計資料到 Firebase（帶數據驗證）
     * @param {string} roomId - 房間 ID
     * @param {Object} statisticsData - 統計資料
     */
    async saveStatistics(roomId, statisticsData) {
        try {
            if (this.connectionState !== 'connected') {
                throw new Error('Firebase 未連線');
            }

            console.log(`💾 正在保存統計資料到房間 ${roomId}:`, statisticsData);

            // 速率限制檢查
            if (!this.checkRateLimit('saveStatistics')) {
                console.warn('⚠️ saveStatistics 速率限制中，跳過本次保存');
                return;
            }

            // 驗證統計數據，防止 NaN 錯誤
            const validatedStats = this.validateStatisticsData(statisticsData);
            console.log(`📊 統計數據驗證完成:`, {
                原始: statisticsData,
                驗證後: validatedStats
            });

            const statisticsRef = this.db.ref(`rooms/${roomId}/statistics`);
            
            // 保存驗證後的統計資料
            await statisticsRef.set(validatedStats);
            
            // 記錄統計更新事件
            await this.addRoomEvent(roomId, {
                type: 'statistics_updated',
                updatedBy: validatedStats.updatedBy || 'system',
                timestamp: validatedStats.timestamp || Date.now()
            });

            console.log(`✅ 統計資料已保存到房間 ${roomId}`);
            this.emitEvent('statistics:saved', { roomId, statistics: validatedStats });

        } catch (error) {
            console.error('❌ 保存統計資料失敗:', error);
            console.error('錯誤詳情:', {
                roomId,
                originalData: statisticsData,
                errorMessage: error.message
            });
            this.emitEvent('statistics:save-error', { roomId, error });
            throw error;
        }
    }
    
    /**
     * 處理玩家更新
     * @param {string} roomId - 房間 ID
     * @param {Object} players - 玩家資料
     */
    handlePlayersUpdate(roomId, players) {
        const playerCount = Object.keys(players).length;
        
        // 檢測新加入的玩家
        Object.keys(players).forEach(playerId => {
            const player = players[playerId];
            if (player.joinedAt && Date.now() - player.joinedAt < 5000) {
                console.log(`🆕 新玩家加入: ${player.name}`);
                this.emitEvent('players:player-added', {
                    roomId,
                    player,
                    playerId
                });
            }
        });
        
        this.emitEvent('room:players-updated', { roomId, players });
    }
    
    /**
     * 處理投票更新
     * @param {string} roomId - 房間 ID
     * @param {Object} votes - 投票資料
     */
    handleVotesUpdate(roomId, votes) {
        const voteCount = Object.keys(votes).length;
        
        // 計算投票進度
        if (this.currentRoomRef) {
            this.currentRoomRef.child('players').once('value', (snapshot) => {
                const players = snapshot.val() || {};
                const totalPlayers = Object.keys(players).filter(id => !players[id].spectator).length;
                const progress = {
                    voted: voteCount,
                    total: totalPlayers,
                    percentage: totalPlayers > 0 ? Math.round((voteCount / totalPlayers) * 100) : 0
                };
                
                this.emitEvent('players:voting-progress', progress);
            });
        }
        
        this.emitEvent('room:votes-updated', { roomId, votes });
    }

    /**
     * 處理廣播更新
     * @param {string} roomId - 房間 ID
     * @param {Object} broadcasts - 廣播資料
     */
    handleBroadcastsUpdate(roomId, broadcasts) {
        console.log('📢 Firebase 廣播更新:', broadcasts);
        
        // 檢查每種廣播類型的版本變化
        Object.keys(broadcasts).forEach(broadcastType => {
            const broadcast = broadcasts[broadcastType];
            if (broadcast && broadcast.version > 0) {
                // 發送廣播事件給 GameState
                this.emitEvent('firebase:broadcast-received', {
                    roomId,
                    type: broadcastType,
                    version: broadcast.version,
                    timestamp: broadcast.timestamp,
                    triggeredBy: broadcast.triggeredBy,
                    data: broadcast
                });
            }
        });
    }

    /**
     * 發送開牌廣播
     * @param {string} roomId - 房間 ID
     * @param {string} playerId - 觸發者 ID
     * @returns {Promise<void>}
     */
    async broadcastReveal(roomId, playerId) {
        try {
            console.log(`📢 發送開牌廣播: ${roomId} by ${playerId}`);
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            
            // 獲取當前廣播版本
            const broadcastSnapshot = await roomRef.child('broadcasts/reveal').once('value');
            const currentBroadcast = broadcastSnapshot.val() || { version: 0 };
            const newVersion = currentBroadcast.version + 1;
            
            // 原子性更新：同時更新階段和廣播
            const updates = {};
            updates[`phase`] = 'revealing';
            updates[`phaseVersion`] = newVersion;
            updates[`phaseTimestamp`] = Date.now();
            updates[`broadcasts/reveal`] = {
                version: newVersion,
                timestamp: Date.now(),
                triggeredBy: playerId
            };
            
            await roomRef.update(updates);
            
            console.log(`✅ 開牌廣播已發送 (版本: ${newVersion})`);
            
        } catch (error) {
            console.error('❌ 發送開牌廣播失敗:', error);
            throw error;
        }
    }

    /**
     * 發送重置廣播
     * @param {string} roomId - 房間 ID
     * @param {string} playerId - 觸發者 ID
     * @returns {Promise<void>}
     */
    async broadcastReset(roomId, playerId) {
        try {
            console.log(`📢 發送重置廣播: ${roomId} by ${playerId}`);
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            
            // 獲取當前廣播版本
            const broadcastSnapshot = await roomRef.child('broadcasts/reset').once('value');
            const currentBroadcast = broadcastSnapshot.val() || { version: 0 };
            const newVersion = currentBroadcast.version + 1;
            
            // 原子性更新：清除投票、重置階段、發送廣播
            const updates = {};
            updates[`phase`] = 'voting';
            updates[`phaseVersion`] = newVersion;
            updates[`phaseTimestamp`] = Date.now();
            updates[`votes`] = null; // 清除所有投票
            updates[`broadcasts/reset`] = {
                version: newVersion,
                timestamp: Date.now(),
                triggeredBy: playerId
            };
            
            // 重置所有玩家的投票狀態
            const playersSnapshot = await roomRef.child('players').once('value');
            const players = playersSnapshot.val() || {};
            Object.keys(players).forEach(playerId => {
                updates[`players/${playerId}/hasVoted`] = false;
                updates[`players/${playerId}/vote`] = null;
            });
            
            await roomRef.update(updates);
            
            console.log(`✅ 重置廣播已發送 (版本: ${newVersion})`);
            
        } catch (error) {
            console.error('❌ 發送重置廣播失敗:', error);
            throw error;
        }
    }

    /**
     * 發送階段變更廣播
     * @param {string} roomId - 房間 ID
     * @param {string} targetPhase - 目標階段
     * @param {string} playerId - 觸發者 ID
     * @returns {Promise<void>}
     */
    async broadcastPhaseChange(roomId, targetPhase, playerId) {
        try {
            console.log(`📢 發送階段變更廣播: ${roomId} → ${targetPhase} by ${playerId}`);
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            
            // 獲取當前廣播版本
            const broadcastSnapshot = await roomRef.child('broadcasts/phase').once('value');
            const currentBroadcast = broadcastSnapshot.val() || { version: 0 };
            const newVersion = currentBroadcast.version + 1;
            
            // 原子性更新
            const updates = {};
            updates[`phase`] = targetPhase;
            updates[`phaseVersion`] = newVersion;
            updates[`phaseTimestamp`] = Date.now();
            updates[`broadcasts/phase`] = {
                version: newVersion,
                timestamp: Date.now(),
                triggeredBy: playerId,
                targetPhase: targetPhase
            };
            
            await roomRef.update(updates);
            
            console.log(`✅ 階段變更廣播已發送 (版本: ${newVersion})`);
            
        } catch (error) {
            console.error('❌ 發送階段變更廣播失敗:', error);
            throw error;
        }
    }

    /**
     * 同步玩家開牌狀態到 Firebase
     * @param {string} roomId - 房間 ID
     * @param {string} playerId - 玩家 ID
     * @param {boolean} isRevealed - 是否開牌
     * @returns {Promise<void>}
     */
    async syncPlayerRevealState(roomId, playerId, isRevealed) {
        try {
            if (this.connectionState !== 'connected') {
                console.warn('⚠️ Firebase 未連線，跳過開牌狀態同步');
                return;
            }

            console.log(`🔄 同步玩家開牌狀態: ${playerId} -> ${isRevealed}`);

            const updates = {};
            if (isRevealed) {
                updates[`rooms/${roomId}/players/${playerId}/revealedAt`] = Date.now();
                
                // 獲取當前階段版本
                if (window.gameState) {
                    const currentState = window.gameState.getState();
                    updates[`rooms/${roomId}/players/${playerId}/revealPhaseVersion`] = currentState.phaseVersion || 0;
                }
            } else {
                // 重置開牌狀態
                updates[`rooms/${roomId}/players/${playerId}/revealedAt`] = null;
                updates[`rooms/${roomId}/players/${playerId}/revealPhaseVersion`] = null;
            }

            await this.db.ref().update(updates);
            console.log(`✅ 玩家開牌狀態已同步到 Firebase`);

        } catch (error) {
            console.error('❌ 同步玩家開牌狀態失敗:', error);
        }
    }

    /**
     * 從 Firebase 恢復玩家開牌狀態
     * @param {Object} playerData - Firebase 玩家資料
     * @param {number} currentPhaseVersion - 當前階段版本
     * @returns {boolean} 是否應該開牌
     */
    shouldPlayerRevealFromFirebase(playerData, currentPhaseVersion) {
        try {
            // 檢查玩家是否有投票
            if (!playerData.hasVoted) {
                return false;
            }

            // 檢查是否有開牌記錄
            if (!playerData.revealedAt || !playerData.revealPhaseVersion) {
                return false;
            }

            // 檢查階段版本是否匹配（確保是同一輪遊戲的開牌狀態）
            if (playerData.revealPhaseVersion !== currentPhaseVersion) {
                console.log(`🔄 玩家 ${playerData.name} 的開牌狀態版本不匹配，跳過恢復`);
                return false;
            }

            console.log(`✅ 恢復玩家 ${playerData.name} 的開牌狀態`);
            return true;

        } catch (error) {
            console.error('❌ 檢查玩家開牌狀態失敗:', error);
            return false;
        }
    }
    
    /**
     * 註冊事件監聽器
     * @param {string} eventType - 事件類型
     * @param {Function} callback - 回調函數
     */
    on(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType).add(callback);
        
        return () => {
            const listeners = this.eventListeners.get(eventType);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.eventListeners.delete(eventType);
                }
            }
        };
    }
    
    /**
     * 取得房間狀態
     * @param {string} roomId - 房間 ID
     * @returns {Promise<Object>} 房間狀態
     */
    async getRoomState(roomId) {
        try {
            if (this.connectionState !== 'connected') {
                throw new Error('Firebase 未連線');    
            }
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            const snapshot = await roomRef.once('value');
            return snapshot.val();
            
        } catch (error) {
            console.error('❌ 取得房間狀態失敗:', error);
            throw error;
        }
    }
    
    /**
     * 設置房間設定
     * @param {string} roomId - 房間 ID
     * @param {Object} settings - 設定資料
     * @returns {Promise<void>}
     */
    async updateRoomSettings(roomId, settings) {
        try {
            if (this.connectionState !== 'connected') {
                throw new Error('Firebase 未連線');
            }
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            await roomRef.child('settings').update(settings);
            
            console.log(`⚙️ 房間 ${roomId} 設定已更新`);
            this.emitEvent('room:settings-updated', { roomId, settings });
            
        } catch (error) {
            console.error('❌ 更新房間設定失敗:', error);
            throw error;
        }
    }

    /**
     * 發送事件到事件總線
     * @param {string} eventType - 事件類型
     * @param {Object} data - 事件資料
     */
    emitEvent(eventType, data) {
        // 發送到內部監聽器
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ FirebaseService 事件處理錯誤 (${eventType}):`, error);
                }
            });
        }
        
        // 發送到全域事件總線
        if (window.eventBus && typeof window.eventBus.emit === 'function') {
            window.eventBus.emit(eventType, data);
        }
    }
    
    /**
     * 取得連線狀態
     * @returns {string} 連線狀態
     */
    getConnectionState() {
        return this.connectionState;
    }
    
    /**
     * 取得當前房間 ID
     * @returns {string|null} 房間 ID
     */
    getCurrentRoomId() {
        return this.currentRoomRef ? this.currentRoomRef.key : null;
    }
    
    /**
     * 取得當前玩家 ID
     * @returns {string|null} 玩家 ID
     */
    getCurrentPlayerId() {
        return this.currentPlayerId;
    }
    
    /**
     * 清理資源
     */
    cleanup() {
        // 停止心跳
        this.stopHeartbeat();
        
        // 移除所有監聽器
        this.listeners.forEach(({ ref, listener }) => {
            if (ref && typeof ref.off === 'function') {
                ref.off('value', listener);
            }
        });
        this.listeners.clear();
        
        // 清理事件監聽器
        this.eventListeners.clear();
        
        // 清理參考
        this.currentRoomRef = null;
        this.currentPlayerId = null;
        
        console.log('🧹 FirebaseService 資源已清理');
    }
    
    /**
     * 清理空房間（使用事務確保原子性）
     * @param {string} roomId - 房間 ID
     */
    async cleanupEmptyRoom(roomId) {
        try {
            const roomRef = this.db.ref(`rooms/${roomId}`);
            
            // 延遲檢查以防玩家快速重新加入
            setTimeout(async () => {
                try {
                    await roomRef.transaction((roomData) => {
                        if (!roomData || !roomData.players || Object.keys(roomData.players).length === 0) {
                            console.log(`🗑️ 原子性清理空房間: ${roomId}`);
                            return null; // 刪除房間
                        }
                        return roomData; // 保留房間
                    });
                } catch (error) {
                    console.warn('⚠️ 清理空房間失敗:', error);
                }
            }, 30000); // 30秒後清理
        } catch (error) {
            console.error('❌ 清理空房間過程失敗:', error);
        }
    }
    
    /**
     * 取得角色對應的超時時間（分鐘）
     * @param {string} playerRole - 玩家角色
     * @returns {number} 超時時間（分鐘）
     */
    getRoleTimeoutMinutes(playerRole) {
        // 🧪 測試模式：使用明確的測試參數，避免會議中誤觸發
        const isTestMode = window.location.hostname === 'localhost' || 
                          window.location.search.includes('test=debug');
        
        if (isTestMode) {
            console.log('🧪 測試模式啟用：使用 2 分鐘超時（避免會議中誤觸發）');
            return 2; // 2 分鐘，比原來的 30 秒更合理
        }
        
        // 🎯 會議友善超時設定：基於實際 Scrum 會議場景優化
        switch(playerRole) {
            case 'scrum_master':
            case 'po': 
                return 60; // 1小時，主持人需要更多時間處理會議流程
            case 'dev':
            case 'qa':
            case 'other':
            default:
                return 45; // 45 分鐘，適合長時間技術討論和估點過程
        }
    }
    
    /**
     * 清理超時玩家 - 基於角色的差異化超時機制
     * @param {string} roomId - 房間 ID
     * @param {number} defaultTimeoutMinutes - 預設超時分鐘數（向後兼容）
     * @returns {Promise<number>} 清理的玩家數量
     */
    async cleanupInactivePlayers(roomId, defaultTimeoutMinutes = 8) {
        try {
            let cleanedCount = 0;
            let warningCount = 0;
            
            const playersRef = this.db.ref(`rooms/${roomId}/players`);
            const snapshot = await playersRef.once('value');
            const players = snapshot.val() || {};
            
            const cleanupPromises = [];
            const now = Date.now();
            
            for (const [playerId, playerData] of Object.entries(players)) {
                const lastHeartbeat = playerData.lastHeartbeat || 0;
                const playerRole = playerData.role || 'other';
                const isOnline = playerData.online !== false;
                
                // 🎯 會議友善判斷：結合心跳時間和連線狀態
                const roleTimeoutMinutes = this.getRoleTimeoutMinutes(playerRole);
                const roleTimeoutMs = roleTimeoutMinutes * 60 * 1000;
                const inactiveTime = now - lastHeartbeat;
                
                // 🚨 階段式判斷邏輯
                const warningThreshold = roleTimeoutMs * 0.7; // 70% 時間時警告
                const offlineThreshold = roleTimeoutMs; // 100% 時間標記離線但保留
                const removeThreshold = roleTimeoutMs * 2; // 200% 時間完全移除
                
                if (!playerData.lastHeartbeat || inactiveTime > removeThreshold) {
                    // 完全移除：超過 2 倍超時時間
                    console.log(`🗑️ 完全移除長時間不活躍玩家: ${playerData.name} (${playerRole}, 不活躍: ${Math.round(inactiveTime/60000)}分鐘)`);
                    cleanupPromises.push(this.leaveRoom(roomId, playerId, true));
                    cleanedCount++;
                    
                } else if (inactiveTime > offlineThreshold) {
                    // 標記離線但保留：超過基礎超時時間
                    if (isOnline) {
                        console.log(`📴 標記玩家為離線（但保留）: ${playerData.name} (${playerRole}, 不活躍: ${Math.round(inactiveTime/60000)}分鐘)`);
                        await playersRef.child(`${playerId}/online`).set(false);
                        await playersRef.child(`${playerId}/lastSeen`).set(lastHeartbeat);
                        warningCount++;
                    }
                    
                } else if (inactiveTime > warningThreshold) {
                    // 警告階段：接近超時但不採取行動
                    const remainingMinutes = Math.ceil((offlineThreshold - inactiveTime) / 60000);
                    console.log(`⚠️ 玩家接近不活躍閾值: ${playerData.name} (${playerRole}, 剩餘 ${remainingMinutes} 分鐘)`);
                    warningCount++;
                    
                } else {
                    // 正常狀態：記錄剩餘時間（僅開發模式）
                    if (window.location.hostname === 'localhost') {
                        const remainingMinutes = Math.ceil((offlineThreshold - inactiveTime) / 60000);
                        console.log(`✅ ${playerData.name} (${playerRole}) 正常，剩餘: ${remainingMinutes}分鐘`);
                    }
                }
            }
            
            // 📊 清理結果報告
            if (cleanedCount > 0 || warningCount > 0) {
                console.log(`📊 玩家狀態更新 - 清理: ${cleanedCount} 位, 警告/離線: ${warningCount} 位`);
            }
            
            if (cleanedCount > 0) {
                await Promise.all(cleanupPromises);
            }
            
            return cleanedCount;
        } catch (error) {
            console.error('❌ 清理超時玩家失敗:', error);
            return 0;
        }
    }
    
    /**
     * 獲取房間實際玩家數量（清理後）
     * @param {string} roomId - 房間 ID
     * @returns {Promise<number>} 實際玩家數量
     */
    async getActivePlayerCount(roomId) {
        try {
            // 先清理超時玩家
            await this.cleanupInactivePlayers(roomId);
            
            // 獲取清理後的玩家數量
            const playersSnapshot = await this.db.ref(`rooms/${roomId}/players`).once('value');
            const players = playersSnapshot.val() || {};
            
            return Object.keys(players).length;
        } catch (error) {
            console.error('❌ 取得活躍玩家數量失敗:', error);
            return 0;
        }
    }
    
    /**
     * 銷毀服務
     */
    destroy() {
        this.cleanup();
        
        // 統一架構：檢查是否使用預初始化實例
        if (window.firebaseConfigManager && window.firebaseConfigManager.isReady()) {
            console.log('🔧 FirebaseService 使用統一管理的 Firebase，跳過直接銷毀');
            // 不直接銷毀 Firebase 實例，由 FirebaseConfigManager 統一管理
        } else {
            // 舊版兼容：直接斷開 Firebase 連線
            if (this.db && typeof this.db.goOffline === 'function') {
                try {
                    // 檢查資料庫是否已被刪除
                    if (this.db.app && this.db.app.isDeleted_) {
                        console.warn('⚠️ [FirebaseService] 略過 goOffline，資料庫已被刪除');
                    } else {
                        this.db.goOffline();
                        console.log('📡 [FirebaseService] 已執行 goOffline');
                    }
                } catch (error) {
                    console.warn('⚠️ [FirebaseService] goOffline 時發生例外:', error.message || error);
                }
            }
        }
        
        // 清理本地引用
        this.app = null;
        this.db = null;
        
        this.connectionState = 'disconnected';
        console.log('🔥 FirebaseService 已銷毀');
    }
    
    // ============================================
    // Phase 5: Firebase 學習數據管理
    // ============================================
    
    /**
     * 儲存智慧建議到 Firebase（房間獨立）
     * @param {string} roomId - 房間 ID
     * @param {Object} adviceData - 建議數據
     * @returns {Promise<boolean>} 儲存是否成功
     */
    async saveLearningAdvice(roomId, adviceData) {
        try {
            if (!this.db || !roomId || !adviceData) {
                throw new Error('Missing required parameters for saving advice');
            }
            
            console.log('💾 儲存智慧建議到 Firebase:', roomId);
            
            // 匿名化處理
            const anonymizedAdvice = this.anonymizeLearningData(adviceData);
            
            const adviceRef = this.db.ref(`rooms/${roomId}/learning_data/current_advice`);
            
            const firebaseAdvice = {
                ...anonymizedAdvice,
                visible_to_all: true,
                stored_at: firebase.database.ServerValue.TIMESTAMP
            };
            
            await adviceRef.set(firebaseAdvice);
            
            console.log('✅ 智慧建議已儲存到 Firebase');
            
            // 觸發事件讓所有客戶端更新
            this.emitEvent('learning:advice-updated', {
                roomId,
                advice: firebaseAdvice
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ 儲存智慧建議到 Firebase 失敗:', error);
            return false;
        }
    }
    
    /**
     * 儲存會話記錄到 Firebase（匿名化處理）
     * @param {string} roomId - 房間 ID
     * @param {Object} sessionData - 會話數據
     * @returns {Promise<boolean>} 儲存是否成功
     */
    async saveLearningSession(roomId, sessionData) {
        try {
            if (!this.db || !roomId || !sessionData) {
                throw new Error('Missing required parameters for saving session');
            }
            
            console.log('📚 儲存學習會話到 Firebase:', roomId);
            
            // 完全匿名化處理
            const anonymizedSession = {
                timestamp: Date.now(),
                task_type: sessionData.taskType || 'general',
                anonymous_votes: this.anonymizeVotes(sessionData.votes || {}),
                statistics: sessionData.statistics || {}
            };
            
            const sessionRef = this.db.ref(`rooms/${roomId}/learning_data/session_history`);
            
            // 生成匿名會話 ID
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            
            await sessionRef.child(sessionId).set(anonymizedSession);
            
            // 檢查並清理過期會話（保持 50 筆限制）
            await this.cleanupOldSessions(roomId);
            
            console.log('✅ 學習會話已儲存到 Firebase');
            return true;
            
        } catch (error) {
            console.error('❌ 儲存學習會話到 Firebase 失敗:', error);
            return false;
        }
    }
    
    /**
     * 完全匿名化投票數據
     * @param {Object} votes - 原始投票數據
     * @returns {Object} 匿名化後的投票數據
     */
    anonymizeVotes(votes) {
        const anonymizedVotes = {};
        let anonCounter = 1;
        
        Object.entries(votes).forEach(([playerId, vote]) => {
            const anonId = `anon_${anonCounter++}`;
            anonymizedVotes[anonId] = {
                role: vote.player_role || vote.role || 'other',
                value: vote.value,
                // 完全移除個人識別資訊
                // 不包含：姓名、真實ID、時間戳記等
            };
        });
        
        return anonymizedVotes;
    }
    
    /**
     * 匿名化學習建議數據
     * @param {Object} adviceData - 原始建議數據
     * @returns {Object} 匿名化後的建議數據
     */
    anonymizeLearningData(adviceData) {
        // 移除任何可能的個人識別資訊
        const cleanAdvice = {
            title: adviceData.title || '',
            content: adviceData.content || '',
            keywords: adviceData.keywords || [],
            metadata: {
                type: adviceData.metadata?.type || 'general',
                generated_at: Date.now(),
                based_on_sessions: adviceData.metadata?.modelInfo?.totalSessions || 0,
                analysis_depth: adviceData.metadata?.analysisDepth || 'basic'
            }
        };
        
        // 如果有學習洞察，也要匿名化
        if (adviceData.learningInsights) {
            cleanAdvice.learning_insights = {
                task_type_insight: adviceData.learningInsights.taskTypeInsight || null,
                // 角色洞察只保留角色類型，不保留具體數值以避免推斷個人
                role_insights_summary: this.anonymizeRoleInsights(adviceData.learningInsights.roleInsights)
            };
        }
        
        return cleanAdvice;
    }
    
    /**
     * 匿名化角色洞察
     * @param {Object} roleInsights - 角色洞察數據
     * @returns {Object} 匿名化後的角色洞察
     */
    anonymizeRoleInsights(roleInsights) {
        if (!roleInsights) return null;
        
        const summary = {};
        Object.entries(roleInsights).forEach(([role, insight]) => {
            summary[role] = {
                has_historical_data: insight.sessionCount > 0,
                deviation_level: Math.abs(insight.deviation) > 2 ? 'high' : 'low'
                // 不包含具體數值，避免個人識別
            };
        });
        
        return summary;
    }
    
    /**
     * 監聽房間學習建議更新
     * @param {string} roomId - 房間 ID
     * @param {Function} callback - 回調函數
     */
    listenToLearningAdvice(roomId, callback) {
        if (!this.db || !roomId) return;
        
        const adviceRef = this.db.ref(`rooms/${roomId}/learning_data/current_advice`);
        
        const listener = adviceRef.on('value', (snapshot) => {
            const advice = snapshot.val();
            if (advice && advice.visible_to_all) {
                console.log('📢 收到 Firebase 學習建議更新:', advice);
                callback(advice);
            }
        });
        
        // 追蹤監聽器以便清理
        this.listeners.set(`learning_advice_${roomId}`, {
            ref: adviceRef,
            listener
        });
    }
    
    /**
     * 獲取房間學習歷史摘要
     * @param {string} roomId - 房間 ID
     * @returns {Promise<Object>} 學習歷史摘要
     */
    async getLearningHistorySummary(roomId) {
        try {
            if (!this.db || !roomId) {
                throw new Error('Missing database or room ID');
            }
            
            const historyRef = this.db.ref(`rooms/${roomId}/learning_data/session_history`);
            const snapshot = await historyRef.once('value');
            const sessions = snapshot.val() || {};
            
            const sessionList = Object.values(sessions);
            const taskTypes = [...new Set(sessionList.map(s => s.task_type))];
            const roles = [...new Set(
                sessionList.flatMap(s => 
                    Object.values(s.anonymous_votes || {}).map(v => v.role)
                )
            )];
            
            return {
                available: sessionList.length > 0,
                total_sessions: sessionList.length,
                task_types: taskTypes,
                roles: roles,
                date_range: sessionList.length > 0 ? {
                    oldest: Math.min(...sessionList.map(s => s.timestamp)),
                    newest: Math.max(...sessionList.map(s => s.timestamp))
                } : null
            };
            
        } catch (error) {
            console.error('❌ 獲取學習歷史摘要失敗:', error);
            return { available: false, error: error.message };
        }
    }
    
    /**
     * 清理過期的學習會話（50天 + 50筆限制）
     * @param {string} roomId - 房間 ID
     * @returns {Promise<void>}
     */
    async cleanupOldSessions(roomId) {
        try {
            const historyRef = this.db.ref(`rooms/${roomId}/learning_data/session_history`);
            const snapshot = await historyRef.once('value');
            const sessions = snapshot.val() || {};
            
            const sessionEntries = Object.entries(sessions);
            const now = Date.now();
            const fiftyDaysMs = 50 * 24 * 60 * 60 * 1000; // 50天
            
            // 按時間排序，最新的在前
            sessionEntries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            
            const toDelete = [];
            
            sessionEntries.forEach(([sessionId, session], index) => {
                // 刪除條件：超過50天 OR 超過50筆記錄
                if (now - session.timestamp > fiftyDaysMs || index >= 50) {
                    toDelete.push(sessionId);
                }
            });
            
            if (toDelete.length > 0) {
                console.log(`🧹 清理 ${toDelete.length} 筆過期學習會話`);
                
                const updates = {};
                toDelete.forEach(sessionId => {
                    updates[`rooms/${roomId}/learning_data/session_history/${sessionId}`] = null;
                });
                
                // 更新清理時間
                updates[`rooms/${roomId}/learning_data/metadata/last_cleanup`] = firebase.database.ServerValue.TIMESTAMP;
                
                await this.db.ref().update(updates);
                
                console.log('✅ 學習會話清理完成');
            }
            
        } catch (error) {
            console.error('❌ 清理學習會話失敗:', error);
        }
    }
    
    /**
     * 手動觸發房間學習數據清理（客戶端發動）
     * @param {string} roomId - 房間 ID
     * @returns {Promise<Object>} 清理結果
     */
    async triggerLearningDataCleanup(roomId) {
        try {
            console.log('🧹 手動觸發學習數據清理:', roomId);
            
            await this.cleanupOldSessions(roomId);
            
            // 獲取清理後的狀態
            const summary = await this.getLearningHistorySummary(roomId);
            
            return {
                success: true,
                message: `清理完成，保留 ${summary.total_sessions} 筆會話記錄`,
                summary
            };
            
        } catch (error) {
            console.error('❌ 手動清理失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 匯出 FirebaseService
window.FirebaseService = FirebaseService;

console.log('🔥 FirebaseService 已載入 - v3.0.0-enhanced');