# Firebase 專案設定教學

這份教學將引導你建立和設定 Firebase 專案，用於 Scrum Poker 應用程式。

## 步驟 1：建立 Firebase 專案

### 1.1 前往 Firebase Console
- 開啟瀏覽器，前往 [Firebase Console](https://console.firebase.google.com/)
- 使用你的 Google 帳號登入

### 1.2 建立新專案
1. 點擊「建立專案」或「Add project」
2. 輸入專案名稱，例如：`scrum-poker-your-team`
3. 點擊「繼續」
4. **Google Analytics**：建議選擇「不啟用」（這個專案不需要）
5. 點擊「建立專案」
6. 等待專案建立完成，點擊「繼續」

## 步驟 2：設定 Realtime Database

### 2.1 啟用 Realtime Database
1. 在 Firebase Console 左側選單中，點擊「Realtime Database」
2. 點擊「建立資料庫」
3. **選擇地區**：建議選擇 `asia-southeast1 (Singapore)` 或 `us-central1`
4. **安全性規則模式選擇**：

   **🔒 預設為鎖定模式**
   - 資料預設為私人，所有讀寫都被禁止
   - 需要手動設定安全規則才能使用
   - 適合：正式上線的產品

   **🧪 以測試模式啟動（建議選擇）**
   - 資料預設為公開，允許所有讀寫
   - 30 天後會自動鎖定，需要更新規則
   - 適合：開發測試和快速上手

   **建議：選擇「以測試模式啟動」**，稍後我們會設定適當的安全規則。

5. 點擊「完成」

### 2.2 設定資料庫規則

#### 根據你選擇的模式：

**如果選擇了「測試模式」：**
- 系統會自動使用開放的規則，可以直接開始測試
- 建議在 30 天內更新為下方的規則

**如果選擇了「鎖定模式」：**
- 必須立即設定規則，否則無法使用

#### 設定步驟：
1. 在 Realtime Database 頁面，點擊「規則」標籤頁
2. 你會看到目前的規則：

   **測試模式的規則：**
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

   **鎖定模式的規則：**
   ```json
   {
     "rules": {
       ".read": false,
       ".write": false
     }
   }
   ```

3. 將規則替換為以下**內部使用適合的規則**：

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['gameState']) && newData.child('gameState').val().matches(/^(voting|revealed)$/)",
        "members": {
          "$userId": {
            ".validate": "newData.hasChildren(['name', 'role', 'voted', 'connected'])"
          }
        },
        "votes": {
          "$userId": {
            ".validate": "newData.hasChildren(['points', 'submittedAt'])"
          }
        }
      }
    }
  }
}
```

4. 點擊「發布」

> **規則說明**：這個規則允許任何人讀寫房間資料，但驗證資料格式，適合內部團隊使用。

## 步驟 3：取得專案設定資訊

### 3.1 找到專案設定
1. 點擊左側選單上方的「專案設定」齒輪圖示
2. 或直接前往：`https://console.firebase.google.com/project/你的專案名稱/settings/general`

### 3.2 取得 Web API 金鑰
1. 在「一般」標籤頁中，向下捲動到「你的應用程式」區塊
2. 如果還沒有 Web 應用程式，點擊 Web 圖示 (`</>`) 來新增
3. 輸入應用程式名稱，例如：`scrum-poker-web`
4. **不用**勾選「Firebase Hosting」
5. 點擊「註冊應用程式」

### 3.3 複製必要資訊
在設定頁面中，你會看到類似這樣的設定物件：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC-abc123def456ghi789...",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456..."
};
```

**你只需要這兩個值：**
- **Project ID**：`your-project-id`
- **API Key**：`AIzaSyC-abc123def456ghi789...`

## 步驟 4：在應用程式中使用

### 4.1 開啟 Scrum Poker 應用程式
前往你部署的 Scrum Poker 網站

### 4.2 輸入 Firebase 設定
1. 在「Firebase 設定」區塊中輸入：
   - **Project ID**：從上方複製的 `your-project-id`
   - **API Key**：從上方複製的 `AIzaSyC...` 開頭的字串
2. 點擊「儲存設定」

### 4.3 測試連線
1. 輸入你的名字和角色
2. 點擊「開始估點」
3. 如果成功，你應該能看到房間被建立

## 步驟 5：分享給團隊成員

### 5.1 口頭提供設定資訊
告訴團隊成員：
- **Project ID**：`your-project-id`
- **API Key**：`AIzaSyC...` （可以寫在內部文件或聊天群組）

### 5.2 第一次使用
每個團隊成員第一次使用時：
1. 開啟 Scrum Poker 網站
2. 輸入提供的 Project ID 和 API Key
3. 點擊「儲存設定」
4. 之後就不用再輸入了

## ⏰ 重要提醒：30 天期限

如果你選擇了「**測試模式**」，Firebase 會在 **30 天後自動鎖定**資料庫：

### 📅 設定提醒
1. **第 20 天**：會收到 Firebase 的 email 提醒
2. **第 25 天**：最後警告 email
3. **第 30 天**：資料庫自動鎖定，無法讀寫

### 🔧 避免中斷的方法
**選項 1：更新安全規則（建議）**
- 按照上方「步驟 2.2」設定適當的安全規則
- 這樣就能持續使用，不會被鎖定

**選項 2：延長測試模式**
- 在 Firebase Console 的「規則」頁面
- 點擊「延長測試模式」（最多可延長 30 天）
- 但建議還是設定正式的安全規則

**選項 3：重新啟用測試模式**
- 如果已經被鎖定，可以重新設定為測試模式
- 但會再次面臨 30 天期限

## 進階設定（可選）

### 安全性規則進階版
如果你想要更嚴格的安全控制，可以使用以下規則：

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": "
          // 允許建立新房間
          !data.exists() ||
          // 或房間建立時間在 24 小時內
          data.child('createdAt').val() > (now - 24 * 60 * 60 * 1000)
        ",
        ".validate": "
          newData.hasChildren(['gameState', 'createdAt']) &&
          newData.child('gameState').val().matches(/^(voting|revealed)$/)
        ",
        "members": {
          "$userId": {
            ".validate": "
              newData.hasChildren(['name', 'role', 'voted', 'connected', 'joinedAt']) &&
              newData.child('role').val().matches(/^(dev|qa|scrum_master|po|other)$/)
            "
          }
        }
      }
    }
  }
}
```

### 授權網域設定
1. 在 Firebase Console 中，前往「Authentication」
2. 點擊「Settings」標籤頁
3. 在「Authorized domains」中新增你的網域
4. 例如：`yourusername.github.io`

## 疑難排解

### Q: 無法連線到 Firebase
**可能原因：**
- Project ID 或 API Key 輸入錯誤
- 網路連線問題
- Firebase 專案設定錯誤
- 選擇了「鎖定模式」但沒有設定安全規則

**解決方法：**
1. 檢查輸入的 Project ID 和 API Key 是否正確
2. 確認 Realtime Database 已啟用
3. 檢查安全規則是否允許讀寫（參考上方規則設定）
4. 檢查瀏覽器開發者工具的 Console 錯誤訊息

### Q: 資料無法儲存
**可能原因：**
- 資料庫規則太嚴格
- 專案配額已滿

**解決方法：**
1. 檢查 Firebase Console 中的「規則」設定
2. 確認專案在免費方案的使用限制內

### Q: 其他成員無法看到即時更新
**可能原因：**
- 使用不同的 Firebase 專案
- 網路連線不穩定

**解決方法：**
1. 確認所有人使用相同的 Project ID
2. 重新整理頁面或重新連線

## 成本注意事項

### Firebase 免費方案限制
- **Realtime Database**：1GB 資料儲存，10GB/月 資料傳輸
- **同時連線**：100 個同時連線用戶

對於小型團隊（< 20 人）的 Scrum Poker 使用，免費方案完全足夠。

### 監控使用量
1. 在 Firebase Console 中點擊「Usage」
2. 監控資料傳輸量和儲存使用量
3. 接近限制時會收到通知

---

## 快速設定檢查清單

- [ ] 建立 Firebase 專案
- [ ] 啟用 Realtime Database
- [ ] 設定資料庫規則
- [ ] 取得 Project ID 和 API Key
- [ ] 在應用程式中輸入設定
- [ ] 測試功能正常
- [ ] 分享設定給團隊成員

完成以上步驟後，你的 Scrum Poker 就可以支援真正的多人即時協作了！