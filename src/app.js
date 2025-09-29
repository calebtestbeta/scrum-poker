/**
 * Scrum Poker 主應用程式 - v3.0.0 Vanilla JavaScript 版本
 * 整合所有組件和服務的主控制器
 * @version 3.0.0-enhanced
 */

/**
 * 主應用程式類別
 */
class ScrumPokerApp {
    constructor() {
        this.version = 'v3.0.0-enhanced';
        this.buildTime = new Date().toISOString().slice(0,10).replace(/-/g,'') + '_' + new Date().toTimeString().slice(0,5).replace(':','');
        
        // 應用狀態
        this.isInitialized = false;
        this.currentState = 'loading'; // loading, login, game
        
        // 核心組件
        this.gameTable = null;
        this.currentPlayer = null;
        this.roomId = null;
        
        // 服務實例
        this.firebaseService = null;
        this.storageService = null;
        this.touchManager = null;
        
        // DOM 元素引用
        this.elements = {
            loadingScreen: null,
            loginScreen: null,
            gameContainer: null,
            toastContainer: null
        };
        
        // 初始化
        this.initialize();
    }
    
    /**
     * 初始化應用程式
     */
    async initialize() {
        console.log(`🚀 Scrum Poker ${this.version} 正在初始化...`);
        
        try {
            // 等待 DOM 載入完成
            if (document.readyState !== 'complete') {
                await this.waitForDOMReady();
            }
            
            // 初始化 DOM 元素引用
            this.initializeDOMReferences();
            
            // 初始化服務
            await this.initializeServices();
            
            // 設置事件監聽器
            this.setupEventListeners();
            
            // 設置全域錯誤處理
            this.setupErrorHandling();
            
            // 檢查保存的使用者資訊
            this.checkSavedUserInfo();
            
            // 隱藏載入畫面
            this.hideLoadingScreen();
            
            // 標記為已初始化
            this.isInitialized = true;
            
            console.log(`✅ Scrum Poker ${this.version} 初始化完成`);
            
        } catch (error) {
            console.error('❌ 應用程式初始化失敗:', error);
            this.showError('應用程式初始化失敗，請重新整理頁面');
        }
    }
    
    /**
     * 等待 DOM 載入完成
     */
    waitForDOMReady() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }
    
    /**
     * 初始化 DOM 元素引用
     */
    initializeDOMReferences() {
        this.elements.loadingScreen = document.getElementById('loadingScreen');
        this.elements.loginScreen = document.getElementById('loginScreen');
        this.elements.gameContainer = document.getElementById('gameContainer');
        this.elements.toastContainer = document.getElementById('toastContainer');
        
        if (!this.elements.loginScreen || !this.elements.gameContainer) {
            throw new Error('缺少必要的 DOM 元素');
        }
    }
    
    /**
     * 初始化服務
     */
    async initializeServices() {
        console.log('🛠️ 正在初始化服務...');
        
        try {
            // 初始化 StorageService
            if (window.StorageService) {
                this.storageService = new StorageService();
                console.log('✅ StorageService 已初始化');
            }
            
            // 初始化 TouchManager
            if (window.TouchManager) {
                this.touchManager = new TouchManager({
                    debug: false,
                    enableHapticFeedback: true,
                    enablePrevention: true
                });
                
                // 設置觸控手勢監聽器
                this.setupTouchGestures();
                console.log('✅ TouchManager 已初始化');
            }
            
            // 初始化 FirebaseService（如果有設定）
            const firebaseConfig = await this.getFirebaseConfig();
            if (firebaseConfig && window.FirebaseService) {
                try {
                    this.firebaseService = new FirebaseService();
                    
                    // 監聽連線狀態變化
                    this.firebaseService.on('firebase:connected', () => {
                        this.updateConnectionStatus(true);
                        this.showToast('success', 'Firebase 連線成功');
                    });
                    
                    this.firebaseService.on('firebase:disconnected', () => {
                        this.updateConnectionStatus(false);
                        this.showToast('warning', 'Firebase 連線中斷');
                    });
                    
                    this.firebaseService.on('firebase:error', (data) => {
                        console.error('Firebase 錯誤:', data.error);
                        this.showError('Firebase 連線異常，請檢查網路狀態');
                    });
                    
                    // 監聽房間事件
                    this.setupFirebaseEventListeners();
                    
                    // 手動初始化 Firebase
                    const initialized = await this.firebaseService.initialize(firebaseConfig);
                    if (initialized) {
                        console.log('✅ FirebaseService 已初始化');
                    } else {
                        throw new Error('Firebase 初始化失敗');
                    }
                } catch (error) {
                    console.error('❌ FirebaseService 初始化失敗:', error);
                    this.firebaseService = null;
                    this.showError('Firebase 初始化失敗，將使用本地模式');
                }
            } else {
                console.log('ℹ️ 使用本地模式（未設定 Firebase）');
            }
            
        } catch (error) {
            console.error('❌ 服務初始化失敗:', error);
            throw error;
        }
    }
    
    /**
     * 取得 Firebase 設定
     */
    async getFirebaseConfig() {
        try {
            if (this.storageService) {
                const config = await this.storageService.getItem('firebaseConfig');
                if (config && config.projectId && config.apiKey) {
                    return {
                        projectId: config.projectId,
                        apiKey: config.apiKey,
                        authDomain: `${config.projectId}.firebaseapp.com`,
                        databaseURL: `https://${config.projectId}-default-rtdb.firebaseio.com`,
                        storageBucket: `${config.projectId}.appspot.com`
                    };
                }
            }
            
            // 降級到舊的 Utils.Storage
            const legacyConfig = Utils.Storage.getItem('scrumPoker_firebaseConfig');
            if (legacyConfig && legacyConfig.projectId && legacyConfig.apiKey) {
                return {
                    projectId: legacyConfig.projectId,
                    apiKey: legacyConfig.apiKey,
                    authDomain: `${legacyConfig.projectId}.firebaseapp.com`,
                    databaseURL: `https://${legacyConfig.projectId}-default-rtdb.firebaseio.com`,
                    storageBucket: `${legacyConfig.projectId}.appspot.com`
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ 取得 Firebase 設定失敗:', error);
            return null;
        }
    }
    
    /**
     * 設置觸控手勢監聽器
     */
    setupTouchGestures() {
        if (!this.touchManager) return;
        
        // 卡牌點擊手勢
        this.touchManager.on('tap', (gestureData) => {
            const target = gestureData.target;
            
            // 檢查是否點擊卡牌
            if (target.closest('.card')) {
                const card = target.closest('.card');
                const value = card.dataset.value;
                
                if (value && window.eventBus) {
                    window.eventBus.emit('deck:card-selected', {
                        value: parseInt(value),
                        card: card
                    });
                }
            }
            
            // 檢查是否點擊控制按鈕
            if (target.closest('.game-controls button')) {
                const button = target.closest('button');
                button.click();
            }
        });
        
        // 長按手勢 - 顯示卡牌資訊
        this.touchManager.on('longpress', (gestureData) => {
            const target = gestureData.target;
            
            if (target.closest('.card')) {
                const card = target.closest('.card');
                const value = card.dataset.value;
                
                if (value) {
                    this.showToast('info', `卡牌值: ${value}`, 2000);
                }
            }
        });
        
        // 滑動手勢 - 快速導航
        this.touchManager.on('swipe', (gestureData) => {
            if (this.currentState !== 'game') return;
            
            const { direction } = gestureData;
            
            switch (direction) {
                case 'left':
                    // 向左滑動 - 下一輪
                    if (this.gameTable) {
                        this.gameTable.clearVotes();
                    }
                    break;
                    
                case 'right':
                    // 向右滑動 - 開牌
                    if (this.gameTable) {
                        this.gameTable.revealVotes();
                    }
                    break;
                    
                case 'up':
                    // 向上滑動 - 顯示統計
                    this.showToast('info', '統計面板已展開', 2000);
                    break;
                    
                case 'down':
                    // 向下滑動 - 隱藏統計
                    this.showToast('info', '統計面板已收起', 2000);
                    break;
            }
        });
        
        console.log('👆 觸控手勢監聽器已設置');
    }
    
    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        // 登入表單
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // 角色選擇變更（顯示/隱藏任務類型）
        const playerRole = document.getElementById('playerRole');
        if (playerRole) {
            playerRole.addEventListener('change', () => {
                this.handleRoleChange();
            });
        }
        
        // Firebase 設定按鈕
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveFirebaseConfig();
            });
        }
        
        const localModeBtn = document.getElementById('localModeBtn');
        if (localModeBtn) {
            localModeBtn.addEventListener('click', () => {
                this.enableLocalMode();
            });
        }
        
        // 複製房間 ID 按鈕
        const copyRoomBtn = document.getElementById('copyRoomBtn');
        if (copyRoomBtn) {
            copyRoomBtn.addEventListener('click', () => {
                this.copyRoomId();
            });
        }
        
        // 全域事件監聽器
        if (window.eventBus) {
            this.setupGameEventListeners();
        }
        
        // 鍵盤快捷鍵
        this.setupKeyboardShortcuts();
    }
    
    /**
     * 設置 Firebase 事件監聽器
     */
    setupFirebaseEventListeners() {
        if (!this.firebaseService) return;
        
        // 玩家加入/離開事件
        this.firebaseService.on('room:player-joined', (data) => {
            this.showToast('info', `${data.player.name} 加入了遊戲`);
        });
        
        this.firebaseService.on('room:players-updated', (data) => {
            if (this.gameTable) {
                this.gameTable.updatePlayers(data.players);
            }
        });
        
        this.firebaseService.on('room:votes-updated', (data) => {
            if (this.gameTable) {
                this.gameTable.updateVotes(data.votes);
            }
        });
        
        this.firebaseService.on('room:phase-changed', (data) => {
            if (this.gameTable) {
                this.gameTable.updatePhase(data.phase);
            }
        });
        
        this.firebaseService.on('players:voting-progress', (progress) => {
            this.updateVotingProgress(progress);
        });
        
        console.log('📡 Firebase 事件監聽器已設置');
    }
    
    /**
     * 設置遊戲事件監聽器
     */
    setupGameEventListeners() {
        // 遊戲狀態變更
        window.eventBus.on('game:vote-submitted', (data) => {
            this.handleVoteSubmitted(data);
        });
        
        window.eventBus.on('game:votes-revealed', (data) => {
            this.handleVotesRevealed(data);
        });
        
        window.eventBus.on('game:votes-cleared', () => {
            this.handleVotesCleared();
        });
        
        window.eventBus.on('game:leave-room', () => {
            this.handleLeaveRoom();
        });
        
        // 玩家事件
        window.eventBus.on('players:player-added', (data) => {
            this.showToast('success', `${data.player.name} 加入房間`);
        });
        
        window.eventBus.on('players:player-removed', (data) => {
            this.showToast('info', '玩家離開房間');
        });
        
        // 投票進度
        window.eventBus.on('players:voting-progress', (progress) => {
            this.updateVotingProgress(progress);
        });
    }
    
    /**
     * 設置鍵盤快捷鍵
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // 只在遊戲狀態下啟用快捷鍵
            if (this.currentState !== 'game') return;
            
            // Ctrl/Cmd + R: 重新開始
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                if (this.gameTable) {
                    this.gameTable.clearVotes();
                }
            }
            
            // 空白鍵: 開牌
            if (event.code === 'Space' && !event.target.matches('input, textarea')) {
                event.preventDefault();
                if (this.gameTable) {
                    this.gameTable.revealVotes();
                }
            }
            
            // 數字鍵: 快速投票
            if (event.key >= '0' && event.key <= '9' && !event.target.matches('input, textarea')) {
                const value = parseInt(event.key);
                const fibValues = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
                if (fibValues.includes(value)) {
                    this.quickVote(value);
                }
            }
        });
    }
    
    /**
     * 設置全域錯誤處理
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('🚨 全域錯誤:', event.error);
            this.showError('發生未預期的錯誤');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚨 未處理的 Promise 錯誤:', event.reason);
            this.showError('發生系統錯誤');
        });
    }
    
    /**
     * 檢查保存的使用者資訊
     */
    checkSavedUserInfo() {
        const savedInfo = Utils.Storage.getItem('scrumPoker_userInfo');
        if (savedInfo) {
            const playerName = document.getElementById('playerName');
            const playerRole = document.getElementById('playerRole');
            const rememberMe = document.getElementById('rememberMe');
            
            if (playerName) playerName.value = savedInfo.name || '';
            if (playerRole) playerRole.value = savedInfo.role || 'dev';
            if (rememberMe) rememberMe.checked = true;
            
            this.handleRoleChange(); // 觸發角色變更邏輯
        }
        
        // 檢查保存的 Firebase 設定
        const savedConfig = Utils.Storage.getItem('scrumPoker_firebaseConfig');
        if (savedConfig) {
            this.hideFirebaseConfig();
        } else {
            this.showFirebaseConfig();
        }
    }
    
    /**
     * 隱藏載入畫面
     */
    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            Utils.Animation.fadeOut(this.elements.loadingScreen, 500).then(() => {
                this.elements.loadingScreen.style.display = 'none';
                this.currentState = 'login';
            });
        } else {
            this.currentState = 'login';
        }
    }
    
    /**
     * 處理角色變更
     */
    handleRoleChange() {
        const playerRole = document.getElementById('playerRole');
        const taskTypeGroup = document.getElementById('taskTypeGroup');
        
        if (playerRole && taskTypeGroup) {
            const role = playerRole.value;
            if (role === 'scrum_master' || role === 'po') {
                taskTypeGroup.classList.remove('hidden');
            } else {
                taskTypeGroup.classList.add('hidden');
            }
        }
    }
    
    /**
     * 處理登入
     */
    async handleLogin() {
        const playerName = document.getElementById('playerName')?.value?.trim();
        const playerRole = document.getElementById('playerRole')?.value;
        const roomId = document.getElementById('roomId')?.value?.trim();
        const taskType = document.getElementById('taskType')?.value;
        const rememberMe = document.getElementById('rememberMe')?.checked;
        
        // 驗證輸入
        if (!playerName) {
            this.showError('請輸入您的名字');
            return;
        }
        
        // 進階輸入驗證和清理
        try {
            // 檢查名字長度和格式
            if (playerName.length < 1 || playerName.length > 20) {
                throw new Error('名字長度必須在 1-20 個字符之間');
            }
            
            // 移除潛在的惡意字符
            const sanitizedName = playerName
                .replace(/[<>\"'&]/g, '') // 移除 HTML 字符
                .replace(/javascript:/gi, '') // 移除 JavaScript 協議
                .replace(/data:/gi, '') // 移除 data 協議
                .trim();
            
            // 檢查清理後是否為空
            if (!sanitizedName) {
                throw new Error('名字包含不允許的字符');
            }
            
            // 檢查是否只包含允許的字符（字母、數字、中文、空格、連字符、底線）
            if (!/^[a-zA-Z0-9\u4e00-\u9fff\s_-]+$/.test(sanitizedName)) {
                throw new Error('名字包含不允許的字符');
            }
            
            // 更新為清理後的名字
            document.getElementById('playerName').value = sanitizedName;
            
        } catch (error) {
            this.showError(error.message);
            return;
        }
        
        // 驗證房間 ID（如果提供）
        if (roomId) {
            try {
                // 房間 ID 長度檢查
                if (roomId.length > 20) {
                    throw new Error('房間 ID 長度不能超過 20 個字符');
                }
                
                // 清理房間 ID
                const sanitizedRoomId = roomId
                    .replace(/[<>\"'&]/g, '') // 移除 HTML 字符
                    .replace(/javascript:/gi, '') // 移除 JavaScript 協議
                    .replace(/data:/gi, '') // 移除 data 協議
                    .trim();
                
                // 檢查房間 ID 格式（只允許字母、數字、連字符、底線）
                if (!/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
                    throw new Error('房間 ID 只能包含字母、數字、連字符和底線');
                }
                
                // 更新為清理後的房間 ID
                document.getElementById('roomId').value = sanitizedRoomId;
                
            } catch (error) {
                this.showError(error.message);
                return;
            }
        }
        
        // 驗證角色
        const allowedRoles = ['dev', 'qa', 'scrum_master', 'po', 'other'];
        if (!allowedRoles.includes(playerRole)) {
            this.showError('無效的玩家角色');
            return;
        }
        
        try {
            // 儲存使用者資訊
            if (rememberMe) {
                if (this.storageService) {
                    await this.storageService.setItem('userInfo', {
                        name: playerName,
                        role: playerRole,
                        timestamp: Date.now()
                    });
                } else {
                    Utils.Storage.setItem('scrumPoker_userInfo', {
                        name: playerName,
                        role: playerRole,
                        timestamp: Date.now()
                    });
                }
            }
            
            // 生成或驗證房間 ID
            const finalRoomId = roomId || Utils.Game.generateRoomId();
            
            // 創建玩家物件
            this.currentPlayer = {
                id: Utils.Data.generateId('player'),
                name: playerName,
                role: playerRole,
                taskType: taskType
            };
            
            // 開始遊戲
            await this.startGame(finalRoomId);
            
        } catch (error) {
            console.error('登入失敗:', error);
            this.showError('登入失敗，請重試');
        }
    }
    
    /**
     * 開始遊戲
     * @param {string} roomId - 房間 ID
     */
    async startGame(roomId) {
        try {
            // 隱藏登入畫面
            if (Utils.Animation) {
                await Utils.Animation.fadeOut(this.elements.loginScreen, 300);
            }
            this.elements.loginScreen.classList.add('hidden');
            
            // 顯示遊戲容器
            this.elements.gameContainer.classList.remove('hidden');
            if (Utils.Animation) {
                await Utils.Animation.fadeIn(this.elements.gameContainer, 300);
            }
            
            // 設置房間 ID
            this.roomId = roomId;
            this.updateRoomIdDisplay(roomId);
            
            // 如果有 Firebase 服務，加入房間
            if (this.firebaseService) {
                await this.firebaseService.joinRoom(roomId, this.currentPlayer);
            }
            
            // 初始化遊戲桌面
            const gameArea = document.getElementById('gameArea');
            if (gameArea && window.GameTable) {
                this.gameTable = new GameTable(gameArea);
                this.gameTable.setRoomId(roomId);
                this.gameTable.setCurrentPlayer(this.currentPlayer.id);
                
                // 添加當前玩家到遊戲桌面
                this.gameTable.addPlayer(
                    this.currentPlayer.id,
                    this.currentPlayer.name,
                    this.currentPlayer.role
                );
                
                // 開始遊戲
                this.gameTable.startGame();
            }
            
            // 更新狀態
            this.currentState = 'game';
            
            // 顯示成功訊息
            this.showToast('success', `歡迎來到房間 ${roomId}！`);
            
            // 設置連線狀態
            this.updateConnectionStatus(this.firebaseService ? true : false);
            
            console.log(`🎮 遊戲開始 - 房間: ${roomId}, 玩家: ${this.currentPlayer.name}`);
            
        } catch (error) {
            console.error('遊戲啟動失敗:', error);
            this.showError('遊戲啟動失敗');
        }
    }
    
    /**
     * 快速投票
     * @param {number} value - 投票值
     */
    quickVote(value) {
        if (this.currentState === 'game' && this.gameTable) {
            // 模擬卡牌點擊
            if (window.eventBus) {
                window.eventBus.emit('deck:card-selected', {
                    value: value,
                    card: null
                });
            }
        }
    }
    
    /**
     * 處理投票提交
     * @param {Object} data - 投票數據
     */
    handleVoteSubmitted(data) {
        if (Utils.Game && Utils.Game.formatPoints) {
            this.showToast('success', `投票已提交: ${Utils.Game.formatPoints(data.vote)}`);
        } else {
            this.showToast('success', `投票已提交: ${data.vote}`);
        }
        
        // 如果有 Firebase 服務，同步投票
        if (this.firebaseService && this.roomId && this.currentPlayer) {
            this.firebaseService.submitVote(this.roomId, this.currentPlayer.id, data.vote);
        }
    }
    
    /**
     * 處理投票揭曉
     * @param {Object} data - 投票結果數據
     */
    handleVotesRevealed(data) {
        const stats = data.statistics;
        this.showToast('info', 
            `投票結果 - 平均: ${stats.averagePoints}, 共識度: ${stats.consensus}%`);
        
        // 更新統計面板
        this.updateStatisticsPanel(stats);
        
        // 如果有 Firebase 服務，同步結果
        if (this.firebaseService && this.roomId) {
            this.firebaseService.revealVotes(this.roomId);
        }
    }
    
    /**
     * 處理投票清除
     */
    handleVotesCleared() {
        this.showToast('info', '投票已清除，開始新一輪');
        
        // 如果有 Firebase 服務，同步清除
        if (this.firebaseService && this.roomId) {
            this.firebaseService.clearVotes(this.roomId);
        }
    }
    
    /**
     * 處理離開房間
     */
    handleLeaveRoom() {
        this.leaveGame();
    }
    
    /**
     * 離開遊戲
     */
    async leaveGame() {
        try {
            // 如果有 Firebase 服務，離開房間
            if (this.firebaseService && this.roomId && this.currentPlayer) {
                await this.firebaseService.leaveRoom(this.roomId, this.currentPlayer.id);
            }
            
            // 銷毀遊戲桌面
            if (this.gameTable) {
                this.gameTable.destroy();
                this.gameTable = null;
            }
            
            // 隱藏遊戲容器
            if (Utils.Animation) {
                await Utils.Animation.fadeOut(this.elements.gameContainer, 300);
            }
            this.elements.gameContainer.classList.add('hidden');
            
            // 顯示登入畫面
            this.elements.loginScreen.classList.remove('hidden');
            if (Utils.Animation) {
                await Utils.Animation.fadeIn(this.elements.loginScreen, 300);
            }
            
            // 重置狀態
            this.currentState = 'login';
            this.currentPlayer = null;
            this.roomId = null;
            
            // 更新連線狀態
            this.updateConnectionStatus(false);
            
            console.log('🚪 已離開遊戲');
            
        } catch (error) {
            console.error('離開遊戲失敗:', error);
        }
    }
    
    /**
     * 更新房間 ID 顯示
     * @param {string} roomId - 房間 ID
     */
    updateRoomIdDisplay(roomId) {
        const roomIdElement = document.getElementById('currentRoomId');
        if (roomIdElement) {
            roomIdElement.textContent = roomId;
        }
    }
    
    /**
     * 複製房間 ID
     */
    async copyRoomId() {
        if (!this.roomId) return;
        
        try {
            await navigator.clipboard.writeText(this.roomId);
            this.showToast('success', '房間 ID 已複製到剪貼簿');
        } catch (error) {
            console.error('複製失敗:', error);
            
            // 降級方案
            const textArea = document.createElement('textarea');
            textArea.value = this.roomId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showToast('success', '房間 ID 已複製到剪貼簿');
        }
    }
    
    /**
     * 更新連線狀態
     * @param {boolean} connected - 是否連線
     */
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            const indicator = statusElement.querySelector('.status-indicator');
            const text = statusElement.querySelector('.status-text');
            
            if (connected) {
                statusElement.className = 'connection-status connected';
                if (text) text.textContent = '已連線';
                if (indicator) indicator.setAttribute('title', '連線正常');
            } else {
                statusElement.className = 'connection-status disconnected';
                if (text) text.textContent = '未連線';
                if (indicator) indicator.setAttribute('title', '未連線');
            }
        }
    }
    
    /**
     * 更新投票進度
     * @param {Object} progress - 進度數據
     */
    updateVotingProgress(progress) {
        // 這裡可以添加全域進度顯示邏輯
        console.log('📊 投票進度:', progress);
    }
    
    /**
     * 更新統計面板
     * @param {Object} statistics - 統計數據
     */
    updateStatisticsPanel(statistics) {
        const statsContent = document.getElementById('statsContent');
        if (!statsContent) return;
        
        const html = `
            <div class="stats-item">
                <div class="stats-label">總投票數</div>
                <div class="stats-value">${statistics.totalVotes}</div>
            </div>
            <div class="stats-item">
                <div class="stats-label">平均點數</div>
                <div class="stats-value">${statistics.averagePoints}</div>
            </div>
            <div class="stats-item">
                <div class="stats-label">共識度</div>
                <div class="stats-value">${statistics.consensus}%</div>
            </div>
            <div class="stats-item">
                <div class="stats-label">最小值</div>
                <div class="stats-value">${statistics.min}</div>
            </div>
            <div class="stats-item">
                <div class="stats-label">最大值</div>
                <div class="stats-value">${statistics.max}</div>
            </div>
        `;
        
        statsContent.innerHTML = html;
    }
    
    /**
     * 保存 Firebase 設定
     */
    async saveFirebaseConfig() {
        const projectId = document.getElementById('projectId')?.value?.trim();
        const apiKey = document.getElementById('apiKey')?.value?.trim();
        
        if (!projectId || !apiKey) {
            this.showError('請填入完整的 Firebase 設定');
            return;
        }
        
        // 驗證 Firebase 設定格式
        try {
            // 驗證 Project ID 格式
            if (!/^[a-z0-9-]+$/.test(projectId)) {
                throw new Error('Project ID 格式無效（只能包含小寫字母、數字和連字符）');
            }
            
            if (projectId.length < 3 || projectId.length > 30) {
                throw new Error('Project ID 長度必須在 3-30 字符之間');
            }
            
            // 驗證 API Key 格式（基本檢查）
            if (!/^AIza[a-zA-Z0-9_-]{35}$/.test(apiKey)) {
                throw new Error('API Key 格式無效');
            }
            
            // 檢查是否包含可疑內容
            const suspiciousPatterns = [
                /javascript:/i,
                /data:/i,
                /vbscript:/i,
                /<script/i,
                /eval\(/i,
                /function\(/i
            ];
            
            for (const pattern of suspiciousPatterns) {
                if (pattern.test(projectId) || pattern.test(apiKey)) {
                    throw new Error('設定包含不允許的內容');
                }
            }
            
        } catch (error) {
            this.showError(error.message);
            return;
        }
        
        const config = {
            projectId: projectId,
            apiKey: apiKey,
            timestamp: Date.now()
        };
        
        try {
            if (this.storageService) {
                await this.storageService.setItem('firebaseConfig', config);
            } else {
                Utils.Storage.setItem('scrumPoker_firebaseConfig', config);
            }
            
            this.hideFirebaseConfig();
            this.showToast('success', 'Firebase 設定已保存');
            
            // 重新初始化 Firebase 服務
            if (window.FirebaseService) {
                const firebaseConfig = await this.getFirebaseConfig();
                if (firebaseConfig) {
                    try {
                        // 清理舊的服務實例
                        if (this.firebaseService) {
                            this.firebaseService.destroy();
                        }
                        
                        // 創建新的服務實例
                        this.firebaseService = new FirebaseService();
                        
                        // 重新設置事件監聽器
                        this.setupFirebaseEventListeners();
                        
                        // 初始化服務
                        const initialized = await this.firebaseService.initialize(firebaseConfig);
                        if (initialized) {
                            console.log('🔄 FirebaseService 已重新初始化');
                            this.showToast('success', 'Firebase 重新連線成功');
                        }
                    } catch (error) {
                        console.error('❌ Firebase 重新初始化失敗:', error);
                        this.showError('Firebase 重新連線失敗');
                    }
                }
            }
        } catch (error) {
            console.error('保存 Firebase 設定失敗:', error);
            this.showError('保存設定失敗');
        }
    }
    
    /**
     * 啟用本地模式
     */
    async enableLocalMode() {
        try {
            if (this.storageService) {
                await this.storageService.setItem('localMode', true);
            } else {
                Utils.Storage.setItem('scrumPoker_localMode', true);
            }
            
            this.hideFirebaseConfig();
            this.showToast('info', '已啟用本地模式（僅限單人遊戲）');
        } catch (error) {
            console.error('啟用本地模式失敗:', error);
        }
    }
    
    /**
     * 顯示 Firebase 設定
     */
    showFirebaseConfig() {
        const configElement = document.getElementById('firebaseConfig');
        if (configElement) {
            configElement.style.display = 'block';
        }
    }
    
    /**
     * 隱藏 Firebase 設定
     */
    hideFirebaseConfig() {
        const configElement = document.getElementById('firebaseConfig');
        if (configElement) {
            configElement.style.display = 'none';
        }
    }
    
    /**
     * 顯示 Toast 通知
     * @param {string} type - 通知類型 (success, error, warning, info)
     * @param {string} message - 通知訊息
     * @param {number} duration - 顯示時間（毫秒）
     */
    showToast(type, message, duration = 3000) {
        if (!this.elements.toastContainer) return;
        
        const toast = Utils.DOM?.createElement ? Utils.DOM.createElement('div', {
            className: `toast toast-${type}`,
            innerHTML: `
                <div class="toast-content">
                    <span class="toast-message">${message}</span>
                    <button class="toast-close" aria-label="關閉通知">×</button>
                </div>
            `
        }) : document.createElement('div');
        
        if (!Utils.DOM?.createElement) {
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-content">
                    <span class="toast-message">${message}</span>
                    <button class="toast-close" aria-label="關閉通知">×</button>
                </div>
            `;
        }
        
        // 關閉按鈕事件
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideToast(toast);
            });
        }
        
        // 添加到容器
        this.elements.toastContainer.appendChild(toast);
        
        // 顯示動畫
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 自動隱藏
        setTimeout(() => {
            this.hideToast(toast);
        }, duration);
    }
    
    /**
     * 隱藏 Toast 通知
     * @param {Element} toast - Toast 元素
     */
    hideToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
    
    /**
     * 顯示錯誤訊息
     * @param {string} message - 錯誤訊息
     */
    showError(message) {
        this.showToast('error', message, 5000);
    }
    
    /**
     * 獲取應用狀態
     * @returns {Object} 應用狀態
     */
    getAppState() {
        return {
            version: this.version,
            buildTime: this.buildTime,
            isInitialized: this.isInitialized,
            currentState: this.currentState,
            roomId: this.roomId,
            currentPlayer: this.currentPlayer,
            gameStatistics: this.gameTable ? this.gameTable.getStatistics() : null,
            services: {
                firebase: !!this.firebaseService,
                storage: !!this.storageService,
                touch: !!this.touchManager
            }
        };
    }
}

// 全域應用實例
let scrumPokerApp = null;

// 當 DOM 載入完成時啟動應用
document.addEventListener('DOMContentLoaded', () => {
    scrumPokerApp = new ScrumPokerApp();
    
    // 掛載到全域以便調試
    window.scrumPokerApp = scrumPokerApp;
});

// 匯出應用類別
window.ScrumPokerApp = ScrumPokerApp;

console.log('🚀 Scrum Poker App 主控制器已載入 - v3.0.0-enhanced');