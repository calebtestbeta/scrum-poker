# 🔥 Firebase Realtime Database 規則設定指南

## 📋 目錄
1. [規則概覽](#規則概覽)
2. [完整規則內容](#完整規則內容) 
3. [設定步驟](#設定步驟)
4. [規則說明](#規則說明)
5. [測試驗證](#測試驗證)
6. [管理員設定](#管理員設定)
7. [常見問題](#常見問題)

---

## 📊 規則概覽

### 🎯 主要功能
- ✅ **房間管理** - 遊戲房間的建立、加入、投票
- ✅ **使用者驗證** - 只有認證用戶可以操作
- ✅ **資料驗證** - 嚴格的資料格式檢查
- ✅ **管理員權限** - 系統管理功能
- ✅ **安全防護** - 防止惡意操作和資料污染

### 🏗️ 資料結構
```
scrumPoker/
├── rooms/               # 遊戲房間
│   └── {roomId}/
│       ├── gameState/   # 遊戲狀態
│       ├── players/     # 玩家列表
│       ├── votes/       # 投票資料
│       └── settings/    # 房間設定
├── userProfiles/        # 使用者檔案（可選）
├── admins/             # 管理員列表
├── statistics/         # 系統統計
└── systemConfig/       # 系統設定
```

---

## 📝 完整規則內容

```json
{
  "rules": {
    // 遊戲房間規則
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null",
        ".validate": "newData.hasChildren(['gameState', 'players', 'createdAt', 'createdBy'])",
        
        "gameState": {
          ".validate": "newData.hasChildren(['phase', 'votes']) && newData.child('phase').isString()",
          "phase": {
            ".validate": "newData.isString() && ['waiting', 'voting', 'revealed'].indexOf(newData.val()) >= 0"
          },
          "votes": {
            ".validate": "newData.isObject()"
          },
          "currentRound": {
            ".validate": "newData.isNumber()"
          },
          "lastActivity": {
            ".validate": "newData.isNumber()"
          }
        },
        
        "players": {
          "$playerId": {
            ".validate": "newData.hasChildren(['name', 'role']) && newData.child('name').isString() && newData.child('role').isString()",
            "name": {
              ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 20"
            },
            "role": {
              ".validate": "newData.isString() && ['dev', 'qa', 'scrum_master', 'po', 'other'].indexOf(newData.val()) >= 0"
            },
            "taskType": {
              ".validate": "newData.isString()"
            },
            "joinedAt": {
              ".validate": "newData.isNumber()"
            },
            "isOnline": {
              ".validate": "newData.isBoolean()"
            },
            "lastSeen": {
              ".validate": "newData.isNumber()"
            }
          }
        },
        
        "votes": {
          "$playerId": {
            ".validate": "newData.isNumber() || newData.isString() || newData.val() === null"
          }
        },
        
        "createdAt": {
          ".validate": "newData.isNumber()"
        },
        "createdBy": {
          ".validate": "newData.isString()"
        },
        "lastUpdated": {
          ".validate": "newData.isNumber()"
        },
        "settings": {
          "cardDeck": {
            ".validate": "newData.isString() && ['fibonacci', 'planning', 'tshirt'].indexOf(newData.val()) >= 0"
          },
          "autoReveal": {
            ".validate": "newData.isBoolean()"
          },
          "allowObservers": {
            ".validate": "newData.isBoolean()"
          }
        }
      }
    },
    
    // 使用者檔案（可選）
    "userProfiles": {
      "$userId": {
        ".read": "$userId === auth.uid || root.child('admins').child(auth.uid).exists()",
        ".write": "$userId === auth.uid || root.child('admins').child(auth.uid).exists()",
        "displayName": {
          ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 30"
        },
        "preferredRole": {
          ".validate": "newData.isString() && ['dev', 'qa', 'scrum_master', 'po', 'other'].indexOf(newData.val()) >= 0"
        },
        "preferredCardDeck": {
          ".validate": "newData.isString() && ['fibonacci', 'planning', 'tshirt'].indexOf(newData.val()) >= 0"
        },
        "totalGames": {
          ".validate": "newData.isNumber() && newData.val() >= 0"
        },
        "lastActive": {
          ".validate": "newData.isNumber()"
        },
        "createdAt": {
          ".validate": "newData.isNumber()"
        }
      }
    },
    
    // 管理員權限
    "admins": {
      ".read": "root.child('admins').child(auth.uid).exists()",
      ".write": "root.child('admins').child(auth.uid).exists()",
      "$adminId": {
        ".validate": "newData.isBoolean()"
      }
    },
    
    // 系統統計（管理員專用）
    "statistics": {
      ".read": "root.child('admins').child(auth.uid).exists()",
      ".write": "root.child('admins').child(auth.uid).exists()",
      "totalRooms": {
        ".validate": "newData.isNumber()"
      },
      "totalUsers": {
        ".validate": "newData.isNumber()"
      },
      "totalVotes": {
        ".validate": "newData.isNumber()"
      },
      "lastUpdated": {
        ".validate": "newData.isNumber()"
      }
    },
    
    // 系統設定（管理員專用）
    "systemConfig": {
      ".read": "root.child('admins').child(auth.uid).exists()",
      ".write": "root.child('admins').child(auth.uid).exists()",
      "maxRoomsPerUser": {
        ".validate": "newData.isNumber() && newData.val() > 0"
      },
      "maxPlayersPerRoom": {
        ".validate": "newData.isNumber() && newData.val() > 0 && newData.val() <= 50"
      },
      "roomTimeout": {
        ".validate": "newData.isNumber() && newData.val() > 0"
      },
      "maintenanceMode": {
        ".validate": "newData.isBoolean()"
      }
    }
  }
}
```

---

## 🚀 設定步驟

### 第一步：登入 Firebase Console
1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇您的專案
3. 點擊左側選單的「Realtime Database」

### 第二步：進入規則編輯器
1. 在 Realtime Database 頁面中
2. 點擊「規則」標籤
3. 您會看到目前的規則編輯器

### 第三步：替換規則
1. **⚠️ 重要：先備份現有規則**
   ```json
   // 預設規則（備份參考）
   {
     "rules": {
       ".read": false,
       ".write": false
     }
   }
   ```

2. **清除現有內容**
3. **貼上新規則**（複製上方完整規則內容）
4. **點擊「發布」**

### 第四步：驗證設定
設定完成後，規則頁面應該顯示：
```
規則已於 [時間戳記] 成功發布
```

---

## 📖 規則說明

### 🔐 權限控制

#### 基本權限
- **讀取權限**: `"auth != null"` - 只有已認證用戶可讀取
- **寫入權限**: `"auth != null"` - 只有已認證用戶可寫入

#### 管理員權限
- **管理員檢查**: `root.child('admins').child(auth.uid).exists()`
- 管理員可以：
  - 讀寫所有使用者檔案
  - 查看系統統計
  - 修改系統設定

### 📋 資料驗證

#### 房間資料
- **必要欄位**: `gameState`, `players`, `createdAt`, `createdBy`
- **遊戲階段**: 只允許 `waiting`, `voting`, `revealed`
- **玩家角色**: 只允許 `dev`, `qa`, `scrum_master`, `po`, `other`

#### 資料格式
- **名字長度**: 1-20 字符
- **投票值**: 數字、字串或 null
- **時間戳記**: 必須為數字

### 🛡️ 安全特性

1. **防止未認證存取** - 所有操作需要認證
2. **資料格式驗證** - 嚴格檢查資料結構
3. **長度限制** - 防止過長資料污染
4. **類型檢查** - 確保資料類型正確
5. **管理員隔離** - 管理功能專用權限

---

## 🧪 測試驗證

### 基本測試
1. **認證測試**
   ```javascript
   // 未認證用戶應該無法讀取
   firebase.database().ref('rooms').once('value')
   // 預期結果：Permission denied
   ```

2. **房間建立測試**
   ```javascript
   // 認證後建立房間
   const roomData = {
     gameState: { phase: 'waiting', votes: {} },
     players: {},
     createdAt: Date.now(),
     createdBy: 'user123'
   };
   firebase.database().ref('rooms/test123').set(roomData)
   // 預期結果：成功
   ```

### 進階測試
1. **資料驗證測試**
2. **權限邊界測試**
3. **管理員功能測試**

---

## 👑 管理員設定

### 設定第一個管理員

#### 方法一：透過 Firebase Console
1. 前往 Firebase Console → Realtime Database → 資料
2. 點擊「+」新增資料
3. 建立路徑：`/admins/[您的UID]`
4. 值設為：`true`

#### 方法二：透過程式碼（需暫時放寬規則）
```javascript
// 暫時在規則中加入
"admins": {
  ".write": "auth.uid === 'YOUR_FIRST_ADMIN_UID'"
}

// 然後執行
firebase.database().ref('admins/YOUR_UID').set(true)
```

### 管理員功能
- ✅ 查看所有使用者檔案
- ✅ 檢視系統統計
- ✅ 修改系統設定
- ✅ 新增/移除管理員

---

## ❓ 常見問題

### Q1: 規則發布後出現「Permission denied」
**A:** 確認用戶已經過 Firebase 認證，檢查 `auth.uid` 是否存在。

### Q2: 無法寫入房間資料
**A:** 檢查資料結構是否包含必要欄位：`gameState`, `players`, `createdAt`, `createdBy`。

### Q3: 管理員功能無法使用
**A:** 確認您的 UID 已加入 `/admins/` 節點，值為 `true`。

### Q4: 如何查看我的 UID？
**A:** 
```javascript
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    console.log('UID:', user.uid);
  }
});
```

### Q5: 如何回復到預設規則？
**A:** 
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

---

## 🎯 部署檢查清單

- [ ] ✅ 備份現有規則
- [ ] ✅ 複製新規則到 Firebase Console
- [ ] ✅ 點擊「發布」
- [ ] ✅ 確認發布成功訊息
- [ ] ✅ 測試基本讀寫權限
- [ ] ✅ 設定第一個管理員
- [ ] ✅ 測試應用程式連接
- [ ] ✅ 驗證遊戲房間建立功能

---

**🎮 現在您的 Scrum Poker 應用程式已具備企業級的安全防護！**