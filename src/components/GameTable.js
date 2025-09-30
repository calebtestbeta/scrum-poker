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
                try {
                    console.log('📢 收到 deck:card-selected 事件:', data);
                    this.handleCardSelection(data.card, data.value);
                } catch (error) {
                    console.error('❌ 處理 deck:card-selected 事件失敗:', error);
                }
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
                'aria-label': '任何玩家都可以點擊開牌顯示所有投票結果',
                'title': '任何玩家都可以點擊開牌'
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
     * 處理卡牌選擇 - 增強錯誤處理
     * @param {Card} card - 選中的卡牌
     * @param {*} value - 卡牌值
     */
    handleCardSelection(card, value) {
        try {
            console.log(`🎯 處理卡牌選擇:`, {
                value,
                currentPhase: this.currentPhase,
                currentPlayerId: this.currentPlayerId,
                card: card ? 'defined' : 'undefined'
            });
            
            // 階段檢查
            if (this.currentPhase !== 'voting') {
                console.warn(`⚠️ 當前階段不允許投票: ${this.currentPhase}`);
                return;
            }
            
            // 玩家檢查
            if (!this.currentPlayerId) {
                console.error('❌ 未設置當前玩家 ID');
                return;
            }
            
            // 投票值檢查 - 特別處理 0 值
            if (value === undefined || value === null) {
                console.error('❌ 無效的投票值:', {
                    value,
                    type: typeof value,
                    isZero: value === 0,
                    isEmptyString: value === '',
                    isFalsy: !value
                });
                return;
            }
            
            // 額外的 0 值驗證日誌
            if (value === 0) {
                console.log('🎯 正在處理 0 值卡牌選擇:', {
                    value,
                    type: typeof value,
                    isNumber: typeof value === 'number',
                    isValidZero: value === 0 && typeof value === 'number'
                });
            }
            
            // 檢查玩家是否存在
            const currentPlayer = this.playerList.getPlayer(this.currentPlayerId);
            if (!currentPlayer) {
                console.error(`❌ 找不到玩家: ${this.currentPlayerId}`);
                return;
            }
            
            console.log(`🎯 玩家 ${currentPlayer.name} 選擇卡牌值: ${value}`);
            
            // 提交投票
            this.submitVote(value);
            
            // 播放選擇反饋
            this.playVoteFeedback();
            
        } catch (error) {
            console.error('❌ handleCardSelection 執行失敗:', error);
            console.error('錯誤詳情:', {
                value,
                currentPhase: this.currentPhase,
                currentPlayerId: this.currentPlayerId,
                stack: error.stack
            });
        }
    }
    
    /**
     * 提交投票 - 支持重新投票（增強錯誤處理）
     * @param {*} value - 投票值
     */
    submitVote(value) {
        try {
            console.log(`📝 開始提交投票:`, {
                value,
                valueType: typeof value,
                isZero: value === 0,
                isValidNumber: typeof value === 'number' && !isNaN(value),
                currentPlayerId: this.currentPlayerId,
                currentPhase: this.currentPhase
            });
            
            const currentPlayer = this.playerList.getPlayer(this.currentPlayerId);
            if (!currentPlayer) {
                console.error('❌ submitVote: 找不到當前玩家');
                return;
            }
            
            const isRevote = currentPlayer.hasVoted;
            console.log(`📊 投票狀態: ${isRevote ? '重新投票' : '首次投票'}`);
            
            // 更新當前玩家的投票
            try {
                currentPlayer.setVote(value, true);
                console.log(`✅ 玩家投票已更新: ${currentPlayer.name} -> ${value}`);
            } catch (error) {
                console.error('❌ 更新玩家投票失敗:', error);
                return;
            }
            
            // 保持卡牌可點擊狀態，允許重新投票
            if (this.currentPhase === 'voting') {
                try {
                    this.cardDeck.setClickable(true);
                    console.log('🎴 卡牌保持可點擊狀態');
                } catch (error) {
                    console.error('❌ 設置卡牌可點擊狀態失敗:', error);
                }
            }
            
            // 發送投票事件
            if (window.eventBus) {
                try {
                    const eventData = {
                        playerId: this.currentPlayerId,
                        vote: value,
                        timestamp: Date.now(),
                        isRevote: isRevote
                    };
                    
                    console.log('📢 發送投票事件:', eventData);
                    window.eventBus.emit('game:vote-submitted', eventData);
                } catch (error) {
                    console.error('❌ 發送投票事件失敗:', error);
                }
            } else {
                console.warn('⚠️ eventBus 不存在，無法發送投票事件');
            }
            
            // 更新狀態
            try {
                this.updateGameStatus();
                console.log('🔄 遊戲狀態已更新');
            } catch (error) {
                console.error('❌ 更新遊戲狀態失敗:', error);
            }
            
            if (isRevote) {
                console.log(`🔄 玩家 ${currentPlayer.name} 重新投票: ${value}`);
            } else {
                console.log(`✅ 玩家 ${currentPlayer.name} 投票: ${value}`);
            }
            
        } catch (error) {
            console.error('❌ submitVote 執行失敗:', error);
            console.error('錯誤詳情:', {
                value,
                currentPlayerId: this.currentPlayerId,
                currentPhase: this.currentPhase,
                stack: error.stack
            });
        }
    }
    
    /**
     * 處理投票進度
     * @param {Object} progress - 進度數據
     */
    handleVotingProgress(progress) {
        // 檢查是否所有人都投票了
        if (progress.percentage >= (this.options.autoRevealThreshold * 100)) {
            if (this.currentPhase === 'voting') {
                console.log('🎯 所有玩家已投票，準備開牌');
                
                // 啟用開牌按鈕
                if (this.buttons.reveal) {
                    this.buttons.reveal.disabled = false;
                    this.buttons.reveal.classList.add('btn-pulse');
                }
                
                // 發送投票完成事件
                if (window.eventBus) {
                    window.eventBus.emit('game:voting-completed', {
                        progress,
                        canReveal: true
                    });
                }
            }
        }
        
        this.updateGameStatus();
    }
    
    /**
     * 處理階段變更
     * @param {string} newPhase - 新階段
     * @param {string} oldPhase - 舊階段
     */
    handlePhaseChange(newPhase, oldPhase) {
        console.log(`🎮 遊戲階段變更: ${oldPhase} → ${newPhase}`);
        
        this.currentPhase = newPhase;
        
        switch (newPhase) {
            case 'waiting':
                this.cardDeck.setClickable(false);
                break;
            case 'voting':
                this.enableVoting();
                break;
            case 'revealing':
                this.cardDeck.setClickable(false);
                this.revealVotes();
                break;
            case 'finished':
                this.cardDeck.setClickable(false);
                break;
        }
        
        this.updateButtonStates();
        this.updateGameStatus();
    }
    
    /**
     * 啟用投票 - 允許重新出牌
     */
    enableVoting() {
        if (this.currentPlayerId && this.currentPhase === 'voting') {
            const currentPlayer = this.playerList.getPlayer(this.currentPlayerId);
            if (currentPlayer) {
                // 允許所有玩家在投票階段重新選擇卡牌
                this.cardDeck.setClickable(true);
                
                // 如果玩家已經投票過，提供視覺提示可以重新投票
                if (currentPlayer.hasVoted) {
                    console.log(`✨ 玩家 ${currentPlayer.name} 可以重新投票`);
                }
            }
        }
    }
    
    /**
     * 開牌顯示結果
     */
    revealVotes() {
        console.log('🎭 開始開牌流程...');
        
        if (this.currentPhase === 'voting') {
            this.currentPhase = 'revealing';
        }
        
        // 獲取所有玩家的投票狀態（開牌前）
        const allPlayers = this.playerList.getAllPlayers();
        const votedPlayers = allPlayers.filter(p => p.hasVoted);
        
        console.log(`📊 開牌前狀態 - 總玩家: ${allPlayers.length}, 已投票: ${votedPlayers.length}`);
        votedPlayers.forEach(player => {
            console.log(`  - ${player.name}: ${player.vote} (投票狀態: ${player.hasVoted}, 開牌狀態: ${player.isRevealed})`);
        });
        
        // 顯示所有投票
        this.playerList.revealAllVotes();
        
        // 驗證開牌結果
        setTimeout(() => {
            console.log('🔍 開牌後驗證:');
            votedPlayers.forEach(player => {
                console.log(`  - ${player.name}: ${player.vote} (投票狀態: ${player.hasVoted}, 開牌狀態: ${player.isRevealed})`);
            });
        }, 100);
        
        // 清除卡牌選擇
        this.cardDeck.clearSelection();
        this.cardDeck.setClickable(false);
        
        // 計算統計數據
        const statistics = this.playerList.getVotingStatistics();
        
        // 發送開牌事件
        if (window.eventBus) {
            window.eventBus.emit('game:votes-revealed', {
                statistics,
                players: this.playerList.getAllPlayers().map(p => p.getData())
            });
        }
        
        // 更新到 finished 階段
        setTimeout(() => {
            this.currentPhase = 'finished';
            this.updateButtonStates();
            this.updateGameStatus();
        }, 1000);
        
        console.log('🎭 投票結果已公開');
    }
    
    /**
     * 清除投票重新開始
     */
    clearVotes() {
        // 清除所有玩家投票
        this.playerList.clearAllVotes();
        
        // 清除卡牌選擇
        this.cardDeck.clearSelection();
        
        // 重置階段
        this.currentPhase = 'voting';
        
        // 重新啟用投票
        this.enableVoting();
        
        // 發送清除事件
        if (window.eventBus) {
            window.eventBus.emit('game:votes-cleared');
        }
        
        this.updateButtonStates();
        this.updateGameStatus();
        
        console.log('🔄 投票已清除，重新開始');
    }
    
    /**
     * 離開房間
     */
    leaveRoom() {
        // 顯示確認對話框
        const confirmed = confirm('確定要離開房間嗎？');
        if (!confirmed) return;
        
        // 發送離開事件
        if (window.eventBus) {
            window.eventBus.emit('game:leave-room', {
                playerId: this.currentPlayerId,
                roomId: this.roomId
            });
        }
        
        // 重置遊戲狀態
        this.reset();
        
        console.log('🚪 已離開房間');
    }
    
    /**
     * 播放投票反饋
     */
    playVoteFeedback() {
        // 觸覺反饋
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
        
        // 音效反饋（如果需要）
        // 可以在這裡添加音效播放
    }
    
    /**
     * 更新按鈕狀態
     */
    updateButtonStates() {
        if (!this.buttons) return;
        
        const progress = this.playerList.updateVotingProgress();
        
        // 開牌按鈕 - 允許任何人在投票階段開牌
        if (this.buttons.reveal) {
            const canReveal = this.currentPhase === 'voting' && progress.voted > 0;
            this.buttons.reveal.disabled = !canReveal;
            this.buttons.reveal.classList.toggle('btn-pulse', 
                canReveal && progress.percentage >= (this.options.autoRevealThreshold * 100));
            
            // 更新按鈕文字提示任何人都可以開牌
            if (canReveal) {
                this.buttons.reveal.title = '任何玩家都可以點擊開牌';
            }
        }
        
        // 重新開始按鈕
        if (this.buttons.clear) {
            const canClear = this.currentPhase === 'finished' || progress.voted > 0;
            this.buttons.clear.disabled = !canClear;
        }
        
        // 離開按鈕始終可用
        if (this.buttons.leave) {
            this.buttons.leave.disabled = false;
        }
    }
    
    /**
     * 更新遊戲狀態顯示
     */
    updateGameStatus() {
        if (!this.elements.gameStatus) return;
        
        const progress = this.playerList.updateVotingProgress();
        let statusText = '';
        let statusClass = '';
        
        switch (this.currentPhase) {
            case 'waiting':
                statusText = '等待玩家加入...';
                statusClass = 'status-waiting';
                break;
            case 'voting':
                if (progress.total === 0) {
                    statusText = '等待玩家加入房間';
                    statusClass = 'status-waiting';
                } else if (progress.voted === 0) {
                    statusText = `請選擇卡牌進行投票 (${progress.total} 位玩家)`;
                    statusClass = 'status-voting';
                } else if (progress.percentage < 100) {
                    statusText = `投票進行中 ${progress.voted}/${progress.total} (${progress.percentage}%) - 可重新選擇卡牌`;
                    statusClass = 'status-voting';
                } else {
                    statusText = `所有玩家已投票完成！任何人可點擊開牌查看結果`;
                    statusClass = 'status-ready';
                }
                break;
            case 'revealing':
                statusText = '正在開牌...';
                statusClass = 'status-revealing';
                break;
            case 'finished':
                const stats = this.playerList.getVotingStatistics();
                statusText = `投票結果 - 平均: ${stats.averagePoints}, 共識度: ${stats.consensus}%`;
                statusClass = 'status-finished';
                break;
        }
        
        this.elements.gameStatus.textContent = statusText;
        this.elements.gameStatus.className = `game-status ${statusClass}`;
    }
    
    // === 公開 API 方法 ===
    
    /**
     * 設置房間 ID
     * @param {string} roomId - 房間 ID
     */
    setRoomId(roomId) {
        this.roomId = roomId;
    }
    
    /**
     * 設置當前玩家
     * @param {string} playerId - 玩家 ID
     */
    setCurrentPlayer(playerId) {
        this.currentPlayerId = playerId;
        this.playerList.setCurrentPlayer(playerId);
        
        // 如果處於投票階段，啟用卡牌
        if (this.currentPhase === 'voting') {
            this.enableVoting();
        }
    }
    
    /**
     * 添加玩家
     * @param {string} id - 玩家 ID
     * @param {string} name - 玩家名稱
     * @param {string} role - 玩家角色
     * @param {Object} data - 額外數據
     */
    addPlayer(id, name, role, data = {}) {
        const player = this.playerList.addPlayer(id, name, role, data);
        this.updateGameStatus();
        return player;
    }
    
    /**
     * 移除玩家
     * @param {string} id - 玩家 ID
     */
    removePlayer(id) {
        this.playerList.removePlayer(id);
        this.updateGameStatus();
    }
    
    /**
     * 更新玩家數據
     * @param {string} id - 玩家 ID
     * @param {Object} data - 玩家數據
     */
    updatePlayer(id, data) {
        const player = this.playerList.getPlayer(id);
        if (player) {
            player.updateFromData(data);
        }
    }
    
    /**
     * 批量更新玩家列表
     * @param {Object} players - 玩家數據物件
     */
    updatePlayers(players) {
        try {
            if (!players || typeof players !== 'object') {
                console.warn('⚠️ updatePlayers: 無效的玩家資料', players);
                return;
            }
            
            console.log('👥 正在更新玩家列表:', Object.keys(players));
            
            // 更新每個玩家的資料
            Object.entries(players).forEach(([playerId, playerData]) => {
                try {
                    if (playerData && typeof playerData === 'object') {
                        let player = this.playerList.getPlayer(playerId);
                        
                        if (!player) {
                            // 如果玩家不存在，創建新玩家
                            player = this.addPlayer(
                                playerId,
                                playerData.name || 'Unknown',
                                playerData.role || 'other',
                                playerData
                            );
                        } else {
                            // 更新現有玩家
                            player.updateFromData(playerData);
                        }
                    }
                } catch (error) {
                    console.error(`❌ 更新玩家 ${playerId} 失敗:`, error);
                }
            });
            
            // 移除不在更新列表中的玩家
            const currentPlayers = this.playerList.getAllPlayers();
            const updatedPlayerIds = Object.keys(players);
            
            currentPlayers.forEach(player => {
                if (!updatedPlayerIds.includes(player.id)) {
                    console.log(`🚪 移除已離開的玩家: ${player.name}`);
                    this.removePlayer(player.id);
                }
            });
            
            // 更新遊戲狀態
            this.updateGameStatus();
            this.updateButtonStates();
            
        } catch (error) {
            console.error('❌ updatePlayers 執行失敗:', error);
        }
    }
    
    /**
     * 批量更新投票數據
     * @param {Object} votes - 投票數據物件
     */
    updateVotes(votes) {
        try {
            if (!votes || typeof votes !== 'object') {
                console.warn('⚠️ updateVotes: 無效的投票資料', votes);
                return;
            }
            
            console.log('🗳️ 正在更新投票數據:', Object.keys(votes));
            
            // 更新每個玩家的投票
            Object.entries(votes).forEach(([playerId, voteData]) => {
                try {
                    const player = this.playerList.getPlayer(playerId);
                    if (player && voteData) {
                        // 保存當前的開牌狀態
                        const wasRevealed = player.isRevealed;
                        console.log(`🔄 Firebase 同步前 - ${player.name}: wasRevealed=${wasRevealed}, currentVote=${player.vote}`);
                        
                        if (typeof voteData === 'object' && voteData.value !== undefined) {
                            // 如果是物件格式 { value: ..., timestamp: ... }
                            player.setVote(voteData.value, false); // 不播放動畫，避免干擾
                            console.log(`✅ 更新玩家 ${player.name} 的投票: ${voteData.value} (原開牌狀態: ${wasRevealed})`);
                        } else {
                            // 如果是直接的值
                            player.setVote(voteData, false); // 不播放動畫，避免干擾
                            console.log(`✅ 更新玩家 ${player.name} 的投票: ${voteData} (原開牌狀態: ${wasRevealed})`);
                        }
                        
                        console.log(`🔄 Firebase 同步後 - ${player.name}: isRevealed=${player.isRevealed}, newVote=${player.vote}`);
                        
                        // 額外的安全檢查：確保開牌狀態被正確保護
                        if (wasRevealed && !player.isRevealed) {
                            console.warn(`⚠️ 檢測到開牌狀態丟失 - ${player.name}，正在恢復...`);
                            player.isRevealed = true;
                            player.updateDisplay();
                            console.log(`🔄 已恢復玩家 ${player.name} 的開牌狀態`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ 更新玩家 ${playerId} 的投票失敗:`, error);
                }
            });
            
            // 清除未在更新列表中的玩家投票
            const currentPlayers = this.playerList.getAllPlayers();
            const votedPlayerIds = Object.keys(votes);
            
            currentPlayers.forEach(player => {
                if (!votedPlayerIds.includes(player.id) && player.hasVoted) {
                    console.log(`🗳️ 清除玩家 ${player.name} 的投票`);
                    player.clearVote();
                }
            });
            
            // 更新遊戲狀態
            this.updateGameStatus();
            this.updateButtonStates();
            
        } catch (error) {
            console.error('❌ updateVotes 執行失敗:', error);
        }
    }
    
    /**
     * 更新遊戲階段
     * @param {string} newPhase - 新的遊戲階段
     */
    updatePhase(newPhase) {
        try {
            if (!newPhase || typeof newPhase !== 'string') {
                console.warn('⚠️ updatePhase: 無效的階段參數', newPhase);
                return;
            }
            
            const oldPhase = this.currentPhase;
            console.log(`🎮 階段更新: ${oldPhase} → ${newPhase}`);
            
            // 更新階段
            this.currentPhase = newPhase;
            
            // 觸發階段變更處理
            this.handlePhaseChange(newPhase, oldPhase);
            
        } catch (error) {
            console.error('❌ updatePhase 執行失敗:', error);
        }
    }
    
    /**
     * 開始遊戲
     */
    startGame() {
        this.currentPhase = 'voting';
        this.enableVoting();
        this.updateButtonStates();
        this.updateGameStatus();
        
        console.log('🎮 遊戲開始');
    }
    
    /**
     * 重置遊戲桌面
     */
    reset() {
        this.currentPhase = 'waiting';
        this.roomId = null;
        this.currentPlayerId = null;
        
        this.playerList.destroy();
        this.cardDeck.destroy();
        
        // 重新初始化
        this.createPlayerList();
        this.createCardDeck();
        
        this.updateButtonStates();
        this.updateGameStatus();
        
        console.log('🔄 遊戲桌面已重置');
    }
    
    /**
     * 獲取遊戲統計
     * @returns {Object} 統計數據
     */
    getStatistics() {
        return {
            phase: this.currentPhase,
            playerCount: this.playerList.getAllPlayers().length,
            votingProgress: this.playerList.updateVotingProgress(),
            votingStatistics: this.playerList.getVotingStatistics()
        };
    }
    
    /**
     * 銷毀遊戲桌面
     */
    destroy() {
        if (this.playerList) {
            this.playerList.destroy();
        }
        
        if (this.cardDeck) {
            this.cardDeck.destroy();
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('💥 GameTable 已銷毀');
    }
}

// 匯出到全域
window.GameTable = GameTable;

console.log('🎯 GameTable 遊戲桌面已載入 - v3.0.0-enhanced');