# 🎯 Scrum Poker - 跨裝置敏捷估點工具

採用 **Desktop/Mobile 雙版本架構**的即時 Scrum Poker 工具，自動檢測裝置並提供最佳使用體驗。支援 Firebase 即時協作與本地降級模式。

## 🚀 線上 Demo

**立即體驗**：[https://calebtestbeta.github.io/scrum-poker](https://calebtestbeta.github.io/scrum-poker)

無需安裝，直接在瀏覽器中使用！支援桌面和手機裝置。

## 🚀 快速開始

### 🎯 一鍵啟動
```bash
# 1. 克隆專案
git clone https://github.com/calebtestbeta/scrum-poker.git
cd scrum-poker

# 2. 安裝依賴（僅用於開發和測試）
npm install

# 3. 啟動本地伺服器
npm start

# 4. 訪問應用
# http://localhost:8080 (自動重定向)
```

### 📱 智慧裝置檢測
程式會自動檢測您的裝置並重定向至最適合的版本：

| 裝置類型 | 自動重定向至 | 特色 |
|---------|------------|------|
| 🖥️ 桌面/筆電 | `/public/desktop/` | 多欄佈局、鍵盤快捷鍵、完整功能 |
| 📱 手機/平板 | `/public/mobile/` | 分頁設計、觸控優化、響應式 |

### 📎 手動指定版本
您也可以直接訪問特定版本：
- **桌面版**：`http://localhost:8080/public/desktop/`
- **行動版**：`http://localhost:8080/public/mobile/`

## 功能特色

### ✨ 核心功能
- 🎯 **自動裝置檢測** - 智慧重定向至最適合的界面
- 🔥 **Firebase 即時協作** - 多人同步投票、即時開牌
- 🧠 **智慧建議系統** - 10 種任務類型的專業建議
- 📊 **即時統計分析** - 投票分佈、結果視覺化
- 🎮 **直覺式操作** - 卡牌選擇、動畫互動
- ⚡ **本地降級模式** - Firebase 無法連線時自動切換

### 🖥️ Desktop 版本特色
- **多欄佈局** - 左側遊戲區 + 右側統計/建議面板
- **鍵盤快捷鍵** - 數字鍵選卡、空白鍵開牌、Ctrl+R 重置
- **懸停效果** - 豐富的滑鼠互動回饋
- **完整功能** - 所有進階功能完整展示

### 📱 Mobile 版本特色
- **分頁設計** - Vote / Players / Stats 三個主要分頁
- **觸控優化** - 大按鈕、手勢支援、觸覺回饋
- **螢幕適配** - 響應式卡牌網格、摺疊式建議區域
- **效能優化** - 減少不必要的動畫和渲染

## 🔥 Firebase 設定

### 快速設定
1. **建立 Firebase 專案**
   - 前往 [Firebase Console](https://console.firebase.google.com/)
   - 建立新專案或選擇現有專案

2. **啟用 Realtime Database**
   - 在專案中啟用 Realtime Database
   - 選擇測試模式開始

3. **取得配置資訊**
   - 專案設定 → 一般 → 網頁程式
   - 複製 `專案 ID` 和 `Web API 金鑰`

4. **在程式中設定**
   - 開啟程式
   - 在 Firebase 設定區域輸入配置資訊
   - 點擊「連接 Firebase」

### 詳細指南
完整的 Firebase 設定說明請參考：[`FIREBASE_SETUP.md`](FIREBASE_SETUP.md)

## 🧠 智慧建議系統

### 支援的任務類型
- 🎨 **前端開發** - React、Vue、UI/UX 相關建議
- ⚙️ **後端開發** - API、資料庫、微服務建議
- 🧪 **測試相關** - 單元測試、整合測試、E2E 測試
- 📱 **行動應用** - iOS、Android、跨平台開發
- 🎨 **設計工作** - UI/UX 設計、原型製作
- 🚀 **DevOps** - CI/CD、部署、基礎設施
- 📚 **研究學習** - 技術調研、概念驗證
- 🛠️ **通用任務** - 重構、優化、維護

### 建議邏輯
- **高分歧** → 技術討論建議
- **高共識** → 確認完成定義
- **高複雜度** → 任務拆分建議
- **低複雜度** → 品質確保建議

## 🧪 測試

### 自動化測試
```bash
# E2E 跨裝置同步測試
npm run test:cross-device

# 含視覺化測試介面
npm run test:ui

# Firebase 環境測試
npm run test:firebase

# 測試報告
npm run test:report
```

### 測試覆蓋
- ✅ 跨裝置投票同步
- ✅ Story Type 選擇功能
- ✅ 智慧建議系統
- ✅ 開牌與重置功能
- ✅ 連線狀態處理

## 📚 部署

### 靜態網站部署
專案已優化為純靜態網站，可直接部署到：

- **GitHub Pages** - 設定 `public/redirect.html` 為首頁
- **Netlify** - 上傳整個專案，自動識別
- **Vercel** - 零配置部署，支援 PWA
- **Firebase Hosting** - 與 Database 完美整合

### 部署設定
```bash
# 建置專案（如需要）
npm run build

# 上傳到您選擇的平台
# 確保將 public/redirect.html 設為首頁
```

## 🎯 使用指南

### 基本流程
1. **加入房間** - 輸入姓名、角色、房間ID（選填）
2. **選擇任務類型** - 提升建議準確度（選填）
3. **投票** - 點擊卡牌進行估點
4. **開牌** - 所有人投票完成後開牌
5. **查看建議** - 基於投票結果的專業建議
6. **重新開始** - 進行下一輪估點

### 角色說明
- **👨‍💻 開發者 (Dev)** - 實作相關的技術建議
- **🐛 測試人員 (QA)** - 測試策略和品質建議
- **👥 Scrum Master** - 流程優化和團隊協作建議
- **📋 Product Owner** - 需求和優先級建議
- **📊 專案經理 (PM)** - 專案管理和資源建議
- **🎨 設計師** - UI/UX 和使用者體驗建議

## 📖 開發文件

### 核心文件
- [`CLAUDE.md`](CLAUDE.md) - AI 協作開發指南
- [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) - Firebase 詳細設定
- [`LOCAL_DEVELOPMENT_GUIDE.md`](LOCAL_DEVELOPMENT_GUIDE.md) - 本地開發環境
- [`tests/README.md`](tests/README.md) - 測試說明

### 技術架構
- **前端框架**: Vanilla JavaScript + CSS
- **資料同步**: Firebase Realtime Database
- **架構模式**: Desktop/Mobile 雙版本 + 自動重定向
- **測試框架**: Playwright E2E 測試
- **PWA 支援**: Service Worker 離線功能

## 🤝 貢獻

歡迎提交 Issues 和 Pull Requests！

### 開發環境設定
```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm start

# 執行測試
npm test
```

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 檔案

---

**🎉 享受敏捷估點的樂趣！**

*讓 Scrum Poker 成為您團隊協作的得力助手* 🚀