# UI 重新設計 - 設置與預覽指南

## 🏗️ 架構概述

已成功建立響應式重定向架構，包含：

```
/public/
├── redirect.html          # 響應式重定向頁面 (設備檢測)
├── desktop/
│   └── index.html        # 桌面版 UI 骨架
└── mobile/
    └── index.html        # 移動版 UI 骨架
```

### 設計實現

- ✅ **響應式重定向** - 自動檢測設備類型並導向對應界面
- ✅ **參數透傳** - 完整保留 `?room=IOT&name=caleb&role=qa` 等參數
- ✅ **桌面版骨架** - 實現 wireframe 中的 Toolbar + Sidebar + Main Board 布局
- ✅ **移動版骨架** - 實現 Tab-based 導航 (Vote | Players | Stats)
- ✅ **交互功能** - 卡牌選擇、按鈕操作、模擬數據顯示
- ✅ **無 Firebase 依賴** - 純前端骨架，便於開發和測試

## 🚀 運行指令

### 方法 1: 使用 Python HTTP Server (推薦)

```bash
# 在專案根目錄執行
cd /Users/caleb/Documents/GitHub/scrum-poker
python3 -m http.server 8080

# 訪問測試 URL
open http://localhost:8080/public/redirect.html?room=IOT&name=caleb&role=qa
```

### 方法 2: 使用 Node.js (如果有 package.json)

```bash
npm start
```

### 方法 3: 使用 Live Server (VSCode 擴展)

1. 在 VSCode 中開啟 `/public/redirect.html`
2. 右鍵選擇 "Open with Live Server"
3. 手動添加參數到 URL

## 🧪 測試連結

### 基本功能測試

```bash
# 響應式重定向測試
http://localhost:8080/public/redirect.html

# 帶參數測試 (推薦)
http://localhost:8080/public/redirect.html?room=IOT&name=caleb&role=qa

# 直接訪問桌面版
http://localhost:8080/public/desktop/?room=IOT&name=caleb&role=qa

# 直接訪問移動版
http://localhost:8080/public/mobile/?room=IOT&name=caleb&role=qa
```

### 設備模擬測試

1. **桌面測試**: 正常瀏覽器視窗
2. **移動測試**: 
   - Chrome DevTools -> Device Mode
   - 選擇 iPhone/Android 模式
   - 重新訪問 redirect.html

## 🎨 UI 特色功能

### 桌面版特色
- **Grid Layout**: Toolbar + Sidebar + Main + Bottom Panel
- **卡牌懸停效果**: 滑鼠懸停時卡牌上升和陰影
- **即時統計面板**: 底部顯示平均分、範圍、投票進度
- **玩家狀態指示**: 左側邊欄顏色編碼 (綠/黃/紅)

### 移動版特色
- **Tab Navigation**: Vote | Players | Stats 三個分頁
- **觸控優化**: 卡牌點擊回饋、防止意外滑動
- **雙列卡牌布局**: 適應手機螢幕寬度
- **觸覺反饋**: 支援震動反饋 (如裝置支援)
- **Safe Area**: 支援 iPhone X+ 等 notch 裝置

## 🔧 除錯功能

### 瀏覽器 Console 指令

```javascript
// 桌面版除錯
debugDesktop()
// 返回: { params, selectedCard, selectCard() }

// 移動版除錯
debugMobile() 
// 返回: { params, currentTab, selectedCard, switchTab(), selectCard() }

// 測試卡牌選擇
debugDesktop().selectCard('13')  // 桌面版選擇 13 點卡牌
debugMobile().selectCard('8')    // 移動版選擇 8 點卡牌

// 測試 Tab 切換 (移動版)
debugMobile().switchTab('players')  // 切換到玩家頁面
debugMobile().switchTab('stats')    // 切換到統計頁面
```

### 重定向除錯資訊

訪問 `redirect.html` 時，頁面會顯示詳細的設備檢測資訊：
- 螢幕尺寸和像素比
- User Agent 字串
- 觸控支援檢測
- 最終重定向決策

## 📊 功能對應檢查

### ✅ 已實現功能

| 功能 | 桌面版 | 移動版 | 狀態 |
|------|--------|--------|------|
| 房間資訊顯示 | ✅ | ✅ | 完成 |
| 階段指示器 | ✅ | ✅ | 完成 |
| 卡牌選擇 | ✅ | ✅ | 完成 |
| 玩家列表 | ✅ | ✅ | 完成 |
| 投票統計 | ✅ | ✅ | 完成 |
| 操作按鈕 | ✅ | ✅ | 完成 |
| 參數透傳 | ✅ | ✅ | 完成 |
| 響應式檢測 | ✅ | ✅ | 完成 |

### 🔄 待整合功能

- Firebase 連接和即時同步
- 真實玩家資料載入
- 投票結果即時更新
- 智慧建議系統
- 房間分享功能

## 🎯 下一步建議

1. **測試 UI 骨架**: 使用提供的測試連結確認界面正常
2. **UI 細節調整**: 根據使用體驗調整樣式和交互
3. **Firebase 整合**: 將現有 Firebase 邏輯整合到新 UI 中
4. **功能完善**: 添加缺失的業務邏輯功能
5. **跨裝置測試**: 在實際設備上測試響應式效果

## 💡 開發提示

- **熱重載**: 修改 HTML/CSS/JS 後重新整理頁面即可看到效果
- **除錯模式**: 開啟瀏覽器開發者工具查看 Console 輸出
- **參數測試**: 修改 URL 參數測試不同的房間/玩家配置
- **設備切換**: 使用 Chrome DevTools 的 Device Mode 測試響應式

---
*建立時間: 2025-01-12*
*版本: v1.0 - UI Redesign Foundation*