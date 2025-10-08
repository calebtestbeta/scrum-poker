# Scrum Poker - 敏捷估點工具

一個採用**雙入口頁架構**的即時 Scrum Poker 工具，提供 Firebase 團隊協作版和本機試用版兩種模式。

## 🏗️ 雙入口頁架構

### 📖 入口頁面說明

| 入口頁面 | 模式 | 描述 | 適用場景 |
|---------|------|------|----------|
| `index.html` | Firebase 團隊協作版 | 完整功能的多人即時協作版本 | 正式團隊使用、跨裝置協作 |
| `playground.html` | 本機試用版 | 基本功能體驗版本，無需設定 | 個人試用、功能展示 |

### 🎯 如何選擇

- **想要完整團隊協作功能**：訪問 `index.html`
- **想要快速試用基本功能**：訪問 `playground.html`

## 功能特色

### 🔥 Firebase 團隊協作版 (`index.html`)
- ✅ **無人數限制**：支援大型團隊同時協作
- ✅ **跨裝置同步**：手機、平板、電腦即時同步
- ✅ **雲端保存**：投票記錄和統計數據雲端儲存
- ✅ **歷史查詢**：完整的統計分析歷史記錄
- ✅ **角色區分**：支援 Dev、QA、Scrum Master、PO 等角色
- ✅ **智慧建議**：基於角色差異和共識度的專業建議
- ✅ **即時通知**：投票狀態變更即時推送

### 🎮 本機試用版 (`playground.html`)
- ✅ **快速體驗**：無需任何設定即可開始使用
- ✅ **基本功能**：完整的投票和開牌流程
- ✅ **本機同步**：同一瀏覽器多標籤頁同步
- ✅ **統計分析**：基本的估點統計和建議
- ⚠️ **限制**：最多 4 人使用，無跨裝置同步
- ⚠️ **限制**：資料不會雲端保存

### 🚀 共同功能
- ✅ **點數選擇**：標準 Fibonacci 數列 + 特殊卡牌（咖啡、問號、無限大）
- ✅ **投票隱私**：投票階段其他人看不到選擇
- ✅ **統計分析**：自動計算平均值、中位數和建議點數
- ✅ **討論建議**：根據估點結果提供具體的討論要點
- ✅ **響應式設計**：支援桌面和行動裝置
- ✅ **快捷鍵**：鍵盤快捷鍵提升操作效率

## 快速開始

### 🎮 方案 1：本機試用版（推薦新手）

1. 部署到 GitHub Pages
2. 訪問 `playground.html`
3. 輸入名字和角色
4. 立即開始試用！

**特點**：無需任何設定，立即可用，適合功能展示和個人試用。

### 🔥 方案 2：Firebase 團隊協作版（推薦團隊）

#### 1. 設定 Firebase

**詳細設定教學請參考：[FIREBASE_SETUP.md](FIREBASE_SETUP.md)**  
**安全配置指南請參考：[FIREBASE_SECURITY_GUIDE.md](FIREBASE_SECURITY_GUIDE.md)**

快速步驟：
1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 建立新專案
3. 啟用 Realtime Database
4. 設定資料庫規則
5. 取得 **Project ID** 和 **API Key**

#### 2. 設定應用程式

1. 訪問部署的 `index.html`（Firebase 團隊協作版）
2. 在設定頁面輸入：
   - **Project ID**：你的 Firebase 專案 ID
   - **API Key**：Web API 金鑰（AIza...）
3. 點擊「儲存設定」
4. 設定會自動儲存在瀏覽器中，下次無需重新輸入

#### 3. 部署到 GitHub Pages

1. Fork 或建立 GitHub 儲存庫
2. 確保以下檔案都在根目錄：
   - `index.html`（Firebase 團隊協作版）
   - `playground.html`（本機試用版）
   - 完整的 `src/` 目錄
   - `firebase-config.js`（可為空，使用者自行設定）
3. 在儲存庫設定中啟用 GitHub Pages
4. 選擇 `main` 分支作為來源
5. 訪問：
   - `https://yourusername.github.io/repository-name/` - Firebase 團隊協作版
   - `https://yourusername.github.io/repository-name/playground.html` - 本機試用版

## 🏗️ 雙模式架構技術說明

### 統一程式碼庫
- **共用 UI 和邏輯**：兩個入口頁面共用所有 `src/` 目錄下的組件和服務
- **Provider 模式**：使用 `RoomProviderFactory` 抽象資料層，支援 Firebase 和本機兩種實現
- **模式檢測**：透過 `data-mode` 屬性和 `window.APP_MODE` 自動檢測執行模式

### 依賴載入策略
| 檔案 | Firebase 版 | 本機試用版 |
|------|-------------|------------|
| Firebase SDK | ✅ 載入 | ❌ 不載入 |
| `firebase-config.js` | ✅ 載入 | ❌ 不載入 |
| `FirebaseService.js` | ✅ 載入 | ❌ 不載入 |
| `LocalRoomService.js` | ✅ 載入 | ✅ 載入 |
| `RoomProviderFactory.js` | ✅ 載入 | ✅ 載入 |

### 安全優勢

✅ **無敏感資訊外洩**：Firebase 設定不會出現在公開程式碼中  
✅ **使用者控制**：每個使用者管理自己的設定  
✅ **內部使用友善**：口頭提供設定，一次設定終生使用  
✅ **靈活切換**：可隨時在 Firebase 和本地模式間切換  
✅ **試用無風險**：本機試用版完全不接觸 Firebase  
✅ **輸入驗證**：所有使用者輸入都經過嚴格驗證和清理  
✅ **安全規則**：完整的 Firebase 安全規則配置  
✅ **錯誤處理**：友善的錯誤訊息，不暴露系統細節

## 檔案結構

```
scrum-poker/
├── index.html                      # Firebase 團隊協作版入口頁
├── playground.html                 # 本機試用版入口頁
├── firebase-config.js              # Firebase 設定（使用者自建）
├── sw.js                          # Service Worker
│
├── src/                           # 共用原始碼目錄
│   ├── app.js                     # 主應用程式控制器（雙模式支援）
│   │
│   ├── components/                # UI 組件
│   │   ├── Card.js               # 卡牌組件和卡牌組
│   │   ├── Player.js             # 玩家組件和玩家列表
│   │   └── GameTable.js          # 遊戲桌面主控制器
│   │
│   ├── core/                     # 核心工具和管理器
│   │   ├── EventBus.js           # 全域事件匯流排
│   │   ├── GameState.js          # 遊戲狀態管理
│   │   ├── TouchManager.js       # 觸控手勢管理
│   │   └── Utils.js              # 通用工具函數
│   │
│   ├── services/                 # 服務層
│   │   ├── RoomProviderFactory.js # 房間資料提供者工廠（核心）
│   │   ├── FirebaseService.js    # Firebase 資料管理
│   │   ├── LocalRoomService.js   # 本機房間服務
│   │   ├── StorageService.js     # 本地儲存管理
│   │   ├── ScrumAdviceEngine.js  # 智慧建議引擎
│   │   └── ScrumAdviceUI.js      # 建議 UI 管理
│   │
│   ├── styles/                   # 樣式文件
│   │   ├── variables.css         # CSS 變數定義
│   │   └── main.css              # 主要樣式文件
│   │
│   └── ui/                       # UI 管理器
│       ├── PanelManager.js       # 面板管理器
│       └── ShortcutHints.js      # 快捷鍵提示
│
├── FIREBASE_SETUP.md              # Firebase 設定教學
├── LOCAL_DEVELOPMENT_GUIDE.md     # 本地開發指南
└── CLAUDE.md                      # AI 協作說明文件
```

### 🔑 關鍵檔案說明

- **`RoomProviderFactory.js`**：雙模式架構的核心，負責根據模式建立對應的資料提供者
- **`app.js`**：主應用控制器，支援雙模式啟動和統一的操作介面
- **入口頁面**：`index.html` 和 `playground.html` 僅負責宣告模式和載入必要依賴

## 使用方式

### 建立新房間
1. 輸入你的名字和選擇角色（Dev、QA、Scrum Master 等）
2. 留空房間 ID（系統會自動產生）
3. 點擊「開始估點」

### 加入現有房間
1. 輸入你的名字和選擇角色
2. 輸入房間 ID 或使用分享連結
3. 點擊「開始估點」

### 進行投票
1. 選擇你認為合適的故事點數
2. 等待所有成員投票完成
3. 點擊「開牌」查看結果
4. 查看分組統計和 Scrum Master 建議

## 智能分析功能

### 角色分組統計
- **Dev 團隊統計**：開發複雜度評估
- **QA 團隊統計**：測試複雜度評估
- **整體統計**：綜合評估和建議點數

### Scrum Master 建議情境

**情境 1: Dev 和 QA 估點差異大（≥3 點）**
- Dev 高於 QA：技術挑戰分析，架構討論建議
- QA 高於 Dev：測試複雜度分析，邊界條件討論

**情境 2: 整體共識度低**
- 需求理解差異大，建議深入討論實作細節

**情境 3: 高估點（>13 點）**
- 建議拆分任務或進行技術調研

**情境 4: 共識度良好**
- 確認 DoD，進入開發階段

**情境 5: 中等共識**
- 識別分歧點，進一步澄清需求

## Firebase 資料庫結構

```json
{
  "rooms": {
    "ROOM123": {
      "gameState": "voting",
      "createdAt": 1640995200000,
      "members": {
        "player_xxx": {
          "name": "Alice",
          "role": "dev",
          "voted": true,
          "connected": true,
          "joinedAt": 1640995200000
        }
      },
      "votes": {
        "player_xxx": {
          "points": 5,
          "submittedAt": 1640995300000
        }
      }
    }
  }
}
```

## 安全性考量

### 生產環境建議

1. **資料庫規則**：設定適當的 Firebase 安全規則
```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['gameState', 'members'])"
      }
    }
  }
}
```

2. **域名限制**：在 Firebase 控制台設定授權域名
3. **API 金鑰限制**：限制 Firebase API 金鑰的使用範圍

## 技術棧

- **前端**：HTML5, CSS3 (Tailwind CSS), JavaScript (ES6+)
- **後端**：Firebase Realtime Database
- **部署**：GitHub Pages
- **圖示**：Font Awesome

## 瀏覽器支援

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 開發模式

專案包含本地模擬模式，即使沒有 Firebase 設定也能進行開發和測試。

模擬模式特色：
- 完整的投票流程模擬
- 多人協作模擬
- 即時更新模擬
- 瀏覽器控制台日誌

## 授權

MIT License

## 貢獻

歡迎提交 Pull Request 或回報問題！

## 相關連結

- [Firebase Documentation](https://firebase.google.com/docs)
- [GitHub Pages Guide](https://pages.github.com/)
- [Tailwind CSS](https://tailwindcss.com/)