// 遊戲整合邏輯 - 連接所有管理器和 UI 元素
// 全域函數供 HTML 呼叫

// 開始遊戲
async function startGame() {
    const playerName = document.getElementById('playerName').value.trim();
    const playerRole = document.getElementById('playerRole').value;
    const roomId = document.getElementById('roomId').value.trim();
    
    // 驗證輸入
    if (!playerName) {
        uiManager.showError('請輸入你的名字');
        return;
    }
    
    try {
        // 設定載入狀態
        gameState = 'loading';
        
        // 初始化 Firebase 設定
        const config = await getFirebaseConfig();
        
        // 初始化 Firebase Manager
        await firebaseManager.initialize(config);
        
        // 設定 Firebase 回調
        setupFirebaseCallbacks();
        
        // 加入房間
        const result = await firebaseManager.joinRoom(roomId, playerName, playerRole);
        
        if (result) {
            // 建立當前玩家
            currentPlayer = {
                id: result.playerId,
                name: playerName,
                role: playerRole
            };
            
            // 在遊戲桌面新增玩家
            gameTable.addPlayer(result.playerId, playerName, playerRole);
            
            // 啟動 UI
            uiManager.startGame(result.roomId, result.playerId);
            
            console.log('🎮 遊戲啟動成功');
        } else {
            throw new Error('無法加入房間');
        }
        
    } catch (error) {
        console.error('啟動遊戲失敗:', error);
        uiManager.showError('啟動遊戲失敗: ' + error.message);
        gameState = 'login';
    }
}

// 開牌
function revealCards() {
    if (!gameTable || !firebaseManager) {
        console.warn('遊戲未初始化');
        return;
    }
    
    // 觸發動畫效果
    animationManager.flash(color(251, 191, 36), 200);
    animationManager.shake(5, 300);
    
    // 執行開牌
    gameTable.revealCards();
    firebaseManager.revealCards();
    
    uiManager.showSuccess('開牌！');
}

// 清除投票
function clearVotes() {
    if (!gameTable || !firebaseManager) {
        console.warn('遊戲未初始化');
        return;
    }
    
    // 執行清除
    gameTable.clearVotes();
    firebaseManager.clearVotes();
    
    // 重設 UI 統計
    uiManager.resetStatistics();
    
    uiManager.showSuccess('重新開始！');
}

// 離開遊戲
function leaveGame() {
    if (firebaseManager) {
        firebaseManager.leaveRoom();
    }
    
    // 清除遊戲狀態
    currentPlayer = null;
    
    // 重設遊戲桌面
    if (gameTable) {
        gameTable.players = [];
    }
    
    // 清除動畫效果
    animationManager.clearAllEffects();
    
    // 結束 UI
    uiManager.endGame();
    
    console.log('👋 離開遊戲');
}

// 儲存 Firebase 設定
function saveFirebaseConfig() {
    const projectId = document.getElementById('projectId').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!projectId || !apiKey) {
        uiManager.showError('請填寫完整的 Firebase 設定');
        return;
    }
    
    // 儲存到 localStorage
    const config = { projectId, apiKey };
    localStorage.setItem('scrumPokerConfig', JSON.stringify(config));
    localStorage.removeItem('scrumPokerMode'); // 清除本地模式標記
    
    // 隱藏設定區域
    const configSection = document.querySelector('.firebase-config');
    if (configSection) {
        configSection.style.display = 'none';
    }
    
    uiManager.showSuccess('Firebase 設定已儲存！');
}

// 使用本地模式
function useLocalMode() {
    // 清除 Firebase 設定
    localStorage.removeItem('scrumPokerConfig');
    localStorage.setItem('scrumPokerMode', 'local');
    
    // 隱藏設定區域
    const configSection = document.querySelector('.firebase-config');
    if (configSection) {
        configSection.style.display = 'none';
    }
    
    uiManager.showSuccess('已切換到本地模式！');
}

// 取得 Firebase 設定
async function getFirebaseConfig() {
    const savedConfig = localStorage.getItem('scrumPokerConfig');
    const savedMode = localStorage.getItem('scrumPokerMode');
    
    if (savedConfig) {
        return JSON.parse(savedConfig);
    } else if (savedMode === 'local') {
        return null; // 使用本地模式
    } else {
        // 檢查是否有全域設定（從 firebase-config.js）
        if (typeof window.FIREBASE_CONFIG !== 'undefined') {
            return window.FIREBASE_CONFIG;
        }
        return null;
    }
}

// 設定 Firebase 回調函數
function setupFirebaseCallbacks() {
    if (!firebaseManager) return;
    
    firebaseManager.setCallbacks({
        onPlayerJoined: (playerData) => {
            console.log('玩家加入:', playerData.name);
            
            // 在遊戲桌面新增玩家
            if (gameTable && playerData.id !== currentPlayer?.id) {
                gameTable.addPlayer(playerData.id, playerData.name, playerData.role);
            }
            
            // 更新玩家數量
            const totalPlayers = gameTable ? gameTable.players.length : 0;
            uiManager.updatePlayerCount(totalPlayers);
            
            // 觸發加入動畫
            if (animationManager && gameTable) {
                const player = gameTable.players.find(p => p.id === playerData.id);
                if (player) {
                    animationManager.createCelebration(player.position.x, player.position.y);
                }
            }
            
            uiManager.showSuccess(`${playerData.name} 加入了遊戲`);
        },
        
        onPlayerLeft: (playerData) => {
            console.log('玩家離開:', playerData.name);
            
            // 從遊戲桌面移除玩家
            if (gameTable) {
                gameTable.removePlayer(playerData.id);
            }
            
            // 更新玩家數量
            const totalPlayers = gameTable ? gameTable.players.length : 0;
            uiManager.updatePlayerCount(totalPlayers);
            
            uiManager.showToast(`${playerData.name} 離開了遊戲`, 'info');
        },
        
        onVoteUpdated: (playerData) => {
            console.log('投票更新:', playerData.name, playerData.vote);
            
            // 更新遊戲桌面的玩家狀態
            if (gameTable) {
                const player = gameTable.players.find(p => p.id === playerData.id);
                if (player && playerData.hasVoted) {
                    player.setVote(playerData.vote);
                    
                    // 觸發投票動畫
                    if (animationManager) {
                        animationManager.createExplosion(player.position.x, player.position.y, 10);
                    }
                }
                
                // 更新投票進度
                const votedCount = gameTable.players.filter(p => p.hasVoted).length;
                const totalCount = gameTable.players.length;
                uiManager.updateVotingProgress(votedCount, totalCount);
            }
        },
        
        onGameStateChanged: (roomData) => {
            console.log('遊戲狀態變更:', roomData.phase);
            
            if (roomData.phase === 'revealing') {
                // 開牌階段
                uiManager.updateGameStatus('revealing');
                
                if (gameTable) {
                    gameTable.gamePhase = 'revealing';
                    gameTable.revealStartTime = millis();
                }
                
                // 觸發開牌動畫
                if (animationManager) {
                    animationManager.flash(color(34, 197, 94), 500);
                    animationManager.shake(8, 400);
                }
            } else if (roomData.phase === 'voting') {
                // 投票階段
                uiManager.updateGameStatus('voting');
                
                if (gameTable) {
                    gameTable.gamePhase = 'voting';
                }
            } else if (roomData.phase === 'finished') {
                // 完成階段
                uiManager.updateGameStatus('finished');
                
                if (gameTable) {
                    gameTable.gamePhase = 'finished';
                }
                
                // 更新統計資料
                if (roomData.votes) {
                    const votes = Object.values(roomData.votes);
                    uiManager.updateStatistics(votes);
                }
                
                // 觸發慶祝動畫
                if (animationManager && gameTable) {
                    for (const player of gameTable.players) {
                        if (player.hasVoted) {
                            setTimeout(() => {
                                animationManager.createCelebration(player.position.x, player.position.y);
                            }, Math.random() * 1000);
                        }
                    }
                }
            }
        },
        
        onError: (errorMessage) => {
            console.error('Firebase 錯誤:', errorMessage);
            uiManager.showError(errorMessage);
        }
    });
}

// Scrum Master 建議系統
class ScrumMasterAdvice {
    constructor() {
        this.suggestions = [];
        this.isVisible = false;
    }
    
    // 分析投票結果並產生建議
    analyzeVotes(votes) {
        this.suggestions = [];
        
        if (votes.length === 0) return;
        
        const numericVotes = votes.filter(v => typeof v.value === 'number');
        const devVotes = numericVotes.filter(v => v.playerRole === 'dev');
        const qaVotes = numericVotes.filter(v => v.playerRole === 'qa');
        
        // 計算統計數據
        const allAverage = numericVotes.reduce((sum, v) => sum + v.value, 0) / numericVotes.length;
        const devAverage = devVotes.length > 0 ? devVotes.reduce((sum, v) => sum + v.value, 0) / devVotes.length : 0;
        const qaAverage = qaVotes.length > 0 ? qaVotes.reduce((sum, v) => sum + v.value, 0) / qaVotes.length : 0;
        
        const variance = numericVotes.reduce((sum, v) => sum + Math.pow(v.value - allAverage, 2), 0) / numericVotes.length;
        const isHighVariance = variance > 4;
        
        // 產生建議
        if (devVotes.length > 0 && qaVotes.length > 0) {
            const devQaDiff = Math.abs(devAverage - qaAverage);
            
            if (devQaDiff > 3) {
                if (devAverage > qaAverage) {
                    this.suggestions.push({
                        type: 'role_gap',
                        title: '開發與測試估點差異較大',
                        message: '開發團隊的估點明顯高於測試團隊，可能需要討論技術複雜度與測試策略的認知差異。',
                        icon: '⚠️'
                    });
                } else {
                    this.suggestions.push({
                        type: 'role_gap',
                        title: '測試估點高於開發估點',
                        message: '測試團隊認為此功能測試複雜度較高，建議討論測試範圍與自動化測試的可能性。',
                        icon: '🔍'
                    });
                }
            }
        }
        
        if (isHighVariance) {
            this.suggestions.push({
                type: 'high_variance',
                title: '估點分歧較大',
                message: '團隊對此功能的複雜度認知差異較大，建議進一步討論需求細節和實作方式。',
                icon: '💭'
            });
        }
        
        if (allAverage > 8) {
            this.suggestions.push({
                type: 'high_complexity',
                title: '高複雜度功能',
                message: '此功能複雜度較高，建議考慮拆分成較小的 User Story，或分階段實作。',
                icon: '🔨'
            });
        }
        
        if (numericVotes.length > 0 && variance < 1) {
            this.suggestions.push({
                type: 'good_consensus',
                title: '團隊共識良好',
                message: '團隊對此功能的複雜度認知一致，可以放心進行開發規劃。',
                icon: '✅'
            });
        }
        
        // 特殊卡牌建議
        const coffeeVotes = votes.filter(v => v.value === 'coffee');
        const questionVotes = votes.filter(v => v.value === 'question');
        
        if (coffeeVotes.length > 0) {
            this.suggestions.push({
                type: 'break_needed',
                title: '休息時間',
                message: `${coffeeVotes.length} 位成員建議休息，考慮安排短暫休息後再繼續討論。`,
                icon: '☕'
            });
        }
        
        if (questionVotes.length > 0) {
            this.suggestions.push({
                type: 'unclear_requirements',
                title: '需求不明確',
                message: `${questionVotes.length} 位成員對需求有疑問，建議先澄清需求細節再重新估點。`,
                icon: '❓'
            });
        }
    }
    
    // 繪製建議面板
    draw() {
        if (!this.isVisible || this.suggestions.length === 0) return;
        
        push();
        
        // 背景
        fill(0, 0, 0, 180);
        noStroke();
        rectMode(CORNER);
        const panelWidth = 350;
        const panelHeight = Math.min(400, this.suggestions.length * 80 + 60);
        const panelX = width - panelWidth - 20;
        const panelY = height - panelHeight - 100;
        
        rect(panelX, panelY, panelWidth, panelHeight, 15);
        
        // 標題
        fill(GAME_CONFIG.colors.accent);
        textAlign(LEFT, TOP);
        textSize(18);
        textStyle(BOLD);
        text('🎯 Scrum Master 建議', panelX + 20, panelY + 20);
        
        // 建議列表
        textStyle(NORMAL);
        let currentY = panelY + 50;
        
        for (const suggestion of this.suggestions) {
            // 圖示
            textSize(20);
            text(suggestion.icon, panelX + 20, currentY);
            
            // 標題
            fill(255);
            textSize(14);
            textStyle(BOLD);
            text(suggestion.title, panelX + 50, currentY);
            
            // 訊息
            fill(200);
            textSize(12);
            textStyle(NORMAL);
            const messageLines = this.wrapText(suggestion.message, panelWidth - 70);
            for (let i = 0; i < messageLines.length; i++) {
                text(messageLines[i], panelX + 50, currentY + 20 + i * 15);
            }
            
            currentY += 70;
        }
        
        pop();
    }
    
    // 文字換行
    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (textWidth(testLine) <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    // 顯示建議
    show() {
        this.isVisible = true;
    }
    
    // 隱藏建議
    hide() {
        this.isVisible = false;
    }
    
    // 切換顯示狀態
    toggle() {
        this.isVisible = !this.isVisible;
    }
}

// 建立 Scrum Master 建議系統實例
let scrumMasterAdvice;

// 當頁面載入完成時初始化
window.addEventListener('DOMContentLoaded', () => {
    scrumMasterAdvice = new ScrumMasterAdvice();
    console.log('🎯 Scrum Master 建議系統已初始化');
});

// 在 UIManager 的 draw 方法中新增建議面板繪製
if (typeof UIManager !== 'undefined') {
    const originalDraw = UIManager.prototype.draw;
    UIManager.prototype.draw = function() {
        originalDraw.call(this);
        
        // 繪製 Scrum Master 建議
        if (scrumMasterAdvice && this.gamePhase === 'finished') {
            scrumMasterAdvice.draw();
        }
    };
    
    // 覆寫統計更新方法以包含建議分析
    const originalUpdateStatistics = UIManager.prototype.updateStatistics;
    UIManager.prototype.updateStatistics = function(votes) {
        originalUpdateStatistics.call(this, votes);
        
        // 分析投票並產生建議
        if (scrumMasterAdvice) {
            scrumMasterAdvice.analyzeVotes(votes);
            scrumMasterAdvice.show();
        }
    };
}

// 鍵盤快捷鍵處理
document.addEventListener('keydown', (event) => {
    if (gameState === 'game') {
        // H 鍵切換建議面板
        if (event.code === 'KeyH' && scrumMasterAdvice) {
            scrumMasterAdvice.toggle();
        }
        
        // 空白鍵開牌
        if (event.code === 'Space') {
            event.preventDefault();
            revealCards();
        }
    }
});

console.log('🎮 遊戲整合邏輯已載入');