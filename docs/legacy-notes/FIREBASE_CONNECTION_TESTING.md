# 🔥 Firebase 連線測試指南

## 快速測試步驟

### 1. 使用專門的測試工具 (推薦)

開啟 `firebase-connection-test.html` 進行全面測試：

```bash
# 啟動本地服務器
python3 -m http.server 8080
# 或
npm start

# 瀏覽器訪問
http://localhost:8080/firebase-connection-test.html
```

**測試工具功能：**
- ✅ 環境檢查 (Firebase SDK, ConfigManager, Service, Adapter)
- ✅ Firebase 配置驗證和儲存
- ✅ 即時連線測試
- ✅ 讀寫權限測試  
- ✅ 房間建立和加入測試
- ✅ 投票功能測試
- ✅ 即時資料監聽測試
- ✅ 詳細日誌記錄和匯出

### 2. 使用 Desktop 版本內建除錯

#### 步驟 A: 開啟 Desktop 版本
```
http://localhost:8080/public/desktop/index.html?room=test&name=測試者&role=dev
```

#### 步驟 B: 開啟瀏覽器 Console (F12)

#### 步驟 C: 執行測試指令

**基本狀態檢查：**
```javascript
// 查看完整 Firebase 狀態
debugDesktop().testFirebase()

// 查看基本資訊
debugDesktop().firebase
```

**模擬資料測試：**
```javascript
// 模擬 Firebase 資料更新 (測試 UI 渲染)
debugDesktop().simulateFirebaseData()

// 測試卡牌選擇
debugDesktop().selectCard(8)
```

## 預期的測試結果

### ✅ 成功連線的 Console 輸出

```
🖥️ Desktop UI 初始化 {room: "test", name: "測試者", role: "dev"}
🔥 嘗試初始化 Firebase Adapter...
🔗 正在連接 Firebase... {room: "test", player: {name: "測試者", role: "dev"}}
✅ Firebase 連線成功
👂 設置 Firebase 房間監聽器...
🎉 Desktop UI Firebase 連線成功！使用 debugDesktop().testFirebase() 查看詳細狀態
```

### ❌ 連線失敗的 Console 輸出

```
🖥️ Desktop UI 初始化 {room: "test", name: "測試者", role: "dev"}
🔥 嘗試初始化 Firebase Adapter...
⚠️ Firebase Adapter 未載入，使用本地模式
⚠️ Firebase 連線失敗，使用本地模式
⚠️ Desktop UI 已載入但 Firebase 未連線。使用 debugDesktop().testFirebase() 診斷問題
```

## 常見問題診斷

### 問題 1: Firebase SDK 未載入
**症狀：** `Firebase SDK: ❌`
**解決：** 檢查網路連線，確保 CDN 正常載入

### 問題 2: FirebaseConfigManager 未找到
**症狀：** `FirebaseConfigManager: ❌`
**解決：** 確認 `src/managers/FirebaseConfigManager.js` 檔案存在並正確載入

### 問題 3: Firebase 配置錯誤
**症狀：** `連線測試: ❌ 失敗`
**解決：** 
1. 檢查 Project ID 和 API Key 是否正確
2. 確認 Firebase 專案已建立且 Realtime Database 已啟用
3. 檢查 Firebase 規則是否允許讀寫

### 問題 4: Firebase Adapter 初始化失敗
**症狀：** `Firebase Adapter: ❌`
**解決：** 確認 `public/shared/firebase-adapter.js` 檔案存在

## 詳細測試命令

### A. 環境檢查
```javascript
// 檢查所有依賴項
console.log('Firebase SDK:', typeof firebase !== 'undefined')
console.log('ConfigManager:', !!window.firebaseConfigManager)
console.log('FirebaseService:', !!window.FirebaseService)  
console.log('Firebase Adapter:', typeof window.createFirebaseAdapter === 'function')
```

### B. 配置測試
```javascript
// 檢查儲存的配置
window.firebaseConfigManager.loadConfig()

// 檢查連線狀態
window.firebaseConfigManager.getStatus()
window.firebaseConfigManager.isReady()
```

### C. 連線測試
```javascript
// 測試連線
await window.firebaseConfigManager.testConnection()

// 測試讀寫權限
await window.firebaseConfigManager.testReadWriteAccess()
```

### D. 房間操作測試
```javascript
// 建立測試 Adapter
const adapter = window.createFirebaseAdapter()

// 初始化房間
await adapter.init('test-room', {name: '測試者', role: 'dev'})

// 檢查連線狀態
adapter.isConnected()

// 查看房間資料
adapter.getRoomData()
```

## Firebase 設定要求

### Realtime Database 規則 (firebase-rules.json)
```json
{
  "rules": {
    "connection-test": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### 必要的 Firebase 功能
- ✅ Authentication (Anonymous)
- ✅ Realtime Database
- ✅ 適當的安全規則

## 故障排除檢查清單

- [ ] 網路連線正常
- [ ] Firebase 專案已建立和配置
- [ ] Realtime Database 已啟用
- [ ] 安全規則允許匿名使用者存取
- [ ] Project ID 和 API Key 正確
- [ ] 所有 JavaScript 檔案正確載入
- [ ] 瀏覽器支援 ES6+ 語法
- [ ] 沒有 CORS 或 CSP 限制

## 成功驗證標誌

當您看到以下訊息時，表示 Firebase 連線成功：

1. **Console 輸出：**
   ```
   ✅ Firebase 連線成功
   👂 設置 Firebase 房間監聽器...
   🎉 Desktop UI Firebase 連線成功！
   ```

2. **debugDesktop().testFirebase() 結果：**
   ```javascript
   {
       environment: true,
       configManager: true,
       adapter: true,
       connected: true,
       roomData: { phase: "voting", players: {...}, votes: {...} }
   }
   ```

3. **UI 行為：**
   - 左側玩家列表顯示真實 Firebase 資料
   - 底部統計數據即時更新
   - 階段指示器反映實際房間狀態

---

使用這些工具，您可以快速診斷和驗證 Firebase 連線狀態！