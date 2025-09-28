#!/bin/bash

# Scrum Poker 開發環境啟動腳本
# 使用方法: ./start-dev.sh

set -e  # 遇到錯誤立即停止

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數定義
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 清理函數
cleanup() {
    print_status "正在停止所有服務..."
    
    # 停止背景程序
    if [ ! -z "$FIREBASE_PID" ]; then
        kill $FIREBASE_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$HTTP_PID" ]; then
        kill $HTTP_PID 2>/dev/null || true
    fi
    
    # 等待程序結束
    sleep 2
    
    print_success "所有服務已停止"
    exit 0
}

# 設定 trap 來捕捉 Ctrl+C
trap cleanup SIGINT SIGTERM

# 主程序開始
clear
echo "🚀 Scrum Poker 開發環境啟動器"
echo "================================="
echo ""

# 檢查 Node.js
print_status "檢查 Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js 未安裝"
    print_status "請前往 https://nodejs.org/ 下載並安裝 Node.js"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js 版本: $NODE_VERSION"

# 檢查 npm
print_status "檢查 npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm 未安裝"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm 版本: $NPM_VERSION"

# 檢查 Firebase CLI
print_status "檢查 Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    print_warning "Firebase CLI 未安裝，正在安裝..."
    npm install -g firebase-tools
fi

# 檢查 http-server
print_status "檢查 http-server..."
if ! command -v http-server &> /dev/null; then
    print_warning "http-server 未安裝，正在安裝..."
    npm install -g http-server
fi

# 安裝專案依賴
if [ -f "package.json" ]; then
    print_status "安裝專案依賴..."
    npm install
fi

echo ""
print_status "開始啟動服務..."
echo ""

# 啟動 Firebase 模擬器
print_status "啟動 Firebase 模擬器..."
firebase emulators:start --only auth,database,hosting > firebase.log 2>&1 &
FIREBASE_PID=$!

# 等待 Firebase 模擬器啟動
print_status "等待 Firebase 模擬器啟動..."
sleep 8

# 檢查 Firebase 是否成功啟動
if ! kill -0 $FIREBASE_PID 2>/dev/null; then
    print_error "Firebase 模擬器啟動失敗"
    print_status "查看 firebase.log 以獲取詳細錯誤信息"
    exit 1
fi

print_success "Firebase 模擬器已啟動"

# 啟動 HTTP 伺服器 (如果不使用 Firebase Hosting)
if [ "$1" != "--firebase-hosting-only" ]; then
    print_status "啟動 HTTP 伺服器..."
    http-server -p 8080 -c-1 --cors --silent > http.log 2>&1 &
    HTTP_PID=$!
    
    sleep 2
    
    if ! kill -0 $HTTP_PID 2>/dev/null; then
        print_error "HTTP 伺服器啟動失敗"
        cleanup
        exit 1
    fi
    
    print_success "HTTP 伺服器已啟動"
fi

echo ""
echo "🎉 開發環境啟動成功！"
echo "=============================="
echo ""
echo "📱 應用程式網址:"
if [ "$1" != "--firebase-hosting-only" ]; then
    echo "   http://localhost:8080 (HTTP Server)"
fi
echo "   http://localhost:5000 (Firebase Hosting)"
echo ""
echo "🔥 Firebase 服務:"
echo "   模擬器 UI: http://localhost:4000"
echo "   Authentication: http://localhost:9099"
echo "   Database: http://localhost:9000"
echo ""
echo "📊 開發工具:"
echo "   - 開啟瀏覽器的開發者工具 (F12)"
echo "   - 查看 Console 標籤監控 JavaScript"
echo "   - 查看 Network 標籤監控 API 請求"
echo "   - 使用 Firebase UI 查看數據庫狀態"
echo ""
echo "🔧 測試建議:"
echo "   1. 開啟多個瀏覽器標籤測試多玩家功能"
echo "   2. 使用無痕模式模擬不同用戶"
echo "   3. 測試響應式設計（調整瀏覽器視窗大小）"
echo "   4. 查看 Firebase UI 確認數據同步"
echo ""
echo "按 Ctrl+C 停止所有服務"
echo ""

# 等待用戶停止
while true; do
    sleep 1
done