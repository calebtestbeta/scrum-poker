---
title: 本機開發環境設置指南
original_path: LOCAL_DEVELOPMENT_GUIDE.md
tags: [legacy, development, setup, firebase]
summary: 詳細說明 Scrum Poker 專案的本機開發環境設置流程，包含 Node.js 安裝、HTTP 伺服器配置、Firebase 模擬器設置等。提供了多種本機伺服器選項（http-server、Live Server、Python），以及完整的 Firebase 模擬器配置步驟和測試流程。還包含除錯指南、常見問題解答，以及 Unix/Windows 系統的快速啟動腳本。
---

# Scrum Poker 本機開發環境設置指南

## 📋 目錄
1. [環境需求](#環境需求)
2. [基本設置](#基本設置)
3. [本機伺服器設置](#本機伺服器設置)
4. [Firebase 模擬設置](#firebase-模擬設置)
5. [測試流程](#測試流程)
6. [除錯指南](#除錯指南)
7. [常見問題](#常見問題)

---

## 🔧 環境需求

### 必要軟體
- **Node.js** (v16.0.0 或更高版本)
- **npm** (通常隨 Node.js 一起安裝)
- **Git** (用於版本控制)
- **現代瀏覽器** (Chrome, Firefox, Safari, Edge)

### 推薦工具
- **Visual Studio Code** (程式碼編輯器)
- **Firebase CLI** (Firebase 開發工具)
- **Live Server** (VSCode 擴充功能)

---

## 🚀 基本設置

### 步驟 1: 安裝 Node.js 和 npm

#### Windows
1. 前往 [Node.js 官網](https://nodejs.org/)
2. 下載 LTS 版本 (推薦)
3. 執行安裝程式，選擇預設選項
4. 開啟命令提示字元，驗證安裝：
```bash
node --version
npm --version
```

#### macOS
```bash
# 使用 Homebrew (推薦)
brew install node

# 或直接從官網下載安裝
```

#### Linux (Ubuntu/Debian)
```bash
# 使用 NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 驗證安裝
node --version
npm --version
```

### 步驟 2: 專案設置

1. **複製專案到本機**
```bash
# 如果是從 GitHub 複製
git clone https://github.com/your-username/scrum-poker.git
cd scrum-poker

# 或如果已有專案檔案，直接進入專案目錄
cd /path/to/scrum-poker
```

2. **初始化 npm 專案**
```bash
npm init -y
```

3. **安裝開發依賴**
```bash
# 安裝 http-server (輕量級本機伺服器)
npm install -g http-server

# 安裝開發工具
npm install --save-dev live-server
npm install --save-dev firebase-tools
```

---

## 🌐 本機伺服器設置

### 方法 1: 使用 http-server (推薦)

1. **在專案根目錄執行**
```bash
# 啟動伺服器，指定埠號 8080
http-server -p 8080 -c-1 --cors

# 參數說明：
# -p 8080: 指定埠號
# -c-1: 禁用快取
# --cors: 啟用 CORS 支援
```

2. **開啟瀏覽器訪問**
```
http://localhost:8080
```

### 方法 2: 使用 Live Server (VSCode)

1. **安裝 VSCode 擴充功能**
   - 開啟 VSCode
   - 前往擴充功能市場
   - 搜尋並安裝 "Live Server"

2. **啟動 Live Server**
   - 在 VSCode 中開啟 `index.html`
   - 右鍵點擊檔案
   - 選擇 "Open with Live Server"

### 方法 3: 使用 Python (內建)

```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

---

## 🔥 Firebase 模擬設置

### 步驟 1: 安裝 Firebase CLI

```bash
# 全域安裝 Firebase CLI
npm install -g firebase-tools

# 登入 Firebase (可選，本機測試不一定需要)
firebase login
```

### 步驟 2: Firebase 模擬器設置

1. **初始化 Firebase 專案**
```bash
firebase init
```
選擇以下選項：
- ✅ Realtime Database
- ✅ Hosting
- ✅ Emulators

2. **配置 firebase.json**
```json
{
  "database": {
    "rules": "database.rules.json"
  },
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "emulators": {
    "database": {
      "port": 9000
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

3. **設置 Database 安全規則** (`database.rules.json`)
```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "rooms": {
      "$roomId": {
        ".validate": "newData.hasChildren(['id', 'created', 'phase'])",
        "players": {
          "$playerId": {
            ".validate": "newData.hasChildren(['id', 'name', 'role'])"
          }
        }
      }
    }
  }
}
```

### 步驟 3: 本機 Firebase 配置

創建 `firebase-config-local.js`：
```javascript
// 本機測試專用 Firebase 設定
const FIREBASE_CONFIG_LOCAL = {
    apiKey: "demo-api-key",
    authDomain: "demo-project.firebaseapp.com",
    databaseURL: "http://localhost:9000?ns=demo-project",
    projectId: "demo-project",
    storageBucket: "demo-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};

// 匯出設定
window.FIREBASE_CONFIG_LOCAL = FIREBASE_CONFIG_LOCAL;
console.log('🔥 本機 Firebase 設定已載入');
```

### 步驟 4: 修改主要設定檔

修改 `firebase-config.js` 以支援本機模式：
```javascript
// 檢測是否為本機環境
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';

// Firebase 設定
let firebaseConfig = null;

if (isLocalhost && window.FIREBASE_CONFIG_LOCAL) {
    // 使用本機設定
    firebaseConfig = window.FIREBASE_CONFIG_LOCAL;
    console.log('🏠 使用本機 Firebase 模擬器');
} else {
    // 使用生產環境設定
    const savedConfig = localStorage.getItem('scrumPokerConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        firebaseConfig = {
            apiKey: config.apiKey,
            authDomain: `${config.projectId}.firebaseapp.com`,
            databaseURL: `https://${config.projectId}-default-rtdb.firebaseio.com/`,
            projectId: config.projectId,
            storageBucket: `${config.projectId}.appspot.com`,
            messagingSenderId: '123456789012',
            appId: '1:123456789012:web:abcdef123456'
        };
        console.log('☁️ 使用雲端 Firebase');
    }
}

// 匯出設定
window.firebaseConfig = firebaseConfig;
```

---

## 🧪 測試流程

### 完整測試啟動流程

1. **啟動 Firebase 模擬器** (終端機 1)
```bash
firebase emulators:start
```
等待看到：
```
✔  All emulators ready! It is now safe to connect your app.
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! View status at http://localhost:4000 │
│ ┌───────────────┬──────────────┬─────────────────────────────┐ │
│ │ Emulator      │ Host:Port    │ View in Emulator UI         │ │
│ ├───────────────┼──────────────┼─────────────────────────────┤ │
│ │ Database      │ localhost:9000 │ http://localhost:4000/database │ │
│ │ Hosting       │ localhost:5000 │ n/a                         │ │
│ └───────────────┴──────────────┴─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

2. **啟動應用程式伺服器** (終端機 2)
```bash
# 如果使用 Firebase Hosting 模擬器
# 應用程式已在 http://localhost:5000

# 或使用 http-server
http-server -p 8080 -c-1 --cors
```

3. **開啟測試頁面**
```
Firebase Hosting: http://localhost:5000
或
HTTP Server: http://localhost:8080
Firebase UI: http://localhost:4000
```

### 測試案例

#### 基本功能測試
1. **頁面載入測試**
   - ✅ 頁面正常載入
   - ✅ 所有 JavaScript 檔案載入成功
   - ✅ 沒有 console 錯誤

2. **建立房間測試**
   - ✅ 輸入玩家名稱和角色
   - ✅ 房間創建成功
   - ✅ 取得房間 ID

3. **多玩家測試**
   - 開啟多個瀏覽器標籤
   - 使用不同玩家名稱加入同一房間
   - 測試同步功能

#### Firebase 連線測試
1. **檢查 Firebase 模擬器 UI**
   - 前往 http://localhost:4000
   - 查看 Database 標籤
   - 確認數據正確寫入

2. **即時同步測試**
   - 在一個標籤中進行投票
   - 檢查其他標籤是否即時更新
   - 驗證數據同步正確性

---

## 🔍 除錯指南

### 常用除錯技巧

1. **開啟瀏覽器開發者工具**
```
Windows/Linux: F12 或 Ctrl+Shift+I
macOS: Cmd+Option+I
```

2. **檢查 Console 錯誤**
   - 查看紅色錯誤訊息
   - 記錄警告訊息
   - 追蹤 JavaScript 執行流程

3. **檢查 Network 請求**
   - 查看 Firebase API 請求狀態
   - 確認請求 URL 正確
   - 檢查回應內容

4. **Firebase 模擬器除錯**
```bash
# 啟動詳細日誌模式
firebase emulators:start --debug

# 查看模擬器狀態
firebase emulators:list
```

### 常見錯誤解決方法

#### CORS 錯誤
```bash
# 啟動伺服器時加入 CORS 支援
http-server -p 8080 --cors

# 或在 Chrome 中停用安全性 (僅開發使用)
# 不推薦此方法
```

#### Firebase 連線失敗
1. 確認模擬器運行中
2. 檢查 `databaseURL` 設定
3. 驗證安全規則設定

#### 模組載入失敗
1. 檢查檔案路徑
2. 確認 HTTP 伺服器運行
3. 使用相對路徑而非絕對路徑

---

## ❓ 常見問題

### Q1: 為什麼需要 HTTP 伺服器？
**A:** 現代瀏覽器的安全性政策不允許直接開啟本機檔案執行 JavaScript，特別是涉及 AJAX 請求和模組載入時。HTTP 伺服器提供了適當的環境。

### Q2: Firebase 模擬器資料會保存嗎？
**A:** 預設情況下，模擬器資料在重啟後會清除。可以使用 `--export-on-exit` 參數保存資料。

### Q3: 如何重設 Firebase 模擬器資料？
**A:** 重新啟動模擬器即可清除所有資料，或使用 Firebase UI 手動清除。

### Q4: 可以同時測試多個房間嗎？
**A:** 可以！開啟多個無痕視窗，使用不同的玩家身份和房間 ID 進行測試。

### Q5: 如何測試行動裝置相容性？
**A:** 
1. 使用瀏覽器的裝置模擬器
2. 在同一網路下使用手機訪問 `http://[你的IP]:8080`
3. 使用瀏覽器的響應式設計模式

---

## 🎯 快速啟動腳本

創建 `start-dev.sh` (Unix/macOS) 或 `start-dev.bat` (Windows)：

### Unix/macOS
```bash
#!/bin/bash
echo "🚀 啟動 Scrum Poker 開發環境"

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝，請先安裝 Node.js"
    exit 1
fi

# 啟動 Firebase 模擬器 (背景執行)
echo "🔥 啟動 Firebase 模擬器..."
firebase emulators:start &
FIREBASE_PID=$!

# 等待模擬器啟動
sleep 5

# 啟動 HTTP 伺服器
echo "🌐 啟動 HTTP 伺服器..."
http-server -p 8080 -c-1 --cors &
HTTP_PID=$!

echo "✅ 開發環境已啟動！"
echo "📱 應用程式: http://localhost:8080"
echo "🔥 Firebase UI: http://localhost:4000"
echo ""
echo "按 Ctrl+C 停止所有服務"

# 等待用戶停止
wait

# 清理程序
kill $FIREBASE_PID $HTTP_PID 2>/dev/null
```

### Windows
```batch
@echo off
echo 🚀 啟動 Scrum Poker 開發環境

REM 檢查 Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js 未安裝，請先安裝 Node.js
    pause
    exit /b 1
)

echo 🔥 啟動 Firebase 模擬器...
start cmd /k "firebase emulators:start"

timeout /t 5 /nobreak >nul

echo 🌐 啟動 HTTP 伺服器...
start cmd /k "http-server -p 8080 -c-1 --cors"

echo ✅ 開發環境已啟動！
echo 📱 應用程式: http://localhost:8080
echo 🔥 Firebase UI: http://localhost:4000
echo.
echo 按任意鍵結束...
pause >nul
```

---

## 🔧 進階設定

### 自動重新載入設定
安裝 `nodemon` 來監控檔案變更：
```bash
npm install -g nodemon
nodemon --watch . --ext html,js,css --exec "echo 檔案已更新"
```

### 效能監控
使用瀏覽器內建工具：
1. 開啟 DevTools → Performance 標籤
2. 錄製使用者操作
3. 分析效能瓶頸

### 測試自動化
創建簡單的測試腳本：
```javascript
// test-basic.js
console.log('🧪 開始基本功能測試');

// 測試頁面載入
if (typeof gameTable !== 'undefined') {
    console.log('✅ GameTable 載入成功');
} else {
    console.log('❌ GameTable 載入失敗');
}

// 測試 Firebase 連線
if (typeof firebaseManager !== 'undefined') {
    console.log('✅ FirebaseManager 載入成功');
} else {
    console.log('❌ FirebaseManager 載入失敗');
}
```

這個完整的指南應該能幫助您在本機環境中成功設置和測試 Scrum Poker 應用程式！