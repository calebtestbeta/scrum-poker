/**
 * 本地房間服務 - 完全基於瀏覽器的房間管理
 * 支援多標籤頁同步、資料持久化、無需任何外部服務
 * @version 1.0.0-local-first
 */

class LocalRoomService {
    constructor() {
        this.version = '1.0.0-local-first';
        this.roomId = null;
        this.currentPlayer = null;
        this.roomData = {
            phase: 'voting', // voting, revealing, finished
            players: {},
            votes: {},
            settings: {},
            statistics: {},
            lastActivity: Date.now(),
            createdAt: Date.now()
        };
        
        // 事件監聽器
        this.eventListeners = {};
        
        // BroadcastChannel 用於跨標籤頁同步
        this.broadcastChannel = null;
        
        // 定期保存和同步
        this.saveInterval = null;
        this.syncInterval = null;
        
        console.log(`🏠 LocalRoomService ${this.version} 已創建`);
    }
    
    /**
     * 初始化本地房間服務
     * @param {string} roomId - 房間 ID
     * @returns {Promise<boolean>}
     */
    async initialize(roomId) {
        try {
            this.roomId = roomId;
            
            // 設置 BroadcastChannel 進行跨標籤頁通訊
            this.setupBroadcastChannel();
            
            // 從 LocalStorage 載入房間資料
            this.loadRoomData();
            
            // 開始定期保存和心跳
            this.startPeriodicSave();
            this.startHeartbeat();
            
            console.log(`✅ LocalRoomService 已初始化 - 房間: ${roomId}`);
            this.emitEvent('room:initialized', { roomId });
            
            return true;
        } catch (error) {
            console.error('❌ LocalRoomService 初始化失敗:', error);
            return false;
        }
    }
    
    /**
     * 設置 BroadcastChannel 進行跨標籤頁通訊
     */
    setupBroadcastChannel() {
        try {
            const channelName = `scrum-poker-room-${this.roomId}`;
            this.broadcastChannel = new BroadcastChannel(channelName);
            
            this.broadcastChannel.onmessage = (event) => {
                this.handleBroadcastMessage(event.data);
            };
            
            console.log(`📡 BroadcastChannel 已設置: ${channelName}`);
        } catch (error) {
            console.warn('⚠️ BroadcastChannel 不支援，將使用 polling 同步:', error);
        }
    }
    
    /**
     * 處理跨標籤頁廣播訊息
     */
    handleBroadcastMessage(data) {
        const { type, payload, sender } = data;
        
        // 忽略自己發送的訊息
        if (sender === this.getClientId()) return;
        
        switch (type) {
            case 'room-data-updated':
                this.handleRemoteRoomUpdate(payload);
                break;
            case 'player-joined':
                this.handleRemotePlayerJoined(payload);
                break;
            case 'vote-submitted':
                this.handleRemoteVoteSubmitted(payload);
                break;
            case 'phase-changed':
                this.handleRemotePhaseChanged(payload);
                break;
            default:
                console.log('📨 未處理的廣播訊息:', type, payload);
        }
    }
    
    /**
     * 廣播訊息到其他標籤頁
     */
    broadcast(type, payload) {
        if (!this.broadcastChannel) return;
        
        this.broadcastChannel.postMessage({
            type,
            payload,
            sender: this.getClientId(),
            timestamp: Date.now()
        });
    }
    
    /**
     * 獲取客戶端唯一 ID
     */
    getClientId() {
        if (!this.clientId) {
            this.clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        return this.clientId;
    }
    
    /**
     * 從 LocalStorage 載入房間資料
     */
    loadRoomData() {
        try {
            const storageKey = `scrum-poker-room-${this.roomId}`;
            const savedData = localStorage.getItem(storageKey);
            
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.roomData = { ...this.roomData, ...parsedData };
                console.log(`📂 已載入房間資料: ${this.roomId}`);
            } else {
                console.log(`🆕 建立新房間: ${this.roomId}`);
            }
        } catch (error) {
            console.warn('⚠️ 載入房間資料失敗:', error);
        }
    }
    
    /**
     * 保存房間資料到 LocalStorage
     */
    saveRoomData() {
        try {
            const storageKey = `scrum-poker-room-${this.roomId}`;
            this.roomData.lastActivity = Date.now();
            
            localStorage.setItem(storageKey, JSON.stringify(this.roomData));
            
            // 廣播資料更新
            this.broadcast('room-data-updated', this.roomData);
            
            console.log(`💾 房間資料已保存: ${this.roomId}`);
        } catch (error) {
            console.error('❌ 保存房間資料失敗:', error);
        }
    }
    
    /**
     * 加入房間
     * @param {Object} player - 玩家資訊
     */
    async joinRoom(roomId, player) {
        try {
            this.currentPlayer = player;
            
            // 添加玩家到房間
            this.roomData.players[player.id] = {
                ...player,
                joinedAt: Date.now(),
                lastHeartbeat: Date.now(),
                online: true
            };
            
            // 保存資料
            this.saveRoomData();
            
            // 廣播玩家加入
            this.broadcast('player-joined', player);
            
            // 觸發事件
            this.emitEvent('players:player-added', player);
            this.emitEvent('room:players-updated', this.roomData.players);
            
            console.log(`👤 玩家 ${player.name} 已加入房間`);
            return this.roomData;
        } catch (error) {
            console.error('❌ 加入房間失敗:', error);
            throw error;
        }
    }
    
    /**
     * 提交投票
     * @param {string} playerId - 玩家 ID
     * @param {*} vote - 投票值
     */
    async submitVote(playerId, vote) {
        try {
            // 更新投票資料
            this.roomData.votes[playerId] = {
                value: vote,
                timestamp: Date.now(),
                playerId: playerId,
                player_role: this.roomData.players[playerId]?.role || 'other'
            };
            
            // 更新玩家狀態
            if (this.roomData.players[playerId]) {
                this.roomData.players[playerId].hasVoted = true;
                this.roomData.players[playerId].vote = vote;
            }
            
            // 保存資料
            this.saveRoomData();
            
            // 廣播投票
            this.broadcast('vote-submitted', { playerId, vote });
            
            // 觸發事件
            this.emitEvent('room:votes-updated', this.roomData.votes);
            
            console.log(`🗳️ 玩家 ${playerId} 投票: ${vote}`);
            return true;
        } catch (error) {
            console.error('❌ 提交投票失敗:', error);
            throw error;
        }
    }
    
    /**
     * 更改遊戲階段
     * @param {string} newPhase - 新階段
     */
    async changePhase(newPhase) {
        try {
            const oldPhase = this.roomData.phase;
            this.roomData.phase = newPhase;
            
            // 保存資料
            this.saveRoomData();
            
            // 廣播階段變更
            this.broadcast('phase-changed', { oldPhase, newPhase });
            
            // 觸發事件
            this.emitEvent('game:phase-changed', { oldPhase, newPhase });
            
            console.log(`🎮 遊戲階段變更: ${oldPhase} → ${newPhase}`);
            return true;
        } catch (error) {
            console.error('❌ 變更階段失敗:', error);
            throw error;
        }
    }
    
    /**
     * 清除所有投票
     */
    async clearVotes() {
        try {
            this.roomData.votes = {};
            
            // 清除玩家投票狀態
            Object.keys(this.roomData.players).forEach(playerId => {
                this.roomData.players[playerId].hasVoted = false;
                this.roomData.players[playerId].vote = null;
            });
            
            // 重置階段為投票
            this.roomData.phase = 'voting';
            
            // 保存資料
            this.saveRoomData();
            
            // 廣播清除投票
            this.broadcast('votes-cleared', {});
            
            // 觸發事件
            this.emitEvent('game:votes-cleared', {});
            
            console.log('🧹 已清除所有投票');
            return true;
        } catch (error) {
            console.error('❌ 清除投票失敗:', error);
            throw error;
        }
    }
    
    /**
     * 獲取房間資料
     */
    getRoomData() {
        return this.roomData;
    }
    
    /**
     * 獲取玩家列表
     */
    getPlayers() {
        return this.roomData.players;
    }
    
    /**
     * 獲取投票資料
     */
    getVotes() {
        return this.roomData.votes;
    }
    
    /**
     * 開始定期保存
     */
    startPeriodicSave() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        
        this.saveInterval = setInterval(() => {
            this.saveRoomData();
        }, 10000); // 每 10 秒保存一次
    }
    
    /**
     * 開始心跳機制
     */
    startHeartbeat() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(() => {
            if (this.currentPlayer) {
                // 更新當前玩家的心跳時間
                const playerId = this.currentPlayer.id;
                if (this.roomData.players[playerId]) {
                    this.roomData.players[playerId].lastHeartbeat = Date.now();
                }
                
                // 清理離線玩家 (超過 30 秒無心跳)
                this.cleanupOfflinePlayers();
            }
        }, 5000); // 每 5 秒心跳一次
    }
    
    /**
     * 清理離線玩家
     */
    cleanupOfflinePlayers() {
        const now = Date.now();
        const timeout = 30 * 1000; // 30 秒
        let hasChanges = false;
        
        Object.keys(this.roomData.players).forEach(playerId => {
            const player = this.roomData.players[playerId];
            if (now - player.lastHeartbeat > timeout) {
                delete this.roomData.players[playerId];
                delete this.roomData.votes[playerId];
                hasChanges = true;
                console.log(`👻 玩家 ${player.name} 已離線並被移除`);
            }
        });
        
        if (hasChanges) {
            this.saveRoomData();
            this.emitEvent('room:players-updated', this.roomData.players);
        }
    }
    
    /**
     * 處理遠端房間更新
     */
    handleRemoteRoomUpdate(roomData) {
        this.roomData = { ...this.roomData, ...roomData };
        this.emitEvent('room:synced', roomData);
    }
    
    /**
     * 處理遠端玩家加入
     */
    handleRemotePlayerJoined(player) {
        this.emitEvent('players:player-added', player);
    }
    
    /**
     * 處理遠端投票
     */
    handleRemoteVoteSubmitted({ playerId, vote }) {
        this.emitEvent('room:votes-updated', this.roomData.votes);
    }
    
    /**
     * 處理遠端階段變更
     */
    handleRemotePhaseChanged({ oldPhase, newPhase }) {
        this.emitEvent('game:phase-changed', { oldPhase, newPhase });
    }
    
    /**
     * 事件監聽
     */
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }
    
    /**
     * 移除事件監聽
     */
    off(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName] = this.eventListeners[eventName].filter(cb => cb !== callback);
        }
    }
    
    /**
     * 觸發事件
     */
    emitEvent(eventName, data) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件處理錯誤 ${eventName}:`, error);
                }
            });
        }
    }
    
    /**
     * 銷毀服務
     */
    destroy() {
        // 清理定時器
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // 關閉 BroadcastChannel
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
        }
        
        // 清理事件監聽器
        this.eventListeners = {};
        
        console.log('🏠 LocalRoomService 已銷毀');
    }
    
    /**
     * 導出房間資料
     */
    exportRoomData() {
        return {
            version: this.version,
            roomId: this.roomId,
            exportedAt: Date.now(),
            roomData: this.roomData
        };
    }
    
    /**
     * 匯入房間資料
     */
    importRoomData(exportedData) {
        try {
            if (exportedData.roomData) {
                this.roomData = { ...this.roomData, ...exportedData.roomData };
                this.saveRoomData();
                console.log('📥 房間資料匯入成功');
                return true;
            }
        } catch (error) {
            console.error('❌ 匯入房間資料失敗:', error);
            return false;
        }
    }
}

// 全域註冊
window.LocalRoomService = LocalRoomService;

console.log('🏠 LocalRoomService 已載入 - v1.0.0-local-first');