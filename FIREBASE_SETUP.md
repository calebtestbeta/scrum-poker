# 🔥 Firebase 設定指南

## 快速開始

本專案支援兩種運行模式：
1. **本地模擬模式** - 無需 Firebase 專案，適合開發和測試
2. **雲端模式** - 需要真實的 Firebase 專案，適合生產環境

## 🏠 本地模擬模式（推薦新手）

使用 `http://localhost:xxxx` 訪問應用時會自動使用本地模擬模式：
- ✅ 無需註冊 Firebase 帳號
- ✅ 無需設定任何配置
- ✅ 所有功能完整可用
- ✅ 數據存儲在瀏覽器記憶體中

## ☁️ 雲端模式設定

### 步驟 1: 創建 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「新增專案」
3. 輸入專案名稱（例如：`my-scrum-poker`）
4. 完成專案創建

### 步驟 2: 啟用必要服務

#### 啟用 Authentication
1. 在 Firebase Console 中選擇你的專案
2. 前往「Authentication」→「登入方法」
3. 啟用「匿名」登入方式

#### 啟用 Realtime Database
1. 前往「Realtime Database」
2. 點擊「建立資料庫」
3. 選擇地區（建議選擇亞洲地區以獲得更好性能）
4. 選擇「以測試模式啟動」（稍後會設定安全規則）

### 步驟 3: 取得專案配置

1. 前往「專案設定」（齒輪圖標）
2. 選擇「一般」分頁
3. 在「你的應用程式」區塊中，點擊「</> Web」
4. 註冊應用程式（輸入任何名稱）
5. 複製 `firebaseConfig` 物件中的值

### 步驟 4: 配置應用程式

1. 打開 `firebase-config.js` 文件
2. 將以下欄位替換為你的真實值：
   ```javascript
   const firebaseConfig = {
       apiKey: "你的-api-key",                    // 從 Firebase Console 複製
       authDomain: "你的-project-id.firebaseapp.com",
       databaseURL: "https://你的-project-id-default-rtdb.firebaseio.com/",
       projectId: "你的-project-id",               // 從 Firebase Console 複製
       storageBucket: "你的-project-id.appspot.com",
       messagingSenderId: "123456789012",
       appId: "1:123456789012:web:demo-app-id"
   };
   ```

### 步驟 5: 設定安全規則

1. 前往「Realtime Database」→「規則」
2. 將 `firebase-rules.json` 的內容複製並貼上
3. 點擊「發布」

## 🔒 安全說明

### 已包含的安全措施
- ✅ 完整的數據匿名化處理
- ✅ 50天自動數據清理政策
- ✅ Firebase Rules 權限控制
- ✅ 輸入驗證和清理

### API 金鑰安全性
Firebase Web API 金鑰是安全的公開配置：
- ✅ 可以安全地包含在客戶端代碼中
- ✅ 真正的安全控制由 Firebase Rules 提供
- ✅ 限制了訪問權限和數據結構

## 🧪 測試配置

使用測試頁面驗證設定：
- `test-firebase-learning.html` - Firebase 學習系統測試
- `test-main-app-integration.html` - 主應用整合測試

## ❓ 疑難排解

### 常見錯誤

**permission_denied 錯誤**
- 確認已啟用匿名身份驗證
- 檢查 Firebase Rules 是否正確部署
- 確認專案 ID 和 API 金鑰正確

**連線失敗**
- 檢查網路連線
- 確認 Firebase 專案是否啟用了 Realtime Database
- 檢查瀏覽器控制台的詳細錯誤信息

**本地模式不工作**
- 確認使用 `http://localhost:xxxx` 訪問
- 不要使用 `file://` 協議
- 建議使用 `python3 -m http.server 8088` 啟動本地服務器

## 📞 支援

如果遇到問題：
1. 檢查瀏覽器控制台的錯誤信息
2. 使用測試頁面診斷配置
3. 確認 Firebase 專案設定正確

---

*最後更新: 2025-10-02*