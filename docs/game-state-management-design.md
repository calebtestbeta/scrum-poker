# Scrum Poker 遊戲狀態管理設計方案

## 🎯 問題分析

當前同步問題根源：
1. **狀態更新不一致**：不同玩家的 UI 更新時機不同
2. **事件廣播混亂**：缺乏統一的狀態變更廣播機制  
3. **Firebase vs Local 狀態衝突**：本地狀態與遠端狀態不同步
4. **競態條件**：多個玩家同時操作導致狀態衝突

## 📊 狀態機設計

### 核心狀態定義
```javascript
const GAME_PHASES = {
    WAITING: 'waiting',     // 等待玩家加入/準備
    VOTING: 'voting',       // 投票進行中
    REVEALING: 'revealing', // 開牌過渡中
    REVEALED: 'revealed',   // 已開牌顯示
    FINISHED: 'finished',   // 本輪結束
    RESETTING: 'resetting'  // 重置過渡中
};

const PHASE_TRANSITIONS = {
    'waiting → voting': '開始投票',
    'voting → revealing': '觸發開牌',
    'revealing → revealed': '開牌完成', 
    'revealed → finished': '結果確認',
    'finished → resetting': '重新開始',
    'resetting → waiting': '重置完成'
};
```

### 狀態轉換觸發條件
```javascript
const TRANSITION_CONDITIONS = {
    'waiting → voting': {
        condition: 'hasMinPlayers && allPlayersReady',
        trigger: 'manual_start',
        authority: 'any_player'
    },
    'voting → revealing': {
        condition: 'hasVotes', 
        trigger: 'reveal_request',
        authority: 'any_player'
    },
    'revealing → revealed': {
        condition: 'reveal_broadcast_sent',
        trigger: 'automatic',
        authority: 'system'
    },
    'revealed → finished': {
        condition: 'statistics_calculated',
        trigger: 'automatic', 
        authority: 'system'
    },
    'finished → resetting': {
        condition: 'true',
        trigger: 'clear_request',
        authority: 'any_player'
    },
    'resetting → waiting': {
        condition: 'reset_broadcast_sent',
        trigger: 'automatic',
        authority: 'system'
    }
};
```

## 🔄 同步架構設計

### Firebase 資料結構
```javascript
// Firebase 上的權威狀態
const FIREBASE_GAME_STATE = {
    "rooms/{roomId}": {
        // 權威遊戲狀態
        "gameState": {
            "phase": "voting|revealing|revealed|finished|resetting",
            "phaseTimestamp": timestamp,
            "phaseVersion": incrementalNumber,
            "triggeredBy": playerId,
            "nextPhase": "target_phase"
        },
        
        // 投票資料
        "votes": {
            "{playerId}": {
                "value": vote_value,
                "timestamp": timestamp,
                "revealed": boolean
            }
        },
        
        // 玩家狀態
        "players": {
            "{playerId}": {
                "hasVoted": boolean,
                "online": boolean,
                "lastHeartbeat": timestamp
            }
        },
        
        // 階段廣播控制
        "broadcasts": {
            "reveal": {
                "version": number,
                "timestamp": timestamp,
                "triggeredBy": playerId
            },
            "reset": {
                "version": number, 
                "timestamp": timestamp,
                "triggeredBy": playerId
            }
        }
    }
};
```

### Client-Only 狀態
```javascript
// 只在本地維護的狀態
const CLIENT_ONLY_STATE = {
    selectedCard: null,           // 當前選擇的卡牌
    uiAnimations: {},            // UI 動畫狀態
    networkStatus: 'connected',   // 網路狀態
    lastSyncVersion: 0,          // 最後同步版本
    pendingOperations: [],       // 待執行操作
    localPhaseOverride: null     // 本地階段覆蓋
};
```

## ⚡ 事件流設計

### 階段變更廣播邏輯
1. **開牌流程** (`voting → revealed`)
   - 觸發者：任何玩家點擊「開牌」
   - 權威更新：Firebase gameState.phase = 'revealing'
   - 廣播事件：reveal broadcast version++
   - 所有玩家：監聽 broadcast 變更 → 執行本地開牌動畫

2. **重置流程** (`finished → waiting`) 
   - 觸發者：任何玩家點擊「重新開始」
   - 權威更新：Firebase gameState.phase = 'resetting'
   - 清理動作：清除 votes, 重置 player.hasVoted
   - 廣播事件：reset broadcast version++
   - 所有玩家：監聽 broadcast 變更 → 執行本地重置

### 優先級處理
```javascript
const CONFLICT_RESOLUTION = {
    'simultaneous_reveal': 'first_writer_wins',
    'simultaneous_reset': 'first_writer_wins', 
    'vote_during_reveal': 'ignore_new_votes',
    'reset_during_vote': 'allow_reset'
};
```

## 🔧 實作策略

### Phase 1: 狀態機強化 (相容性優先)
- 在 GameState.js 中加入版本控制
- 在 FirebaseService 中加入 broadcast 機制
- 在 GameTable 中加入統一的狀態同步邏輯

### Phase 2: 競態條件處理
- 實作樂觀鎖機制 (version-based)
- 加入重試和衝突解決邏輯
- 優化事件監聽器的觸發順序

### Phase 3: UI 更新優化
- 統一 UI 更新入口點
- 實作狀態變更的批次更新
- 加入防抖和節流機制

## 📋 建議實作順序

1. **首先修改 GameState.js** - 加入版本控制和狀態驗證
2. **然後修改 FirebaseService.js** - 加入 broadcast 機制
3. **最後修改 GameTable.js** - 統一狀態同步邏輯
4. **測試同步邏輯** - 多人多裝置測試
5. **效能優化** - 減少不必要的 Firebase 讀寫

## 🎯 成功指標

- ✅ 所有玩家在相同時間看到相同的遊戲狀態
- ✅ 開牌後所有玩家都能看到翻面的卡牌
- ✅ 重新開始後所有狀態都正確清除
- ✅ 網路延遲不影響狀態同步的正確性
- ✅ 多人同時操作不會導致狀態不一致