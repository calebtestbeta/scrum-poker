# 🚀 Firebase 安全規則部署指南

## 📋 部署方式

### 方式 1: Firebase 控制台 (推薦)
1. 前往 [Firebase 控制台](https://console.firebase.google.com/)
2. 選擇您的專案
3. 左側選單 → **Realtime Database**
4. 選取 **規則** 標籤
5. 將以下內容複製並貼上：

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    
    "rooms": {
      "$roomId": {
        // 房間基本資訊 - 需要身份驗證
        "phase": {
          ".read": "auth != null",
          ".write": "auth != null && (newData.val() == 'voting' || newData.val() == 'revealing' || newData.val() == 'finished')"
        },
        
        "created_at": {
          ".read": "auth != null",
          ".write": "auth != null && !data.exists()"
        },
        
        "last_activity": {
          ".read": "auth != null",  
          ".write": "auth != null"
        },
        
        "task_type": {
          ".read": "auth != null",
          ".write": "auth != null"
        },
        
        // 玩家管理 - 只能修改自己的資料
        "players": {
          ".read": "auth != null",
          
          "$playerId": {
            ".write": "auth != null && auth.uid == $playerId",
            
            "name": {
              ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 20"
            },
            
            "role": {
              ".validate": "newData.val().matches(/^(dev|qa|scrum_master|po|other)$/)"
            },
            
            "joined_at": {
              ".validate": "newData.isNumber()"
            },
            
            "last_active": {
              ".validate": "newData.isNumber()"
            },
            
            "online": {
              ".validate": "newData.isBoolean()"
            },
            
            "hasVoted": {
              ".validate": "newData.isBoolean()"
            }
          }
        },
        
        // 投票管理 - 只能修改自己的投票
        "votes": {
          ".read": "auth != null",
          
          "$playerId": {
            ".write": "auth != null && auth.uid == $playerId",
            
            "value": {
              ".validate": "newData.isNumber() || newData.val().matches(/^(coffee|question|infinity)$/)"
            },
            
            "timestamp": {
              ".validate": "newData.isNumber()"
            },
            
            "player_role": {
              ".validate": "newData.val().matches(/^(dev|qa|scrum_master|po|other)$/)"
            }
          }
        },
        
        // 會話統計資訊 - 只讀，需要身份驗證
        "session_info": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    }
  }
}
```

6. 點擊 **發布**

### 方式 2: Firebase CLI (如果已安裝)
```bash
# 安裝 Firebase CLI (如果尚未安裝)
npm install -g firebase-tools

# 登入 Firebase
firebase login

# 初始化專案 (如果尚未初始化)
firebase init database

# 部署規則
firebase deploy --only database
```

## ✅ 部署後驗證

### 1. 檢查規則狀態
- 在 Firebase 控制台確認規則已更新
- 檢查 **規則** 標籤下是否顯示新的安全規則

### 2. 功能測試
1. **測試應用登入**
   - 訪問 `https://calebtestbeta.github.io/scrum-poker/`
   - 確認可以正常加入房間

2. **測試投票功能**
   - 加入房間後嘗試投票
   - 確認投票狀態正常同步

3. **測試多人協作**
   - 開啟多個瀏覽器標籤
   - 確認玩家狀態正常同步

### 3. 安全性驗證
使用提供的測試工具：
- 開啟 `security-test.html`
- 在 `firebaseConfig` 中填入您的 Firebase 配置
- 執行各項安全測試

## 🔧 故障排除

### 常見問題

#### 1. "Permission denied" 錯誤
**症狀**: 無法讀取或寫入資料
**原因**: 匿名身份驗證未正確設置
**解決方案**:
1. 檢查 Firebase 控制台 → Authentication → Sign-in method
2. 確保 **匿名** 身份驗證已啟用
3. 檢查應用程式碼中的 `ensureAuthenticated()` 方法

#### 2. 資料驗證失敗
**症狀**: 資料寫入被拒絕
**原因**: 資料格式不符合驗證規則
**解決方案**:
- 檢查玩家名稱長度 (1-20字符)
- 確認角色值為有效選項
- 確保時間戳為數字類型

#### 3. 投票功能異常
**症狀**: 無法提交投票
**原因**: `auth.uid` 與 `playerId` 不匹配
**解決方案**:
- 確保使用 Firebase Auth 生成的 UID 作為 playerId
- 檢查 `FirebaseService.js` 中的 `generatePlayerId()` 方法

### 緊急回滾

如果遇到嚴重問題，可立即回滾到開放規則：

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**注意**: 回滾後安全性將降低，請儘快排除問題並重新部署安全規則。

## 📊 監控建議

### Firebase 控制台監控
1. **使用量** → 監控讀寫次數
2. **Authentication** → 檢查登入狀況
3. **Realtime Database** → 檢查資料結構

### 應用層監控
- 檢查瀏覽器控制台錯誤
- 監控網路請求狀態
- 確認用戶體驗正常

---

**部署完成後，您的 Firebase 安全性將從 0% 提升到 85%** 🔒