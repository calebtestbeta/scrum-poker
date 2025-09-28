// Scrum Poker p5.js 主程式
// 全域變數
let gameTable;
let firebaseManager;
let uiManager;
let animationManager;
let currentPlayer = null;
let gameState = 'login';
let canvas;

// 遊戲設定
const GAME_CONFIG = {
    canvas: {
        width: 1200,
        height: 800,
        minWidth: 320,
        minHeight: 568
    },
    table: {
        centerX: 600,
        centerY: 400,
        radius: 280,
        innerRadius: 150
    },
    cards: {
        width: 80,
        height: 120,
        cornerRadius: 10
    },
    colors: {
        background: '#1e3a8a',
        table: '#8b4513',
        tableHighlight: '#a0522d',
        cardBack: '#1e40af',
        cardFront: '#ffffff',
        playerSeat: '#374151',
        playerActive: '#10b981',
        accent: '#f59e0b'
    },
    fibonacci: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, '☕', '❓', '∞'],
    // 觸控和響應式設定
    touch: {
        tapThreshold: 10, // 點擊閥值（像素）
        doubleTapTime: 300, // 雙擊時間閥值（毫秒）
        longPressTime: 500, // 長按時間閥值（毫秒）
        swipeThreshold: 50 // 滑動閥值（像素）
    },
    responsive: {
        mobileBreakpoint: 768,
        tabletBreakpoint: 1024,
        cardScaleMobile: 0.8,
        cardScaleTablet: 0.9
    }
};

// 觸控狀態追蹤
let touchState = {
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    touchStartTime: 0,
    touchStartX: 0,
    touchStartY: 0,
    isTouching: false,
    isLongPress: false,
    swipeDirection: null
};

// 裝置檢測
let deviceInfo = {
    isMobile: false,
    isTablet: false,
    isTouch: false,
    pixelRatio: 1
};

// 版本信息
const VERSION_HASH = '035381c8';
const BUILD_TIME = '20250928_0940';
const VERSION_STRING = `v${VERSION_HASH}-${BUILD_TIME}`;

// p5.js 設定函數
function setup() {
    // 顯示版本信息
    console.log(`🎮 Scrum Poker 遊戲版本: ${VERSION_STRING}`);
    console.log(`📅 構建時間: ${BUILD_TIME}`);
    console.log(`🔑 版本代碼: ${VERSION_HASH}`);
    
    // 檢測裝置類型
    detectDevice();
    
    // 建立畫布
    setupCanvas();
    
    // 初始化管理器
    try {
        firebaseManager = new FirebaseManager();
    } catch (error) {
        console.error('FirebaseManager 初始化失敗:', error);
        firebaseManager = null;
    }
    
    try {
        uiManager = new UIManager();
    } catch (error) {
        console.error('UIManager 初始化失敗:', error);
        uiManager = null;
    }
    
    try {
        animationManager = new AnimationManager();
    } catch (error) {
        console.error('AnimationManager 初始化失敗:', error);
        animationManager = null;
    }
    
    try {
        gameTable = new GameTable();
    } catch (error) {
        console.error('GameTable 初始化失敗:', error);
        gameTable = null;
    }
    
    // 檢查 URL 參數
    checkUrlParams();
    
    // 檢查已儲存的 Firebase 設定
    checkSavedConfig();
    
    // 設定觸控優化
    setupTouchOptimizations();
    
    console.log('🎮 Scrum Poker p5.js 版本已初始化');
    console.log('📱 裝置資訊:', deviceInfo);
}

// p5.js 繪製函數
function draw() {
    // 清除畫布
    background(GAME_CONFIG.colors.background);
    
    // 根據遊戲狀態繪製不同內容
    switch (gameState) {
        case 'login':
            drawLoginState();
            break;
        case 'game':
            drawGameState();
            break;
        case 'loading':
            drawLoadingState();
            break;
    }
    
    // 更新動畫
    if (animationManager) {
        animationManager.update();
    }
}

// 繪製登入狀態
function drawLoginState() {
    // 繪製背景圖案
    drawBackgroundPattern();
    
    // 繪製標題
    push();
    textAlign(CENTER, CENTER);
    textSize(48);
    fill(255, 255, 255, 100);
    text('🎮', width / 2, height / 2 - 100);
    
    textSize(32);
    fill(255);
    text('Scrum Poker 遊戲版', width / 2, height / 2 - 40);
    
    textSize(16);
    fill(255, 255, 255, 150);
    text('請在登入面板中輸入資訊開始遊戲', width / 2, height / 2 + 20);
    pop();
}

// 繪製遊戲狀態
function drawGameState() {
    if (!gameTable) return;
    
    // 繪製遊戲桌面
    gameTable.draw();
    
    // 繪製 UI 元素
    if (uiManager) {
        uiManager.draw();
    }
}

// 繪製載入狀態
function drawLoadingState() {
    push();
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(255);
    text('正在連線到遊戲房間...', width / 2, height / 2);
    
    // 載入動畫
    const time = millis() * 0.005;
    for (let i = 0; i < 3; i++) {
        const angle = time + i * TWO_PI / 3;
        const x = width / 2 + cos(angle) * 30;
        const y = height / 2 + 40 + sin(angle) * 10;
        circle(x, y, 8);
    }
    pop();
}

// 繪製背景圖案
function drawBackgroundPattern() {
    push();
    stroke(255, 255, 255, 20);
    strokeWeight(1);
    noFill();
    
    // 繪製網格圖案
    for (let x = 0; x < width; x += 50) {
        line(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 50) {
        line(0, y, width, y);
    }
    
    // 繪製中央圓圈
    circle(width / 2, height / 2, 400);
    circle(width / 2, height / 2, 300);
    pop();
}

// 建立響應式畫布
function setupCanvas() {
    let canvasWidth = GAME_CONFIG.canvas.width;
    let canvasHeight = GAME_CONFIG.canvas.height;
    
    // 響應式調整
    if (windowWidth < canvasWidth || windowHeight < canvasHeight) {
        const scaleX = windowWidth / canvasWidth;
        const scaleY = windowHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY) * 0.9;
        
        canvasWidth *= scale;
        canvasHeight *= scale;
    }
    
    // 確保最小尺寸
    canvasWidth = Math.max(canvasWidth, GAME_CONFIG.canvas.minWidth);
    canvasHeight = Math.max(canvasHeight, GAME_CONFIG.canvas.minHeight);
    
    // 移除舊畫布（如果存在）
    if (canvas) {
        canvas.remove();
    }
    
    // 使用 p5.js 的 createCanvas 函數建立新畫布
    canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('gameContainer');
    
    // 更新遊戲設定
    GAME_CONFIG.table.centerX = canvasWidth / 2;
    GAME_CONFIG.table.centerY = canvasHeight / 2;
    
    console.log(`🖼️ 畫布建立完成: ${canvasWidth}x${canvasHeight}`);
    
    // 重新初始化動畫背景元素
    if (animationManager && typeof animationManager.initializeBackgroundElements === 'function') {
        animationManager.initializeBackgroundElements();
    }
}

// 注意：windowResized 函數在檔案後面已定義

// 滑鼠點擊事件
function mousePressed() {
    if (gameState === 'game' && gameTable) {
        gameTable.handleMousePressed(mouseX, mouseY);
    }
}

// 滑鼠釋放事件
function mouseReleased() {
    if (gameState === 'game' && gameTable) {
        gameTable.handleMouseReleased(mouseX, mouseY);
    }
}

// 滑鼠移動事件
function mouseMoved() {
    if (gameState === 'game' && gameTable) {
        gameTable.handleMouseMoved(mouseX, mouseY);
    }
}

// 滑鼠拖拽事件
function mouseDragged() {
    if (gameState === 'game' && gameTable) {
        gameTable.handleMouseDragged(mouseX, mouseY);
    }
}

// 鍵盤事件
function keyPressed() {
    // ESC 鍵返回登入畫面
    if (keyCode === ESCAPE) {
        leaveGame();
    }
    
    // 只在遊戲狀態下處理遊戲相關按鍵
    if (gameState === 'game' && gameTable) {
        // 數字鍵快速投票
        if (key >= '0' && key <= '9') {
            const number = parseInt(key);
            if (GAME_CONFIG.fibonacci.includes(number)) {
                gameTable.selectCard(number);
            }
        }
        
        // D 鍵切換刪除按鈕顯示
        if (key === 'D' || key === 'd') {
            const currentPlayer = gameTable.players.find(p => p.isCurrentPlayer);
            if (currentPlayer) {
                gameTable.togglePlayerDeleteButtons(currentPlayer);
            }
        }
        
        // H 鍵顯示 Scrum Master 建議
        if (key === 'H' || key === 'h') {
            if (gameTable.gamePhase === 'finished') {
                // 顯示 Scrum Master 建議對話框
                showScrumMasterAdvice();
            } else if (uiManager) {
                uiManager.showToast('完成估點後按 H 鍵查看 Scrum Master 建議', 'info');
            }
        }
        
        // R 鍵開牌（單獨按 R 鍵即可）
        if (key === 'R' || key === 'r') {
            if (gameTable.gamePhase === 'voting') {
                gameTable.revealCards();
            }
        }
        
        // C 鍵清除投票（單獨按 C 鍵即可）
        if (key === 'C' || key === 'c') {
            gameTable.clearVotes();
        }
    }
}

// 檢查 URL 參數
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId) {
        document.getElementById('roomId').value = roomId;
    }
}

// 檢查已儲存的設定
function checkSavedConfig() {
    const savedConfig = localStorage.getItem('scrumPokerConfig');
    const savedMode = localStorage.getItem('scrumPokerMode');
    
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        document.getElementById('projectId').value = config.projectId;
        document.getElementById('apiKey').value = config.apiKey;
        
        // 自動隱藏 Firebase 設定區域
        const configSection = document.querySelector('.firebase-config');
        if (configSection) {
            configSection.style.display = 'none';
        }
    } else if (savedMode === 'local') {
        // 自動隱藏 Firebase 設定區域
        const configSection = document.querySelector('.firebase-config');
        if (configSection) {
            configSection.style.display = 'none';
        }
    }
}

// 工具函數：顯示 Toast 通知
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 工具函數：格式化點數顯示
function formatPoints(points) {
    if (points === 'coffee') return '☕';
    if (points === 'question') return '❓';
    if (points === 'infinity') return '∞';
    return points.toString();
}

// 工具函數：生成隨機 ID
function generateId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 工具函數：計算兩點間距離
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// 工具函數：角度計算
function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

// 工具函數：貝塞爾曲線點
function bezierPoint(t, p0, p1, p2, p3) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    
    return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
}

// 顯示 Scrum Master 建議
function showScrumMasterAdvice() {
    if (!gameTable || !uiManager) return;
    
    const gameState = gameTable.getGameState();
    const devPlayers = gameState.players.filter(p => p.role === 'dev' && p.hasVoted);
    const qaPlayers = gameState.players.filter(p => p.role === 'qa' && p.hasVoted);
    
    if (devPlayers.length === 0 && qaPlayers.length === 0) {
        uiManager.showToast('還沒有人投票，無法提供建議', 'info');
        return;
    }
    
    let adviceMessage = '📋 Scrum Master 建議\n\n';
    
    if (devPlayers.length > 0) {
        const devAvg = devPlayers.reduce((sum, p) => sum + (typeof p.vote === 'number' ? p.vote : 0), 0) / devPlayers.length;
        adviceMessage += `👨‍💻 開發組平均: ${devAvg.toFixed(1)} 點\n`;
    }
    
    if (qaPlayers.length > 0) {
        const qaAvg = qaPlayers.reduce((sum, p) => sum + (typeof p.vote === 'number' ? p.vote : 0), 0) / qaPlayers.length;
        adviceMessage += `🐛 測試組平均: ${qaAvg.toFixed(1)} 點\n`;
    }
    
    if (devPlayers.length > 0 && qaPlayers.length > 0) {
        const devAvg = devPlayers.reduce((sum, p) => sum + (typeof p.vote === 'number' ? p.vote : 0), 0) / devPlayers.length;
        const qaAvg = qaPlayers.reduce((sum, p) => sum + (typeof p.vote === 'number' ? p.vote : 0), 0) / qaPlayers.length;
        const diff = Math.abs(devAvg - qaAvg);
        
        adviceMessage += `\n⚖️ 差異分析: ${diff.toFixed(1)} 點\n`;
        
        if (diff <= 1) {
            adviceMessage += '✅ 建議: 認知一致，可直接進行開發';
        } else if (diff <= 3) {
            adviceMessage += '💬 建議: 存在些微差異，建議簡短討論澄清需求';
        } else if (diff <= 5) {
            adviceMessage += '🔍 建議: 顯著差異，需要仔細檢視需求和實作細節';
        } else {
            adviceMessage += '⚠️ 建議: 重大分歧，須召開會議深入討論需求和技術方案';
        }
    }
    
    // 使用瀏覽器原生對話框顯示建議
    alert(adviceMessage);
}

// ===== 觸控和響應式設計功能 =====

// 檢測裝置類型
function detectDevice() {
    deviceInfo.isMobile = windowWidth <= GAME_CONFIG.responsive.mobileBreakpoint;
    deviceInfo.isTablet = windowWidth > GAME_CONFIG.responsive.mobileBreakpoint && 
                         windowWidth <= GAME_CONFIG.responsive.tabletBreakpoint;
    
    // 更強健的觸控檢測，特別針對 Safari
    deviceInfo.isTouch = 'ontouchstart' in window || 
                        'ontouchstart' in document.documentElement ||
                        navigator.maxTouchPoints > 0 ||
                        navigator.msMaxTouchPoints > 0;
    
    deviceInfo.pixelRatio = window.devicePixelRatio || 1;
    
    // 檢測用戶代理字串
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
        deviceInfo.isMobile = true;
        deviceInfo.isTouch = true; // 強制開啟觸控
    }
    if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
        deviceInfo.isTablet = true;
        deviceInfo.isTouch = true; // 強制開啟觸控
    }
    if (userAgent.includes('safari') && (userAgent.includes('iphone') || userAgent.includes('ipad'))) {
        deviceInfo.isTouch = true; // Safari iOS 特別處理
    }
    
    console.log('🔍 裝置檢測結果:', deviceInfo);
}

// 設定觸控優化
function setupTouchOptimizations() {
    if (deviceInfo.isMobile) {
        // 行動裝置優化
        GAME_CONFIG.cards.width *= GAME_CONFIG.responsive.cardScaleMobile;
        GAME_CONFIG.cards.height *= GAME_CONFIG.responsive.cardScaleMobile;
        GAME_CONFIG.table.radius *= 0.8;
        
        // 設定動畫管理器為低性能模式
        if (animationManager) {
            animationManager.setPerformanceMode('low');
        }
    } else if (deviceInfo.isTablet) {
        // 平板裝置優化
        GAME_CONFIG.cards.width *= GAME_CONFIG.responsive.cardScaleTablet;
        GAME_CONFIG.cards.height *= GAME_CONFIG.responsive.cardScaleTablet;
        GAME_CONFIG.table.radius *= 0.9;
        
        if (animationManager) {
            animationManager.setPerformanceMode('medium');
        }
    }
    
    // 防止觸控滾動 - 延遲設定直到畫布建立
    setTimeout(() => {
        if (deviceInfo.isTouch && canvas && canvas.canvas) {
            canvas.canvas.addEventListener('touchmove', function(e) {
                e.preventDefault();
            }, { passive: false });
            
            canvas.canvas.addEventListener('touchstart', function(e) {
                e.preventDefault();
            }, { passive: false });
            
            canvas.canvas.addEventListener('touchend', function(e) {
                e.preventDefault();
            }, { passive: false });
            
            // 防止雙指縮放
            canvas.canvas.addEventListener('gesturestart', function(e) {
                e.preventDefault();
            });
            
            canvas.canvas.addEventListener('gesturechange', function(e) {
                e.preventDefault();
            });
            
            canvas.canvas.addEventListener('gestureend', function(e) {
                e.preventDefault();
            });
        }
    }, 100);
}

// p5.js 觸控事件處理
function touchStarted() {
    // 在 Safari 中總是處理觸控事件
    const currentTime = millis();
    touchState.touchStartTime = currentTime;
    touchState.touchStartX = touches.length > 0 ? touches[0].x : mouseX;
    touchState.touchStartY = touches.length > 0 ? touches[0].y : mouseY;
    touchState.isTouching = true;
    touchState.isLongPress = false;
    
    // 檢測雙擊
    const timeSinceLastTap = currentTime - touchState.lastTapTime;
    const distanceFromLastTap = distance(
        touchState.touchStartX, touchState.touchStartY,
        touchState.lastTapX, touchState.lastTapY
    );
    
    if (timeSinceLastTap < GAME_CONFIG.touch.doubleTapTime && 
        distanceFromLastTap < GAME_CONFIG.touch.tapThreshold) {
        handleDoubleTap(touchState.touchStartX, touchState.touchStartY);
        return false; // 防止預設行為
    }
    
    touchState.lastTapTime = currentTime;
    touchState.lastTapX = touchState.touchStartX;
    touchState.lastTapY = touchState.touchStartY;
    
    // 處理單次觸控開始
    if (gameState === 'game' && gameTable) {
        gameTable.handleMousePressed(touchState.touchStartX, touchState.touchStartY);
    }
    
    return false; // 防止預設行為
}

function touchMoved() {
    if (!touchState.isTouching) return;
    
    const currentX = touches.length > 0 ? touches[0].x : mouseX;
    const currentY = touches.length > 0 ? touches[0].y : mouseY;
    
    // 處理拖拽
    if (gameState === 'game' && gameTable) {
        gameTable.handleMouseDragged(currentX, currentY);
    }
    
    return false; // 防止預設行為
}

function touchEnded() {
    const currentTime = millis();
    const touchDuration = currentTime - touchState.touchStartTime;
    const currentX = touchState.lastTapX;
    const currentY = touchState.lastTapY;
    
    // 檢測長按
    if (touchDuration >= GAME_CONFIG.touch.longPressTime) {
        handleLongPress(currentX, currentY);
    } else {
        // 檢測滑動
        const swipeDistance = distance(
            touchState.touchStartX, touchState.touchStartY,
            currentX, currentY
        );
        
        if (swipeDistance >= GAME_CONFIG.touch.swipeThreshold) {
            const swipeDirection = getSwipeDirection(
                touchState.touchStartX, touchState.touchStartY,
                currentX, currentY
            );
            handleSwipe(swipeDirection);
        } else {
            // 普通點擊
            if (gameState === 'game' && gameTable) {
                gameTable.handleMouseReleased(currentX, currentY);
            }
        }
    }
    
    touchState.isTouching = false;
    touchState.isLongPress = false;
    
    return false; // 防止預設行為
}

// 處理雙擊
function handleDoubleTap(x, y) {
    console.log('雙擊檢測:', x, y);
    
    if (gameState === 'game') {
        // 雙擊開牌
        revealCards();
    }
}

// 處理長按
function handleLongPress(x, y) {
    console.log('長按檢測:', x, y);
    touchState.isLongPress = true;
    
    if (gameState === 'game') {
        // 長按顯示選項或說明
        if (uiManager) {
            uiManager.showToast('長按功能 - 可用於顯示更多選項', 'info');
        }
    }
}

// 處理滑動
function handleSwipe(direction) {
    console.log('滑動檢測:', direction);
    
    if (gameState === 'game') {
        switch (direction) {
            case 'up':
                // 向上滑動 - 顯示統計
                if (scrumMasterAdvice) {
                    scrumMasterAdvice.show();
                }
                break;
            case 'down':
                // 向下滑動 - 隱藏統計
                if (scrumMasterAdvice) {
                    scrumMasterAdvice.hide();
                }
                break;
            case 'left':
                // 向左滑動 - 切換視圖
                break;
            case 'right':
                // 向右滑動 - 切換視圖
                break;
        }
    }
}

// 計算滑動方向
function getSwipeDirection(startX, startY, endX, endY) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? 'right' : 'left';
    } else {
        return deltaY > 0 ? 'down' : 'up';
    }
}

// 視窗大小變更時的響應式處理
function windowResized() {
    // 重新檢測裝置
    detectDevice();
    
    // 重新建立畫布
    setupCanvas();
    
    // 重新設定觸控優化
    setupTouchOptimizations();
    
    // 更新 UI 佈局
    if (uiManager) {
        uiManager.updateResponsiveLayout();
    }
    
    // 重新初始化遊戲桌面元素
    if (gameTable) {
        // 重新計算卡牌位置以適應新的螢幕尺寸
        gameTable.calculateCardPositions();
        console.log('📱 視窗大小變更，重新計算卡牌位置');
    }
}

// 處理方向變更
window.addEventListener('orientationchange', function() {
    setTimeout(() => {
        windowResized();
    }, 100);
});

// 處理視窗焦點變更（省電優化）
window.addEventListener('blur', function() {
    if (animationManager) {
        animationManager.setPerformanceMode('low');
    }
});

window.addEventListener('focus', function() {
    if (animationManager) {
        const mode = deviceInfo.isMobile ? 'low' : deviceInfo.isTablet ? 'medium' : 'high';
        animationManager.setPerformanceMode(mode);
    }
});

// 禁用右鍵選單（在觸控裝置上）
if (deviceInfo.isTouch) {
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
}

console.log('📱 觸控和響應式設計功能已載入');