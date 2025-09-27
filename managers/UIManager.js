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
        document.addEventListener('keydown', (event) => {
            if (!this.isGameStarted) return;
            
            // ESC - 離開房間
            if (event.code === 'Escape') {
                this.showLeaveConfirmation();
                return;
            }
            
            // Ctrl+R - 開牌
            if (event.ctrlKey && event.code === 'KeyR') {
                event.preventDefault();
                if (this.revealBtn && !this.revealBtn.disabled) {
                    this.revealBtn.click();
                }
                return;
            }
            
            // Ctrl+C - 清除投票
            if (event.ctrlKey && event.code === 'KeyC') {
                event.preventDefault();
                if (this.clearBtn && !this.clearBtn.disabled) {
                    this.clearBtn.click();
                }
                return;
            }
            
            // 數字鍵投票 (1-9, 0)
            if (this.gamePhase === 'voting' && gameTable) {
                const fibSequence = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55];
                const keyNum = parseInt(event.key);
                
                if (!isNaN(keyNum) && keyNum >= 0 && keyNum <= 9) {
                    const voteValue = fibSequence[keyNum];
                    gameTable.handlePlayerVote(voteValue);
                }
            }
        });
        
        // 視窗調整大小事件
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // 初始化響應式佈局
        this.updateResponsiveLayout();
    }
    
    // 處理視窗調整大小
    handleResize() {
        // 更新響應式佈局
        this.updateResponsiveLayout();
    }
    
    // 更新響應式佈局
    updateResponsiveLayout() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // 行動版佈局調整
            if (this.gameInfo) {
                this.gameInfo.style.position = 'relative';
                this.gameInfo.style.textAlign = 'center';
            }
            
            if (this.gameControls) {
                this.gameControls.style.position = 'relative';
                this.gameControls.style.textAlign = 'center';
            }
        } else {
            // 桌面版佈局
            if (this.gameInfo) {
                this.gameInfo.style.position = 'absolute';
                this.gameInfo.style.textAlign = 'left';
            }
            
            if (this.gameControls) {
                this.gameControls.style.position = 'absolute';
                this.gameControls.style.textAlign = 'right';
            }
        }
    }
    
    // 開始遊戲
    startGame(roomId, playerId) {
        this.isGameStarted = true;
        this.currentRoom = roomId;
        
        // 隱藏登入面板
        if (this.loginPanel) {
            this.loginPanel.style.display = 'none';
        }
        
        // 顯示遊戲介面
        if (this.gameInfo) {
            this.gameInfo.style.display = 'block';
        }
        
        if (this.gameControls) {
            this.gameControls.style.display = 'block';
        }
        
        // 更新房間資訊
        this.updateRoomInfo(roomId);
        
        // 更新響應式佈局
        this.updateResponsiveLayout();
        
        // 顯示成功訊息
        this.showToast(`成功加入房間 ${roomId}`, 'success');
        
        // 切換遊戲狀態
        gameState = 'game';
        
        console.log(`🎮 遊戲開始 - 房間: ${roomId}`);
    }
    
    // 結束遊戲
    endGame() {
        this.isGameStarted = false;
        this.currentRoom = null;
        
        // 顯示登入面板
        if (this.loginPanel) {
            this.loginPanel.style.display = 'block';
        }
        
        // 隱藏遊戲介面
        if (this.gameInfo) {
            this.gameInfo.style.display = 'none';
        }
        
        if (this.gameControls) {
            this.gameControls.style.display = 'none';
        }
        
        // 切換遊戲狀態
        gameState = 'login';
        
        console.log('🚪 遊戲結束');
    }
    
    // 更新房間資訊
    updateRoomInfo(roomId) {
        if (this.currentRoomSpan) {
            this.currentRoomSpan.textContent = roomId || '-';
        }
    }
    
    // 更新玩家數量
    updatePlayerCount(count) {
        this.playerCount = count;
        if (this.playerCountSpan) {
            this.playerCountSpan.textContent = count.toString();
        }
    }
    
    // 更新遊戲狀態
    updateGameStatus(phase, extra = '') {
        this.gamePhase = phase;
        
        const statusText = {
            'waiting': '等待中',
            'voting': '投票中',
            'revealing': '開牌中',
            'finished': '已完成'
        };
        
        let displayText = statusText[phase] || '未知';
        if (extra) {
            displayText += ` ${extra}`;
        }
        
        if (this.gameStatusSpan) {
            this.gameStatusSpan.textContent = displayText;
        }
        
        // 更新控制按鈕狀態
        this.updateControlButtons(phase);
    }
    
    // 更新控制按鈕狀態
    updateControlButtons(phase) {
        if (this.revealBtn) {
            this.revealBtn.disabled = (phase !== 'voting' || this.playerCount === 0);
            this.revealBtn.textContent = phase === 'revealing' ? '開牌中...' : '🎭 開牌';
        }
        
        if (this.clearBtn) {
            this.clearBtn.disabled = (phase === 'waiting');
        }
    }
    
    // 更新投票進度
    updateVotingProgress(votedCount, totalCount) {
        const progressText = `(${votedCount}/${totalCount})`;
        this.updateGameStatus('voting', progressText);
        
        // 更新開牌按鈕狀態
        if (this.revealBtn) {
            const canReveal = totalCount > 0; // 只要有玩家就可以開牌
            this.revealBtn.disabled = !canReveal;
        }
    }
    
    // 顯示 Toast 通知
    showToast(message, type = 'info', duration = 3000) {
        if (!this.toast) return;
        
        this.toast.textContent = message;
        this.toast.className = `toast ${type}`;
        this.toast.classList.add('show');
        
        // 自動隱藏
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, duration);
        
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }
    
    // 顯示錯誤訊息
    showError(message) {
        this.showToast(message, 'error', 5000);
    }
    
    // 顯示成功訊息
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    
    // 顯示離開確認對話框
    showLeaveConfirmation() {
        const confirmed = confirm('確定要離開房間嗎？');
        if (confirmed) {
            this.leaveGame();
        }
    }
    
    // 離開遊戲
    leaveGame() {
        if (firebaseManager) {
            firebaseManager.leaveRoom();
        }
        
        this.endGame();
        this.showToast('已離開房間', 'info');
    }
    
    // 更新統計資料
    updateStatistics(votes) {
        const numericVotes = votes.filter(v => typeof v.value === 'number');
        
        if (numericVotes.length === 0) {
            this.statistics = {
                totalVotes: votes.length,
                averagePoints: 0,
                consensus: 0,
                devAverage: 0,
                qaAverage: 0
            };
            return;
        }
        
        // 計算平均分數
        const total = numericVotes.reduce((sum, vote) => sum + vote.value, 0);
        const average = total / numericVotes.length;
        
        // 計算共識度
        const variance = numericVotes.reduce((sum, vote) => 
            sum + Math.pow(vote.value - average, 2), 0) / numericVotes.length;
        const maxVariance = Math.pow(
            Math.max(...numericVotes.map(v => v.value)) - 
            Math.min(...numericVotes.map(v => v.value)), 2
        ) / 4;
        const consensus = Math.round((1 - (variance / (maxVariance || 1))) * 100);
        
        // 計算角色別平均
        const devVotes = numericVotes.filter(v => v.playerRole === 'dev');
        const qaVotes = numericVotes.filter(v => v.playerRole === 'qa');
        
        const devAverage = devVotes.length > 0 ? 
            devVotes.reduce((sum, vote) => sum + vote.value, 0) / devVotes.length : 0;
        const qaAverage = qaVotes.length > 0 ? 
            qaVotes.reduce((sum, vote) => sum + vote.value, 0) / qaVotes.length : 0;
        
        this.statistics = {
            totalVotes: votes.length,
            averagePoints: Math.round(average * 10) / 10,
            consensus: consensus,
            devAverage: Math.round(devAverage * 10) / 10,
            qaAverage: Math.round(qaAverage * 10) / 10
        };
    }
    
    // 繪製統計資訊（在 p5.js 畫布上）
    drawStatistics() {
        if (this.gamePhase !== 'finished') return;
        
        push();
        
        // 背景
        fill(0, 0, 0, 150);
        noStroke();
        rectMode(CORNER);
        rect(width - 250, 20, 220, 160, 10);
        
        // 標題
        fill(255);
        textAlign(LEFT, TOP);
        textSize(16);
        textStyle(BOLD);
        text('📊 投票統計', width - 240, 35);
        
        // 統計資料
        textSize(12);
        textStyle(NORMAL);
        let y = 55;
        
        text(`總投票數: ${this.statistics.totalVotes}`, width - 240, y);
        y += 18;
        
        if (this.statistics.averagePoints > 0) {
            text(`平均點數: ${this.statistics.averagePoints}`, width - 240, y);
            y += 18;
            
            text(`共識度: ${this.statistics.consensus}%`, width - 240, y);
            y += 18;
            
            if (this.statistics.devAverage > 0) {
                text(`開發平均: ${this.statistics.devAverage}`, width - 240, y);
                y += 18;
            }
            
            if (this.statistics.qaAverage > 0) {
                text(`測試平均: ${this.statistics.qaAverage}`, width - 240, y);
                y += 18;
            }
            
            // 共識度顏色條
            const barWidth = 180;
            const barHeight = 8;
            const barX = width - 240;
            const barY = y + 5;
            
            // 背景條
            fill(100);
            rect(barX, barY, barWidth, barHeight, 4);
            
            // 進度條
            const consensusColor = this.getConsensusColor(this.statistics.consensus);
            fill(consensusColor);
            const progressWidth = (this.statistics.consensus / 100) * barWidth;
            rect(barX, barY, progressWidth, barHeight, 4);
        }
        
        pop();
    }
    
    // 取得共識度顏色
    getConsensusColor(consensus) {
        if (consensus >= 80) return color(34, 197, 94);   // 綠色
        if (consensus >= 60) return color(251, 191, 36);  // 黃色
        if (consensus >= 40) return color(249, 115, 22);  // 橘色
        return color(239, 68, 68);                        // 紅色
    }
    
    // 繪製 UI 元素（在 p5.js 畫布上）
    draw() {
        if (!this.isGameStarted) return;
        
        // 繪製統計資訊
        this.drawStatistics();
        
        // 繪製快捷鍵提示
        this.drawShortcutHints();
        
        // 繪製連線狀態
        this.drawConnectionStatus();
    }
    
    // 繪製快捷鍵提示
    drawShortcutHints() {
        if (this.gamePhase !== 'voting') return;
        
        push();
        fill(255, 255, 255, 100);
        textAlign(RIGHT, BOTTOM);
        textSize(10);
        text('快捷鍵: 數字鍵投票, Ctrl+R 開牌, Ctrl+C 重設', width - 20, height - 40);
        text('ESC 離開房間', width - 20, height - 25);
        pop();
    }
    
    // 繪製連線狀態
    drawConnectionStatus() {
        if (!firebaseManager) return;
        
        const status = firebaseManager.getConnectionStatus();
        
        push();
        const statusColor = status.isConnected ? 
            (status.useFirebase ? color(34, 197, 94) : color(251, 191, 36)) : 
            color(239, 68, 68);
        
        fill(statusColor);
        noStroke();
        circle(width - 30, 30, 12);
        
        // 狀態文字
        fill(255, 200);
        textAlign(RIGHT, CENTER);
        textSize(10);
        const statusText = status.isConnected ? 
            (status.useFirebase ? 'Firebase' : '本地模式') : '已斷線';
        text(statusText, width - 45, 30);
        
        pop();
    }
    
    // 取得統計資料
    getStatistics() {
        return { ...this.statistics };
    }
    
    // 重設統計資料
    resetStatistics() {
        this.statistics = {
            totalVotes: 0,
            averagePoints: 0,
            consensus: 0,
            devAverage: 0,
            qaAverage: 0
        };
    }
}

console.log('🎨 UIManager 類別已載入');