# Scrum Poker v4.0 架構重構總覽

## 🎯 重構目標

本次架構重構旨在解決以下核心問題：
1. **狀態管理分散**：GameState 和 GameTable 耦合過緊
2. **事件系統混亂**：缺乏統一的事件管理機制
3. **Firebase 服務臃腫**：單一服務承擔過多職責
4. **併發衝突處理**：缺乏系統性的衝突解決機制
5. **擴展性限制**：難以支持未來的功能擴展

## 🏗️ 新架構概覽

### 核心架構模式

```
┌─────────────────────────────────────────────────────────────┐
│                     統一事件匯流排                          │
│                   (UnifiedEventBus)                        │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
    ┌───────▼──────┐ ┌────────▼────────┐ ┌─────▼──────┐
    │ GameManager  │ │  FirebaseEvent  │ │ UI組件層   │
    │   (控制中心)  │ │    Manager      │ │           │
    └───────┬──────┘ └─────────────────┘ └────────────┘
            │
    ┌───────▼──────┐
    │ GameContext  │
    │  (橋接層)     │
    └───────┬──────┘
            │
    ┌───────▼──────┐
    │StateMachine  │
    │  (狀態機)     │
    └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Firebase 數據層                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│ ConflictResolver│ FirebaseDataSync│    FirebaseEvent       │
│   (衝突解決)     │   (數據同步)     │      Manager           │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 📦 新增核心組件

### 1. GameManager (遊戲管理器)
**檔案**: `src/core/GameManager.js`

**職責**：
- 作為整個遊戲系統的統一控制中心
- 整合 GameContext、GameStateMachine 和其他組件
- 提供高層次的遊戲 API
- 管理組件生命週期和健康檢查

**核心功能**：
```javascript
class GameManager {
    async initialize(options)           // 初始化系統
    async startGame(options)            // 開始遊戲
    async transitionTo(phase, options)  // 狀態轉換
    async revealVotes(triggeredBy)      // 開牌
    async resetGame(triggeredBy)        // 重置遊戲
    getGameState()                      // 獲取遊戲狀態
    getDebugInfo()                      // 調試資訊
}
```

### 2. GameStateMachine (遊戲狀態機)
**檔案**: `src/core/GameStateMachine.js`

**職責**：
- 實現狀態模式的遊戲階段管理
- 處理狀態轉換的驗證和執行
- 提供清晰的狀態轉換規則

**狀態定義**：
```javascript
const GAME_PHASES = {
    WAITING: 'waiting',         // 等待玩家
    VOTING: 'voting',          // 投票進行中
    REVEALING: 'revealing',    // 開牌過渡中
    REVEALED: 'revealed',      // 已開牌顯示
    FINISHED: 'finished',      // 本輪結束
    RESETTING: 'resetting'     // 重置過渡中
}
```

### 3. GameContext (遊戲上下文)
**檔案**: `src/core/GameContext.js`

**職責**：
- 作為狀態機與遊戲組件間的橋接層
- 管理組件引用和依賴注入
- 提供統一的遊戲資料存取介面

**核心功能**：
```javascript
class GameContext {
    registerComponent(type, component)  // 註冊組件
    updatePhase(phase, version)         // 更新階段
    clearVotingData()                   // 清除投票
    revealAllVotes()                    // 開牌
    generateAdvice()                    // 生成建議
}
```

### 4. UnifiedEventBus (統一事件匯流排)
**檔案**: `src/core/UnifiedEventBus.js`

**職責**：
- 統一所有組件的事件通訊
- 支援事件優先級、節流、防抖
- 提供命名空間管理和萬用字元監聽
- 中介軟體系統支援

**核心特性**：
```javascript
class UnifiedEventBus {
    on(eventType, callback, options)    // 註冊監聽器
    emit(eventType, data, options)      // 發送事件
    onNamespace(namespace, callback)    // 命名空間監聽
    use(middleware, priority)           // 註冊中介軟體
    getStatistics()                     // 事件統計
}
```

### 5. ConflictResolver (衝突解決器)
**檔案**: `src/services/ConflictResolver.js`

**職責**：
- 檢測併發操作衝突
- 實現多種衝突解決策略
- 支援樂觀鎖和重試機制

**解決策略**：
```javascript
const RESOLUTION_STRATEGIES = {
    FIRST_WRITER_WINS: 'first_writer_wins',
    PRIORITY_BASED: 'priority_based',
    RETRY_WITH_BACKOFF: 'retry_with_backoff',
    IGNORE_CONFLICT: 'ignore_conflict'
}
```

### 6. FirebaseDataSync (Firebase 數據同步)
**檔案**: `src/services/FirebaseDataSync.js`

**職責**：
- 專責 Firebase 數據存取和同步
- 實現版本控制和樂觀鎖
- 支援批次更新和事務處理

**核心功能**：
```javascript
class FirebaseDataSync {
    async readRoomState(roomId)         // 讀取房間狀態
    async writeRoomState(roomId, data)  // 寫入房間狀態
    async transaction(roomId, updateFn) // 事務性更新
    setupListener(path, callback)       // 設置監聽器
}
```

### 7. FirebaseEventManager (Firebase 事件管理器)
**檔案**: `src/services/FirebaseEventManager.js`

**職責**：
- 專責 Firebase 事件監聽和分發
- 實現智慧事件過濾和批次處理
- 提供錯誤恢復機制

**核心功能**：
```javascript
class FirebaseEventManager {
    on(eventType, callback, options)       // 註冊事件監聽
    setupFirebaseListener(path, callback)  // 設置 Firebase 監聽
    emit(eventType, data)                  // 發送事件
    processBatchedEvents()                 // 批次事件處理
}
```

## 🔄 事件系統重構

### 統一事件命名規範

```javascript
const UNIFIED_EVENT_TYPES = {
    // GameManager 事件
    GAME_MANAGER_INITIALIZED: 'manager:initialized',
    GAME_MANAGER_STATE_CHANGED: 'manager:stateChanged',
    GAME_MANAGER_TRANSITION_SUCCESS: 'manager:transition:success',
    
    // 遊戲狀態事件
    GAME_STARTED: 'game:started',
    GAME_PHASE_CHANGED: 'game:phase-changed',
    GAME_VOTE_SUBMITTED: 'game:vote-submitted',
    
    // Firebase 事件
    FIREBASE_CONNECTED: 'firebase:connected',
    ROOM_PLAYERS_UPDATED: 'room:players-updated',
    ROOM_VOTES_UPDATED: 'room:votes-updated'
}
```

### 事件優先級系統

```javascript
const EVENT_PRIORITY = {
    CRITICAL: 1,    // 系統關鍵事件
    HIGH: 2,        // 遊戲狀態變更
    NORMAL: 3,      // 一般事件
    LOW: 4          // 統計、日誌等
}
```

## 🚀 向後相容性

### 遺留系統整合

1. **GameState.js 兼容**：
   - GameManager 通過 `syncToLegacyGameState()` 方法同步狀態
   - 保持現有 API 可用性

2. **EventBus 遷移**：
   - UnifiedEventBus 自動檢測並遷移現有監聽器
   - 保持向後兼容的 API

3. **FirebaseService 橋接**：
   - 現有 FirebaseService 繼續工作
   - 新組件逐步接管功能

## 📊 效能優化

### 事件處理優化

1. **批次處理**：50ms 內的相似事件合併處理
2. **優先級佇列**：關鍵事件優先處理
3. **智慧節流**：防止事件氾濫
4. **記憶體管理**：自動清理過期監聽器

### 數據同步優化

1. **版本控制**：避免不必要的數據傳輸
2. **樂觀鎖**：減少衝突和重試
3. **批次更新**：合併多個小更新
4. **連線池管理**：優化 Firebase 連線

## 🧪 測試與驗證

### 測試頁面
**檔案**: `architecture-test.html`

提供完整的新架構功能測試，包括：
- 統一事件系統測試
- GameManager 功能測試
- 衝突解決器測試
- 數據同步測試
- 系統統計監控

### 使用方式
```bash
# 在專案根目錄啟動本地伺服器
python3 -m http.server 8080

# 訪問測試頁面
http://localhost:8080/architecture-test.html
```

## 🔮 未來擴展能力

### Phase 2 計劃功能

1. **玩家狀態管理重構**：
   - 獨立的玩家模型系統
   - 狀態持久化機制
   - 離線/重連處理

2. **建議引擎解耦**：
   - 插件化建議系統
   - 多重建議來源整合
   - 機器學習整合準備

3. **觀察者模式實現**：
   - 支援遊戲觀察者
   - 即時數據分析
   - 第三方整合

4. **歷史記錄系統**：
   - 完整的遊戲回放
   - 數據倉儲設計
   - 分析查詢介面

## 📈 效益總結

### 架構改善

1. **可維護性提升**：模組化設計，職責清晰分離
2. **擴展性增強**：插件化架構，易於添加新功能
3. **穩定性改進**：系統性錯誤處理和恢復機制
4. **效能最佳化**：智慧事件處理和數據同步

### 開發體驗改善

1. **調試友好**：完整的日誌和統計系統
2. **測試便利**：獨立組件易於單元測試
3. **文件完整**：清晰的 API 文件和使用範例
4. **向後兼容**：平滑的升級路徑

---

**版本**: v4.0.0-unified-architecture  
**完成日期**: 2025-01-11  
**作者**: Claude AI  
**狀態**: Phase 1 完成，準備進入 Phase 2