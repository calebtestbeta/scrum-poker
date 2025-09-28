// UI 管理器 - 處理介面元素和使用者互動
class UIManager {
    constructor() {
        // DOM 元素引用
        this.loginPanel = document.getElementById('loginPanel');
        this.gameControls = document.getElementById('gameControls');
        this.toast = document.getElementById('toast');
        
        // gameInfo 相關元素已移除，改由畫布顯示
        
        // 控制按鈕
        this.revealBtn = document.getElementById('revealBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        // 初始化按鈕事件監聽器
        this.initializeButtonListeners();
        
        // 狀態
        this.isGameStarted = false;
        this.currentRoom = null;
        this.playerCount = 0;
        this.gamePhase = 'waiting';
        
        // 確認對話框狀態
        this.confirmDialog = {
            visible: false,
            title: '',
            message: '',
            playerName: '',
            playerId: '',
            onConfirm: null,
            onCancel: null
        };
        
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
    
    // 初始化按鈕事件監聽器
    initializeButtonListeners() {
        console.log('🔧 初始化按鈕事件監聽器');
        
        // 檢查按鈕是否存在
        if (this.revealBtn) {
            console.log('✅ 開牌按鈕找到，綁定事件監聽器');
            // 添加額外的事件監聽器作為備用
            this.revealBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎭 開牌按鈕被點擊 (事件監聽器)');
                if (typeof revealCards === 'function') {
                    revealCards();
                } else {
                    console.error('❌ revealCards 函數未定義');
                }
            });
        } else {
            console.error('❌ 開牌按鈕未找到');
        }
        
        if (this.clearBtn) {
            console.log('✅ 重新開始按鈕找到，綁定事件監聽器');
            // 添加額外的事件監聽器作為備用
            this.clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 重新開始按鈕被點擊 (事件監聽器)');
                if (typeof clearVotes === 'function') {
                    clearVotes();
                } else {
                    console.error('❌ clearVotes 函數未定義');
                }
            });
        } else {
            console.error('❌ 重新開始按鈕未找到');
        }
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
            // 行動版佈局調整（gameInfo 已移除）
            
            if (this.gameControls) {
                this.gameControls.style.position = 'relative';
                this.gameControls.style.textAlign = 'center';
            }
        } else {
            // 桌面版佈局（gameInfo 已移除）
            
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
        
        // 遊戲介面顯示（gameInfo 已移除）
        
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
        
        // 隱藏遊戲介面（gameInfo 已移除）
        
        if (this.gameControls) {
            this.gameControls.style.display = 'none';
        }
        
        // 切換遊戲狀態
        gameState = 'login';
        
        console.log('🚪 遊戲結束');
    }
    
    // 更新房間資訊（現由畫布顯示）
    updateRoomInfo(roomId) {
        // gameInfo DOM 元素已移除，資訊由畫布顯示
        console.log(`🏠 房間資訊更新: ${roomId}`);
    }
    
    // 更新玩家數量（現由畫布顯示）
    updatePlayerCount(count) {
        this.playerCount = count;
        console.log(`👥 玩家數量更新: ${count}`);
    }
    
    // 更新遊戲狀態（現由畫布顯示）
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
        
        console.log(`🎮 遊戲狀態更新: ${displayText}`);
        
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
    
    // 繪製畫布上的遊戲資訊（避免被其他元素遮蔽）
    draw() {
        if (!this.isGameStarted) return;
        
        push();
        
        // 繪製半透明背景
        fill(0, 0, 0, 120);
        noStroke();
        rectMode(CORNER);
        
        // 計算位置（畫布中央上方）
        const infoWidth = 300;
        const infoHeight = 80;
        const infoX = (width - infoWidth) / 2;
        const infoY = 30;
        
        rect(infoX, infoY, infoWidth, infoHeight, 10);
        
        // 繪製文字資訊
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        textStyle(BOLD);
        
        const centerX = infoX + infoWidth / 2;
        let currentY = infoY + 20;
        
        // 房間資訊
        text(`房間: ${this.currentRoom || 'N/A'}`, centerX, currentY);
        currentY += 20;
        
        // 玩家和狀態資訊
        const statusText = this.gamePhase === 'voting' ? 
            `投票中 (${this.playerCount} 玩家)` : 
            `${this.gamePhase === 'revealing' ? '開牌中' : '等待中'} (${this.playerCount} 玩家)`;
        
        text(statusText, centerX, currentY);
        
        pop();
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
        rect(width - 280, 20, 250, 220, 10);
        
        // 標題
        fill(255);
        textAlign(LEFT, TOP);
        textSize(16);
        textStyle(BOLD);
        text('📊 分組估點結果', width - 270, 35);
        
        // 統計資料
        textSize(12);
        textStyle(NORMAL);
        let y = 55;
        
        text(`總投票數: ${this.statistics.totalVotes}`, width - 270, y);
        y += 20;
        
        // Dev 組結果
        if (this.statistics.devAverage > 0) {
            fill(color(52, 211, 153)); // 青綠色
            textStyle(BOLD);
            text(`👨‍💻 開發組 (Dev)`, width - 270, y);
            y += 16;
            textStyle(NORMAL);
            fill(255);
            text(`  平均點數: ${this.statistics.devAverage}`, width - 270, y);
            y += 16;
            text(`  複雜度評估: ${this.getComplexityLabel(this.statistics.devAverage)}`, width - 270, y);
            y += 20;
        }
        
        // QA 組結果
        if (this.statistics.qaAverage > 0) {
            fill(color(251, 146, 60)); // 橘色
            textStyle(BOLD);
            text(`🐛 測試組 (QA)`, width - 270, y);
            y += 16;
            textStyle(NORMAL);
            fill(255);
            text(`  平均點數: ${this.statistics.qaAverage}`, width - 270, y);
            y += 16;
            text(`  測試複雜度: ${this.getComplexityLabel(this.statistics.qaAverage)}`, width - 270, y);
            y += 20;
        }
        
        // 差異分析
        if (this.statistics.devAverage > 0 && this.statistics.qaAverage > 0) {
            const diff = Math.abs(this.statistics.devAverage - this.statistics.qaAverage);
            const diffColor = diff > 3 ? color(239, 68, 68) : color(34, 197, 94);
            fill(diffColor);
            textStyle(BOLD);
            text(`⚖️ 差異分析: ${diff.toFixed(1)} 點`, width - 270, y);
            y += 16;
            textStyle(NORMAL);
            fill(255);
            text(`  ${this.getDifferenceAnalysis(diff)}`, width - 270, y);
        }
        
        pop();
    }
    
    // 取得複雜度標籤
    getComplexityLabel(average) {
        if (average <= 2) return '簡單';
        if (average <= 5) return '中等';
        if (average <= 13) return '複雜';
        return '極複雜';
    }
    
    // 取得差異分析
    getDifferenceAnalysis(diff) {
        if (diff <= 1) return '認知一致，可直接進行';
        if (diff <= 3) return '些微差異，建議討論';
        if (diff <= 5) return '顯著差異，需要澄清';
        return '重大分歧，須深入討論';
    }
    
    // 取得共識度顏色
    getConsensusColor(consensus) {
        if (consensus >= 80) return color(34, 197, 94);   // 綠色
        if (consensus >= 60) return color(251, 191, 36);  // 黃色
        if (consensus >= 40) return color(249, 115, 22);  // 橘色
        return color(239, 68, 68);                        // 紅色
    }
    
    // 顯示刪除確認對話框
    showDeleteConfirmation(playerName, playerId, onConfirm, onCancel) {
        this.confirmDialog = {
            visible: true,
            title: '⚠️ 確認移除玩家',
            message: `確定要移除玩家 "${playerName}" 嗎？\n\n移除後該玩家將無法繼續參與本局遊戲。\n這個操作無法復原。`,
            playerName: playerName,
            playerId: playerId,
            onConfirm: onConfirm,
            onCancel: onCancel
        };
    }
    
    // 隱藏確認對話框
    hideConfirmDialog() {
        this.confirmDialog.visible = false;
        this.confirmDialog.onConfirm = null;
        this.confirmDialog.onCancel = null;
    }
    
    // 處理確認對話框按鈕點擊
    handleConfirmDialogClick(mx, my) {
        if (!this.confirmDialog.visible) return false;
        
        const dialogWidth = 400;
        const dialogHeight = 200;
        const dialogX = width / 2 - dialogWidth / 2;
        const dialogY = height / 2 - dialogHeight / 2;
        
        // 確認按鈕區域
        const confirmBtnX = dialogX + dialogWidth / 2 - 120;
        const confirmBtnY = dialogY + dialogHeight - 50;
        const confirmBtnW = 100;
        const confirmBtnH = 35;
        
        // 取消按鈕區域
        const cancelBtnX = dialogX + dialogWidth / 2 + 20;
        const cancelBtnY = dialogY + dialogHeight - 50;
        const cancelBtnW = 100;
        const cancelBtnH = 35;
        
        // 檢查是否點擊確認按鈕
        if (mx >= confirmBtnX && mx <= confirmBtnX + confirmBtnW &&
            my >= confirmBtnY && my <= confirmBtnY + confirmBtnH) {
            if (this.confirmDialog.onConfirm) {
                this.confirmDialog.onConfirm();
            }
            this.hideConfirmDialog();
            return true;
        }
        
        // 檢查是否點擊取消按鈕
        if (mx >= cancelBtnX && mx <= cancelBtnX + cancelBtnW &&
            my >= cancelBtnY && my <= cancelBtnY + cancelBtnH) {
            if (this.confirmDialog.onCancel) {
                this.confirmDialog.onCancel();
            }
            this.hideConfirmDialog();
            return true;
        }
        
        // 檢查是否點擊對話框外部（關閉對話框）
        if (mx < dialogX || mx > dialogX + dialogWidth ||
            my < dialogY || my > dialogY + dialogHeight) {
            if (this.confirmDialog.onCancel) {
                this.confirmDialog.onCancel();
            }
            this.hideConfirmDialog();
            return true;
        }
        
        return true; // 阻止事件穿透
    }
    
    // 繪製確認對話框
    drawConfirmDialog() {
        if (!this.confirmDialog.visible) return;
        
        push();
        
        // 背景遮罩
        fill(0, 0, 0, 150);
        noStroke();
        rect(0, 0, width, height);
        
        // 對話框背景
        const dialogWidth = 400;
        const dialogHeight = 200;
        const dialogX = width / 2 - dialogWidth / 2;
        const dialogY = height / 2 - dialogHeight / 2;
        
        fill(45, 45, 45);
        stroke(255, 255, 255, 100);
        strokeWeight(2);
        rectMode(CORNER);
        rect(dialogX, dialogY, dialogWidth, dialogHeight, 15);
        
        // 標題
        fill(255, 200, 200);
        textAlign(CENTER, TOP);
        textSize(18);
        textStyle(BOLD);
        text(this.confirmDialog.title, dialogX + dialogWidth / 2, dialogY + 20);
        
        // 訊息
        fill(255);
        textAlign(CENTER, TOP);
        textSize(14);
        textStyle(NORMAL);
        const messageLines = this.confirmDialog.message.split('\n');
        let messageY = dialogY + 50;
        for (const line of messageLines) {
            text(line, dialogX + dialogWidth / 2, messageY);
            messageY += 18;
        }
        
        // 按鈕
        const buttonY = dialogY + dialogHeight - 50;
        const buttonHeight = 35;
        
        // 確認按鈕
        fill(220, 38, 38);
        stroke(255, 255, 255, 150);
        strokeWeight(1);
        rectMode(CORNER);
        rect(dialogX + dialogWidth / 2 - 120, buttonY, 100, buttonHeight, 8);
        
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(14);
        textStyle(BOLD);
        text('確認移除', dialogX + dialogWidth / 2 - 70, buttonY + buttonHeight / 2);
        
        // 取消按鈕
        fill(100, 100, 100);
        stroke(255, 255, 255, 100);
        strokeWeight(1);
        rect(dialogX + dialogWidth / 2 + 20, buttonY, 100, buttonHeight, 8);
        
        fill(255);
        text('取消', dialogX + dialogWidth / 2 + 70, buttonY + buttonHeight / 2);
        
        pop();
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
        
        // 繪製確認對話框（最後繪製，確保在最上層）
        this.drawConfirmDialog();
    }
    
    // 繪製快捷鍵提示
    drawShortcutHints() {
        push();
        fill(255, 255, 255, 120);
        textAlign(RIGHT, BOTTOM);
        textSize(10);
        
        if (this.gamePhase === 'voting') {
            text('💡 點擊下方卡牌選擇點數', width - 20, height - 85);
            text('快捷鍵: 數字鍵投票, R 鍵開牌, C 鍵重設', width - 20, height - 70);
        } else if (this.gamePhase === 'finished') {
            text('💡 估點完成！按 H 鍵查看 Scrum Master 建議', width - 20, height - 70);
        }
        
        // 刪除功能提示
        fill(255, 200, 200, 120);
        text('🗑️ 刪除玩家: 按 D 鍵或點擊玩家頭像顯示刪除按鈕', width - 20, height - 55);
        
        // 通用快捷鍵
        fill(255, 255, 255, 100);
        text('ESC 離開房間, H 鍵查看建議, D 鍵切換刪除按鈕', width - 20, height - 40);
        text('點擊紅色 X 按鈕移除對應玩家（不可移除自己）', width - 20, height - 25);
        
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
        let statusText = '已斷線';
        if (status.isConnected) {
            if (status.useFirebase) {
                statusText = status.isAuthenticated ? 'Firebase ✓' : 'Firebase (未驗證)';
            } else {
                statusText = '本地模式';
            }
        }
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