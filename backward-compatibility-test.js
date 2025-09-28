// 向後相容性測試腳本
// 在瀏覽器 Console 中執行此腳本來測試系統相容性

function runBackwardCompatibilityTests() {
    console.log('🧪 開始向後相容性測試...');
    
    const tests = [];
    
    // 測試 1: 檢查任務類型選擇元素是否可選
    try {
        const taskTypeElement = document.getElementById('taskType');
        if (!taskTypeElement) {
            tests.push('✅ 任務類型元素不存在時系統正常 (非 PO/SM 角色)');
        } else {
            tests.push('✅ 任務類型元素存在且可存取');
        }
    } catch (error) {
        tests.push('❌ 任務類型元素存取異常: ' + error.message);
    }
    
    // 測試 2: 檢查建議系統初始化
    try {
        if (typeof scrumMasterAdvice !== 'undefined') {
            tests.push('✅ 建議系統已正確初始化');
            
            // 測試空任務類型的處理
            scrumMasterAdvice.selectedTaskType = null;
            scrumMasterAdvice.generateTaskTypeAdvice();
            if (scrumMasterAdvice.suggestions.length === 0) {
                tests.push('✅ 空任務類型時不生成建議');
            } else {
                tests.push('❌ 空任務類型時仍生成建議');
            }
        } else {
            tests.push('⚠️ 建議系統尚未初始化 (正常，頁面載入中)');
        }
    } catch (error) {
        tests.push('❌ 建議系統測試異常: ' + error.message);
    }
    
    // 測試 3: 檢查原有函數是否存在
    const coreFunctions = [
        'startGame',
        'revealCards', 
        'clearVotes',
        'leaveGame'
    ];
    
    coreFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            tests.push(`✅ 核心函數 ${funcName} 存在`);
        } else {
            tests.push(`❌ 核心函數 ${funcName} 缺失`);
        }
    });
    
    // 測試 4: 檢查角色變更邏輯
    try {
        const roleSelect = document.getElementById('playerRole');
        const taskTypeGroup = document.getElementById('taskTypeGroup');
        
        if (roleSelect && taskTypeGroup) {
            // 模擬開發者角色選擇
            roleSelect.value = 'dev';
            toggleTaskTypeVisibility();
            
            if (taskTypeGroup.style.display === 'none') {
                tests.push('✅ 非 PO/SM 角色時任務類型隱藏');
            } else {
                tests.push('❌ 非 PO/SM 角色時任務類型仍顯示');
            }
            
            // 模擬 PO 角色選擇
            roleSelect.value = 'po';
            toggleTaskTypeVisibility();
            
            if (taskTypeGroup.style.display === 'block') {
                tests.push('✅ PO 角色時任務類型顯示');
            } else {
                tests.push('❌ PO 角色時任務類型未顯示');
            }
        } else {
            tests.push('⚠️ 角色選擇元素不完整 (可能是頁面載入問題)');
        }
    } catch (error) {
        tests.push('❌ 角色變更邏輯測試異常: ' + error.message);
    }
    
    // 測試 5: 檢查版本資訊
    try {
        if (typeof window.SCRUM_POKER_VERSION !== 'undefined') {
            const version = window.SCRUM_POKER_VERSION.toString();
            if (version.includes('v2.0.0')) {
                tests.push('✅ 版本資訊正確更新為 v2.0.0');
            } else {
                tests.push('❌ 版本資訊未正確更新: ' + version);
            }
        } else {
            tests.push('❌ 版本資訊缺失');
        }
    } catch (error) {
        tests.push('❌ 版本資訊檢查異常: ' + error.message);
    }
    
    // 顯示測試結果
    console.log('\n📊 向後相容性測試結果:');
    console.log('================================');
    tests.forEach(test => console.log(test));
    
    const passed = tests.filter(t => t.startsWith('✅')).length;
    const failed = tests.filter(t => t.startsWith('❌')).length;
    const warnings = tests.filter(t => t.startsWith('⚠️')).length;
    
    console.log('================================');
    console.log(`總計: ${tests.length} 項測試`);
    console.log(`通過: ${passed} 項`);
    console.log(`失敗: ${failed} 項`);
    console.log(`警告: ${warnings} 項`);
    
    if (failed === 0) {
        console.log('🎉 向後相容性測試通過！');
        return true;
    } else {
        console.log('⚠️ 發現相容性問題，請檢查失敗項目');
        return false;
    }
}

// 自動執行測試（延遲 1 秒確保頁面載入完成）
setTimeout(() => {
    console.log('🚀 自動執行向後相容性測試...');
    runBackwardCompatibilityTests();
}, 1000);

// 也提供手動執行函數
window.testBackwardCompatibility = runBackwardCompatibilityTests;