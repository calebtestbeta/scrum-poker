# 🧪 Scrum Poker E2E 測試

## 概述

此測試套件使用 Playwright 進行端到端測試，特別專注於測試 Desktop 和 Mobile 版本之間的即時同步功能。

## 測試場景

### 🔄 跨裝置同步測試 (`e2e-cross-device.spec.js`)

測試以下功能：

1. **房間加入測試**
   - Desktop 和 Mobile 同時加入同一房間
   - 驗證房間 ID 顯示正確
   - 確認初始階段狀態

2. **投票同步測試**
   - Desktop 投票 → Mobile 看到更新
   - Mobile 投票 → Desktop 看到更新
   - 驗證卡牌選中狀態

3. **開牌同步測試**
   - 一個裝置觸發開牌
   - 另一個裝置即時看到階段變化
   - 驗證卡牌禁用狀態 (opacity: 0.6)

4. **重置同步測試**
   - 一個裝置觸發重置
   - 兩個裝置回到投票狀態
   - 卡牌重新啟用

5. **玩家列表同步測試**
   - 確認兩個裝置能看到彼此
   - 驗證玩家狀態更新

## 安裝與設定

### 1. 安裝依賴

```bash
# 安裝 Node.js 依賴
npm install

# 安裝 Playwright 瀏覽器
npm run install-playwright
```

### 2. 啟動開發伺服器

```bash
npm start
# 或使用 Python
python3 -m http.server 8080
```

伺服器會在 `http://localhost:8080` 啟動。

## 運行測試

### 基本測試命令

```bash
# 運行所有測試
npm test

# 運行跨裝置測試
npm run test:cross-device

# 帶 UI 模式運行測試
npm run test:ui

# 有頭模式運行（可以看到瀏覽器）
npm run test:cross-device:headed

# 除錯模式
npm run test:debug
```

### 高級選項

```bash
# 只運行特定測試
npx playwright test --grep "投票同步測試"

# 運行測試並生成報告
npm test && npm run test:report

# 在特定瀏覽器運行
npx playwright test --project=firefox
```

## 測試配置

### Firebase 模式測試

如果要測試真實的 Firebase 同步：

#### 方法 1: 使用環境變數文件 (推薦)

1. **建立配置文件**：
   ```bash
   # 複製範例配置文件
   cp .env.test.example .env.test
   ```

2. **編輯 .env.test 文件**：
   ```bash
   # Firebase 專案 ID (必填)
   FIREBASE_PROJECT_ID=your-firebase-project-id
   
   # Firebase Web API Key (必填)
   FIREBASE_API_KEY=AIzaSyD...your-firebase-api-key
   
   # 可選配置
   TEST_TIMEOUT=30000
   TEST_ROOM_PREFIX=e2e-test-
   ```

3. **運行 Firebase 測試**：
   ```bash
   npm run test:firebase          # 使用 .env.test 配置
   npm run test:firebase:headed   # 有頭模式 Firebase 測試
   ```

#### 方法 2: 使用命令行環境變數

```bash
# 單次測試
FIREBASE_PROJECT_ID=your-project FIREBASE_API_KEY=your-api-key npm test

# Windows 用戶
set FIREBASE_PROJECT_ID=your-project && set FIREBASE_API_KEY=your-api-key && npm test
```

#### 方法 3: 手動輸入 (不建議)

如果未設定環境變數，測試會顯示 Firebase 配置彈窗，您可以手動輸入配置資訊。

### 本地模式測試

如果不需要測試 Firebase 功能：

```bash
npm run test:local             # 本地模式測試
npm run test:cross-device      # 預設本地模式
```

預設測試使用本地模式，會自動選擇「使用本地模式」選項跳過 Firebase 配置。

## 測試結果

### 成功指標

- ✅ 兩個裝置成功加入同一房間
- ✅ 投票狀態即時同步
- ✅ 開牌/重置操作即時同步
- ✅ 卡牌禁用/啟用狀態正確
- ✅ 階段指示器正確更新

### 失敗排除

1. **連接超時**
   ```bash
   # 確認伺服器運行
   curl http://localhost:8080
   
   # 增加超時時間
   CONFIG.timeout = 15000
   ```

2. **同步失敗**
   - 檢查 Firebase 配置
   - 確認網路連線
   - 查看瀏覽器控制台錯誤

3. **元素找不到**
   - 檢查選擇器是否正確
   - 確認頁面完全載入
   - 使用 `waitFor` 等待元素

## 測試報告

測試完成後，報告會生成在：

- HTML 報告: `test-results/html-report/index.html`
- JSON 報告: `test-results/results.json`
- 失敗截圖: `test-results/`

查看報告：
```bash
npm run test:report
```

## 開發測試

### 新增測試案例

1. 在 `tests/` 目錄建立新的 `.spec.js` 文件
2. 使用相同的 Playwright 設定
3. 參考現有測試結構

### 除錯技巧

```javascript
// 在測試中加入除錯點
await page.pause();

// 截圖除錯
await page.screenshot({ path: 'debug.png' });

// 控制台日誌
page.on('console', msg => console.log('Browser:', msg.text()));
```

## CI/CD 整合

### GitHub Actions 範例

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm start &
      - run: npm test
```

## 效能考量

- 測試使用單一 worker 避免房間 ID 衝突
- 自動生成唯一房間 ID 避免測試間干擾
- 適當的等待時間確保同步完成
- 失敗時保留截圖和影片除錯

---

## 疑難排解

### 常見問題

**Q: 測試超時失敗**
A: 增加 `CONFIG.timeout` 或檢查網路連線

**Q: Firebase 配置彈窗干擾測試**
A: 確認 `handleFirebaseConfig` 函數正確處理彈窗

**Q: 跨裝置同步不一致**
A: 增加 `waitForTimeout` 讓同步有足夠時間

**Q: 卡牌狀態檢查失敗**
A: 檢查 CSS 選擇器和樣式屬性名稱

---

更多資訊請參考 [Playwright 官方文檔](https://playwright.dev/) 和專案的 `CLAUDE.md`。