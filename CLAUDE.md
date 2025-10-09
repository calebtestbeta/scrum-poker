# 🤖 Claude AI 協作說明文件

## 專案說明

這是一個基於 **Vanilla JavaScript** 開發的 **Scrum Poker 敏捷估點工具**，主要用於軟體開發團隊進行 Story Point 估點會議。專案提供直觀的撲克牌估點界面，支援多人即時協作，並具備智慧建議系統來協助團隊做出更好的技術決策。

### 主要技術棧
- **前端框架**: Vanilla JavaScript + CSS (v3.0.0-vanilla)
- **架構模式**: 事件驅動架構 (EventBus)
- **資料儲存**: Firebase Realtime Database + Cookie
- **身份驗證**: Firebase Anonymous Auth
- **部署平台**: 靜態網頁託管

### 核心功能
- 即時多人估點系統
- CSS 動畫化卡牌互動
- 智慧任務類型建議
- 投票結果統計分析
- 跨裝置響應式設計
- 本地/離線模式支援
- 狀態持久化機制

## 程式碼規範

### 命名規則

#### 變數命名
- **駝峰式命名**: `playerName`, `gameState`, `eventBus`
- **常數**: 全大寫蛇形 `GAME_CONFIG`, `FIREBASE_CONFIG`
- **私有變數**: 底線開頭 `_internalState`, `_tempData`

#### 函式命名
- **動詞開頭**: `startGame()`, `revealCards()`, `updateStatistics()`
- **事件處理**: `on` 開頭 `onPlayerJoined()`, `onVoteUpdated()`
- **事件發送**: `handle` 開頭 `handleVoteSubmitted()`, `handlePhaseChange()`
- **工具函式**: 描述性命名 `calculateAverage()`, `validateInput()`

#### 檔案命名
- **類別檔案**: 大寫開頭 `Player.js`, `GameTable.js`, `Card.js`
- **服務檔案**: `Service` 結尾 `FirebaseService.js`, `StorageService.js`
- **核心工具**: 小寫開頭 `Utils.js`, `EventBus.js`
- **設定檔**: 小寫連字符 `firebase-config.js`

### 註解風格
```javascript
// 單行註解：簡潔說明功能
function updateScore() {
    // 計算總分
    const total = votes.reduce((sum, vote) => sum + vote.value, 0);
    
    /**
     * 多行註解：複雜邏輯說明
     * 用於類別建構子、複雜演算法、API 介面
     */
}

// 中文註解：符合台灣開發習慣
// 功能：處理玩家加入房間的邏輯
```

### 模組化原則
- **類別化**: 使用 ES6 Class 語法
- **單一職責**: 每個類別只負責一個主要功能
- **事件驅動**: 使用 EventBus 進行組件間通訊
- **靜態方法**: 工具函式使用靜態方法

## 檔案結構說明

```
scrum-poker/
├── index.html              # 主頁面 - 登入和遊戲界面
├── firebase-rules.json     # Firebase 安全規則
├── package.json            # 專案設定和依賴
├── sw.js                   # Service Worker (PWA)
│
├── src/                    # 原始碼目錄
│   ├── app.js             # 主應用程式控制器
│   │
│   ├── components/        # UI 組件
│   │   ├── Card.js       # 卡牌組件和卡牌組
│   │   ├── Player.js     # 玩家組件和玩家列表
│   │   └── GameTable.js  # 遊戲桌面主控制器
│   │
│   ├── core/             # 核心工具和管理器
│   │   ├── EventBus.js   # 全域事件匯流排
│   │   ├── GameState.js  # 遊戲狀態管理
│   │   ├── TouchManager.js # 觸控手勢管理
│   │   └── Utils.js      # 通用工具函數
│   │
│   ├── managers/         # 統一管理器
│   │   └── FirebaseConfigManager.js # Firebase 設定統一管理器
│   │
│   ├── services/         # 服務層
│   │   ├── FirebaseService.js     # Firebase 資料管理
│   │   ├── LocalRoomService.js    # 本機房間服務
│   │   ├── RoomProviderFactory.js # 房間資料提供者工廠
│   │   ├── ScrumAdviceEngine.js   # 智慧建議引擎
│   │   ├── ScrumAdviceUI.js       # 智慧建議界面
│   │   └── StorageService.js      # 本地儲存管理
│   │
│   └── styles/           # 樣式文件
│       ├── variables.css # CSS 變數定義
│       └── main.css      # 主要樣式文件
│
├── FEATURE_DEMO.md        # 功能演示說明
├── FIREBASE_SETUP.md     # Firebase 設定教學
├── LOCAL_DEVELOPMENT_GUIDE.md # 本地開發指南
└── CLAUDE.md              # 本文件
```

## Firebase 使用說明

### Realtime Database 結構
```json
{
  "rooms": {
    "room_id": {
      "phase": "voting|revealing|finished",
      "created_at": "timestamp",
      "last_activity": "timestamp",
      "players": {
        "player_id": {
          "name": "玩家名稱",
          "role": "dev|qa|scrum_master|po|other",
          "joined_at": "timestamp",
          "last_active": "timestamp"
        }
      },
      "votes": {
        "player_id": {
          "value": 1|2|3|5|8|13|21|"coffee"|"question",
          "timestamp": "timestamp",
          "player_role": "dev|qa|scrum_master|po|other"
        }
      },
      "task_type": "frontend|backend|fullstack|mobile_app|...",
      "session_info": {
        "total_rounds": 0,
        "average_votes": [],
        "completion_time": []
      }
    }
  }
}
```

### 權限設計 (firebase-rules.json)
- **讀取權限**: 所有已驗證使用者可讀取房間資料
- **寫入權限**: 限制玩家只能修改自己的資料
- **房間管理**: 自動清除 24 小時無活動的房間
- **防濫用**: 限制寫入頻率，避免惡意攻擊

### Firebase 安全設定
```javascript
// 匿名登入，避免需要使用者註冊
auth.signInAnonymously()

// 自動清除機制
const cleanupInterval = 24 * 60 * 60 * 1000; // 24 小時

// 錯誤處理 - 使用 FirebaseConfigManager
if (window.firebaseConfigManager && window.firebaseConfigManager.isReady()) {
    const database = window.firebaseConfigManager.getDatabase();
    database.ref().on('error', (error) => {
        console.error('Firebase 連線錯誤:', error);
    });
}
```

## 事件驅動架構

### EventBus 系統
專案使用全域事件匯流排進行組件間通訊，避免直接依賴關係：

```javascript
// 發送事件
window.eventBus.emit('game:vote-submitted', {
    playerId: this.currentPlayerId,
    vote: value,
    timestamp: Date.now()
});

// 監聽事件
window.eventBus.on('game:vote-submitted', (data) => {
    this.handleVoteSubmitted(data);
});
```

### 主要事件類型

#### 遊戲流程事件
- `game:vote-submitted` - 投票提交
- `game:votes-revealed` - 開牌完成
- `game:votes-cleared` - 清除投票
- `game:phase-changed` - 階段變更
- `game:leave-room` - 離開房間

#### 玩家事件
- `players:player-added` - 玩家加入
- `players:player-removed` - 玩家離開
- `players:voting-progress` - 投票進度更新

#### 卡牌事件
- `deck:card-selected` - 卡牌選擇
- `deck:card-hover` - 卡牌懸停

#### Firebase 事件
- `firebase:connected` - 連線成功
- `firebase:disconnected` - 連線中斷
- `room:players-updated` - 玩家列表更新
- `room:votes-updated` - 投票數據更新

## 開發與維護規則

### 新功能開發注意事項

1. **事件驅動原則**
   - 使用 EventBus 進行組件間通訊
   - 避免直接修改其他組件的狀態
   - 新功能應該監聽相關事件並做出響應

2. **狀態管理原則**
   ```javascript
   // ✅ 好的做法
   class NewFeature {
       constructor() {
           this.isEnabled = false;
           this.data = {};
           this.setupEventListeners();
       }
       
       setupEventListeners() {
           window.eventBus.on('game:phase-changed', (data) => {
               this.handlePhaseChange(data);
           });
       }
   }
   
   // ❌ 避免的做法
   let globalNewFeatureFlag = true; // 避免全域狀態
   ```

3. **狀態保護機制**
   - 開牌狀態 (`isRevealed`) 需要特別保護
   - 區分「重新開始遊戲」與「Firebase 同步」場景
   - 使用智慧參數控制狀態重置行為

### Debug / 測試方式

1. **瀏覽器開發者工具**
   ```javascript
   // 使用階層式 console 輸出
   console.group('🎮 遊戲初始化');
   console.log('玩家數量:', players.length);
   console.log('房間狀態:', roomPhase);
   console.groupEnd();
   
   // 錯誤追蹤
   try {
       riskyOperation();
   } catch (error) {
       console.error('操作失敗:', error);
       this.showToast('error', '操作失敗，請重試');
   }
   ```

2. **本地測試伺服器**
   ```bash
   npm start
   # 或
   python3 -m http.server 8080
   # 訪問 http://localhost:8080
   ```

3. **Firebase 模擬器** (可選)
   ```bash
   firebase emulators:start --only database
   ```

### Firebase 限制處理

**免費方案限制**:
- 同時連線數: 100
- 資料庫大小: 1GB
- 每月傳輸量: 10GB

**應對策略**:
1. **連線優化**
   ```javascript
   // 自動斷線無活動使用者
   const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 分鐘
   
   // 批次更新減少 API 呼叫 - 使用 FirebaseConfigManager
   const updates = {};
   updates[`rooms/${roomId}/players/${playerId}`] = playerData;
   
   if (window.firebaseConfigManager && window.firebaseConfigManager.isReady()) {
       const database = window.firebaseConfigManager.getDatabase();
       database.ref().update(updates);
   }
   ```

2. **資料清理**
   ```javascript
   // 定期清理過期房間 - 使用 FirebaseConfigManager
   const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
   
   if (window.firebaseConfigManager && window.firebaseConfigManager.isReady()) {
       const database = window.firebaseConfigManager.getDatabase();
       database.ref('rooms')
           .orderByChild('last_activity')
           .endAt(cutoffTime)
       .once('value', snapshot => {
           // 清理邏輯
       });
   ```

3. **本地降級**
   ```javascript
   // Firebase 無法連線時的本地模式
   if (!firebase.apps.length) {
       console.warn('Firebase 無法初始化，切換到本地模式');
       useLocalStorage = true;
   }
   ```

## 常見任務的提示

### 新增互動功能

1. **事件監聽**
   ```javascript
   // 在組件初始化時設置事件監聽
   setupEventListeners() {
       window.eventBus.on('deck:card-selected', (data) => {
           this.handleCardSelection(data);
       });
   }
   
   // 觸控裝置支援
   this.touchManager.on('tap', (gestureData) => {
       const target = gestureData.target;
       if (target.closest('.card')) {
           // 處理卡牌點擊
       }
   });
   ```

2. **鍵盤快捷鍵**
   ```javascript
   setupKeyboardShortcuts() {
       document.addEventListener('keydown', (event) => {
           if (this.currentState !== 'game') return;
           
           switch (event.key) {
               case ' ': // 空白鍵
                   this.revealVotes();
                   break;
               case 'r': // R 鍵
                   if (event.ctrlKey || event.metaKey) {
                       event.preventDefault();
                       this.clearVotes();
                   }
                   break;
           }
       });
   }
   ```

### Firebase 資料操作

1. **新增資料**
   ```javascript
   async function addGameData(roomId, data) {
       try {
           // 使用 FirebaseConfigManager 統一介面
           if (!window.firebaseConfigManager || !window.firebaseConfigManager.isReady()) {
               throw new Error('Firebase 尚未準備好');
           }
           
           const database = window.firebaseConfigManager.getDatabase();
           const ref = database.ref(`rooms/${roomId}/custom_data`);
           await ref.push(data);
           console.log('資料新增成功');
       } catch (error) {
           console.error('資料新增失敗:', error);
           throw error;
       }
   }
   ```

2. **即時監聽**
   ```javascript
   function setupDataListener(roomId) {
       // 使用 FirebaseConfigManager 統一介面
       if (!window.firebaseConfigManager || !window.firebaseConfigManager.isReady()) {
           console.error('Firebase 尚未準備好，無法設置監聽器');
           return;
       }
       
       const database = window.firebaseConfigManager.getDatabase();
       const ref = database.ref(`rooms/${roomId}`);
       ref.on('value', (snapshot) => {
           const data = snapshot.val();
           if (data) {
               // 發送事件而非直接更新狀態
               window.eventBus.emit('firebase:data-updated', data);
           }
       });
       
       // 記得在適當時機移除監聽
       // ref.off();
   }
   ```

### 狀態管理和保護

1. **開牌狀態保護**
   ```javascript
   setVote(vote, animate = true) {
       const wasRevealed = this.isRevealed; // 保存當前開牌狀態
       
       this.vote = vote;
       this.hasVoted = vote !== null && vote !== undefined;
       
       // 保護開牌狀態：如果之前已開牌且仍有投票，維持開牌狀態
       if (wasRevealed && this.hasVoted) {
           console.log(`🛡️ 保護玩家 ${this.name} 的開牌狀態`);
           // 開牌狀態保持不變
       } else if (!this.hasVoted) {
           this.isRevealed = false;
       }
   }
   ```

2. **智慧狀態重置**
   ```javascript
   clearAllVotes(resetRevealState = false) {
       console.log(`🧹 清除所有投票 - resetRevealState: ${resetRevealState}`);
       
       this.players.forEach(player => {
           player.clearVote();
           
           if (resetRevealState) {
               // 重新開始遊戲：強制重置開牌狀態
               player.hideVote(true);
           }
           // Firebase 同步：保持開牌狀態不變
       });
   }
   ```

### 錯誤處理

1. **API 呼叫失敗**
   ```javascript
   async function safeFirebaseOperation(operation) {
       const MAX_RETRIES = 3;
       let retries = 0;
       
       while (retries < MAX_RETRIES) {
           try {
               return await operation();
           } catch (error) {
               retries++;
               console.warn(`嘗試 ${retries}/${MAX_RETRIES} 失敗:`, error);
               
               if (retries >= MAX_RETRIES) {
                   this.showToast('error', '連線失敗，請檢查網路後重試');
                   throw error;
               }
               
               await new Promise(resolve => setTimeout(resolve, 1000 * retries));
           }
       }
   }
   ```

2. **使用者輸入驗證**
   ```javascript
   function validateUserInput(input) {
       // 基本檢查
       if (!input || typeof input !== 'string') {
           throw new Error('輸入格式錯誤');
       }
       
       // 清理潛在惡意字符
       const sanitizedInput = input
           .replace(/[<>"'&]/g, '') // 移除 HTML 字符
           .replace(/javascript:/gi, '') // 移除 JavaScript 協議
           .trim();
       
       // 長度檢查
       if (sanitizedInput.length === 0) {
           throw new Error('輸入不能為空');
       }
       
       if (sanitizedInput.length > 20) {
           throw new Error('輸入過長');
       }
       
       // 字符格式檢查
       if (!/^[a-zA-Z0-9\u4e00-\u9fff\s_-]+$/.test(sanitizedInput)) {
           throw new Error('名字包含不允許的字符');
       }
       
       return sanitizedInput;
   }
   ```

## AI 使用注意事項

### 程式碼生成原則

1. **保持風格一致**
   - 使用現有的命名規範
   - 遵循既有的檔案結構
   - 維持相同的註解風格

2. **優先考慮可讀性**
   ```javascript
   // ✅ 清晰易讀
   function calculateAverageScore(votes) {
       const numericVotes = votes.filter(v => typeof v.value === 'number');
       if (numericVotes.length === 0) return 0;
       
       const total = numericVotes.reduce((sum, vote) => sum + vote.value, 0);
       return Math.round(total / numericVotes.length * 10) / 10;
   }
   
   // ❌ 過度優化
   const calcAvg = v => v.filter(x=>!isNaN(x.value)).reduce((a,b)=>a+b.value,0)/v.length||0;
   ```

3. **避免過度依賴外部套件**
   - 優先使用原生 JavaScript
   - Vanilla JavaScript 和 CSS 已足夠大部分需求
   - 只在必要時引入新的 CDN 資源

### 功能開發建議

1. **漸進式增強**
   - 先實現基本功能
   - 再添加進階特性
   - 確保每個階段都能獨立運作

2. **測試驅動**
   - 提供測試頁面或測試函式
   - 包含錯誤情況的處理
   - 確保跨瀏覽器相容性

3. **文件更新**
   - 新功能需更新相關文件
   - 提供使用範例
   - 說明設定方式和注意事項

### 效能考量

1. **DOM 操作最佳化**
   ```javascript
   // 避免重複查詢 DOM
   class UIComponent {
       constructor() {
           this.elements = {
               container: document.getElementById('container'),
               button: document.getElementById('button')
           };
       }
       
       update() {
           // 使用快取的元素引用
           this.elements.container.classList.toggle('active');
       }
   }
   ```

2. **Firebase 最佳化**
   ```javascript
   // 使用 once() 而非 on() 取得一次性資料
   ref.once('value').then(snapshot => {
       // 處理資料
   });
   
   // 限制查詢結果數量
   ref.limitToLast(10).once('value');
   
   // 批次更新 - 使用 FirebaseConfigManager
   const updates = {};
   updates[`rooms/${roomId}/phase`] = 'finished';
   updates[`rooms/${roomId}/last_activity`] = Date.now();
   
   if (window.firebaseConfigManager && window.firebaseConfigManager.isReady()) {
       const database = window.firebaseConfigManager.getDatabase();
       database.ref().update(updates);
   }
   ```

3. **事件監聽器管理**
   ```javascript
   class Component {
       constructor() {
           this.boundHandlers = {
               handleClick: this.handleClick.bind(this),
               handleKeydown: this.handleKeydown.bind(this)
           };
       }
       
       bindEvents() {
           document.addEventListener('click', this.boundHandlers.handleClick);
           document.addEventListener('keydown', this.boundHandlers.handleKeydown);
       }
       
       unbindEvents() {
           document.removeEventListener('click', this.boundHandlers.handleClick);
           document.removeEventListener('keydown', this.boundHandlers.handleKeydown);
       }
       
       destroy() {
           this.unbindEvents();
       }
   }
   ```

## 關鍵修復和最佳實踐

### CSS 翻牌動畫修復
修復了卡牌開牌後顯示錯誤的問題：

```css
/* 修復前：卡牌正面和背面 transform 邏輯錯誤 */
.player-card-front {
    transform: rotateY(0deg); /* 錯誤：未翻轉 */
}

/* 修復後：正確的翻牌邏輯 */
.player-card-front {
    /* 正面預設就是翻轉的，這樣開牌後顯示正面 */
    transform: rotateY(180deg);
}

.player-card-back {
    /* 背面在未開牌時顯示（不翻轉） */
}
```

### 狀態保護機制
實現了多層狀態保護，防止 Firebase 同步時意外重置開牌狀態：

```javascript
// 智慧參數設計
clearAllVotes(resetRevealState = false) {
    // resetRevealState = true: 重新開始遊戲，完全重置
    // resetRevealState = false: Firebase 同步，保持開牌狀態
}

// 狀態保護邏輯
setVote(vote, animate = true) {
    const wasRevealed = this.isRevealed;
    
    // 保護開牌狀態：如果之前已開牌且仍有投票，維持開牌狀態
    if (wasRevealed && this.hasVoted) {
        console.log(`🛡️ 保護玩家 ${this.name} 的開牌狀態`);
    }
}
```

---

## 🔄 持續改進

這個專案由 Claude AI 協助開發，歡迎持續優化和擴充功能。開發時請遵循本文件的規範，確保程式碼品質和專案的可維護性。

**記住**: 簡潔、清晰、可維護 > 炫技和過度優化

---

*最後更新: 2025-01-01*
*版本: v3.0.0-vanilla*
*架構: Vanilla JavaScript + CSS + EventBus*