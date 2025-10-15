# 🔧 Firebase 配置取得指南

## 📋 如何取得 Firebase 配置資訊

### 第一步：前往 Firebase 控制台
1. 開啟瀏覽器，前往 [Firebase 控制台](https://console.firebase.google.com/)
2. 使用您的 Google 帳號登入
3. 選擇您的 Scrum Poker 專案

### 第二步：取得基本配置
1. 點擊左側導航欄的 **齒輪圖示** (專案設定)
2. 在「一般」標籤頁中，向下捲動到 **「您的應用程式」** 區域
3. 如果看到 Web 應用程式，點擊它；如果沒有，請點擊 **「新增應用程式」** → **「Web」**

### 第三步：複製配置值
在 Firebase SDK snippet 中，您會看到類似這樣的配置：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC7x5X5x5x5x5x5x5x5x5x5x5x5x5x5",
  authDomain: "my-project.firebaseapp.com",
  databaseURL: "https://my-project-default-rtdb.firebaseio.com",
  projectId: "my-project-id",
  storageBucket: "my-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789"
};
```

### 第四步：取得各項配置值

#### 1. API Key 📍
- **位置**: Firebase 控制台 > 專案設定 > 一般 > **Web API 金鑰**
- **格式**: 必須以 `AIza` 開頭（Web API Key 特徵）
- **範例**: `AIzaSyC7x5X5x5x5x5x5x5x5x5x5x5x5x5x5`
- **用途**: Firebase SDK 客戶端身份驗證

⚠️ **重要：API Key 類型說明**
- ✅ **Web API Key**: 以 `AIza` 開頭，用於瀏覽器和行動應用程式
- ❌ **Server Key**: 以其他格式開頭，僅用於伺服器端應用程式
- ❌ **Legacy Server Key**: 舊版伺服器金鑰，不適用於客戶端

如果您使用了錯誤的 API Key 類型，會出現 `auth/api-key-not-valid` 錯誤。

#### 2. Project ID 📍
- **位置**: `firebaseConfig.projectId`
- **格式**: 小寫字母、數字、連字符
- **範例**: `my-scrum-poker-project`
- **用途**: 識別您的 Firebase 專案

#### 3. Database URL 📍
- **方法 1**: 從配置中的 `databaseURL` 複製
- **方法 2**: 前往 **Realtime Database** → **資料** 標籤，URL 顯示在頂部
- **格式**: `https://your-project-default-rtdb.firebaseio.com`
- **範例**: `https://my-scrum-poker-project-default-rtdb.firebaseio.com`

## 🔒 安全注意事項

### 這些配置是公開的嗎？
- ✅ **API Key**: 可以公開（用於客戶端身份驗證）
- ✅ **Project ID**: 可以公開（用於識別專案）
- ✅ **Database URL**: 可以公開（客戶端需要連接）
- ✅ **Auth Domain**: 可以公開（用於身份驗證重定向）

### 真正的安全性在哪裡？
🛡️ **Firebase 安全規則** 才是真正的安全保護！
- API Key 只是客戶端標識符
- 實際的安全控制由 **Database Rules** 和 **Authentication** 提供
- 這就是為什麼我們要實施 Firebase 安全規則的原因

## 🧪 配置測試工具使用

### 在安全測試工具中輸入配置：
1. 開啟 `security-test.html`
2. 在「Firebase 配置」區域填入：
   - **API Key**: 貼上您的 API Key
   - **Project ID**: 貼上您的 Project ID  
   - **Database URL**: 貼上您的 Database URL
3. 點擊 **「保存配置」**
4. 點擊 **「初始化 Firebase」** 開始測試

### 配置會保存嗎？
- ✅ 配置會保存在您的瀏覽器 `localStorage` 中
- ✅ 下次開啟工具時會自動載入
- ✅ 不會上傳到任何伺服器
- ✅ 只在您的電腦本地存儲

## ❓ 常見問題

### Q: 找不到 Web 應用程式配置？
**A**: 您需要先建立一個 Web 應用程式：
1. 在專案設定頁面點擊「新增應用程式」
2. 選擇「Web」圖示
3. 輸入應用程式名稱（例如：Scrum Poker Web）
4. 不需要勾選 Firebase Hosting
5. 點擊「註冊應用程式」

### Q: Database URL 格式不對？
**A**: 確保您的專案已啟用 Realtime Database：
1. 左側導航 → **Realtime Database**
2. 點擊「建立資料庫」
3. 選擇地區（通常選擇離您最近的）
4. 選擇安全規則模式（測試模式或鎖定模式）
5. URL 會顯示在資料庫頁面頂部

### Q: 測試時出現權限錯誤？
**A**: 檢查以下設定：
1. **Authentication**: 確保已啟用「匿名」身份驗證
2. **Database Rules**: 確保已部署新的安全規則
3. **配置正確性**: 確保 Project ID 和 Database URL 匹配

### Q: API Key 錯誤？
**A**: 
1. 確保複製完整的 API Key（通常約 39 字符）
2. 檢查是否包含額外的空格或字符
3. 嘗試重新產生 API Key（專案設定 → 一般 → Web API Key）

### Q: 出現 `auth/api-key-not-valid` 錯誤？
**A**:
1. **確認使用 Web API Key**：必須以 `AIza` 開頭，不是 Server Key
2. **檢查 API Key 完整性**：確保沒有遺漏字符
3. **驗證 Firebase 專案設定**：確保 Project ID 正確匹配

### Q: 出現 `auth/operation-not-allowed` 錯誤？
**A**: 需要啟用 Firebase 匿名身份驗證
1. Firebase 控制台 → **Authentication**
2. 點擊 **Sign-in method** 標籤
3. 找到 **Anonymous** (匿名) 選項
4. 如果狀態為「已停用」，點擊進入設定
5. 將「啟用」開關打開並儲存

**為什麼需要匿名登入？**
- Scrum Poker 使用匿名身份驗證識別玩家
- 玩家無需註冊就能加入遊戲
- 滿足安全規則的身份驗證要求

## 🔄 故障排除步驟

1. **清除瀏覽器快取**：Ctrl+Shift+Delete
2. **檢查網路連接**：確保能訪問 Firebase
3. **驗證專案狀態**：確保 Firebase 專案處於活躍狀態
4. **檢查配置格式**：使用工具內建的格式驗證
5. **查看瀏覽器控制台**：檢查詳細錯誤訊息

---

💡 **提示**: 如果仍有問題，可以在測試工具中點擊「配置指南」按鈕快速查看這些說明。