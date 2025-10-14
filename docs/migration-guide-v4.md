# Scrum Poker v4.0 遷移指南

## 🎯 遷移概覽

本指南協助開發者從 v3.x 版本平滑遷移到 v4.0 新架構。新架構提供向後兼容性，但建議逐步採用新的 API 和模式。

## 🚦 遷移階段

### 階段 1：自動遷移（已完成）
- ✅ UnifiedEventBus 自動檢測並遷移現有 EventBus 監聽器
- ✅ GameManager 與現有 GameState 系統並行運作
- ✅ 新組件載入但不影響現有功能

### 階段 2：逐步採用（建議）
- 🔄 更新事件監聽器使用新的統一事件類型
- 🔄 採用 GameManager API 替代直接操作 GameState
- 🔄 使用新的 Firebase 數據同步組件

### 階段 3：完全遷移（未來）
- ⏳ 移除舊版 EventBus 依賴
- ⏳ 整合衝突解決器到所有數據操作
- ⏳ 啟用所有效能優化功能

## 🔧 API 遷移對照

### EventBus → UnifiedEventBus

#### 舊版本
```javascript
// 舊的事件註冊
window.eventBus.on('game-started', callback);
window.eventBus.emit('vote-submitted', data);

// 舊的事件類型（不規範）
window.eventBus.on('playerJoined', callback);
window.eventBus.on('gameStateChanged', callback);
```

#### 新版本
```javascript
// 新的統一事件類型
window.eventBus.on('game:started', callback, {
    priority: EVENT_PRIORITY.HIGH
});

window.eventBus.emit('game:vote-submitted', data, {
    source: 'GameTable',
    priority: EVENT_PRIORITY.NORMAL
});

// 命名空間監聽
window.eventBus.onNamespace('game', (data, event) => {
    console.log(`遊戲事件: ${event.type}`);
});
```

### GameState → GameManager

#### 舊版本
```javascript
// 直接操作 GameState
window.gameState.updateState({ phase: 'voting' });
window.gameState.clearVotes();

// 手動狀態檢查
if (window.gameState.getState().phase === 'voting') {
    // 執行投票邏輯
}
```

#### 新版本
```javascript
// 使用 GameManager 統一 API
await window.gameManager.transitionTo('voting', {
    triggeredBy: 'player123',
    data: { reason: 'start_voting' }
});

await window.gameManager.resetGame('player123');

// 狀態查詢
const gameState = window.gameManager.getGameState();
if (gameState.currentPhase === 'voting') {
    // 執行投票邏輯
}
```

### Firebase 操作

#### 舊版本
```javascript
// 直接使用 FirebaseService
window.firebaseService.updateRoom(roomId, data);
window.firebaseService.on('room:updated', callback);
```

#### 新版本
```javascript
// 使用新的數據同步組件（通過 GameManager）
await window.gameManager.context.updateRoomData(data);

// 或直接使用（高級用法）
const dataSync = new FirebaseDataSync(database);
await dataSync.writeRoomState(roomId, data, {
    expectedVersion: 5,
    enableConflictResolution: true
});
```

## 📋 詳細遷移步驟

### 1. 更新事件監聽器

**步驟**：逐一替換現有的事件監聽器

```javascript
// 舊的方式
window.eventBus.on('game-phase-changed', (data) => {
    this.handlePhaseChange(data);
});

// 新的方式
window.eventBus.on('game:phase-changed', (data) => {
    this.handlePhaseChange(data);
}, {
    priority: EVENT_PRIORITY.HIGH,
    filter: (data) => data.roomId === this.currentRoomId
});
```

**檢查清單**：
- [ ] 更新所有事件類型為新的命名空間格式
- [ ] 添加適當的事件優先級
- [ ] 考慮添加事件過濾器
- [ ] 移除重複的事件監聽器

### 2. 整合 GameManager

**步驟**：將現有的遊戲邏輯遷移到 GameManager

```javascript
// 在應用初始化時
class ScrumPokerApp {
    async initialize() {
        // 確保 GameManager 已初始化
        if (window.gameManager) {
            await this.integrateGameManager();
        }
    }
    
    async integrateGameManager() {
        // 註冊現有組件
        window.gameManager.registerComponent('gameTable', this.gameTable);
        window.gameManager.registerComponent('gameState', window.gameState);
        
        // 設置事件監聽
        window.eventBus.on('manager:stateChanged', (event) => {
            this.handleGameStateChange(event);
        });
    }
}
```

### 3. 更新遊戲流程控制

**原本的流程**：
```javascript
// 舊的遊戲開始流程
function startGame(roomId, player) {
    window.gameState.updateState({ phase: 'voting' });
    window.eventBus.emit('game-started', { roomId, player });
}

// 舊的開牌流程
function revealVotes() {
    window.gameState.updateState({ phase: 'revealed' });
    window.gameTable.revealAllCards();
    window.eventBus.emit('votes-revealed');
}
```

**新的流程**：
```javascript
// 新的遊戲開始流程
async function startGame(roomId, player) {
    const success = await window.gameManager.startGame({
        roomId,
        playerId: player.id,
        data: player
    });
    
    if (success) {
        console.log('遊戲開始成功');
    }
}

// 新的開牌流程
async function revealVotes(playerId) {
    const success = await window.gameManager.revealVotes(playerId);
    
    if (!success) {
        console.warn('開牌失敗，可能是狀態不允許');
    }
}
```

## ⚠️ 注意事項

### 破壞性變更

1. **事件命名變更**：
   - 舊的駝峰式事件名稱 → 新的命名空間格式
   - 部分事件類型重新命名以保持一致性

2. **API 變更**：
   - 同步操作 → 異步操作（返回 Promise）
   - 部分方法參數格式變更

3. **錯誤處理**：
   - 新架構提供更嚴格的錯誤檢查
   - 某些之前被忽略的錯誤現在會被拋出

### 相容性保證

1. **EventBus 相容**：
   - 舊的 `window.eventBus.on()` 和 `emit()` 繼續工作
   - 自動事件類型轉換（盡力而為）

2. **GameState 相容**：
   - `window.gameState` 物件保持可用
   - GameManager 會自動同步狀態到 GameState

3. **Firebase 相容**：
   - 現有的 FirebaseService 繼續工作
   - 新組件不會干擾現有連線

## 🧪 驗證遷移結果

### 1. 功能測試

```javascript
// 測試新架構是否正常工作
function validateMigration() {
    // 檢查核心組件
    console.assert(window.gameManager, 'GameManager 應該存在');
    console.assert(window.eventBus.version, 'UnifiedEventBus 應該已載入');
    
    // 測試基本事件
    let eventReceived = false;
    window.eventBus.once('test:migration', () => {
        eventReceived = true;
    });
    
    window.eventBus.emit('test:migration');
    
    setTimeout(() => {
        console.assert(eventReceived, '事件系統應該正常工作');
    }, 100);
    
    // 測試 GameManager
    window.gameManager.getGameState().then(state => {
        console.assert(state.currentPhase, '應該能獲取遊戲狀態');
    });
}
```

### 2. 效能監控

```javascript
// 監控事件處理效能
function monitorPerformance() {
    if (window.eventBus.getStatistics) {
        const stats = window.eventBus.getStatistics();
        console.log('EventBus 統計:', stats);
        
        // 檢查是否有性能問題
        if (stats.droppedEvents > 0) {
            console.warn('存在丟棄的事件，可能需要調整佇列大小');
        }
        
        if (parseFloat(stats.processRate) < 95) {
            console.warn('事件處理率過低，可能存在效能問題');
        }
    }
}

// 定期執行監控
setInterval(monitorPerformance, 30000);
```

### 3. 使用測試頁面

開啟 `architecture-test.html` 執行完整的功能測試：

```bash
# 啟動本地伺服器
python3 -m http.server 8080

# 開啟測試頁面
open http://localhost:8080/architecture-test.html
```

## 🚨 常見問題

### Q1: 遷移後事件不觸發怎麼辦？

**A**: 檢查事件類型是否使用新的命名空間格式：

```javascript
// 錯誤
window.eventBus.on('gameStarted', callback);

// 正確
window.eventBus.on('game:started', callback);
```

### Q2: GameManager 初始化失敗？

**A**: 確保依賴的組件已正確載入：

```javascript
// 檢查依賴
console.log('GameStateMachine:', typeof window.GameStateMachine);
console.log('GameContext:', typeof window.GameContext);
console.log('UnifiedEventBus:', typeof window.UnifiedEventBus);
```

### Q3: 狀態同步問題？

**A**: 檢查是否有多個狀態管理系統衝突：

```javascript
// 暫時禁用舊的狀態監聽器
if (window.gameState && window.gameState.pauseSync) {
    window.gameState.pauseSync(true);
}
```

### Q4: 效能下降？

**A**: 調整事件處理配置：

```javascript
// 調整批次處理參數
window.eventBus.batchProcessing = {
    enabled: true,
    timeout: 100,  // 增加批次延遲
    maxBatchSize: 50  // 增加批次大小
};
```

## 📞 技術支援

### 調試工具

```javascript
// 啟用調試模式
window.eventBus.enableDebug();
window.gameManager.enableDebugMode();

// 獲取詳細統計
console.log('EventBus 統計:', window.eventBus.getStatistics());
console.log('GameManager 狀態:', window.gameManager.getDebugInfo());
```

### 日誌收集

新架構提供詳細的日誌輸出，建議在遷移期間保持控制台開啟以監控：

- `🎮 GameManager` 前綴：遊戲管理器日誌
- `📡 UnifiedEventBus` 前綴：事件系統日誌  
- `🔧 ConflictResolver` 前綴：衝突解決日誌
- `📊 FirebaseDataSync` 前綴：數據同步日誌

---

**最後更新**: 2025-01-11  
**版本**: v4.0.0  
**狀態**: Phase 1 遷移完成