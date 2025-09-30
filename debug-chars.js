// 調試特殊字符
console.log('=== 調試特殊字符編碼 ===');

const testChars = ['❓', '☕', '∞'];
const allowedSpecial = ['?', '❓', '☕', 'coffee', '∞', 'infinity'];

testChars.forEach(char => {
    console.log(`字符: "${char}"`);
    console.log(`Unicode: ${char.charCodeAt(0)}`);
    console.log(`在陣列中: ${allowedSpecial.includes(char)}`);
    console.log('---');
});

// 檢查是否是相同的字符
console.log('=== 字符比較 ===');
console.log('❓ === "❓":', '❓' === '❓');
console.log('☕ === "☕":', '☕' === '☕');  
console.log('∞ === "∞":', '∞' === '∞');

// 檢查陣列內容
console.log('=== 允許的特殊值 ===');
allowedSpecial.forEach((val, index) => {
    console.log(`[${index}]: "${val}" (Unicode: ${val.charCodeAt ? val.charCodeAt(0) : 'N/A'})`);
});