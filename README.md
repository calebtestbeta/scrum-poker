# Scrum Poker - 敏捷估點工具

一個基於 Firebase 的即時 Scrum Poker 工具，可用於敏捷開發團隊的故事點估算。

## 功能特色

- ✅ **即時同步**：使用 Firebase Realtime Database 實現即時多人投票
- ✅ **角色區分**：支援 Dev、QA、Scrum Master、PO 等角色
- ✅ **分組分析**：Dev 和 QA 分開統計，專業估點互不影響
- ✅ **智能建議**：基於角色差異和共識度的 Scrum Master 建議
- ✅ **房間管理**：支援建立和加入投票房間
- ✅ **點數選擇**：標準 Fibonacci 數列 + 特殊卡牌（咖啡、問號、無限大）
- ✅ **投票隱私**：投票階段其他人看不到你的選擇
- ✅ **統計分析**：自動計算平均值、中位數和建議點數
- ✅ **討論建議**：根據估點結果提供具體的討論要點
- ✅ **URL 分享**：透過連結輕鬆邀請團隊成員
- ✅ **響應式設計**：支援桌面和行動裝置

## 快速開始

### 方案 1：立即使用（本地模擬模式）

1. 直接推送到 GitHub Pages
2. 訪問網站，選擇「使用本地模式」
3. 開始使用！（單瀏覽器模擬多人投票）

### 方案 2：完整功能（Firebase 模式）

#### 1. 設定 Firebase

**詳細設定教學請參考：[FIREBASE_SETUP.md](FIREBASE_SETUP.md)**

快速步驟：
1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 建立新專案
3. 啟用 Realtime Database
4. 設定資料庫規則
5. 取得 **Project ID** 和 **API Key**

#### 2. 設定應用程式

1. 訪問部署的網站
2. 在設定頁面輸入：
   - **Project ID**：你的 Firebase 專案 ID
   - **API Key**：Web API 金鑰（AIza...）
3. 點擊「儲存設定」
4. 設定會自動儲存在瀏覽器中，下次無需重新輸入

#### 3. 部署

1. 建立 GitHub 儲存庫
2. 上傳所有檔案到儲存庫
3. 在儲存庫設定中啟用 GitHub Pages
4. 選擇 `main` 分支作為來源
5. 訪問 `https://yourusername.github.io/repository-name`

## 安全優勢

✅ **無敏感資訊外洩**：Firebase 設定不會出現在公開程式碼中  
✅ **使用者控制**：每個使用者管理自己的設定  
✅ **內部使用友善**：口頭提供設定，一次設定終生使用  
✅ **靈活切換**：可隨時在 Firebase 和本地模式間切換

## 檔案結構

```
scrum-poker/
├── index.html                 # 主頁面
├── game.js                    # 核心遊戲邏輯
├── sketch.js                  # p5.js 畫布邏輯
├── classes/                   # 遊戲物件類別
│   ├── GameTable.js          # 遊戲桌面邏輯
│   ├── Player.js             # 玩家管理
│   ├── Card.js               # 卡牌系統
│   └── Vector2D.js           # 數學向量
├── managers/                  # 功能管理器
│   ├── FirebaseManager.js    # 資料庫管理
│   ├── UIManager.js          # 使用者介面
│   ├── AnimationManager.js   # 動畫效果
│   └── CookieManager.js      # 本地資料
├── FIREBASE_SETUP.md         # Firebase 設定指南
├── FEATURE_DEMO.md           # 功能演示說明
└── README.md                 # 本說明檔案
```

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