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
            
            // 啟動心跳
            this.startHeartbeat();
            
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
                await this.currentRoomRef.child(`players/${this.currentPlayerId}/lastHeartbeat`).set(Date.now());
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
                // 玩家 ID 格式檢查
                if (!/^player_\d+_[a-zA-Z0-9]+$/.test(sanitized)) {
                    throw new Error('玩家 ID 格式無效');
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
        // 允許的特殊值
        const allowedSpecial = ['?', '☕', '∞'];
        
        if (typeof vote === 'number' && allowedNumbers.includes(vote)) {
            return vote;
        }
        
        if (typeof vote === 'string' && allowedSpecial.includes(vote)) {
            return vote;
        }
        
        throw new Error('無效的投票值');
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
            
            // 輸入驗證和清理
            roomId = this.validateAndSanitizeInput(roomId, 20, 'roomId');
            player.id = this.validateAndSanitizeInput(player.id, 50, 'playerId');
            player.name = this.validateAndSanitizeInput(player.name, 20, 'playerName');
            
            // 角色驗證
            const allowedRoles = ['dev', 'qa', 'scrum_master', 'po', 'other'];
            if (!allowedRoles.includes(player.role)) {
                throw new Error('無效的玩家角色');
            }
            
            console.log(`🏠 正在加入房間: ${roomId}`);
            
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
                const playerCount = roomData.players ? Object.keys(roomData.players).length : 0;
                
                if (roomData.locked) {
                    throw new Error('房間已被鎖定');
                }
                
                if (playerCount >= 10) { // 最大玩家數限制
                    throw new Error('房間已滿');
                }
            }
            
            // 添加玩家到房間
            await this.addPlayerToRoom(roomId, player);
            
            // 設置房間監聽器
            this.setupRoomListeners(roomId);
            
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
        
        await this.db.ref(`rooms/${roomId}/players/${player.id}`).set(playerData);
        
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
            
            // 輸入驗證和清理
            roomId = this.validateAndSanitizeInput(roomId, 20, 'roomId');
            playerId = this.validateAndSanitizeInput(playerId, 50, 'playerId');
            vote = this.validateVoteValue(vote);
            
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
            console.error('❌ 提交投票失敗:', error);
            this.emitEvent('vote:error', { roomId, playerId, vote, error });
            throw error;
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
     * @returns {Promise<void>}
     */
    async leaveRoom(roomId, playerId) {
        try {
            if (!roomId || !playerId) {
                console.warn('⚠️ 房間 ID 或玩家 ID 不完整，跳過離開房間');
                return;
            }
            
            if (this.connectionState !== 'connected') {
                console.warn('⚠️ Firebase 未連線，跳過離開房間');
                return;
            }
            
            const roomRef = this.db.ref(`rooms/${roomId}`);
            
            // 移除玩家投票
            await roomRef.child(`votes/${playerId}`).remove();
            
            // 移除玩家資料
            await roomRef.child(`players/${playerId}`).remove();
            
            // 記錄離開事件
            await this.addRoomEvent(roomId, {
                type: 'player_left',
                playerId: playerId,
                timestamp: Date.now()
            });
            
            // 檢查房間是否為空，如果是則清理房間
            const playersSnapshot = await roomRef.child('players').once('value');
            const remainingPlayers = playersSnapshot.val() || {};
            
            if (Object.keys(remainingPlayers).length === 0) {
                // 房間為空，延遲清理以防玩家快速重新加入
                setTimeout(async () => {
                    try {
                        const finalCheck = await roomRef.child('players').once('value');
                        const finalPlayers = finalCheck.val() || {};
                        
                        if (Object.keys(finalPlayers).length === 0) {
                            await roomRef.remove();
                            console.log(`🗑️ 空房間 ${roomId} 已清理`);
                        }
                    } catch (error) {
                        console.warn('⚠️ 清理空房間失敗:', error);
                    }
                }, 30000); // 30秒後清理
            }
            
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
        // 檢測新加入的玩家
        Object.keys(players).forEach(playerId => {
            const player = players[playerId];
            if (player.joinedAt && Date.now() - player.joinedAt < 5000) {
                // 5秒內加入的玩家視為新玩家
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
}

// 匯出 FirebaseService
window.FirebaseService = FirebaseService;

console.log('🔥 FirebaseService 已載入 - v3.0.0-enhanced');