/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { StudentSubmission, Assignment } from '../types';

export function exportResultsToExcel(
  assignment: Assignment,
  submissions: StudentSubmission[],
  questionStats?: { index: number; content: string; correctRate: number }[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Bảng điểm học sinh
  const scoreRows = submissions.map((sub, idx) => {
    const mins = Math.floor(sub.durationSeconds / 60);
    const secs = sub.durationSeconds % 60;
    const timeStr = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    const submitDateStr = new Date(sub.submittedAt).toLocaleString('vi-VN');

    return {
      'STT': idx + 1,
      'Họ và tên': sub.studentName,
      'Lớp': sub.studentClass,
      'Điểm': sub.score,
      'Điểm tối đa': sub.totalScore,
      'Thời gian làm': timeStr,
      'Số lần rời tab': sub.tabLeavesCount,
      'Trạng thái': sub.score >= 5 ? 'Đạt' : 'Chưa đạt',
      'Thời gian nộp bài': submitDateStr,
    };
  });

  const wsScores = XLSX.utils.json_to_sheet(scoreRows);
  wsScores['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsScores, 'BangDiem');

  // Sheet 2: Thống kê tổng quan
  if (submissions.length > 0) {
    const scores = submissions.map(s => s.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passed = scores.filter(s => s >= 5).length;
    const passRate = Math.round((passed / scores.length) * 100);
    const excellent = scores.filter(s => s >= 8).length;
    const excellentRate = Math.round((excellent / scores.length) * 100);

    const summaryRows = [
      { 'Chỉ số': 'Tên bài kiểm tra', 'Giá trị': assignment.title },
      { 'Chỉ số': 'Mã bài giao', 'Giá trị': assignment.code },
      { 'Chỉ số': 'Lớp tham gia', 'Giá trị': assignment.targetClass },
      { 'Chỉ số': 'Tổng số bài đã nộp', 'Giá trị': submissions.length },
      { 'Chỉ số': 'Điểm trung bình', 'Giá trị': Number(avg.toFixed(2)) },
      { 'Chỉ số': 'Điểm cao nhất', 'Giá trị': max },
      { 'Chỉ số': 'Điểm thấp nhất', 'Giá trị': min },
      { 'Chỉ số': 'Tỉ lệ Đạt (≥ 5.0)', 'Giá trị': `${passRate}% (${passed}/${submissions.length})` },
      { 'Chỉ số': 'Tỉ lệ Giỏi (≥ 8.0)', 'Giá trị': `${excellentRate}% (${excellent}/${submissions.length})` },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ThongKeChung');
  }

  // Sheet 3: Phân tích câu hỏi
  if (questionStats && questionStats.length > 0) {
    const qRows = questionStats.map(qs => ({
      'Câu số': qs.index,
      'Nội dung tóm tắt': qs.content,
      'Tỉ lệ trả lời đúng (%)': `${qs.correctRate}%`,
      'Đánh giá độ khó': qs.correctRate < 30 ? 'Rất khó' : qs.correctRate < 60 ? 'Vừa phải' : 'Dễ',
    }));
    const wsQ = XLSX.utils.json_to_sheet(qRows);
    wsQ['!cols'] = [{ wch: 10 }, { wch: 50 }, { wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsQ, 'PhanTichCauHoi');
  }

  const safeTitle = assignment.title.replace(/[\\/*?:"<>|]/g, '').replace(/\s+/g, '_');
  XLSX.writeFile(wb, `KetQua_${safeTitle}_${assignment.code}.xlsx`);
}
