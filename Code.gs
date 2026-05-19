// DQT-96 Google Apps Script — 接收测评结果写入 Sheet
// 部署后替换 app.js 中的 SHEET_URL

// === 配置：表格结构 ===
// Sheet 列顺序（A→K）：
// A: timestamp    提交时间
// B: userName     用户姓名 ★ 新增
// C: testId       测试ID
// D: totalScore   总分
// E: totalMax     满分
// F: percentage   百分比
// G: duration     耗时(秒)
// H: dim1_score   维度1得分(数据敏感性)
// I: dim2_score   维度2得分(量化抽象力)
// J: dim3_score   维度3得分(逻辑推演力)
// K: dim4_score   维度4得分(决策校准力)
//
// 每道题的详细答案写入 Sheet2（如有）

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 确保表头
    ensureHeaders(sheet);
    
    // 写入主数据行
    const dims = data.dimensions || {};
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString('zh-CN', { hour12: false }),
      data.userName || '',       // ★ 用户姓名
      data.testId || '',
      data.totalScore || 0,
      data.totalMax || 0,
      data.percentage || 0,
      data.durationSeconds || 0,
      dims[1] || 0,  // 数据敏感性
      dims[2] || 0,  // 量化抽象力
      dims[3] || 0,  // 逻辑推演力
      dims[4] || 0,  // 决策校准力
    ]);
    
    // 可选：写入详细答题记录到 Sheet2
    if (data.answers && data.answers.length > 0) {
      writeAnswers(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('DQT-96 API ready');
}

function ensureHeaders(sheet) {
  // 检查第一行是否有表头
  const firstCell = sheet.getRange(1, 1).getValue();
  if (!firstCell || firstCell !== '提交时间') {
    sheet.getRange(1, 1, 1, 11).setValues([[
      '提交时间', '用户姓名', '测试ID', '总分', '满分',
      '百分比', '耗时(秒)', '数据敏感性%', '量化抽象力%',
      '逻辑推演力%', '决策校准力%'
    ]]);
    sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
  }
}

function writeAnswers(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet2 = ss.getSheetByName('答题明细');
  if (!sheet2) {
    sheet2 = ss.insertSheet('答题明细');
    sheet2.getRange(1, 1, 1, 5).setValues([[
      'testId', '用户名', '题号', '用户答案', '得分'
    ]]);
    sheet2.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  
  const rows = data.answers.map((a, i) => [
    data.testId,
    data.userName || '',
    i + 1,
    JSON.stringify(a.answer),
    a.score || 0
  ]);
  
  sheet2.getRange(sheet2.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
}
