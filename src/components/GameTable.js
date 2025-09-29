/**
 * 遊戲桌面組件 - Scrum Poker 遊戲主控制器
 * 整合玩家、卡牌和投票邏輯的核心組件
 * @version 3.0.0-enhanced
 */

/**
 * 遊戲桌面類別
 */
class GameTable {
    constructor(container, options = {}) {
        this.container = container;
        this.currentPhase = 'waiting'; // waiting, voting, revealing, finished
        this.roomId = null;
        this.currentPlayerId = null;
        
        // 子組件
        this.playerList = null;
        this.cardDeck = null;
        
        // DOM 元素
        this.elements = {
            playersArea: null,
            cardsArea: null,
            gameActions: null,
            gameStatus: null
        };
        
        // 選項設定
        this.options = {
            maxPlayers: options.maxPlayers || 20,
            autoRevealThreshold: options.autoRevealThreshold || 1.0, // 100%
            enableSpectatorMode: options.enableSpectatorMode || false,
            ...options
        };
        
        // 初始化
        this.initialize();
        this.setupEventListeners();
    }
    
    /**
     * 初始化遊戲桌面
     */
    initialize() {
        this.createLayout();
        this.createPlayerList();
        this.createCardDeck();
        this.updateGameStatus();
        
        console.log('🎮 GameTable 已初始化');
    }
    
    /**
     * 建立佈局
     */
    createLayout() {
        if (!this.container) {
            console.error('GameTable: 需要容器元素');
            return;
        }
        
        this.container.className = 'game-table';
        this.container.setAttribute('role', 'main');
        this.container.setAttribute('aria-label', 'Scrum Poker 遊戲桌面');
        
        // 建立玩家區域
        this.elements.playersArea = Utils.DOM.createElement('div', {
            className: 'game-players-area',
            attributes: {
                'role': 'region',
                'aria-label': '玩家區域'
            }
        });
        
        // 建立遊戲狀態顯示
        this.elements.gameStatus = Utils.DOM.createElement('div', {
            className: 'game-status',
            attributes: {
                'role': 'status',
                'aria-live': 'polite'
            }
        });
        
        // 建立遊戲操作區域
        this.elements.gameActions = Utils.DOM.createElement('div', {
            className: 'game-actions',
            attributes: {
                'role': 'region',
                'aria-label': '遊戲操作'
            }
        });
        
        // 建立卡牌區域
        this.elements.cardsArea = Utils.DOM.createElement('div', {
            className: 'game-cards-area',
            attributes: {
                'role': 'region',
                'aria-label': '投票卡牌'
            }
        });
        
        // 添加到容器
        this.container.appendChild(this.elements.playersArea);
        this.container.appendChild(this.elements.gameStatus);
        this.container.appendChild(this.elements.gameActions);
        this.container.appendChild(this.elements.cardsArea);
    }
    
    /**
     * 建立玩家列表
     */
    createPlayerList() {
        this.playerList = new PlayerList(this.elements.playersArea, {
            maxPlayers: this.options.maxPlayers,
            showCards: true,
            showStatus: true,
            playerClickable: false
        });
    }
    
    /**
     * 建立卡牌組
     */
    createCardDeck() {
        this.cardDeck = new CardDeck();
        this.cardDeck.renderTo(this.elements.cardsArea);
        
        // 初始時禁用卡牌（等待加入房間）
        this.cardDeck.setClickable(false);
    }
    
    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        if (window.eventBus) {
            // 卡牌選擇事件
            window.eventBus.on('deck:card-selected', (data) => {
                this.handleCardSelection(data.card, data.value);
            });
            
            // 玩家投票進度事件
            window.eventBus.on('players:voting-progress', (progress) => {
                this.handleVotingProgress(progress);
            });
            
            // 狀態變更事件
            window.eventBus.on('phase:changed', (data) => {
                this.handlePhaseChange(data.newPhase, data.oldPhase);
            });
        }
        
        // 建立遊戲控制按鈕
        this.createGameControls();
    }
    
    /**
     * 建立遊戲控制按鈕
     */
    createGameControls() {
        const controlsContainer = Utils.DOM.createElement('div', {
            className: 'game-controls-container'
        });
        
        // 開牌按鈕
        const revealBtn = Utils.DOM.createElement('button', {
            className: 'btn btn-primary',
            textContent: '🎭 開牌',
            attributes: {
                'id': 'revealBtn',
                'aria-label': '開牌顯示所有投票結果'
            }
        });
        
        revealBtn.addEventListener('click', () => {
            this.revealVotes();
        });
        
        // 重新開始按鈕
        const clearBtn = Utils.DOM.createElement('button', {
            className: 'btn btn-secondary',
            textContent: '🔄 重新開始',
            attributes: {
                'id': 'clearBtn',
                'aria-label': '清除所有投票重新開始'
            }
        });
        
        clearBtn.addEventListener('click', () => {
            this.clearVotes();
        });
        
        // 離開房間按鈕
        const leaveBtn = Utils.DOM.createElement('button', {
            className: 'btn btn-outline',
            textContent: '🚪 離開房間',
            attributes: {
                'id': 'leaveBtn',
                'aria-label': '離開當前遊戲房間'
            }
        });
        
        leaveBtn.addEventListener('click', () => {
            this.leaveRoom();
        });
        
        controlsContainer.appendChild(revealBtn);
        controlsContainer.appendChild(clearBtn);
        controlsContainer.appendChild(leaveBtn);
        
        this.elements.gameActions.appendChild(controlsContainer);
        
        // 儲存按鈕引用
        this.buttons = {
            reveal: revealBtn,
            clear: clearBtn,
            leave: leaveBtn
        };
        
        // 更新按鈕狀態
        this.updateButtonStates();
    }
    
    /**
     * 處理卡牌選擇
     * @param {Card} card - 選中的卡牌
     * @param {*} value - 卡牌值
     */
    handleCardSelection(card, value) {
        if (this.currentPhase !== 'voting') {
            console.warn('當前階段不允許投票');
            return;
        }
        
        if (!this.currentPlayerId) {
            console.warn('未設置當前玩家');
            return;
        }
        
        // 提交投票
        this.submitVote(value);
        
        // 播放選擇反饋
        this.playVoteFeedback();
    }
    
    /**
     * 提交投票
     * @param {*} value - 投票值
     */
    submitVote(value) {
        const currentPlayer = this.playerList.getPlayer(this.currentPlayerId);
        if (!currentPlayer) return;
        
        // 更新當前玩家的投票
        currentPlayer.setVote(value, true);
        
        // 禁用卡牌選擇
        this.cardDeck.setClickable(false);
        
        // 發送投票事件
        if (window.eventBus) {
            window.eventBus.emit('game:vote-submitted', {
                playerId: this.currentPlayerId,
                vote: value,
                timestamp: Date.now()
            });
        }
        
        // 更新狀態
        this.updateGameStatus();
        
        console.log(`✅ 玩家 ${currentPlayer.name} 投票: ${value}`);
    }
    
    /**
     * 處理投票進度
     * @param {Object} progress - 進度數據
     */
    handleVotingProgress(progress) {        // 檢查是否所有人都投票了        if (progress.percentage >= (this.options.autoRevealThreshold * 100)) {            if (this.currentPhase === 'voting') {                console.log('🎯 所有玩家已投票，準備開牌');                                // 啟用開牌按鈕                if (this.buttons.reveal) {                    this.buttons.reveal.disabled = false;                    this.buttons.reveal.classList.add('btn-pulse');                }                                // 發送投票完成事件                if (window.eventBus) {                    window.eventBus.emit('game:voting-completed', {                        progress,                        canReveal: true                    });                }            }        }                this.updateGameStatus();    }        /**     * 處理階段變更     * @param {string} newPhase - 新階段     * @param {string} oldPhase - 舊階段     */    handlePhaseChange(newPhase, oldPhase) {        console.log(`🎮 遊戲階段變更: ${oldPhase} → ${newPhase}`);                this.currentPhase = newPhase;                switch (newPhase) {            case 'waiting':                this.cardDeck.setClickable(false);                break;            case 'voting':                this.enableVoting();                break;            case 'revealing':                this.cardDeck.setClickable(false);                this.revealVotes();                break;            case 'finished':                this.cardDeck.setClickable(false);                break;        }                this.updateButtonStates();        this.updateGameStatus();    }        /**     * 啟用投票     */    enableVoting() {        if (this.currentPlayerId) {            const currentPlayer = this.playerList.getPlayer(this.currentPlayerId);            if (currentPlayer && !currentPlayer.hasVoted) {                this.cardDeck.setClickable(true);            }        }    }        /**     * 開牌顯示結果     */    revealVotes() {        if (this.currentPhase === 'voting') {            this.currentPhase = 'revealing';        }                // 顯示所有投票        this.playerList.revealAllVotes();                // 清除卡牌選擇        this.cardDeck.clearSelection();        this.cardDeck.setClickable(false);                // 計算統計數據        const statistics = this.playerList.getVotingStatistics();                // 發送開牌事件        if (window.eventBus) {            window.eventBus.emit('game:votes-revealed', {                statistics,                players: this.playerList.getAllPlayers().map(p => p.getData())            });        }                // 更新到 finished 階段        setTimeout(() => {            this.currentPhase = 'finished';            this.updateButtonStates();            this.updateGameStatus();        }, 1000);                console.log('🎭 投票結果已公開');    }        /**     * 清除投票重新開始     */    clearVotes() {        // 清除所有玩家投票        this.playerList.clearAllVotes();                // 清除卡牌選擇        this.cardDeck.clearSelection();                // 重置階段        this.currentPhase = 'voting';                // 重新啟用投票        this.enableVoting();                // 發送清除事件        if (window.eventBus) {            window.eventBus.emit('game:votes-cleared');        }                this.updateButtonStates();        this.updateGameStatus();                console.log('🔄 投票已清除，重新開始');    }        /**     * 離開房間     */    leaveRoom() {        // 顯示確認對話框        const confirmed = confirm('確定要離開房間嗎？');        if (!confirmed) return;                // 發送離開事件        if (window.eventBus) {            window.eventBus.emit('game:leave-room', {                playerId: this.currentPlayerId,                roomId: this.roomId            });        }                // 重置遊戲狀態        this.reset();                console.log('🚪 已離開房間');    }        /**     * 播放投票反饋     */    playVoteFeedback() {        // 觸覺反饋        if (navigator.vibrate) {            navigator.vibrate(100);        }                // 音效反饋（如果需要）        // 可以在這裡添加音效播放    }        /**     * 更新按鈕狀態     */    updateButtonStates() {        if (!this.buttons) return;                const progress = this.playerList.updateVotingProgress();                // 開牌按鈕        if (this.buttons.reveal) {            const canReveal = this.currentPhase === 'voting' && progress.voted > 0;            this.buttons.reveal.disabled = !canReveal;            this.buttons.reveal.classList.toggle('btn-pulse',                 canReveal && progress.percentage >= (this.options.autoRevealThreshold * 100));        }                // 重新開始按鈕        if (this.buttons.clear) {            const canClear = this.currentPhase === 'finished' || progress.voted > 0;            this.buttons.clear.disabled = !canClear;        }                // 離開按鈕始終可用        if (this.buttons.leave) {            this.buttons.leave.disabled = false;        }    }        /**     * 更新遊戲狀態顯示     */    updateGameStatus() {        if (!this.elements.gameStatus) return;                const progress = this.playerList.updateVotingProgress();        let statusText = '';        let statusClass = '';                switch (this.currentPhase) {            case 'waiting':                statusText = '等待玩家加入...';                statusClass = 'status-waiting';                break;            case 'voting':                if (progress.total === 0) {                    statusText = '等待玩家加入房間';                    statusClass = 'status-waiting';                } else if (progress.voted === 0) {                    statusText = `請選擇卡牌進行投票 (${progress.total} 位玩家)`;                    statusClass = 'status-voting';                } else if (progress.percentage < 100) {                    statusText = `投票進行中 ${progress.voted}/${progress.total} (${progress.percentage}%)`;                    statusClass = 'status-voting';                } else {                    statusText = `所有玩家已投票完成！點擊開牌查看結果`;                    statusClass = 'status-ready';                }                break;            case 'revealing':                statusText = '正在開牌...';                statusClass = 'status-revealing';                break;            case 'finished':                const stats = this.playerList.getVotingStatistics();                statusText = `投票結果 - 平均: ${stats.averagePoints}, 共識度: ${stats.consensus}%`;                statusClass = 'status-finished';                break;        }                this.elements.gameStatus.textContent = statusText;        this.elements.gameStatus.className = `game-status ${statusClass}`;    }        // === 公開 API 方法 ===        /**     * 設置房間 ID     * @param {string} roomId - 房間 ID     */    setRoomId(roomId) {        this.roomId = roomId;    }        /**     * 設置當前玩家     * @param {string} playerId - 玩家 ID     */    setCurrentPlayer(playerId) {        this.currentPlayerId = playerId;        this.playerList.setCurrentPlayer(playerId);                // 如果處於投票階段，啟用卡牌        if (this.currentPhase === 'voting') {            this.enableVoting();        }    }        /**     * 添加玩家     * @param {string} id - 玩家 ID     * @param {string} name - 玩家名稱     * @param {string} role - 玩家角色     * @param {Object} data - 額外數據     */    addPlayer(id, name, role, data = {}) {        const player = this.playerList.addPlayer(id, name, role, data);        this.updateGameStatus();        return player;    }        /**     * 移除玩家     * @param {string} id - 玩家 ID     */    removePlayer(id) {        this.playerList.removePlayer(id);        this.updateGameStatus();    }        /**     * 更新玩家數據     * @param {string} id - 玩家 ID     * @param {Object} data - 玩家數據     */    updatePlayer(id, data) {        const player = this.playerList.getPlayer(id);        if (player) {            player.updateFromData(data);        }    }        /**     * 開始遊戲     */    startGame() {        this.currentPhase = 'voting';        this.enableVoting();        this.updateButtonStates();        this.updateGameStatus();                console.log('🎮 遊戲開始');    }        /**     * 重置遊戲桌面     */    reset() {        this.currentPhase = 'waiting';        this.roomId = null;        this.currentPlayerId = null;                this.playerList.destroy();        this.cardDeck.destroy();                // 重新初始化        this.createPlayerList();        this.createCardDeck();                this.updateButtonStates();        this.updateGameStatus();                console.log('🔄 遊戲桌面已重置');    }        /**     * 獲取遊戲統計     * @returns {Object} 統計數據     */    getStatistics() {        return {            phase: this.currentPhase,            playerCount: this.playerList.getAllPlayers().length,            votingProgress: this.playerList.updateVotingProgress(),            votingStatistics: this.playerList.getVotingStatistics()        };    }        /**     * 銷毀遊戲桌面     */    destroy() {        if (this.playerList) {            this.playerList.destroy();        }                if (this.cardDeck) {            this.cardDeck.destroy();        }                if (this.container) {            this.container.innerHTML = '';        }                console.log('💥 GameTable 已銷毀');    }}// 匯出到全域window.GameTable = GameTable;console.log('🎯 GameTable 遊戲桌面已載入 - v3.0.0-enhanced');