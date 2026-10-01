// 《他們坐在哪裡？》小燈對話紀錄：接收 Cloudflare Worker 送來的資料，寫進這個試算表。
// 使用方式：在試算表裡按「擴充功能 → Apps Script」，把這整段貼上，再「部署 → 新增部署作業 → 網頁應用程式」。

const SHEET_NAME = '對話紀錄';
const HEADERS = ['時間', '學生代號', '年代', '第幾輪', '學生寫的話', '小燈的回答'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  sh.appendRow([d.time, d.sid, d.era, d.turn, safe(d.student), safe(d.reply)]);
  return ContentService.createTextOutput('ok');
}

// 學生打的字如果以 = + - @ 開頭，前面加 ' ，避免被當成試算表公式執行
function safe(v) {
  const t = String(v == null ? '' : v);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

// 在 Apps Script 編輯器選這個函式按「執行」，可以先建立標題列並確認權限
function setup() {
  doPost({ postData: { contents: JSON.stringify({ time: '測試', sid: 'TEST', era: '測試', turn: 0, student: '這是測試列，可以刪掉', reply: '' }) } });
}
