// UI 管理器 - 處理介面元素和使用者互動
class UIManager {
    constructor() {
        // DOM 元素引用
        this.loginPanel = document.getElementById('loginPanel');
        this.gameInfo = document.getElementById('gameInfo');
        this.gameControls = document.getElementById('gameControls');
        this.toast = document.getElementById('toast');
        
        // 遊戲資訊元素
        this.currentRoomSpan = document.getElementById('currentRoom');
        this.playerCountSpan = document.getElementById('playerCount');
        this.gameStatusSpan = document.getElementById('gameStatus');
        
        // 控制按鈕
        this.revealBtn = document.getElementById('revealBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        // 狀態
        this.isGameStarted = false;
        this.currentRoom = null;
        this.playerCount = 0;
        this.gamePhase = 'waiting';
        
        // 統計資料
        this.statistics = {
            totalVotes: 0,
            averagePoints: 0,
            consensus: 0,
            devAverage: 0,
            qaAverage: 0
        };
        
        // 綁定事件監聽器
        this.bindEventListeners();
        
        console.log('🎨 UIManager 已初始化');
    }
    
    // 綁定事件監聽器
    bindEventListeners() {
        // 控制按鈕事件
        if (this.revealBtn) {
            this.revealBtn.addEventListener('click', () => {
                if (gameTable) {
                    gameTable.revealCards();
                }
            });
        }
        
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                if (gameTable) {
                    gameTable.clearVotes();
                }
            });
        }
        
        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
        
        // 視窗大小變更
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    // 處理鍵盤事件
    handleKeyPress(event) {
        if (!this.isGameStarted) return;
        
        switch (event.code) {
            case 'KeyR':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (gameTable) {
                        gameTable.revealCards();
                    }
                }
                break;
                
            case 'KeyC':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (gameTable) {
                        gameTable.clearVotes();
                    }
                }
                break;
                
            case 'Escape':
                this.showLeaveConfirmation();
                break;
        }
    }
    
    // 處理視窗大小變更
    handleResize() {\n        // 更新響應式佈局\n        this.updateResponsiveLayout();\n    }\n    \n    // 更新響應式佈局\n    updateResponsiveLayout() {\n        const isMobile = window.innerWidth <= 768;\n        \n        if (isMobile) {\n            // 行動版佈局調整\n            if (this.gameInfo) {\n                this.gameInfo.style.position = 'relative';\n                this.gameInfo.style.textAlign = 'center';\n            }\n            \n            if (this.gameControls) {\n                this.gameControls.style.position = 'relative';\n                this.gameControls.style.textAlign = 'center';\n            }\n        } else {\n            // 桌面版佈局\n            if (this.gameInfo) {\n                this.gameInfo.style.position = 'absolute';\n                this.gameInfo.style.textAlign = 'left';\n            }\n            \n            if (this.gameControls) {\n                this.gameControls.style.position = 'absolute';\n                this.gameControls.style.textAlign = 'right';\n            }\n        }\n    }\n    \n    // 開始遊戲\n    startGame(roomId, playerId) {\n        this.isGameStarted = true;\n        this.currentRoom = roomId;\n        \n        // 隱藏登入面板\n        if (this.loginPanel) {\n            this.loginPanel.style.display = 'none';\n        }\n        \n        // 顯示遊戲介面\n        if (this.gameInfo) {\n            this.gameInfo.style.display = 'block';\n        }\n        \n        if (this.gameControls) {\n            this.gameControls.style.display = 'block';\n        }\n        \n        // 更新房間資訊\n        this.updateRoomInfo(roomId);\n        \n        // 更新響應式佈局\n        this.updateResponsiveLayout();\n        \n        // 顯示成功訊息\n        this.showToast(`成功加入房間 ${roomId}`, 'success');\n        \n        // 切換遊戲狀態\n        gameState = 'game';\n        \n        console.log(`🎮 遊戲開始 - 房間: ${roomId}`);\n    }\n    \n    // 結束遊戲\n    endGame() {\n        this.isGameStarted = false;\n        this.currentRoom = null;\n        \n        // 顯示登入面板\n        if (this.loginPanel) {\n            this.loginPanel.style.display = 'block';\n        }\n        \n        // 隱藏遊戲介面\n        if (this.gameInfo) {\n            this.gameInfo.style.display = 'none';\n        }\n        \n        if (this.gameControls) {\n            this.gameControls.style.display = 'none';\n        }\n        \n        // 切換遊戲狀態\n        gameState = 'login';\n        \n        console.log('🚪 遊戲結束');\n    }\n    \n    // 更新房間資訊\n    updateRoomInfo(roomId) {\n        if (this.currentRoomSpan) {\n            this.currentRoomSpan.textContent = roomId || '-';\n        }\n    }\n    \n    // 更新玩家數量\n    updatePlayerCount(count) {\n        this.playerCount = count;\n        if (this.playerCountSpan) {\n            this.playerCountSpan.textContent = count.toString();\n        }\n    }\n    \n    // 更新遊戲狀態\n    updateGameStatus(phase, extra = '') {\n        this.gamePhase = phase;\n        \n        const statusText = {\n            'waiting': '等待中',\n            'voting': '投票中',\n            'revealing': '開牌中',\n            'finished': '已完成'\n        };\n        \n        let displayText = statusText[phase] || '未知';\n        if (extra) {\n            displayText += ` ${extra}`;\n        }\n        \n        if (this.gameStatusSpan) {\n            this.gameStatusSpan.textContent = displayText;\n        }\n        \n        // 更新控制按鈕狀態\n        this.updateControlButtons(phase);\n    }\n    \n    // 更新控制按鈕狀態\n    updateControlButtons(phase) {\n        if (this.revealBtn) {\n            this.revealBtn.disabled = (phase !== 'voting' || this.playerCount === 0);\n            this.revealBtn.textContent = phase === 'revealing' ? '開牌中...' : '🎭 開牌';\n        }\n        \n        if (this.clearBtn) {\n            this.clearBtn.disabled = (phase === 'waiting');\n        }\n    }\n    \n    // 更新投票進度\n    updateVotingProgress(votedCount, totalCount) {\n        const progressText = `(${votedCount}/${totalCount})`;\n        this.updateGameStatus('voting', progressText);\n        \n        // 更新開牌按鈕狀態\n        if (this.revealBtn) {\n            const canReveal = totalCount > 0; // 只要有玩家就可以開牌\n            this.revealBtn.disabled = !canReveal;\n        }\n    }\n    \n    // 顯示 Toast 通知\n    showToast(message, type = 'info', duration = 3000) {\n        if (!this.toast) return;\n        \n        this.toast.textContent = message;\n        this.toast.className = `toast ${type}`;\n        this.toast.classList.add('show');\n        \n        // 自動隱藏\n        setTimeout(() => {\n            this.toast.classList.remove('show');\n        }, duration);\n        \n        console.log(`📢 ${type.toUpperCase()}: ${message}`);\n    }\n    \n    // 顯示錯誤訊息\n    showError(message) {\n        this.showToast(message, 'error', 5000);\n    }\n    \n    // 顯示成功訊息\n    showSuccess(message) {\n        this.showToast(message, 'success');\n    }\n    \n    // 顯示離開確認對話框\n    showLeaveConfirmation() {\n        const confirmed = confirm('確定要離開房間嗎？');\n        if (confirmed) {\n            this.leaveGame();\n        }\n    }\n    \n    // 離開遊戲\n    leaveGame() {\n        if (firebaseManager) {\n            firebaseManager.leaveRoom();\n        }\n        \n        this.endGame();\n        this.showToast('已離開房間', 'info');\n    }\n    \n    // 更新統計資料\n    updateStatistics(votes) {\n        const numericVotes = votes.filter(v => typeof v.value === 'number');\n        \n        if (numericVotes.length === 0) {\n            this.statistics = {\n                totalVotes: votes.length,\n                averagePoints: 0,\n                consensus: 0,\n                devAverage: 0,\n                qaAverage: 0\n            };\n            return;\n        }\n        \n        // 計算平均分數\n        const total = numericVotes.reduce((sum, vote) => sum + vote.value, 0);\n        const average = total / numericVotes.length;\n        \n        // 計算共識度\n        const variance = numericVotes.reduce((sum, vote) => \n            sum + Math.pow(vote.value - average, 2), 0) / numericVotes.length;\n        const maxVariance = Math.pow(\n            Math.max(...numericVotes.map(v => v.value)) - \n            Math.min(...numericVotes.map(v => v.value)), 2\n        ) / 4;\n        const consensus = Math.round((1 - (variance / (maxVariance || 1))) * 100);\n        \n        // 計算角色別平均\n        const devVotes = numericVotes.filter(v => v.playerRole === 'dev');\n        const qaVotes = numericVotes.filter(v => v.playerRole === 'qa');\n        \n        const devAverage = devVotes.length > 0 ? \n            devVotes.reduce((sum, vote) => sum + vote.value, 0) / devVotes.length : 0;\n        const qaAverage = qaVotes.length > 0 ? \n            qaVotes.reduce((sum, vote) => sum + vote.value, 0) / qaVotes.length : 0;\n        \n        this.statistics = {\n            totalVotes: votes.length,\n            averagePoints: Math.round(average * 10) / 10,\n            consensus: consensus,\n            devAverage: Math.round(devAverage * 10) / 10,\n            qaAverage: Math.round(qaAverage * 10) / 10\n        };\n    }\n    \n    // 繪製統計資訊（在 p5.js 畫布上）\n    drawStatistics() {\n        if (this.gamePhase !== 'finished') return;\n        \n        push();\n        \n        // 背景\n        fill(0, 0, 0, 150);\n        noStroke();\n        rectMode(CORNER);\n        rect(width - 250, 20, 220, 160, 10);\n        \n        // 標題\n        fill(255);\n        textAlign(LEFT, TOP);\n        textSize(16);\n        textStyle(BOLD);\n        text('📊 投票統計', width - 240, 35);\n        \n        // 統計資料\n        textSize(12);\n        textStyle(NORMAL);\n        let y = 55;\n        \n        text(`總投票數: ${this.statistics.totalVotes}`, width - 240, y);\n        y += 18;\n        \n        if (this.statistics.averagePoints > 0) {\n            text(`平均點數: ${this.statistics.averagePoints}`, width - 240, y);\n            y += 18;\n            \n            text(`共識度: ${this.statistics.consensus}%`, width - 240, y);\n            y += 18;\n            \n            if (this.statistics.devAverage > 0) {\n                text(`開發平均: ${this.statistics.devAverage}`, width - 240, y);\n                y += 18;\n            }\n            \n            if (this.statistics.qaAverage > 0) {\n                text(`測試平均: ${this.statistics.qaAverage}`, width - 240, y);\n                y += 18;\n            }\n            \n            // 共識度顏色條\n            const barWidth = 180;\n            const barHeight = 8;\n            const barX = width - 240;\n            const barY = y + 5;\n            \n            // 背景條\n            fill(100);\n            rect(barX, barY, barWidth, barHeight, 4);\n            \n            // 進度條\n            const consensusColor = this.getConsensusColor(this.statistics.consensus);\n            fill(consensusColor);\n            const progressWidth = (this.statistics.consensus / 100) * barWidth;\n            rect(barX, barY, progressWidth, barHeight, 4);\n        }\n        \n        pop();\n    }\n    \n    // 取得共識度顏色\n    getConsensusColor(consensus) {\n        if (consensus >= 80) return color(34, 197, 94);   // 綠色\n        if (consensus >= 60) return color(251, 191, 36);  // 黃色\n        if (consensus >= 40) return color(249, 115, 22);  // 橘色\n        return color(239, 68, 68);                        // 紅色\n    }\n    \n    // 繪製 UI 元素（在 p5.js 畫布上）\n    draw() {\n        if (!this.isGameStarted) return;\n        \n        // 繪製統計資訊\n        this.drawStatistics();\n        \n        // 繪製快捷鍵提示\n        this.drawShortcutHints();\n        \n        // 繪製連線狀態\n        this.drawConnectionStatus();\n    }\n    \n    // 繪製快捷鍵提示\n    drawShortcutHints() {\n        if (this.gamePhase !== 'voting') return;\n        \n        push();\n        fill(255, 255, 255, 100);\n        textAlign(RIGHT, BOTTOM);\n        textSize(10);\n        text('快捷鍵: 數字鍵投票, Ctrl+R 開牌, Ctrl+C 重設', width - 20, height - 40);\n        text('ESC 離開房間', width - 20, height - 25);\n        pop();\n    }\n    \n    // 繪製連線狀態\n    drawConnectionStatus() {\n        if (!firebaseManager) return;\n        \n        const status = firebaseManager.getConnectionStatus();\n        \n        push();\n        const statusColor = status.isConnected ? \n            (status.useFirebase ? color(34, 197, 94) : color(251, 191, 36)) : \n            color(239, 68, 68);\n        \n        fill(statusColor);\n        noStroke();\n        circle(width - 30, 30, 12);\n        \n        // 狀態文字\n        fill(255, 200);\n        textAlign(RIGHT, CENTER);\n        textSize(10);\n        const statusText = status.isConnected ? \n            (status.useFirebase ? 'Firebase' : '本地模式') : '已斷線';\n        text(statusText, width - 45, 30);\n        \n        pop();\n    }\n    \n    // 取得統計資料\n    getStatistics() {\n        return { ...this.statistics };\n    }\n    \n    // 重設統計資料\n    resetStatistics() {\n        this.statistics = {\n            totalVotes: 0,\n            averagePoints: 0,\n            consensus: 0,\n            devAverage: 0,\n            qaAverage: 0\n        };\n    }\n}\n