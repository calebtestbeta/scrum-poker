@echo off
:: Scrum Poker 開發環境啟動腳本 (Windows)
:: 使用方法: start-dev.bat

setlocal enabledelayedexpansion
title Scrum Poker 開發環境

:: 設定顏色
for /F %%a in ('echo prompt $E^| cmd') do set "ESC=%%a"

:: 顏色定義
set "RED=%ESC%[31m"
set "GREEN=%ESC%[32m"
set "YELLOW=%ESC%[33m"
set "BLUE=%ESC%[34m"
set "NC=%ESC%[0m"

cls
echo 🚀 Scrum Poker 開發環境啟動器
echo =================================
echo.

:: 檢查 Node.js
echo %BLUE%[INFO]%NC% 檢查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[ERROR]%NC% Node.js 未安裝
    echo %BLUE%[INFO]%NC% 請前往 https://nodejs.org/ 下載並安裝 Node.js
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo %GREEN%[SUCCESS]%NC% Node.js 版本: %NODE_VERSION%

:: 檢查 npm
echo %BLUE%[INFO]%NC% 檢查 npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[ERROR]%NC% npm 未安裝
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo %GREEN%[SUCCESS]%NC% npm 版本: %NPM_VERSION%

:: 檢查 Firebase CLI
echo %BLUE%[INFO]%NC% 檢查 Firebase CLI...
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%[WARNING]%NC% Firebase CLI 未安裝，正在安裝...
    npm install -g firebase-tools
)

:: 檢查 http-server
echo %BLUE%[INFO]%NC% 檢查 http-server...
http-server --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%[WARNING]%NC% http-server 未安裝，正在安裝...
    npm install -g http-server
)

:: 安裝專案依賴
if exist package.json (
    echo %BLUE%[INFO]%NC% 安裝專案依賴...
    npm install
)

echo.
echo %BLUE%[INFO]%NC% 開始啟動服務...
echo.

:: 啟動 Firebase 模擬器
echo %BLUE%[INFO]%NC% 啟動 Firebase 模擬器...
start "Firebase Emulators" cmd /k "firebase emulators:start --only auth,database,hosting"

:: 等待 Firebase 模擬器啟動
echo %BLUE%[INFO]%NC% 等待 Firebase 模擬器啟動...
timeout /t 10 /nobreak >nul

:: 啟動 HTTP 伺服器
echo %BLUE%[INFO]%NC% 啟動 HTTP 伺服器...
start "HTTP Server" cmd /k "http-server -p 8080 -c-1 --cors"

:: 等待服務啟動
timeout /t 3 /nobreak >nul

echo.
echo 🎉 開發環境啟動成功！
echo ==============================
echo.
echo 📱 應用程式網址:
echo    http://localhost:8080 (HTTP Server)
echo    http://localhost:5000 (Firebase Hosting)
echo.
echo 🔥 Firebase 服務:
echo    模擬器 UI: http://localhost:4000
echo    Authentication: http://localhost:9099
echo    Database: http://localhost:9000
echo.
echo 📊 開發工具:
echo    - 開啟瀏覽器的開發者工具 (F12)
echo    - 查看 Console 標籤監控 JavaScript
echo    - 查看 Network 標籤監控 API 請求
echo    - 使用 Firebase UI 查看數據庫狀態
echo.
echo 🔧 測試建議:
echo    1. 開啟多個瀏覽器標籤測試多玩家功能
echo    2. 使用無痕模式模擬不同用戶
echo    3. 測試響應式設計（調整瀏覽器視窗大小）
echo    4. 查看 Firebase UI 確認數據同步
echo.
echo 💡 提示:
echo    - Firebase 模擬器和 HTTP 伺服器在獨立視窗中運行
echo    - 關閉對應的命令提示字元視窗即可停止服務
echo    - 如需重新啟動，請先關閉所有服務視窗
echo.

:: 開啟瀏覽器
echo %BLUE%[INFO]%NC% 正在開啟瀏覽器...
start "" "http://localhost:8080"

echo 按任意鍵開啟 Firebase UI...
pause >nul
start "" "http://localhost:4000"

echo.
echo 開發環境已完全啟動！
echo 按任意鍵結束此視窗...
pause >nul