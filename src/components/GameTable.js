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
            console.warn('當前階段不允許投票');\n            return;\n        }\n        \n        if (!this.currentPlayerId) {\n            console.warn('未設置當前玩家');\n            return;\n        }\n        \n        // 提交投票\n        this.submitVote(value);\n        \n        // 播放選擇反饋\n        this.playVoteFeedback();\n    }\n    \n    /**\n     * 提交投票\n     * @param {*} value - 投票值\n     */\n    submitVote(value) {\n        const currentPlayer = this.playerList.getPlayer(this.currentPlayerId);\n        if (!currentPlayer) return;\n        \n        // 更新當前玩家的投票\n        currentPlayer.setVote(value, true);\n        \n        // 禁用卡牌選擇\n        this.cardDeck.setClickable(false);\n        \n        // 發送投票事件\n        if (window.eventBus) {\n            window.eventBus.emit('game:vote-submitted', {\n                playerId: this.currentPlayerId,\n                vote: value,\n                timestamp: Date.now()\n            });\n        }\n        \n        // 更新狀態\n        this.updateGameStatus();\n        \n        console.log(`✅ 玩家 ${currentPlayer.name} 投票: ${value}`);\n    }\n    \n    /**\n     * 處理投票進度\n     * @param {Object} progress - 進度數據\n     */\n    handleVotingProgress(progress) {\n        // 檢查是否所有人都投票了\n        if (progress.percentage >= (this.options.autoRevealThreshold * 100)) {\n            if (this.currentPhase === 'voting') {\n                console.log('🎯 所有玩家已投票，準備開牌');\n                \n                // 啟用開牌按鈕\n                if (this.buttons.reveal) {\n                    this.buttons.reveal.disabled = false;\n                    this.buttons.reveal.classList.add('btn-pulse');\n                }\n                \n                // 發送投票完成事件\n                if (window.eventBus) {\n                    window.eventBus.emit('game:voting-completed', {\n                        progress,\n                        canReveal: true\n                    });\n                }\n            }\n        }\n        \n        this.updateGameStatus();\n    }\n    \n    /**\n     * 處理階段變更\n     * @param {string} newPhase - 新階段\n     * @param {string} oldPhase - 舊階段\n     */\n    handlePhaseChange(newPhase, oldPhase) {\n        console.log(`🎮 遊戲階段變更: ${oldPhase} → ${newPhase}`);\n        \n        this.currentPhase = newPhase;\n        \n        switch (newPhase) {\n            case 'waiting':\n                this.cardDeck.setClickable(false);\n                break;\n            case 'voting':\n                this.enableVoting();\n                break;\n            case 'revealing':\n                this.cardDeck.setClickable(false);\n                this.revealVotes();\n                break;\n            case 'finished':\n                this.cardDeck.setClickable(false);\n                break;\n        }\n        \n        this.updateButtonStates();\n        this.updateGameStatus();\n    }\n    \n    /**\n     * 啟用投票\n     */\n    enableVoting() {\n        if (this.currentPlayerId) {\n            const currentPlayer = this.playerList.getPlayer(this.currentPlayerId);\n            if (currentPlayer && !currentPlayer.hasVoted) {\n                this.cardDeck.setClickable(true);\n            }\n        }\n    }\n    \n    /**\n     * 開牌顯示結果\n     */\n    revealVotes() {\n        if (this.currentPhase === 'voting') {\n            this.currentPhase = 'revealing';\n        }\n        \n        // 顯示所有投票\n        this.playerList.revealAllVotes();\n        \n        // 清除卡牌選擇\n        this.cardDeck.clearSelection();\n        this.cardDeck.setClickable(false);\n        \n        // 計算統計數據\n        const statistics = this.playerList.getVotingStatistics();\n        \n        // 發送開牌事件\n        if (window.eventBus) {\n            window.eventBus.emit('game:votes-revealed', {\n                statistics,\n                players: this.playerList.getAllPlayers().map(p => p.getData())\n            });\n        }\n        \n        // 更新到 finished 階段\n        setTimeout(() => {\n            this.currentPhase = 'finished';\n            this.updateButtonStates();\n            this.updateGameStatus();\n        }, 1000);\n        \n        console.log('🎭 投票結果已公開');\n    }\n    \n    /**\n     * 清除投票重新開始\n     */\n    clearVotes() {\n        // 清除所有玩家投票\n        this.playerList.clearAllVotes();\n        \n        // 清除卡牌選擇\n        this.cardDeck.clearSelection();\n        \n        // 重置階段\n        this.currentPhase = 'voting';\n        \n        // 重新啟用投票\n        this.enableVoting();\n        \n        // 發送清除事件\n        if (window.eventBus) {\n            window.eventBus.emit('game:votes-cleared');\n        }\n        \n        this.updateButtonStates();\n        this.updateGameStatus();\n        \n        console.log('🔄 投票已清除，重新開始');\n    }\n    \n    /**\n     * 離開房間\n     */\n    leaveRoom() {\n        // 顯示確認對話框\n        const confirmed = confirm('確定要離開房間嗎？');\n        if (!confirmed) return;\n        \n        // 發送離開事件\n        if (window.eventBus) {\n            window.eventBus.emit('game:leave-room', {\n                playerId: this.currentPlayerId,\n                roomId: this.roomId\n            });\n        }\n        \n        // 重置遊戲狀態\n        this.reset();\n        \n        console.log('🚪 已離開房間');\n    }\n    \n    /**\n     * 播放投票反饋\n     */\n    playVoteFeedback() {\n        // 觸覺反饋\n        if (navigator.vibrate) {\n            navigator.vibrate(100);\n        }\n        \n        // 音效反饋（如果需要）\n        // 可以在這裡添加音效播放\n    }\n    \n    /**\n     * 更新按鈕狀態\n     */\n    updateButtonStates() {\n        if (!this.buttons) return;\n        \n        const progress = this.playerList.updateVotingProgress();\n        \n        // 開牌按鈕\n        if (this.buttons.reveal) {\n            const canReveal = this.currentPhase === 'voting' && progress.voted > 0;\n            this.buttons.reveal.disabled = !canReveal;\n            this.buttons.reveal.classList.toggle('btn-pulse', \n                canReveal && progress.percentage >= (this.options.autoRevealThreshold * 100));\n        }\n        \n        // 重新開始按鈕\n        if (this.buttons.clear) {\n            const canClear = this.currentPhase === 'finished' || progress.voted > 0;\n            this.buttons.clear.disabled = !canClear;\n        }\n        \n        // 離開按鈕始終可用\n        if (this.buttons.leave) {\n            this.buttons.leave.disabled = false;\n        }\n    }\n    \n    /**\n     * 更新遊戲狀態顯示\n     */\n    updateGameStatus() {\n        if (!this.elements.gameStatus) return;\n        \n        const progress = this.playerList.updateVotingProgress();\n        let statusText = '';\n        let statusClass = '';\n        \n        switch (this.currentPhase) {\n            case 'waiting':\n                statusText = '等待玩家加入...';\n                statusClass = 'status-waiting';\n                break;\n            case 'voting':\n                if (progress.total === 0) {\n                    statusText = '等待玩家加入房間';\n                    statusClass = 'status-waiting';\n                } else if (progress.voted === 0) {\n                    statusText = `請選擇卡牌進行投票 (${progress.total} 位玩家)`;\n                    statusClass = 'status-voting';\n                } else if (progress.percentage < 100) {\n                    statusText = `投票進行中 ${progress.voted}/${progress.total} (${progress.percentage}%)`;\n                    statusClass = 'status-voting';\n                } else {\n                    statusText = `所有玩家已投票完成！點擊開牌查看結果`;\n                    statusClass = 'status-ready';\n                }\n                break;\n            case 'revealing':\n                statusText = '正在開牌...';\n                statusClass = 'status-revealing';\n                break;\n            case 'finished':\n                const stats = this.playerList.getVotingStatistics();\n                statusText = `投票結果 - 平均: ${stats.averagePoints}, 共識度: ${stats.consensus}%`;\n                statusClass = 'status-finished';\n                break;\n        }\n        \n        this.elements.gameStatus.textContent = statusText;\n        this.elements.gameStatus.className = `game-status ${statusClass}`;\n    }\n    \n    // === 公開 API 方法 ===\n    \n    /**\n     * 設置房間 ID\n     * @param {string} roomId - 房間 ID\n     */\n    setRoomId(roomId) {\n        this.roomId = roomId;\n    }\n    \n    /**\n     * 設置當前玩家\n     * @param {string} playerId - 玩家 ID\n     */\n    setCurrentPlayer(playerId) {\n        this.currentPlayerId = playerId;\n        this.playerList.setCurrentPlayer(playerId);\n        \n        // 如果處於投票階段，啟用卡牌\n        if (this.currentPhase === 'voting') {\n            this.enableVoting();\n        }\n    }\n    \n    /**\n     * 添加玩家\n     * @param {string} id - 玩家 ID\n     * @param {string} name - 玩家名稱\n     * @param {string} role - 玩家角色\n     * @param {Object} data - 額外數據\n     */\n    addPlayer(id, name, role, data = {}) {\n        const player = this.playerList.addPlayer(id, name, role, data);\n        this.updateGameStatus();\n        return player;\n    }\n    \n    /**\n     * 移除玩家\n     * @param {string} id - 玩家 ID\n     */\n    removePlayer(id) {\n        this.playerList.removePlayer(id);\n        this.updateGameStatus();\n    }\n    \n    /**\n     * 更新玩家數據\n     * @param {string} id - 玩家 ID\n     * @param {Object} data - 玩家數據\n     */\n    updatePlayer(id, data) {\n        const player = this.playerList.getPlayer(id);\n        if (player) {\n            player.updateFromData(data);\n        }\n    }\n    \n    /**\n     * 開始遊戲\n     */\n    startGame() {\n        this.currentPhase = 'voting';\n        this.enableVoting();\n        this.updateButtonStates();\n        this.updateGameStatus();\n        \n        console.log('🎮 遊戲開始');\n    }\n    \n    /**\n     * 重置遊戲桌面\n     */\n    reset() {\n        this.currentPhase = 'waiting';\n        this.roomId = null;\n        this.currentPlayerId = null;\n        \n        this.playerList.destroy();\n        this.cardDeck.destroy();\n        \n        // 重新初始化\n        this.createPlayerList();\n        this.createCardDeck();\n        \n        this.updateButtonStates();\n        this.updateGameStatus();\n        \n        console.log('🔄 遊戲桌面已重置');\n    }\n    \n    /**\n     * 獲取遊戲統計\n     * @returns {Object} 統計數據\n     */\n    getStatistics() {\n        return {\n            phase: this.currentPhase,\n            playerCount: this.playerList.getAllPlayers().length,\n            votingProgress: this.playerList.updateVotingProgress(),\n            votingStatistics: this.playerList.getVotingStatistics()\n        };\n    }\n    \n    /**\n     * 銷毀遊戲桌面\n     */\n    destroy() {\n        if (this.playerList) {\n            this.playerList.destroy();\n        }\n        \n        if (this.cardDeck) {\n            this.cardDeck.destroy();\n        }\n        \n        if (this.container) {\n            this.container.innerHTML = '';\n        }\n        \n        console.log('💥 GameTable 已銷毀');\n    }\n}\n\n// 匯出到全域\nwindow.GameTable = GameTable;\n\nconsole.log('🎯 GameTable 遊戲桌面已載入 - v3.0.0-enhanced');