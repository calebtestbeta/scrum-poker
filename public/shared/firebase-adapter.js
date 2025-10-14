/**
 * Scrum Poker - Firebase Adapter
 * 封裝 FirebaseService 的簡化介面，提供統一的資料存取方法
 * 
 * 設計目標：
 * - 簡化 Firebase 操作介面
 * - 統一錯誤處理
 * - 提供 Desktop/Mobile 共用的資料層
 * - 與既有 FirebaseService 兼容
 */

class FirebaseAdapter {
    constructor() {
        this.firebaseService = null;
        this.isInitialized = false;
        this.currentRoomId = null;
        this.currentPlayer = null;
        this.roomData = {
            phase: 'voting',
            players: {},
            votes: {},
            settings: {}
        };
        
        // 事件監聽器
        this.listeners = new Map();
        this.roomUpdateCallbacks = [];
        
        console.log('🔌 Firebase Adapter 初始化');
    }
    
    /**
     * 初始化 Firebase 連接
     * @param {string} roomId - 房間 ID
     * @param {Object} player - 玩家資訊 {name, role}
     * @returns {Promise<boolean>} 是否初始化成功
     */
    async init(roomId, player) {
        try {
            console.log('🚀 Firebase Adapter 初始化中...', { roomId, player });
            
            this.currentRoomId = roomId;
            this.currentPlayer = player;
            
            // 檢查是否有 FirebaseConfigManager
            if (typeof window.firebaseConfigManager === 'undefined') {
                console.warn('⚠️ FirebaseConfigManager 未找到，使用本地模式');
                return false;
            }
            
            // 等待 Firebase 準備就緒
            if (!window.firebaseConfigManager.isReady()) {
                console.log('⏳ 等待 Firebase 連線...');
                
                // 等待最多 5 秒
                let attempts = 0;
                while (!window.firebaseConfigManager.isReady() && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (!window.firebaseConfigManager.isReady()) {
                    console.warn('⚠️ Firebase 連線逾時，使用本地模式');
                    return false;
                }
            }
            
            // 取得或建立 FirebaseService
            this.firebaseService = window.firebaseConfigManager.getFirebaseService();
            
            if (!this.firebaseService) {
                console.warn('⚠️ FirebaseService 未找到，使用本地模式');
                return false;
            }
            
            console.log('✅ FirebaseService 已準備就緒');
            
            // 加入房間
            const playerId = this.generatePlayerId(player);
            console.log('🆔 生成玩家 ID:', playerId);
            
            const result = await this.firebaseService.joinRoom(roomId, {
                id: playerId,
                name: player.name,
                role: player.role,
                joinedAt: Date.now()
            });
            
            console.log('🔍 FirebaseService.joinRoom 回傳結果:', result);
            
            if (result && result.roomId) {
                console.log('✅ 成功加入房間:', roomId);
                console.log('📊 房間資訊:', { 
                    roomId: result.roomId, 
                    isNewRoom: result.isNewRoom, 
                    playerCount: result.playerCount 
                });
                
                this.isInitialized = true;
                
                // 初始化房間資料
                if (result.roomData) {
                    this.roomData = result.roomData;
                }
                
                // 設置房間監聽
                this.setupRoomListeners(roomId);
                
                return true;
            } else {
                console.error('❌ 加入房間失敗: result 格式不正確');
                console.error('❌ 完整 result 物件:', result);
                console.error('❌ result 類型:', typeof result);
                console.error('❌ result 是否為 null/undefined:', result === null || result === undefined);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Firebase Adapter 初始化失敗:', error);
            return false;
        }
    }
    
    /**
     * 訂閱房間更新
     * @param {string} roomId - 房間 ID
     * @param {Function} onUpdate - 更新回調 (roomData) => void
     */
    subscribeRoom(roomId, onUpdate) {
        if (typeof onUpdate !== 'function') {
            console.error('❌ onUpdate 必須是函數');
            return;
        }
        
        this.roomUpdateCallbacks.push(onUpdate);
        console.log('📡 註冊房間更新監聽器，總數:', this.roomUpdateCallbacks.length);
        
        // 如果已有資料，立即回調
        if (Object.keys(this.roomData.players).length > 0) {
            onUpdate(this.roomData);
        }
    }
    
    /**
     * 取消房間訂閱
     * @param {Function} onUpdate - 要移除的回調函數
     */
    unsubscribeRoom(onUpdate) {
        const index = this.roomUpdateCallbacks.indexOf(onUpdate);
        if (index > -1) {
            this.roomUpdateCallbacks.splice(index, 1);
            console.log('📡 移除房間更新監聽器，剩餘:', this.roomUpdateCallbacks.length);
        }
    }
    
    /**
     * 提交投票
     * @param {*} value - 投票值
     * @returns {Promise<boolean>} 是否提交成功
     */
    async submitVote(value) {
        try {
            console.log('🎯 開始提交投票...', { value, type: typeof value });
            
            if (!this.isInitialized || !this.firebaseService) {
                console.warn('⚠️ Firebase 未初始化，投票將不會同步');
                console.warn('⚠️ 狀態檢查:', { 
                    isInitialized: this.isInitialized, 
                    hasFirebaseService: !!this.firebaseService 
                });
                return false;
            }
            
            if (!this.currentRoomId) {
                console.error('❌ 當前房間 ID 為空');
                return false;
            }
            
            if (!this.currentPlayer) {
                console.error('❌ 當前玩家資料為空');
                return false;
            }
            
            const playerId = this.generatePlayerId(this.currentPlayer);
            console.log('🗳️ 提交投票詳細資訊:', { 
                roomId: this.currentRoomId,
                playerId, 
                playerName: this.currentPlayer?.name,
                value,
                valueType: typeof value
            });
            
            // FirebaseService.submitVote 沒有返回值，成功時不會拋出異常
            await this.firebaseService.submitVote(
                this.currentRoomId, 
                playerId, 
                value
            );
            
            console.log('✅ 投票提交成功:', value);
            return true;
            
        } catch (error) {
            console.error('❌ 提交投票時發生錯誤:', error);
            console.error('❌ 錯誤堆疊:', error.stack);
            console.error('❌ 投票參數:', {
                roomId: this.currentRoomId,
                playerId: this.currentPlayer ? this.generatePlayerId(this.currentPlayer) : 'N/A',
                value,
                isInitialized: this.isInitialized,
                hasFirebaseService: !!this.firebaseService
            });
            return false;
        }
    }
    
    /**
     * 開牌
     * @returns {Promise<boolean>} 是否開牌成功
     */
    async reveal() {
        try {
            if (!this.isInitialized || !this.firebaseService) {
                console.warn('⚠️ Firebase 未初始化，開牌將不會同步');
                return false;
            }
            
            // FirebaseService.revealVotes 沒有返回值，成功時不會拋出異常
            await this.firebaseService.revealVotes(this.currentRoomId);
            
            console.log('✅ 開牌成功');
            return true;
            
        } catch (error) {
            console.error('❌ 開牌時發生錯誤:', error);
            return false;
        }
    }
    
    /**
     * 清除投票
     * @returns {Promise<boolean>} 是否清除成功
     */
    async clearVotes() {
        try {
            if (!this.isInitialized || !this.firebaseService) {
                console.warn('⚠️ Firebase 未初始化，清除投票將不會同步');
                return false;
            }
            
            // FirebaseService.clearVotes 沒有返回值，成功時不會拋出異常
            await this.firebaseService.clearVotes(this.currentRoomId);
            
            console.log('✅ 清除投票成功');
            return true;
            
        } catch (error) {
            console.error('❌ 清除投票時發生錯誤:', error);
            return false;
        }
    }
    
    /**
     * 離開房間
     * @returns {Promise<boolean>} 是否離開成功
     */
    async leaveRoom() {
        try {
            if (!this.isInitialized || !this.firebaseService) {
                console.log('ℹ️ 本地模式，無需離開房間');
                return true;
            }
            
            const playerId = this.generatePlayerId(this.currentPlayer);
            
            // FirebaseService.leaveRoom 沒有返回值，成功時不會拋出異常
            await this.firebaseService.leaveRoom(this.currentRoomId, playerId);
            
            console.log('✅ 已離開房間');
            this.cleanup();
            
            return true;
            
        } catch (error) {
            console.error('❌ 離開房間時發生錯誤:', error);
            this.cleanup();
            return false;
        }
    }
    
    /**
     * 更新玩家資訊
     * @param {string} playerId - 玩家 ID
     * @param {Object} playerInfo - 玩家資訊 {name, role, lastUpdated}
     * @returns {Promise<boolean>} 是否更新成功
     */
    async updatePlayerInfo(playerId, playerInfo) {
        try {
            if (!this.isInitialized || !this.firebaseService) {
                console.log('ℹ️ 本地模式，無法更新玩家資訊到 Firebase');
                return false;
            }
            
            if (!this.currentRoomId) {
                throw new Error('未指定房間 ID');
            }
            
            console.log('🔄 更新玩家資訊到 Firebase...', { playerId, playerInfo });
            
            // 構建更新資料
            const updateData = {
                name: playerInfo.name,
                role: playerInfo.role,
                lastUpdated: playerInfo.lastUpdated || Date.now(),
                online: true // 確保玩家仍在線上
            };
            
            // 使用 FirebaseService 更新玩家資訊
            // 直接更新資料庫中的玩家資料
            const database = window.firebaseConfigManager.getDatabase();
            const playerRef = database.ref(`rooms/${this.currentRoomId}/players/${playerId}`);
            
            await playerRef.update(updateData);
            
            // 更新本地快取
            if (this.roomData.players && this.roomData.players[playerId]) {
                this.roomData.players[playerId] = {
                    ...this.roomData.players[playerId],
                    ...updateData
                };
            }
            
            // 如果是更新當前玩家，同時更新 currentPlayer
            if (playerId === this.generatePlayerId(this.currentPlayer)) {
                this.currentPlayer.name = playerInfo.name;
                this.currentPlayer.role = playerInfo.role;
                console.log('✅ 當前玩家資訊已同步更新');
            }
            
            console.log('✅ 玩家資訊更新成功');
            return true;
            
        } catch (error) {
            console.error('❌ 更新玩家資訊時發生錯誤:', error);
            return false;
        }
    }
    
    /**
     * 取得當前房間資料
     * @returns {Object} 房間資料
     */
    getRoomData() {
        return { ...this.roomData };
    }
    
    /**
     * 取得連線狀態
     * @returns {boolean} 是否已連線
     */
    isConnected() {
        return this.isInitialized && this.firebaseService !== null;
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 設置房間監聽器
     * @param {string} roomId - 房間 ID
     */
    setupRoomListeners(roomId) {
        if (!this.firebaseService) return;
        
        console.log('📡 設置房間監聽器:', roomId);
        
        // 監聽玩家更新
        this.firebaseService.on('room:players-updated', (data) => {
            if (data.roomId === roomId) {
                this.roomData.players = data.players || {};
                this.notifyRoomUpdate();
            }
        });
        
        // 監聽投票更新
        this.firebaseService.on('room:votes-updated', (data) => {
            if (data.roomId === roomId) {
                this.roomData.votes = data.votes || {};
                this.notifyRoomUpdate();
            }
        });
        
        // 監聽階段變更
        this.firebaseService.on('room:phase-changed', (data) => {
            if (data.roomId === roomId) {
                this.roomData.phase = data.phase || 'voting';
                this.notifyRoomUpdate();
            }
        });
        
        // 監聽設定更新
        this.firebaseService.on('room:settings-updated', (data) => {
            if (data.roomId === roomId) {
                this.roomData.settings = data.settings || {};
                this.notifyRoomUpdate();
            }
        });
    }
    
    /**
     * 通知房間資料更新
     */
    notifyRoomUpdate() {
        const roomData = this.getRoomData();
        
        this.roomUpdateCallbacks.forEach(callback => {
            try {
                callback(roomData);
            } catch (error) {
                console.error('❌ 房間更新回調執行錯誤:', error);
            }
        });
    }
    
    /**
     * 產生玩家 ID
     * @param {Object} player - 玩家資訊
     * @returns {string} 玩家 ID
     */
    generatePlayerId(player) {
        // 如果已經有 playerId，直接使用
        if (this.currentPlayerId) {
            return this.currentPlayerId;
        }
        
        // 使用穩定的 hash 算法產生玩家 ID（符合 FirebaseService 驗證格式）
        const str = `${player.name}_${player.role}_${this.currentRoomId || 'default'}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 轉換為 32 位整數
        }
        
        // 格式：player_時間戳(base36)_隨機字符(base36)
        // 為了符合 FirebaseService 驗證要求，生成符合長度限制的部分
        const timestamp = Date.now().toString(36); // 時間戳轉 base36 (6-11字符)
        const hashPart = Math.abs(hash).toString(36).padStart(6, '0').substring(0, 8); // 確保 6-8 字符長度
        
        const playerId = `player_${timestamp}_${hashPart}`;
        
        console.log('🆔 生成玩家 ID 詳細資訊:', {
            原始字串: str,
            hash: hash,
            timestamp: timestamp,
            hashPart: hashPart,
            最終ID: playerId,
            長度檢查: {
                timestamp長度: timestamp.length,
                hash長度: hashPart.length,
                總長度: playerId.length
            }
        });
        
        // 儲存生成的 ID
        this.currentPlayerId = playerId;
        
        return playerId;
    }
    
    /**
     * 清理資源
     */
    cleanup() {
        this.isInitialized = false;
        this.currentRoomId = null;
        this.currentPlayer = null;
        this.roomUpdateCallbacks = [];
        this.roomData = {
            phase: 'voting',
            players: {},
            votes: {},
            settings: {}
        };
        
        // 清理 Firebase 監聽器
        if (this.firebaseService) {
            // 這裡可以添加移除特定監聽器的邏輯
            console.log('🧹 清理 Firebase 監聽器');
        }
        
        console.log('🧹 Firebase Adapter 已清理');
    }
    
    /**
     * Debug 資訊
     */
    debug() {
        console.group('🔍 Firebase Adapter Debug');
        console.log('初始化狀態:', this.isInitialized);
        console.log('當前房間:', this.currentRoomId);
        console.log('當前玩家:', this.currentPlayer);
        console.log('房間資料:', this.roomData);
        console.log('監聽器數量:', this.roomUpdateCallbacks.length);
        console.log('Firebase 服務:', !!this.firebaseService);
        console.groupEnd();
        
        return {
            initialized: this.isInitialized,
            roomId: this.currentRoomId,
            player: this.currentPlayer,
            roomData: this.getRoomData(),
            listenersCount: this.roomUpdateCallbacks.length,
            hasFirebaseService: !!this.firebaseService
        };
    }
}

// 建立全域單例
window.FirebaseAdapter = FirebaseAdapter;

// 匯出便利函數
window.createFirebaseAdapter = () => new FirebaseAdapter();