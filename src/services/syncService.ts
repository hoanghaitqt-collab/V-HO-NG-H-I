/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SyncQueueItem } from '../types';

/**
 * Mã nguồn Google Apps Script hoàn chỉnh dành cho giáo viên dán vào Trình biên tập tập lệnh
 * của Google Sheet. Tự động khởi tạo 7 bảng dữ liệu và hỗ trợ toàn bộ API.
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * KIỂM TRA, ĐÁNH GIÁ MÔN CÔNG NGHỆ - GOOGLE APPS SCRIPT BACKEND
 * Hướng dẫn:
 * 1. Mở Google Sheet -> Mở 'Tiện ích mở rộng' (Extensions) -> 'Apps Script'.
 * 2. Xóa hết mã cũ, dán toàn bộ đoạn mã này vào file Code.gs.
 * 3. Bấm 'Triển khai' (Deploy) -> 'Triển khai mới' (New deployment).
 * 4. Chọn loại: 'Ứng dụng web' (Web app).
 * 5. Tại mục 'Người có quyền truy cập' (Who has access): Chọn 'Bất kỳ ai' (Anyone).
 * 6. Bấm 'Triển khai', cấp quyền và sao chép URL Web App (kết thúc bằng /exec) dán vào Cài đặt app.
 */

var SHEETS = ['Questions', 'Exams', 'Assignments', 'Classes', 'Students', 'Results', 'Settings'];
var DEFAULT_PIN = '123456'; // Đổi mã PIN bảo mật của bạn tại đây hoặc qua app

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var req = JSON.parse(raw);
    var action = req.action;

    if (action === 'ping') {
      return responseJSON({ ok: true, time: new Date().getTime(), message: 'Kết nối Google Sheet thành công!' });
    }

    if (action === 'publicAssignment') {
      return handlePublicAssignment(req.code);
    }

    if (action === 'submit') {
      return handleSubmit(req);
    }

    // Các action của giáo viên yêu cầu kiểm tra PIN
    var pin = req.pin || '';
    var serverPin = getStoredPin();
    if (pin !== serverPin) {
      return responseJSON({ ok: false, error: 'Mã PIN giáo viên không đúng!' });
    }

    if (action === 'pull') {
      return handlePull(req.since || 0);
    }

    if (action === 'push') {
      return handlePush(req.items || []);
    }

    return responseJSON({ ok: false, error: 'Hành động không hợp lệ: ' + action });
  } catch (err) {
    return responseJSON({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutput('<h3>Ứng dụng Kiểm tra, đánh giá môn Công nghệ đang hoạt động tốt!</h3>');
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(['id', 'data', 'updatedAt', 'deleted']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getStoredPin() {
  var ss = getSpreadsheet();
  var settingsSheet = getOrCreateSheet(ss, 'Settings');
  var data = settingsSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === 'teacherPin' && !data[i][3]) {
      try {
        var parsed = JSON.parse(data[i][1]);
        return parsed.pin || DEFAULT_PIN;
      } catch (e) {
        return DEFAULT_PIN;
      }
    }
  }
  return DEFAULT_PIN;
}

function handlePull(since) {
  var ss = getSpreadsheet();
  var results = [];
  var now = new Date().getTime();

  for (var s = 0; s < SHEETS.length; s++) {
    var sheetName = SHEETS[s];
    var sheet = getOrCreateSheet(ss, sheetName);
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) continue;

    for (var r = 1; r < values.length; r++) {
      var id = values[r][0];
      var rawData = values[r][1];
      var updatedAt = Number(values[r][2]) || 0;
      var deleted = Boolean(values[r][3]);

      if (updatedAt > since && id) {
        var parsedData = null;
        try {
          parsedData = JSON.parse(rawData);
        } catch (e) {
          parsedData = rawData;
        }
        results.push({
          sheet: sheetName,
          id: id,
          data: parsedData,
          updatedAt: updatedAt,
          deleted: deleted
        });
      }
    }
  }

  return responseJSON({ ok: true, now: now, items: results });
}

function handlePush(items) {
  var ss = getSpreadsheet();
  var now = new Date().getTime();

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item.sheet || !item.id) continue;

    var sheet = getOrCreateSheet(ss, item.sheet);
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;

    for (var r = 1; r < values.length; r++) {
      if (values[r][0] == item.id) {
        rowIndex = r + 1; // 1-indexed
        break;
      }
    }

    var dataStr = typeof item.data === 'string' ? item.data : JSON.stringify(item.data);
    var isDeleted = item.deleted ? true : false;
    var updatedAt = item.data && item.data.updatedAt ? Number(item.data.updatedAt) : now;

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 2).setValue(dataStr);
      sheet.getRange(rowIndex, 3).setValue(updatedAt);
      sheet.getRange(rowIndex, 4).setValue(isDeleted);
    } else {
      sheet.appendRow([item.id, dataStr, updatedAt, isDeleted]);
    }
  }

  return responseJSON({ ok: true, now: now });
}

function handlePublicAssignment(code) {
  var ss = getSpreadsheet();
  var assignSheet = getOrCreateSheet(ss, 'Assignments');
  var assignData = assignSheet.getDataRange().getValues();
  var targetAssign = null;

  for (var r = 1; r < assignData.length; r++) {
    if (!assignData[r][3]) {
      try {
        var a = JSON.parse(assignData[r][1]);
        if (a.code && a.code.toUpperCase() === code.toUpperCase()) {
          targetAssign = a;
          break;
        }
      } catch (e) {}
    }
  }

  if (!targetAssign) {
    return responseJSON({ ok: false, error: 'Không tìm thấy bài giao với mã: ' + code });
  }

  // Lấy thông tin đề thi tương ứng
  var examSheet = getOrCreateSheet(ss, 'Exams');
  var examData = examSheet.getDataRange().getValues();
  var targetExam = null;

  for (var r = 1; r < examData.length; r++) {
    if (examData[r][0] === targetAssign.examId && !examData[r][3]) {
      try {
        targetExam = JSON.parse(examData[r][1]);
        break;
      } catch (e) {}
    }
  }

  if (!targetExam) {
    return responseJSON({ ok: false, error: 'Không tìm thấy đề thi liên kết với bài này!' });
  }

  // Lấy các câu hỏi và LƯỢC BỎ đáp án đúng
  var qSheet = getOrCreateSheet(ss, 'Questions');
  var qData = qSheet.getDataRange().getValues();
  var questionsMap = {};
  for (var r = 1; r < qData.length; r++) {
    if (!qData[r][3]) {
      try {
        var q = JSON.parse(qData[r][1]);
        questionsMap[q.id] = q;
      } catch (e) {}
    }
  }

  var studentQuestions = [];
  for (var i = 0; i < targetExam.questions.length; i++) {
    var ref = targetExam.questions[i];
    var q = questionsMap[ref.questionId];
    if (!q) continue;

    var sanitized = {
      id: q.id,
      grade: q.grade,
      topic: q.topic,
      level: q.level,
      type: q.type,
      content: q.content,
      options: q.options || {},
      points: ref.points,
      section: ref.section,
      imageUrl: q.imageUrl || '',
      lockOptionOrder: q.lockOptionOrder || false
    };

    if (q.subQuestions) {
      sanitized.subQuestions = q.subQuestions.map(function(sq) {
        return {
          id: sq.id,
          label: sq.label,
          content: sq.content
        };
      });
    }

    studentQuestions.push(sanitized);
  }

  return responseJSON({
    ok: true,
    assignment: {
      id: targetAssign.id,
      code: targetAssign.code,
      title: targetAssign.title,
      targetClass: targetAssign.targetClass,
      durationMinutes: targetAssign.durationMinutes,
      openAt: targetAssign.openAt,
      closeAt: targetAssign.closeAt,
      maxAttempts: targetAssign.maxAttempts,
      shuffleForStudent: targetAssign.shuffleForStudent,
      allowReviewAfterSubmit: targetAssign.allowReviewAfterSubmit,
      questions: studentQuestions
    }
  });
}

function handleSubmit(req) {
  var code = req.code;
  var student = req.student; // { name, class }
  var answers = req.answers || {};
  var meta = req.meta || {};

  var ss = getSpreadsheet();
  var assignSheet = getOrCreateSheet(ss, 'Assignments');
  var assignData = assignSheet.getDataRange().getValues();
  var targetAssign = null;

  for (var r = 1; r < assignData.length; r++) {
    if (!assignData[r][3]) {
      try {
        var a = JSON.parse(assignData[r][1]);
        if (a.code && a.code.toUpperCase() === code.toUpperCase()) {
          targetAssign = a;
          break;
        }
      } catch (e) {}
    }
  }

  if (!targetAssign) {
    return responseJSON({ ok: false, error: 'Không tìm thấy bài giao!' });
  }

  // Tải đề và câu hỏi gốc kèm đáp án để chấm điểm
  var examSheet = getOrCreateSheet(ss, 'Exams');
  var examData = examSheet.getDataRange().getValues();
  var targetExam = null;
  for (var r = 1; r < examData.length; r++) {
    if (examData[r][0] === targetAssign.examId && !examData[r][3]) {
      try {
        targetExam = JSON.parse(examData[r][1]);
        break;
      } catch (e) {}
    }
  }

  var qSheet = getOrCreateSheet(ss, 'Questions');
  var qData = qSheet.getDataRange().getValues();
  var questionsMap = {};
  for (var r = 1; r < qData.length; r++) {
    if (!qData[r][3]) {
      try {
        var q = JSON.parse(qData[r][1]);
        questionsMap[q.id] = q;
      } catch (e) {}
    }
  }

  var totalEarned = 0;
  var totalMax = 0;
  var detail = [];

  for (var i = 0; i < targetExam.questions.length; i++) {
    var ref = targetExam.questions[i];
    var q = questionsMap[ref.questionId];
    if (!q) continue;

    var maxScore = ref.points || 0.25;
    totalMax += maxScore;
    var earned = 0;
    var stuAns = answers[q.id];

    if (q.type === 'TN') {
      var isCorrect = (stuAns && stuAns === q.correctOption);
      if (isCorrect) earned = maxScore;
      detail.push({
        questionId: q.id,
        type: 'TN',
        studentAnswer: stuAns || null,
        correctAnswer: q.correctOption,
        scoreEarned: earned,
        maxScore: maxScore,
        isCorrect: isCorrect
      });
    } else if (q.type === 'DS') {
      var correctCount = 0;
      var subList = q.subQuestions || [];
      for (var s = 0; s < subList.length; s++) {
        var sq = subList[s];
        var stuChoice = (stuAns && typeof stuAns[sq.label] !== 'undefined') ? stuAns[sq.label] : null;
        if (stuChoice === sq.isCorrect) {
          correctCount++;
        }
      }
      // Quy chuẩn thang điểm Đúng/Sai 4 ý mới của Bộ GD&ĐT:
      // 1 ý đúng: 10% (0.1) ; 2 ý: 25% (0.25) ; 3 ý: 50% (0.5) ; 4 ý: 100% (1.0)
      var ratio = 0;
      if (correctCount === 1) ratio = 0.1;
      else if (correctCount === 2) ratio = 0.25;
      else if (correctCount === 3) ratio = 0.5;
      else if (correctCount === 4) ratio = 1.0;
      earned = maxScore * ratio;
      detail.push({
        questionId: q.id,
        type: 'DS',
        studentAnswer: stuAns || {},
        correctAnswer: subList.map(function(sq) { return { label: sq.label, isCorrect: sq.isCorrect }; }),
        scoreEarned: earned,
        maxScore: maxScore,
        isCorrect: (correctCount === 4)
      });
    } else if (q.type === 'TLN') {
      var isOk = false;
      var accepted = (q.shortAnswer || '').split('|').map(function(x) { return x.trim().toLowerCase(); });
      var stuClean = (stuAns || '').toString().trim().toLowerCase();
      if (stuClean && accepted.indexOf(stuClean) >= 0) {
        isOk = true;
        earned = maxScore;
      }
      detail.push({
        questionId: q.id,
        type: 'TLN',
        studentAnswer: stuAns || '',
        correctAnswer: q.shortAnswer,
        scoreEarned: earned,
        maxScore: maxScore,
        isCorrect: isOk
      });
    } else {
      // Tự luận: Giáo viên chấm tay sau
      detail.push({
        questionId: q.id,
        type: 'TL',
        studentAnswer: stuAns || '',
        correctAnswer: q.essayGuide || '',
        scoreEarned: 0,
        maxScore: maxScore,
        isCorrect: false
      });
    }

    totalEarned += earned;
  }

  // Làm tròn 2 chữ số
  totalEarned = Math.round(totalEarned * 100) / 100;

  // Lưu bài nộp vào sheet Results
  var resultSheet = getOrCreateSheet(ss, 'Results');
  var subId = 'sub_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
  var submission = {
    id: subId,
    assignmentId: targetAssign.id,
    assignmentCode: targetAssign.code,
    assignmentTitle: targetAssign.title,
    studentName: student.name,
    studentClass: student.class,
    score: totalEarned,
    totalScore: totalMax,
    durationSeconds: meta.durationSec || 0,
    tabLeavesCount: meta.tabLeaves || 0,
    submittedAt: new Date().getTime(),
    answers: answers,
    detail: detail,
    essayGraded: false,
    updatedAt: new Date().getTime()
  };

  resultSheet.appendRow([subId, JSON.stringify(submission), new Date().getTime(), false]);

  return responseJSON({
    ok: true,
    score: totalEarned,
    total: totalMax,
    detail: targetAssign.allowReviewAfterSubmit ? detail : null,
    showAnswer: targetAssign.allowReviewAfterSubmit
  });
}
`;

/**
 * Thực hiện gọi Google Apps Script API bằng fetch POST với text/plain để tránh CORS preflight.
 */
export async function callAppsScript(scriptUrl: string, payload: any): Promise<any> {
  if (!scriptUrl || !scriptUrl.trim().startsWith('http')) {
    throw new Error('Chưa cấu hình URL Google Apps Script Web App (/exec)');
  }

  try {
    const response = await fetch(scriptUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json;
  } catch (err: any) {
    console.error('Lỗi gọi Apps Script:', err);
    throw err;
  }
}

/**
 * Ping kiểm tra kết nối với Google Apps Script Web App
 */
export async function pingAppsScript(scriptUrl: string): Promise<{ ok: boolean; message: string; time?: number }> {
  try {
    const res = await callAppsScript(scriptUrl, { action: 'ping' });
    if (res && res.ok) {
      return { ok: true, message: 'Kết nối Google Apps Script thành công!', time: res.time };
    }
    return { ok: false, message: res.error || 'Phản hồi không hợp lệ từ máy chủ.' };
  } catch (err: any) {
    return {
      ok: false,
      message: `Không thể kết nối (${err.message || 'Lỗi mạng hoặc URL không chính xác'}). Vui lòng kiểm tra quyền "Bất kỳ ai" (Anyone) khi triển khai.`,
    };
  }
}

/**
 * Đẩy các mục thay đổi lên Google Apps Script
 */
export async function pushToGoogleSheet(
  scriptUrl: string,
  pin: string,
  items: SyncQueueItem[]
): Promise<{ ok: boolean; now?: number; error?: string }> {
  if (!items || items.length === 0) return { ok: true };
  const payload = {
    action: 'push',
    pin,
    items: items.map(item => ({
      sheet: item.sheet,
      id: item.id,
      data: item.data,
      deleted: item.deleted || false,
    })),
  };
  return await callAppsScript(scriptUrl, payload);
}

/**
 * Kéo các mục mới/sửa từ Google Apps Script
 */
export async function pullFromGoogleSheet(
  scriptUrl: string,
  pin: string,
  since: number
): Promise<{ ok: boolean; now: number; items: any[]; error?: string }> {
  const payload = {
    action: 'pull',
    pin,
    since: since || 0,
  };
  return await callAppsScript(scriptUrl, payload);
}
