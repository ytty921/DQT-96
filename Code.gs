// DQT-96 Google Apps Script — 接收测评结果写入 Sheet
// 部署后替换 app.js 中的 SHEET_URL

// === 配置：表格结构 ===
// Sheet 列顺序（A→M）：
// A: timestamp      提交时间
// B: userName       用户姓名
// C: testId         测试ID
// D: totalScore     总分
// E: totalMax       满分
// F: percentage     百分比
// G: duration       耗时(秒)
// H: dim1_score     维度1得分(数据敏感性)
// I: dim2_score     维度2得分(量化抽象力)
// J: dim3_score     维度3得分(逻辑推演力)
// K: dim4_score     维度4得分(决策校准力)
// L: tierLabel      满分等级（高/中/低难度组）★ 新增 2026-05-18
// M: ratingLevel    二维评级（卓越/优秀/良好/待提升/薄弱）★ 新增 2026-05-18
//
// 每道题的详细答案写入 Sheet2（如有）

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const debug = [];
    
    // 确保表头
    ensureHeaders(sheet);
    
    // 写入主数据行
    const dims = data.dimensions || {};
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString('zh-CN', { hour12: false }),
      data.userName || '',
      data.testId || '',
      data.totalScore || 0,
      data.totalMax || 0,
      data.percentage || 0,
      data.durationSeconds || 0,
      (dims['数据敏感性'] && dims['数据敏感性'].percentage) || 0,
      (dims['量化抽象力'] && dims['量化抽象力'].percentage) || 0,
      (dims['逻辑推演力'] && dims['逻辑推演力'].percentage) || 0,
      (dims['决策校准力'] && dims['决策校准力'].percentage) || 0,
      data.tierLabel || '',
      data.ratingLevel || '',
    ]);
    
    // 写入详细答题记录
    const hasAnswers = data.answers && data.answers.length > 0;
    debug.push('answersCount: ' + (data.answers ? data.answers.length : 'null'));
    
    if (hasAnswers) {
      debug.push('firstAnswerKeys: ' + Object.keys(data.answers[0]).join(','));
      try {
        writeAnswers(data);
        debug.push('writeAnswers: ok, rows=' + data.answers.length);
      } catch (e2) {
        debug.push('writeAnswers error: ' + e2.toString());
      }
    } else {
      debug.push('writeAnswers: skipped (no answers data)');
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', debug: debug }))
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
    sheet.getRange(1, 1, 1, 13).setValues([[
      '提交时间', '用户姓名', '测试ID', '总分', '满分',
      '百分比', '耗时(秒)', '数据敏感性%', '量化抽象力%',
      '逻辑推演力%', '决策校准力%', '满分等级', '二维评级'
    ]]);
    sheet.getRange(1, 1, 1, 13).setFontWeight('bold');
  }
}

function writeAnswers(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet2 = ss.getSheetByName('答题明细');
  // 如果旧表存在且表头列数不对，删除重建
  if (sheet2) {
    const header = sheet2.getRange(1, 1, 1, sheet2.getLastColumn()).getValues()[0];
    if (!header || header.length < 9 || header[3] !== '题目ID') {
      ss.deleteSheet(sheet2);
      sheet2 = null;
    }
  }
  if (!sheet2) {
    sheet2 = ss.insertSheet('答题明细');
    sheet2.getRange(1, 1, 1, 9).setValues([[
      'testId', '用户名', '题号', '题目ID', '题目内容', '用户答案', '正确答案', '正确/错误', '得分'
    ]]);
    sheet2.getRange(1, 1, 1, 9).setFontWeight('bold');
  }
  
  const rows = data.answers.map((a, i) => [
    data.testId,
    data.userName || '',
    a.order || (i + 1),
    a.qid || '',
    a.question || '',
    a.userAnswer || '',
    a.correctAnswer || '',
    a.correct ? '正确' : '错误',
    a.score || 0
  ]);
  
  sheet2.getRange(sheet2.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
}
