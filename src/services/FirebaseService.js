/**
 * Firebase 服務 - 即時資料庫整合
 * 提供房間管理、玩家同步、投票狀態同步等功能
 * @version 3.0.0-enhanced
 */

/**
 * Firebase 服務類別
 */
class FirebaseService {
    constructor(config = null) {
        this.version = '3.0.0-enhanced';
        this.db = null;
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
            leaveRoom: { interval: 1000, maxAttempts: 3 } // 1秒內最多3次
        };
        
        // 如果提供了配置，立即初始化
        if (config) {
            this.initialize(config).catch(error => {
                console.error('❌ 自動初始化失敗:', error);
            });
        }
        
        // 配置選項
        this.config = {
            enablePersistence: true,
            enableLogging: false,
            retryInterval: 30000,
            heartbeatInterval: 60000
        };
        
        // 心跳定時器
        this.heartbeatTimer = null;
        
        console.log(`🔥 FirebaseService ${this.version} 已創建`);
    }
    
    /**
     * 初始化 Firebase 連線
     * @param {Object} config - Firebase 配置
     * @param {string} config.projectId - Firebase 專案 ID
     * @param {string} config.apiKey - Firebase API 金鑰
     * @param {string} [config.databaseURL] - 資料庫 URL（可選）
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize(config) {
        try {
            console.log('🔥 正在初始化 Firebase...');
            this.connectionState = 'connecting';
            
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
            
            // 初始化 Firebase 應用
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            // 取得資料庫參考
            this.db = firebase.database();
            
            // 匿名身份驗證 - 解決權限問題
            try {
                console.log('🔐 正在進行匿名身份驗證...');
                const authResult = await firebase.auth().signInAnonymously();
                console.log('✅ 匿名身份驗證成功:', authResult.user.uid);
                
                // 等待身份驗證狀態穩定
                await new Promise(resolve => {
                    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
                        if (user) {
                            console.log('✅ 身份驗證狀態確認:', user.uid);
                            unsubscribe();
                            resolve();
                        }
                    });
                });
                
            } catch (authError) {
                console.error('❌ 匿名身份驗證失敗:', authError);
                throw new Error(`身份驗證失敗: ${authError.message}`);
            }
            
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
            
            // 心跳機制將在加入房間後啟動
            
            this.connectionState = 'connected';
            this.retryCount = 0;
            
            console.log('✅ Firebase 初始化成功');
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
     * 更新玩家心跳
     */
    async updatePlayerHeartbeat() {
        try {
            if (this.currentRoomRef && this.currentPlayerId) {
                const heartbeatTime = Date.now();
                await this.currentRoomRef.child(`players/${this.currentPlayerId}/lastHeartbeat`).set(heartbeatTime);
            } else {
                console.warn('⚠️ 心跳更新跳過: 房間或玩家信息未設置');
            }
        } catch (error) {
            console.warn('⚠️ 心跳更新失敗:', error);
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
                console.log(`👥 房間 ${roomId} 當前活躍玩家數: ${activePlayerCount}/10`);
                
                if (activePlayerCount >= 10) { // 最大玩家數限制
                    throw new Error(`房間已達到最大容量 (${activePlayerCount}/10 位玩家)。請等待其他玩家離開或建立新房間。`);
                }
                
                // 檢查該玩家是否已經在房間中
                if (roomData.players && roomData.players[player.id]) {
                    console.log(`🔄 玩家 ${player.name} 重新加入房間`);
                    // 更新現有玩家的心跳時間
                    await roomRef.child(`players/${player.id}/lastHeartbeat`).set(Date.now());
                    await roomRef.child(`players/${player.id}/online`).set(true);
                }
            }
            
            // 添加玩家到房間
            await this.addPlayerToRoom(roomId, player);
            
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
            phase: 'waiting', // waiting, voting, revealing, finished
            locked: false,
            settings: {
                allowSpectators: true,
                autoReveal: false,
                cardSet: 'fibonacci', // fibonacci, tshirt, custom
                maxPlayers: 10,
                timeLimit: null
            },
            statistics: {
                rounds: 0,
                totalVotes: 0,
                averageTime: 0
            },
            players: {},
            votes: {},
            history: []
        };
        
        await this.db.ref(`rooms/${roomId}`).set(roomData);
    }
    
    /**
     * 添加玩家到房間
     * @param {string} roomId - 房間 ID
     * @param {Object} player - 玩家資訊
     */
    async addPlayerToRoom(roomId, player) {
        const playerData = {
            id: player.id,
            name: player.name,
            role: player.role,
            joinedAt: Date.now(),
            lastHeartbeat: Date.now(),
            online: true,
            hasVoted: false,
            vote: null,
            spectator: false
        };
        
        console.log(`🔄 [${roomId}] [${player.id}] 正在添加玩家到房間: ${player.name}`);
        
        const playerRef = this.db.ref(`rooms/${roomId}/players/${player.id}`);
        const voteRef = this.db.ref(`rooms/${roomId}/votes/${player.id}`);
        
        // 批次更新，確保原子性
        const updates = {};
        updates[`rooms/${roomId}/players/${player.id}`] = playerData;
        updates[`rooms/${roomId}/lastActivity`] = Date.now();
        
        await this.db.ref().update(updates);
        
        // 設置斷線自動清理 - 改為更新 online 狀態而不是直接刪除
        await playerRef.onDisconnect().update({
            online: false,
            lastSeen: Date.now()
        });
        await voteRef.onDisconnect().remove();
        
        console.log(`🔗 [${roomId}] [${player.id}] 已設置斷線自動清理 (標記離線+清理投票)`);
        
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
        
        // 遊戲階段變更監聽
        const phaseRef = roomRef.child('phase');
        const phaseListener = phaseRef.on('value', (snapshot) => {
            const phase = snapshot.val();
            this.emitEvent('room:phase-changed', { roomId, phase });
        });
        this.listeners.set('phase', { ref: phaseRef, listener: phaseListener });
        
        // 房間設定變更監聽
        const settingsRef = roomRef.child('settings');
        const settingsListener = settingsRef.on('value', (snapshot) => {
            const settings = snapshot.val() || {};
            this.emitEvent('room:settings-updated', { roomId, settings });
        });
        this.listeners.set('settings', { ref: settingsRef, listener: settingsListener });
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
     * 更新房間統計
     * @param {string} roomId - 房間 ID
     */
    async updateRoomStatistics(roomId) {
        try {
            const roomRef = this.db.ref(`rooms/${roomId}`);
            const statisticsRef = roomRef.child('statistics');
            
            // 取得當前統計
            const statsSnapshot = await statisticsRef.once('value');
            const currentStats = statsSnapshot.val() || { rounds: 0, totalVotes: 0, averageTime: 0 };
            
            // 更新輪次
            const updatedStats = {
                ...currentStats,
                rounds: currentStats.rounds + 1,
                lastRoundAt: Date.now()
            };
            
            await statisticsRef.set(updatedStats);
            
        } catch (error) {
            console.warn('⚠️ 更新房間統計失敗:', error);
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
        switch(playerRole) {
            case 'scrum_master':
            case 'po': 
                return 20; // Scrum Master 和 PO 需要更多主持和決策時間
            case 'dev':
            case 'qa':
            case 'other':
            default:
                return 15; // 所有參與者都支援15+分鐘的深度討論
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
            
            const playersRef = this.db.ref(`rooms/${roomId}/players`);
            const snapshot = await playersRef.once('value');
            const players = snapshot.val() || {};
            
            const cleanupPromises = [];
            const now = Date.now();
            
            for (const [playerId, playerData] of Object.entries(players)) {
                const lastHeartbeat = playerData.lastHeartbeat || 0;
                const playerRole = playerData.role || 'other';
                
                // 基於角色決定超時時間
                const roleTimeoutMinutes = this.getRoleTimeoutMinutes(playerRole);
                const roleTimeoutMs = roleTimeoutMinutes * 60 * 1000;
                const cutoffTime = now - roleTimeoutMs;
                
                const isTimeout = !playerData.lastHeartbeat || lastHeartbeat < cutoffTime;
                
                if (isTimeout) {
                    console.log(`🧹 清理超時玩家: ${playerData.name} (${playerRole}, 超時: ${roleTimeoutMinutes}分鐘)`);
                    cleanupPromises.push(this.leaveRoom(roomId, playerId, true));
                    cleanedCount++;
                } else {
                    // 記錄角色與剩餘時間（調試用）
                    const remainingMs = lastHeartbeat + roleTimeoutMs - now;
                    const remainingMinutes = Math.ceil(remainingMs / 60000);
                    console.log(`⏰ ${playerData.name} (${playerRole}) 剩餘時間: ${remainingMinutes}分鐘`);
                }
            }
            
            if (cleanedCount > 0) {
                await Promise.all(cleanupPromises);
                console.log(`✅ 已清理 ${cleanedCount} 個超時玩家`);
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
        
        // 斷開 Firebase 連線
        if (this.db && typeof this.db.goOffline === 'function') {
            this.db.goOffline();
        }
        
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