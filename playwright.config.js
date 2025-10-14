/**
 * Playwright 測試配置
 * 用於 Scrum Poker 跨裝置同步測試
 */

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  // 測試文件位置
  testDir: './tests',
  
  // 測試超時設定
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  
  // 測試並行執行
  fullyParallel: false, // 關閉平行執行，因為需要測試房間同步
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // 使用單一 worker 避免房間衝突
  
  // 報告設定
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  // 全域設定
  use: {
    // 基本設定
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 瀏覽器設定
    headless: process.env.CI ? true : false, // CI 環境使用 headless 模式
    
    // 忽略 HTTPS 錯誤
    ignoreHTTPSErrors: true,
  },

  // 瀏覽器專案配置
  projects: [
    {
      name: 'chromium',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        // 允許本地伺服器連線
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--allow-running-insecure-content'
          ]
        }
      },
    },
    
    // 可選：不同瀏覽器測試
    // {
    //   name: 'firefox',
    //   use: { ...require('@playwright/test').devices['Desktop Firefox'] },
    // },
    
    // {
    //   name: 'webkit',
    //   use: { ...require('@playwright/test').devices['Desktop Safari'] },
    // },
  ],

  // 開發伺服器配置（可選）
  webServer: {
    command: 'npx http-server . -p 8080 -c-1 --cors',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
};

module.exports = config;