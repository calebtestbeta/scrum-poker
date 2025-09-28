# Firebase 設定指南

## 問題解決方案

修正 `permission_denied` 錯誤需要完成以下 Firebase 設定：

## 1. 啟用匿名身份驗證

在 Firebase Console 中：
1. 前往 **Authentication** > **Sign-in method**
2. 啟用 **Anonymous** 身份驗證
3. 點擊儲存

## 2. 設定 Realtime Database 安全規則

在 Firebase Console 中前往 **Realtime Database** > **Rules**，使用以下規則：

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        // 允許已驗證用戶讀取房間資料
        ".read": "auth != null",
        
        // 允許已驗證用戶寫入房間資料（創建新房間）
        ".write": "auth != null && (!data.exists() || data.child('createdBy').val() == auth.uid)",
        
        "players": {
          "$playerId": {
            // 允許已驗證用戶讀寫自己的玩家資料
            ".read": "auth != null",
            ".write": "auth != null && (data.child('uid').val() == auth.uid || !data.exists())"
          }
        },
        
        "votes": {
          "$playerId": {
            // 允許已驗證用戶讀寫自己的投票
            ".read": "auth != null",
            ".write": "auth != null && (data.child('playerId').val() == $playerId || !data.exists())"
          }
        },
        
        // 其他房間屬性（phase, settings 等）
        "phase": {
          ".read": "auth != null",
          ".write": "auth != null"
        },
        
        "settings": {
          ".read": "auth != null",
          ".write": "auth != null"
        },
        
        "created": {
          ".read": "auth != null"
        },
        
        "createdBy": {
          ".read": "auth != null"
        }
      }
    }
  }
}
```

## 3. 測試安全規則（可選）

更寬鬆的測試規則（**僅供開發使用**）：

```json
{
  "rules": {
    "rooms": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## 4. 驗證設定

確保你的 Firebase 專案設定中包含：
- ✅ 已啟用匿名身份驗證
- ✅ 已設定適當的安全規則
- ✅ Realtime Database 已建立並啟用

## 程式碼修改

此修正已自動完成以下改進：
- ✅ 自動匿名身份驗證
- ✅ 身份驗證狀態檢查
- ✅ 詳細的錯誤日誌
- ✅ 房間創建者追蹤
- ✅ 用戶 UID 關聯

## 錯誤排除

如果仍有問題：

1. **檢查 Firebase Console 日誌**
2. **確認匿名驗證已啟用**
3. **檢查瀏覽器控制台中的詳細錯誤訊息**
4. **確認 Firebase 專案 ID 和 API 金鑰正確**

完成上述設定後，房間創建功能應該能正常運作。