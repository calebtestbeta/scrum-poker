// 測試 FirebaseService 中的 validateVoteValue 函數

// 直接複製 FirebaseService 中的邏輯
function validateVoteValue(vote) {
    // 允許的 Fibonacci 數列
    const allowedNumbers = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 100];
    // 允許的特殊值 (包含多種表示方式)
    const allowedSpecial = ['?', '❓', 'question', '☕', 'coffee', '∞', 'infinity'];
    
    console.log('測試投票值:', vote, '類型:', typeof vote);
    console.log('允許的特殊值:', allowedSpecial);
    console.log('包含檢查結果:', allowedSpecial.includes(vote));
    
    // 數字類型驗證
    if (typeof vote === 'number' && allowedNumbers.includes(vote)) {
        console.log(`✅ 有效數字投票值: ${vote}`);
        return vote;
    }
    
    // 字串類型驗證 (支援多種表示方式)
    if (typeof vote === 'string' && allowedSpecial.includes(vote)) {
        console.log(`✅ 有效特殊投票值: ${vote}`);
        return vote;
    }
    
    // 詳細錯誤日誌
    console.error(`❌ 無效的投票值:`, {
        value: vote,
        type: typeof vote,
        allowedNumbers,
        allowedSpecial
    });
    
    throw new Error(`無效的投票值: ${vote} (類型: ${typeof vote})`);
}

// 測試用例
const testCases = [
    '❓',    // 問號 emoji
    'question', // question 字串
    '☕',    // 咖啡 emoji  
    'coffee', // coffee 字串
    '∞',     // 無限符號
    'infinity' // infinity 字串
];

console.log('=== 開始測試 ===');
testCases.forEach(testCase => {
    console.log(`\n測試: "${testCase}"`);
    try {
        const result = validateVoteValue(testCase);
        console.log('✅ 通過, 返回值:', result);
    } catch (error) {
        console.log('❌ 失敗:', error.message);
    }
});

console.log('\n=== 字符調試 ===');
testCases.forEach(testCase => {
    console.log(`"${testCase}" - Unicode: ${testCase.charCodeAt ? testCase.charCodeAt(0) : 'N/A'}`);
});