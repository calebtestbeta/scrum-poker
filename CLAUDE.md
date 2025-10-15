# 🤖 Claude AI 協作說明文件

## 專案說明

這是一個基於 **Vanilla JavaScript** 開發的 **Scrum Poker 敏捷估點工具**，採用 **Desktop/Mobile 雙版本架構**，為軟體開發團隊提供跨裝置的估點協作體驗。專案具備自動裝置檢測、Firebase 即時同步與智慧建議系統，協助團隊做出更好的技術決策。

### 主要技術棧
- **前端框架**: Vanilla JavaScript + CSS (v3.2.0-production)
- **架構模式**: Desktop/Mobile 雙版本 + 自動重定向
- **資料儲存**: Firebase Realtime Database + LocalStorage
- **身份驗證**: Firebase Anonymous Auth
- **部署平台**: 靜態網頁託管 (GitHub Pages / Netlify)

### 核心功能
- 🎯 **自動裝置檢測** - 智慧重定向至桌面版或行動版
- 🔥 **Firebase 即時協作** - 多人同步投票與開牌
- 🧠 **智慧建議系統** - 基於任務類型的技術建議
- 📊 **即時統計分析** - 投票分佈與結果視覺化
- 📱 **跨裝置設計** - 桌面/平板/手機完美適配
- ⚡ **本地降級模式** - Firebase 無法連線時自動切換
- 🎮 **直覺式操作** - 卡牌選擇與動畫互動

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

**🏗️ 生產環境優化架構 (v3.2.0)**

```
scrum-poker/
├── public/                    # 🎯 生產版本入口
│   ├── redirect.html         # 📍 主入口 - 自動裝置檢測重定向
│   ├── desktop/             # 🖥️ 桌面版本
│   │   └── index.html       # 桌面完整功能版本
│   ├── mobile/              # 📱 行動版本  
│   │   └── index.html       # 行動優化版本
│   └── shared/              # 🔗 共用資源
│       ├── firebase-adapter.js   # Firebase 統一介面
│       ├── styles/base.css       # 基礎樣式
│       └── utils/                # 工具函式
│           ├── querystring.js    # URL 參數處理
│           └── fmt.js            # 格式化工具
│
├── src/                      # 🧩 核心服務模組
│   ├── managers/            # 🔧 管理器
│   │   └── FirebaseConfigManager.js # Firebase 配置統一管理
│   ├── services/            # 🛠️ 服務層 (10個核心服務)
│   │   ├── FirebaseService.js        # Firebase 資料管理
│   │   ├── AdviceTemplateLoader.js   # 建議模板載入器
│   │   ├── ScrumAdviceEngine.js      # 智慧建議引擎
│   │   └── ...                       # 其他服務模組
│   └── data/advice/         # 📋 智慧建議模板 (JSON)
│       ├── frontend.json    # 前端開發建議
│       ├── backend.json     # 後端開發建議
│       ├── testing.json     # 測試相關建議
│       └── ...              # 其他類型建議模板
│
├── tests/                   # 🧪 E2E 自動化測試
│   ├── e2e-cross-device.spec.js # 跨裝置同步測試
│   └── README.md                 # 測試說明
│
├── 設定檔案                  # ⚙️ 專案配置
│   ├── package.json         # 專案設定 (入口: public/redirect.html)
│   ├── firebase.json        # Firebase 部署設定
│   ├── database.rules.json  # Firebase 安全規則
│   ├── sw.js                # Service Worker (PWA支援)
│   └── playwright.config.js # 測試設定
│
└── 文件                     # 📚 專案文件
    ├── CLAUDE.md            # AI 協作指南 (本文件)
    ├── README.md            # 使用者指南
    ├── FIREBASE_SETUP.md    # Firebase 設定教學
    └── docs/legacy-notes/   # 歷史文件存檔
```

**✨ 關鍵改進**
- **統一入口**: `public/redirect.html` 自動檢測裝置並重定向
- **雙版本架構**: Desktop 與 Mobile 各自優化的完整版本
- **模組化設計**: 核心服務與資料分離，便於維護
- **生產就緒**: 移除舊版複雜架構，專注實用功能

## 🔥 Firebase 整合架構

### 🏢 統一配置管理
專案採用 `FirebaseConfigManager` 統一管理 Firebase 配置，避免重複設定：

```javascript
// 透過 FirebaseConfigManager 統一初始化
const configManager = window.firebaseConfigManager;
await configManager.initialize(config);

// 各版本透過 firebase-adapter.js 統一存取
const adapter = window.createFirebaseAdapter();
```

### 📊 Realtime Database 結構
```json
{
  "rooms": {
    "room_id": {
      "phase": "voting|revealing|finished",
      "created_at": "timestamp", 
      "last_activity": "timestamp",
      "revealed_at": "timestamp",
      "players": {
        "player_id": {
          "name": "玩家名稱",
          "role": "dev|qa|scrum_master|po|designer|pm|other",
          "joined_at": "timestamp",
          "last_active": "timestamp",
          "online": true
        }
      },
      "votes": {
        "player_id": {
          "value": 0|1|2|3|5|8|13|21|34|55|89|"?",
          "timestamp": "timestamp", 
          "player_role": "dev|qa|scrum_master|po|other"
        }
      },
      "task_type": "frontend|backend|testing|mobile|design|devops|general",
      "session_info": {
        "total_rounds": 0,
        "completion_times": [],
        "vote_histories": []
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

## 🎯 Desktop/Mobile 雙版本架構

### 🔀 自動重定向機制
`public/redirect.html` 作為統一入口，透過裝置檢測自動導向合適版本：

```javascript
// 裝置檢測邏輯
class DeviceRedirector {
    detectDevice() {
        // 綜合判斷：平台、螢幕尺寸、觸控支援、User Agent
        const isDesktopPlatform = ['MacIntel', 'Win32', 'Win64'].includes(navigator.platform);
        const isMobileUA = /android|iphone|ipad/i.test(navigator.userAgent);
        const hasRealTouch = navigator.maxTouchPoints > 1;
        const isLargeScreen = window.innerWidth >= 1024;
        
        // 決策邏輯：平台優先，兼顧螢幕大小和觸控
        return (isDesktopPlatform && isLargeScreen && !isMobileUA) ? 'desktop' : 'mobile';
    }
    
    redirect(deviceType, queryString) {
        const targetUrl = `${location.origin}/public/${deviceType}/index.html${queryString ? '?' + queryString : ''}`;
        window.location.href = targetUrl;
    }
}
```

### 📱 版本特色差異

#### 🖥️ Desktop 版本特色
- **多欄式佈局** - 左側遊戲區 + 右側統計/建議面板
- **鍵盤快捷鍵** - 數字鍵選卡、空白鍵開牌、Ctrl+R 重置（含任務類型）
- **懸停效果** - 豐富的滑鼠互動回饋
- **完整功能** - 所有進階功能完整展示

#### 📱 Mobile 版本特色  
- **分頁式設計** - Vote / Players / Stats 三個主要分頁
- **觸控優化** - 大按鈕、手勢支援、觸覺回饋
- **螢幕適配** - 響應式卡牌網格、摺疊式建議區域
- **效能優化** - 減少不必要的動畫和渲染

### 🔄 資料同步機制
兩版本透過相同的 Firebase 資料結構保持同步：

```javascript
// 共用的 Firebase Adapter
class FirebaseAdapter {
    async submitVote(value) {
        // 同步到 Firebase，自動觸發其他裝置更新
        return await this.firebaseService.submitVote(value);
    }
    
    subscribeRoom(roomId, callback) {
        // 監聽房間變化，跨裝置即時同步
        this.firebaseService.subscribeRoom(roomId, callback);
    }
}
```

## 🧠 智慧建議系統

### 📋 動態模板載入
專案採用外部 JSON 模板，支援 10 種任務類型的專業建議：

```javascript
// AdviceTemplateLoader 動態載入建議模板
const loader = new AdviceTemplateLoader();
const template = await loader.loadTemplate('frontend'); // 載入前端開發建議

// 支援的任務類型
const supportedTypes = [
    'frontend', 'backend', 'testing', 'mobile', 'design', 
    'devops', 'manual_testing', 'automation_testing', 
    'study', 'general'
];
```

### 🎯 建議生成邏輯
根據投票結果的統計特徵生成對應建議：

```javascript
class ScrumAdviceEngine {
    generateAdvice(taskType, statistics, options) {
        const { variance, average, distribution } = statistics;
        
        // 根據統計特徵選擇建議類型
        if (variance > threshold.high) {
            return template.highVariance; // 團隊分歧大
        } else if (average > threshold.complex) {
            return template.highEstimate; // 高複雜度任務
        } else if (variance < threshold.low) {
            return template.lowVariance; // 團隊共識高
        } else {
            return template.lowEstimate; // 相對簡單任務
        }
    }
}
```

### 📊 建議模板結構
每個任務類型包含 4 種場景的專業建議：

```json
{
  "category": "frontend",
  "displayName": "前端開發",
  "icon": "🎨",
  "templates": {
    "highVariance": {
      "title": "🤔 前端技術架構需要討論",
      "content": "團隊對前端實作方式有不同看法...",
      "keywords": ["組件設計", "狀態管理", "效能優化"]
    },
    "lowVariance": { /* 高共識場景 */ },
    "highEstimate": { /* 高複雜度場景 */ },
    "lowEstimate": { /* 低複雜度場景 */ }
  }
}
```

## 🚀 開發與維護規則

### 💡 新功能開發注意事項

1. **雙版本兼容原則**
   - 新功能需同時考慮 Desktop 和 Mobile 版本的體驗
   - 使用共用的 `firebase-adapter.js` 確保資料同步一致性
   - 優先在 Desktop 版本實作完整功能，Mobile 版本可適度簡化

2. **模組化開發原則**
   ```javascript
   // ✅ 好的做法：使用統一的服務介面
   class NewFeature {
       constructor() {
           this.firebaseAdapter = window.createFirebaseAdapter();
           this.adviceEngine = new ScrumAdviceEngine();
       }
       
       async handleNewFeature() {
           // 透過統一介面操作資料
           await this.firebaseAdapter.submitData(data);
       }
   }
   
   // ❌ 避免的做法：直接操作 Firebase
   firebase.database().ref().set(data); // 繞過統一管理
   ```

3. **效能與體驗平衡**
   - Desktop：著重功能完整性和視覺效果
   - Mobile：著重載入速度和觸控體驗
   - 共用：智慧建議和核心商業邏輯保持一致

### 🧪 測試與除錯

1. **自動化 E2E 測試**
   ```bash
   # 跨裝置同步測試
   npm run test:cross-device
   
   # 含視覺化介面
   npm run test:ui
   
   # Firebase 環境測試
   npm run test:firebase
   ```

2. **開發伺服器與即時測試**
   ```bash
   # 啟動開發伺服器
   npm start
   # 訪問 http://localhost:8080 (自動重定向)
   
   # 強制指定版本測試
   http://localhost:8080/public/desktop/
   http://localhost:8080/public/mobile/
   ```

3. **除錯工具與檢查**
   ```javascript
   // Desktop 版本內建診斷工具
   window.diagnosticReport(); // 完整系統檢查
   
   // Mobile 版本診斷按鈕
   mobileUI.showDiagnosticReport(); // 行動版系統診斷
   
   // Service Worker 快取管理
   window.clearServiceWorkerCache(); // 清除所有快取
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

## 🛠️ 常見開發任務

### 🎨 新增 UI 功能

1. **雙版本 UI 更新流程**
   ```javascript
   // 步驟 1: 先在 Desktop 版本實作完整功能
   // public/desktop/index.html - 完整 UI 實作
   
   // 步驟 2: 在 Mobile 版本實作適配版本  
   // public/mobile/index.html - 簡化/優化版本
   
   // 步驟 3: 確保共用資料邏輯一致
   // 透過 firebase-adapter.js 統一資料操作
   ```

2. **新增智慧建議模板**
   ```javascript
   // 步驟 1: 新增 JSON 模板
   // src/data/advice/new_category.json
   
   // 步驟 2: 更新 AdviceTemplateLoader 支援清單
   this.supportedCategories = {
       // ... 現有類型
       'new_category': 'new_category.json'
   };
   
   // 步驟 3: 在兩個版本的 Story Type 選單中新增選項
   ```

### 🔥 Firebase 資料操作

1. **透過統一 Adapter 操作**
   ```javascript
   // ✅ 推薦方式：使用 firebase-adapter.js
   const adapter = window.createFirebaseAdapter();
   
   // 初始化連線
   await adapter.init(roomId, playerInfo);
   
   // 提交投票
   await adapter.submitVote(value);
   
   // 監聽房間變化
   adapter.subscribeRoom(roomId, (roomData) => {
       // 處理即時更新
   });
   ```

2. **直接使用 FirebaseConfigManager**
   ```javascript
   // 適用於需要更底層控制的場合
   if (window.firebaseConfigManager?.isReady()) {
       const database = window.firebaseConfigManager.getDatabase();
       const ref = database.ref(`rooms/${roomId}/custom_data`);
       
       // 新增資料
       await ref.push(data);
       
       // 監聽變化
       ref.on('value', (snapshot) => {
           console.log('資料更新:', snapshot.val());
       });
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

3. **任務類型重置功能** (v3.2.0 新增)
   ```javascript
   resetLocalUI() {
       // 重置卡牌選擇
       document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
       this.selectedCard = null;

       // 重置任務類型選擇 (NEW!)
       if (this.selectedTaskTypes) {
           console.log('🧹 清除任務類型選擇');
           this.selectedTaskTypes.clear();
           
           // 移除所有任務類型按鈕的選中狀態
           document.querySelectorAll('.task-type-btn').forEach(btn => {
               btn.classList.remove('selected');
           });

           // 同步清空的任務類型到 Firebase
           if (this.isFirebaseConnected) {
               this.syncTaskTypesToFirebase().catch(error => {
                   console.warn('⚠️ 任務類型 Firebase 同步失敗:', error);
               });
           }
       }

       // 其他重置邏輯...
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

## 📚 部署與生產指南

### 🚀 快速部署
```bash
# 1. 克隆專案
git clone https://github.com/your-username/scrum-poker.git
cd scrum-poker

# 2. 安裝依賴（僅用於開發和測試）
npm install

# 3. 啟動本地伺服器
npm start

# 4. 訪問應用
# http://localhost:8080 (自動重定向)
```

### ☁️ 靜態網站部署
專案已優化為純靜態網站，可直接部署到：

- **GitHub Pages**: 設定 `public/redirect.html` 為首頁
- **Netlify**: 上傳整個專案，自動識別靜態檔案
- **Vercel**: 零配置部署，支援 PWA 功能
- **Firebase Hosting**: 與 Firebase Database 完美整合

### 🔧 Firebase 設定
1. 建立 Firebase 專案
2. 啟用 Realtime Database
3. 設定安全規則 (參考 `database.rules.json`)
4. 取得 Project ID 和 API Key
5. 在應用中輸入配置資訊

---

## 🧾 歷史文件參考

開發過程中的歷史文件已整理至 `docs/legacy-notes/`，包含：

### 📋 重要參考文件
- [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) - Firebase 完整設定指南
- [`LOCAL_DEVELOPMENT_GUIDE.md`](LOCAL_DEVELOPMENT_GUIDE.md) - 本地開發環境設置
- [`docs/legacy-notes/game-rules.md`](docs/legacy-notes/game-rules.md) - Scrum Poker 遊戲規則
- [`tests/README.md`](tests/README.md) - E2E 測試說明

### 🔍 架構演進記錄
- [`docs/legacy-notes/`](docs/legacy-notes/) - 完整的歷史設計文件
- 包含架構演進、安全性檢查、功能測試等記錄
- 供 AI 協作時參考設計脈絡和技術決策

---

## 🎉 專案成就

- ✅ **雙版本架構** - Desktop/Mobile 各自優化
- ✅ **自動裝置檢測** - 智慧重定向用戶體驗  
- ✅ **Firebase 即時協作** - 多人同步投票系統
- ✅ **智慧建議系統** - 10 種任務類型專業建議
- ✅ **完整測試覆蓋** - E2E 跨裝置自動化測試
- ✅ **生產就緒** - 程式碼清理與效能優化
- ✅ **PWA 支援** - Service Worker 離線功能

**記住**: 實用性 > 復雜性，使用者體驗 > 技術炫技

---

*最後更新: 2025-01-15*  
*版本: v3.2.1-task-type-reset*  
*架構: Desktop/Mobile 雙版本 + Firebase 即時協作*