# 🤖 Claude AI 協作說明文件

## 專案說明

這是一個基於 p5.js 開發的 **Scrum Poker 敏捷估點工具**，主要用於軟體開發團隊進行 Story Point 估點會議。專案提供互動式的撲克牌估點界面，支援多人即時協作，並具備智慧建議系統來協助團隊做出更好的技術決策。

### 主要技術棧
- **前端框架**: p5.js (互動式畫布渲染)
- **資料儲存**: Firebase Realtime Database
- **身份驗證**: Firebase Anonymous Auth
- **部署平台**: 靜態網頁託管

### 核心功能
- 即時多人估點系統
- 動畫化卡牌互動
- 智慧任務類型建議
- 投票結果統計分析
- 跨裝置響應式設計

## 程式碼規範

### 命名規則

#### 變數命名
- **駝峰式命名**: `playerName`, `gameState`, `animationManager`
- **常數**: 全大寫蛇形 `GAME_CONFIG`, `FIREBASE_CONFIG`
- **私有變數**: 底線開頭 `_internalState`, `_tempData`

#### 函式命名
- **動詞開頭**: `startGame()`, `revealCards()`, `updateStatistics()`
- **事件處理**: `on` 開頭 `onPlayerJoined()`, `onVoteUpdated()`
- **工具函式**: 描述性命名 `calculateAverage()`, `validateInput()`

#### 檔案命名
- **類別檔案**: 大寫開頭 `Player.js`, `GameTable.js`, `Card.js`
- **管理器**: `Manager` 結尾 `UIManager.js`, `FirebaseManager.js`
- **設定檔**: 小寫蛇形 `firebase-config.js`, `game-config.js`

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
- **管理器模式**: 用於處理複雜的系統協調
- **靜態方法**: 工具函式使用靜態方法

## 檔案結構說明

```
scrum-poker/
├── index.html              # 主頁面 - 登入界面
├── game.js                 # 遊戲整合邏輯
├── sketch.js               # p5.js 主要繪製邏輯
├── firebase-config.js      # Firebase 設定檔
├── firebase-config-local.js # 本地開發設定
├── 
├── classes/                # 核心類別
│   ├── Card.js            # 卡牌類別
│   ├── Player.js          # 玩家類別
│   ├── GameTable.js       # 遊戲桌面類別
│   └── Vector2D.js        # 向量計算工具
│
├── managers/               # 系統管理器
│   ├── FirebaseManager.js # Firebase 資料管理
│   ├── UIManager.js       # 使用者介面管理
│   ├── AnimationManager.js # 動畫效果管理
│   └── CookieManager.js   # 本地資料管理
│
├── FEATURE_DEMO.md        # 功能演示說明
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

### 權限設計 (database.rules.json)
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

// 錯誤處理
firebase.database().ref().on('error', (error) => {
    console.error('Firebase 連線錯誤:', error);
});
```

## 開發與維護規則

### 新功能開發注意事項

1. **核心渲染循環保護**
   - 不要直接修改 `draw()` 函式的主要結構
   - 新功能封裝在獨立的類別或管理器中
   - 使用事件驅動模式，避免直接修改遊戲狀態

2. **狀態管理原則**
   ```javascript
   // ✅ 好的做法
   class NewFeature {
       constructor() {
           this.isEnabled = false;
           this.data = {};
       }
       
       update() {
           if (!this.isEnabled) return;
           // 功能邏輯
       }
   }
   
   // ❌ 避免的做法
   let globalNewFeatureFlag = true; // 避免全域狀態
   ```

3. **向後相容性**
   - 新功能必須是可選的
   - 不影響現有的估點流程
   - 提供功能開關和降級機制

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
       uiManager.showError('操作失敗，請重試');
   }
   ```

2. **本地測試伺服器**
   ```bash
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
   
   // 批次更新減少 API 呼叫
   const updates = {};
   updates[`rooms/${roomId}/players/${playerId}`] = playerData;
   firebase.database().ref().update(updates);
   ```

2. **資料清理**
   ```javascript
   // 定期清理過期房間
   const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
   firebase.database().ref('rooms')
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

1. **滑鼠點擊事件**
   ```javascript
   function mousePressed() {
       // 檢查點擊位置
       if (gameTable.isMouseOverCard(mouseX, mouseY)) {
           const card = gameTable.getCardAt(mouseX, mouseY);
           handleCardClick(card);
       }
   }
   
   // 觸控裝置支援
   function touchStarted() {
       mousePressed(); // 重用滑鼠邏輯
       return false; // 防止預設行為
   }
   ```

2. **鍵盤快捷鍵**
   ```javascript
   function keyPressed() {
       if (gameState !== 'game') return;
       
       switch (keyCode) {
           case 32: // 空白鍵
               revealCards();
               break;
           case 72: // H 鍵
               scrumMasterAdvice.toggle();
               break;
       }
   }
   ```

### Firebase 資料操作

1. **新增資料**
   ```javascript
   async function addGameData(roomId, data) {
       try {
           const ref = firebase.database().ref(`rooms/${roomId}/custom_data`);
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
       const ref = firebase.database().ref(`rooms/${roomId}`);
       ref.on('value', (snapshot) => {
           const data = snapshot.val();
           if (data) {
               updateGameState(data);
           }
       });
       
       // 記得在適當時機移除監聽
       // ref.off();
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
                   uiManager.showError('連線失敗，請檢查網路後重試');
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
       if (!input || typeof input !== 'string') {
           throw new Error('輸入格式錯誤');
       }
       
       if (input.trim().length === 0) {
           throw new Error('輸入不能為空');
       }
       
       if (input.length > 50) {
           throw new Error('輸入過長');
       }
       
       return input.trim();
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
   - p5.js 內建功能已足夠大部分需求
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

1. **p5.js 最佳化**
   ```javascript
   // 避免在 draw() 中重複計算
   let cachedValue;
   function draw() {
       if (!cachedValue) {
           cachedValue = expensiveCalculation();
       }
   }
   
   // 使用物件池重用
   const particlePool = [];
   function getParticle() {
       return particlePool.pop() || new Particle();
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
   ```

---

## 🔄 持續改進

這個專案由 Claude AI 協助開發，歡迎持續優化和擴充功能。開發時請遵循本文件的規範，確保程式碼品質和專案的可維護性。

**記住**: 簡潔、清晰、可維護 > 炫技和過度優化

---

*最後更新: 2025-09-28*
*版本: v1.0*