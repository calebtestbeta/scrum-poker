/**
 * 房間資料提供者工廠 - 雙模式支援
 * 根據應用模式動態創建對應的資料層服務
 * @version 3.0.0-dual-mode
 */

/**
 * 房間資料提供者介面規範
 * 所有房間服務都必須實現這些方法
 * @interface IRoomProvider
 */
const IRoomProvider = {
    // === 初始化相關 ===
    /**
     * 初始化服務
     * @param {string} roomId - 房間 ID (4-20字符，英數字)
     * @returns {Promise<{success: boolean, error?: string}>} 初始化結果
     * @throws {Error} 當 roomId 格式不正確時拋出錯誤
     */
    initialize: async (roomId) => {},
    
    /**
     * 銷毀服務並清理資源
     * @returns {Promise<void>} 清理完成的 Promise
     */
    destroy: async () => {},
    
    // === 房間管理 ===
    /**
     * 加入房間
     * @param {string} roomId - 房間 ID (4-20字符，英數字)
     * @param {Object} player - 玩家資訊
     * @param {string} player.id - 玩家唯一標識符
     * @param {string} player.name - 玩家名稱 (1-20字符)
     * @param {'dev'|'qa'|'scrum_master'|'po'|'other'} player.role - 玩家角色
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>} 加入結果
     */
    joinRoom: async (roomId, player) => {},
    
    /**
     * 離開房間
     * @param {string} roomId - 房間 ID
     * @param {string} playerId - 玩家 ID
     * @param {boolean} [immediate=false] - 是否立即移除，不等待清理
     * @returns {Promise<{success: boolean, error?: string}>} 離開結果
     */
    leaveRoom: async (roomId, playerId, immediate = false) => {},
    
    // === 投票管理 ===
    /**
     * 提交投票
     * @param {string} playerId - 玩家 ID
     * @param {*} vote - 投票值
     * @returns {Promise<boolean>} 是否提交成功
     */
    submitVote: async (playerId, vote) => {},
    
    /**
     * 開牌 (揭曉所有投票)
     * @param {string} roomId - 房間 ID
     * @returns {Promise<boolean>} 是否開牌成功
     */
    revealVotes: async (roomId) => {},
    
    /**
     * 清除投票 (開始新一輪)
     * @param {string} roomId - 房間 ID
     * @returns {Promise<boolean>} 是否清除成功
     */
    clearVotes: async (roomId) => {},
    
    // === 事件監聽 ===
    /**
     * 監聽事件
     * @param {string} eventName - 事件名稱
     * @param {Function} callback - 回調函數
     * @returns {void}
     */
    on: (eventName, callback) => {},
    
    /**
     * 移除事件監聽
     * @param {string} eventName - 事件名稱
     * @param {Function} callback - 回調函數  
     * @returns {void}
     */
    off: (eventName, callback) => {},
    
    // === 資料查詢 ===
    /**
     * 獲取房間狀態
     * @param {string} roomId - 房間 ID
     * @returns {Promise<Object>} 房間狀態
     */
    getRoomState: async (roomId) => {},
    
    /**
     * 獲取玩家列表
     * @param {string} roomId - 房間 ID
     * @returns {Promise<Array>} 玩家列表
     */
    getPlayers: async (roomId) => {},
    
    /**
     * 獲取投票狀態
     * @param {string} roomId - 房間 ID
     * @returns {Promise<Object>} 投票狀態
     */
    getVotes: async (roomId) => {},
    
    // === 統計資料管理 ===
    /**
     * 保存統計資料
     * @param {string} roomId - 房間 ID
     * @param {Object} statisticsData - 統計資料
     * @returns {Promise<boolean>} 是否保存成功
     */
    saveStatistics: async (roomId, statisticsData) => {}
};

/**
 * 輸入驗證與安全工具
 */
class SecurityUtils {
    /**
     * 驗證房間 ID 格式
     * 【低安全性設計：RTDB 兼容房間 ID 驗證】
     * 僅排除 Firebase RTDB 禁用字元，支援 push() 生成的 ID
     * @param {string} roomId - 房間 ID
     * @returns {boolean} 是否有效
     */
    static validateRoomId(roomId) {
        if (typeof roomId !== 'string') return false;
        const trimmed = roomId.trim();
        if (!trimmed) return false; // 空值處理
        
        // 僅排除 RTDB 禁字元：. # $ / [ ] 與空白字元
        // 支援 Firebase push() 生成的 ID（以 - 開頭，長度可達 20+ 字符）
        return /^[^\.\#\$\/\[\]\s]{1,64}$/.test(trimmed);
    }
    
    /**
     * 清理使用者輸入，防範 XSS
     * @param {string} input - 使用者輸入
     * @returns {string} 清理後的字串
     */
    static sanitizeUserInput(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/[<>"'&]/g, (match) => {
                const entities = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
                return entities[match] || match;
            })
            .replace(/javascript:/gi, '')
            .trim()
            .slice(0, 100); // 限制長度
    }
    
    /**
     * 驗證玩家資料
     * @param {Object} player - 玩家資料
     * @returns {{valid: boolean, error?: string, sanitized?: Object}}
     */
    static validatePlayer(player) {
        if (!player || typeof player !== 'object') {
            return { valid: false, error: '玩家資料格式錯誤' };
        }
        
        const { name, role } = player;
        
        // 驗證名稱
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return { valid: false, error: '玩家名稱不能為空' };
        }
        
        if (name.length > 20) {
            return { valid: false, error: '玩家名稱過長（最多20字符）' };
        }
        
        // 驗證角色
        const validRoles = ['dev', 'qa', 'scrum_master', 'po', 'other'];
        if (!validRoles.includes(role)) {
            return { valid: false, error: '無效的玩家角色' };
        }
        
        // 清理並回傳
        const sanitized = {
            ...player,
            name: this.sanitizeUserInput(name),
            role,
            id: player.id || this.generatePlayerId()
        };
        
        return { valid: true, sanitized };
    }
    
    /**
     * 產生安全的玩家 ID
     * @returns {string} 玩家 ID
     */
    static generatePlayerId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

/**
 * 房間資料提供者工廠類別
 * 負責根據不同模式創建對應的資料層服務
 */
class RoomProviderFactory {
    // 靜態屬性：存儲當前的房間提供者實例
    static currentProvider = null;
    /**
     * 設置房間提供者實例（由主應用註冊）
     * @param {Object} providerInstance - 房間提供者實例
     */
    static setRoomProvider(providerInstance) {
        console.log('🏭 [RoomProviderFactory] 註冊房間提供者:', providerInstance?.type || 'unknown');
        RoomProviderFactory.currentProvider = providerInstance;
    }
    
    /**
     * 取得當前房間提供者實例
     * @returns {Object|null} 房間提供者實例
     */
    static getRoomProvider() {
        if (!RoomProviderFactory.currentProvider) {
            console.warn('⚠️ [RoomProviderFactory] 尚未註冊房間提供者，請先呼叫 setRoomProvider()');
            return null;
        }
        return RoomProviderFactory.currentProvider;
    }
    
    /**
     * 創建房間資料提供者 - 已廢棄，請使用 setRoomProvider/getRoomProvider
     * @deprecated 請改用依賴注入模式
     */
    static async createProvider(mode, config = {}) {
        console.warn('⚠️ [RoomProviderFactory] createProvider() 已廢棄，請使用 setRoomProvider/getRoomProvider 模式');
        
        try {
            switch (mode) {
                case 'firebase':
                    return await RoomProviderFactory.createFirebaseProvider(config);
                    
                case 'local':
                    return await RoomProviderFactory.createLocalProvider(config);
                    
                default:
                    throw new Error(`不支援的房間資料提供者模式: ${mode}`);
            }
        } catch (error) {
            console.error(`❌ 建立房間資料提供者失敗 (${mode}):`, error);
            throw error;
        }
    }
    
    /**
     * 創建 Firebase 資料提供者 - 已廢棄，請使用 Singleton 模式
     * @param {Object} config - Firebase 配置
     * @returns {Promise<Object>} Firebase 提供者實例
     * @deprecated 請透過主應用的 FirebaseConfigManager 取得 Singleton 實例並使用 setRoomProvider 註冊
     */
    static async createFirebaseProvider(config) {
        console.warn('⚠️ [RoomProviderFactory] createFirebaseProvider 已廢棄，應使用 Singleton 模式');
        
        // 🔄 優先使用 FirebaseConfigManager 的 Singleton 實例
        if (window.firebaseConfigManager && window.firebaseConfigManager.isReady()) {
            console.log('🔄 [RoomProviderFactory] 使用 FirebaseConfigManager Singleton 實例');
            
            const firebaseService = window.firebaseConfigManager.getFirebaseService();
            if (!firebaseService) {
                throw new Error('無法從 FirebaseConfigManager 取得 Singleton FirebaseService');
            }
            
            console.log('✅ [RoomProviderFactory] FirebaseRoomProvider 使用 Singleton 架構建立');
            return new FirebaseRoomProvider(firebaseService);
        }
        
        // 【已廢棄】備援模式
        console.error('❌ [RoomProviderFactory] FirebaseConfigManager 不可用且備援模式已廢棄');
        console.error('❌ [RoomProviderFactory] 請確保 FirebaseConfigManager 正確初始化');
        throw new Error('Firebase 提供者建立失敗：需要使用 Singleton 模式');
    }
    
    /**
     * 創建本機資料提供者
     * @param {Object} config - 本機配置
     * @returns {Promise<Object>} 本機提供者實例
     */
    static async createLocalProvider(config) {
        if (!window.LocalRoomService) {
            throw new Error('LocalRoomService 未載入或不可用');
        }
        
        const localService = new LocalRoomService();
        return new LocalRoomProvider(localService);
    }
    
    /**
     * 檢測應用模式
     * @returns {string} 檢測到的模式 ('firebase' | 'local')
     */
    static detectMode() {
        const htmlElement = document.documentElement;
        const htmlMode = htmlElement.getAttribute('data-mode');
        if (htmlMode === 'local' || htmlMode === 'firebase') {
            return htmlMode;
        }
        
        if (window.APP_MODE === 'local' || window.APP_MODE === 'firebase') {
            return window.APP_MODE;
        }
        
        if (window.IS_PLAYGROUND === true) {
            return 'local';
        }
        
        const pathname = window.location.pathname;
        if (pathname.includes('playground.html')) {
            return 'local';
        }
        
        const hasFirebase = !!(window.firebase || window.FirebaseService);
        if (!hasFirebase) {
            return 'local';
        }
        
        return 'firebase';
    }
    
    /**
     * 驗證提供者是否符合介面規範
     * @param {Object} provider - 要驗證的提供者
     * @returns {boolean} 是否符合規範
     */
    static validateProvider(provider) {
        const requiredMethods = [
            'initialize', 'destroy', 'joinRoom', 'leaveRoom',
            'submitVote', 'revealVotes', 'clearVotes',
            'on', 'off', 'getRoomState', 'getPlayers', 'getVotes',
            'saveStatistics'
        ];
        
        for (const method of requiredMethods) {
            if (typeof provider[method] !== 'function') {
                console.error(`❌ 提供者缺少必要方法: ${method}`);
                return false;
            }
        }
        
        console.log('✅ 提供者介面驗證通過');
        return true;
    }
}

/**
 * Firebase 房間資料提供者包裝器
 * 將 FirebaseService 包裝成標準介面
 */
class FirebaseRoomProvider {
    constructor(firebaseService) {
        this.service = firebaseService;
        this.type = 'firebase';
        
        console.log('📦 Firebase 房間提供者包裝器已建立');
    }
    
    async initialize(roomId) {
        // FirebaseService 在建立時已初始化，這裡主要是設置房間
        return true;
    }
    
    destroy() {
        if (this.service && typeof this.service.destroy === 'function') {
            this.service.destroy();
        }
    }
    
    async joinRoom(roomId, player) {
        // 安全驗證
        if (!SecurityUtils.validateRoomId(roomId)) {
            throw new Error(`房間 ID "${roomId}" 格式無效。不能包含字符：. # $ / [ ] 或空白`);
        }
        
        const validation = SecurityUtils.validatePlayer(player);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        try {
            const result = await this.service.joinRoom(roomId, validation.sanitized);
            return { success: !!result, data: result };
        } catch (error) {
            console.error('Firebase: 加入房間失敗:', error);
            return { success: false, error: error.message };
        }
    }
    
    async leaveRoom(roomId, playerId, immediate = false) {
        if (!SecurityUtils.validateRoomId(roomId)) {
            throw new Error('無效的房間 ID 格式');
        }
        
        try {
            let result;
            if (typeof this.service.leaveRoom === 'function') {
                result = await this.service.leaveRoom(roomId, playerId, immediate);
            } else {
                result = false;
            }
            return { success: !!result };
        } catch (error) {
            console.error('Firebase: 離開房間失敗:', error);
            return { success: false, error: error.message };
        }
    }
    
    async submitVote(playerId, vote) {
        // Firebase 需要房間 ID，從目前房間狀態獲取
        const roomId = this.service.currentRoomId || window.scrumPokerApp?.roomId;
        if (!roomId) {
            throw new Error('無法確定當前房間 ID');
        }
        return await this.service.submitVote(roomId, playerId, vote);
    }
    
    async reveal() {
        // Firebase Adapter 便利方法：不需要傳入 roomId
        const roomId = this.service.getCurrentRoomId();
        if (!roomId) {
            throw new Error('無法確定當前房間 ID');
        }
        console.log(`🃏 Firebase Adapter: 開牌房間 ${roomId}`);
        return await this.service.revealVotes(roomId);
    }
    
    async revealVotes(roomId) {
        return await this.service.revealVotes(roomId);
    }
    
    async reset() {
        // Firebase Adapter 便利方法：不需要傳入 roomId
        const roomId = this.service.getCurrentRoomId();
        if (!roomId) {
            throw new Error('無法確定當前房間 ID');
        }
        console.log(`🔄 Firebase Adapter: 重置房間 ${roomId}`);
        return await this.service.clearVotes(roomId);
    }
    
    async clearVotes(roomId) {
        return await this.service.clearVotes(roomId);
    }
    
    on(eventName, callback) {
        this.service.on(eventName, callback);
    }
    
    off(eventName, callback) {
        this.service.off(eventName, callback);
    }
    
    async getRoomState(roomId) {
        // Firebase 的房間狀態透過事件更新，這裡回傳快取狀態
        return this.service.currentRoomState || null;
    }
    
    async getPlayers(roomId) {
        // Firebase 的玩家列表透過事件更新，這裡回傳快取狀態
        return this.service.currentPlayers || [];
    }
    
    async getVotes(roomId) {
        // Firebase 的投票狀態透過事件更新，這裡回傳快取狀態
        return this.service.currentVotes || {};
    }
    
    async saveStatistics(roomId, statisticsData) {
        // 安全驗證
        if (!SecurityUtils.validateRoomId(roomId)) {
            throw new Error(`房間 ID "${roomId}" 格式無效。不能包含字符：. # $ / [ ] 或空白`);
        }
        
        return await this.service.saveStatistics(roomId, statisticsData);
    }
}

/**
 * 本機房間資料提供者包裝器
 * 將 LocalRoomService 包裝成標準介面
 */
class LocalRoomProvider {
    constructor(localService) {
        this.service = localService;
        this.type = 'local';
        
        console.log('📦 本機房間提供者包裝器已建立');
    }
    
    async initialize(roomId) {
        return await this.service.initialize(roomId);
    }
    
    destroy() {
        if (this.service && typeof this.service.destroy === 'function') {
            this.service.destroy();
        }
    }
    
    async joinRoom(roomId, player) {
        // 安全驗證
        if (!SecurityUtils.validateRoomId(roomId)) {
            throw new Error(`房間 ID "${roomId}" 格式無效。不能包含字符：. # $ / [ ] 或空白`);
        }
        
        const validation = SecurityUtils.validatePlayer(player);
        if (!validation.valid) {
            throw new Error(validation.error);
        }
        
        try {
            const result = await this.service.joinRoom(roomId, validation.sanitized);
            return { success: !!result, data: result };
        } catch (error) {
            console.error('本機: 加入房間失敗:', error);
            return { success: false, error: error.message };
        }
    }
    
    async leaveRoom(roomId, playerId, immediate = false) {
        if (!SecurityUtils.validateRoomId(roomId)) {
            throw new Error('無效的房間 ID 格式');
        }
        
        try {
            let result;
            if (typeof this.service.leaveRoom === 'function') {
                result = await this.service.leaveRoom(roomId, playerId);
            } else {
                result = true; // 本機模式預設成功
            }
            return { success: !!result };
        } catch (error) {
            console.error('本機: 離開房間失敗:', error);
            return { success: false, error: error.message };
        }
    }
    
    async submitVote(playerId, vote) {
        return await this.service.submitVote(playerId, vote);
    }
    
    async revealVotes(roomId) {
        // LocalRoomService 可能沒有這個方法，用事件模擬
        if (typeof this.service.revealVotes === 'function') {
            return await this.service.revealVotes(roomId);
        } else {
            // 透過事件系統觸發開牌
            if (window.eventBus) {
                window.eventBus.emit('game:phase-changed', { 
                    newPhase: 'revealing',
                    roomId 
                });
            }
            return true;
        }
    }
    
    async clearVotes(roomId) {
        // LocalRoomService 可能沒有這個方法，用事件模擬
        if (typeof this.service.clearVotes === 'function') {
            return await this.service.clearVotes(roomId);
        } else {
            // 透過事件系統觸發清除
            if (window.eventBus) {
                window.eventBus.emit('game:phase-changed', { 
                    newPhase: 'voting',
                    roomId 
                });
            }
            return true;
        }
    }
    
    on(eventName, callback) {
        this.service.on(eventName, callback);
    }
    
    off(eventName, callback) {
        this.service.off(eventName, callback);
    }
    
    async getRoomState(roomId) {
        if (typeof this.service.getRoomState === 'function') {
            return await this.service.getRoomState(roomId);
        }
        return this.service.roomState || null;
    }
    
    async getPlayers(roomId) {
        if (typeof this.service.getPlayers === 'function') {
            return await this.service.getPlayers(roomId);
        }
        return this.service.players || [];
    }
    
    async getVotes(roomId) {
        if (typeof this.service.getVotes === 'function') {
            return await this.service.getVotes(roomId);
        }
        return this.service.votes || {};
    }
    
    async saveStatistics(roomId, statisticsData) {
        // 本機模式不需要實際保存統計資料，但提供介面一致性
        console.log('📊 本機模式：統計資料已記錄但不持久化', statisticsData);
        
        // 通過事件通知統計資料已"保存"
        if (window.eventBus) {
            window.eventBus.emit('statistics:saved', {
                roomId,
                statistics: statisticsData
            });
        }
        
        return true;
    }
}

// 匯出到全域
window.RoomProviderFactory = RoomProviderFactory;
window.IRoomProvider = IRoomProvider;
window.FirebaseRoomProvider = FirebaseRoomProvider;
window.LocalRoomProvider = LocalRoomProvider;
window.SecurityUtils = SecurityUtils;

console.log('🏭 房間資料提供者工廠已載入 - v3.0.0-dual-mode-secure');