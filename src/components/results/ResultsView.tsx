/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentSubmission, Assignment, Question } from '../../types';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { exportResultsToExcel } from '../../services/excelExporter';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Download,
  Search,
  Eye,
  Trash2,
  TrendingUp,
  Award,
  Users,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const ResultsView: React.FC = () => {
  const {
    assignments,
    submissions,
    questions,
    students,
    deleteSubmission,
    gradeEssay,
    updateSubmissionScore,
  } = useApp();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(
    assignments[0]?.id || ''
  );
  const [search, setSearch] = useState('');

  // Modals
  const [detailSub, setDetailSub] = useState<StudentSubmission | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const questionsMap = useMemo(() => {
    const map: Record<string, Question> = {};
    questions.forEach(q => {
      map[q.id] = q;
    });
    return map;
  }, [questions]);

  const currentAssignment = useMemo(() => {
    return assignments.find(a => a.id === selectedAssignmentId) || assignments[0];
  }, [assignments, selectedAssignmentId]);

  // Lọc các bài nộp theo bài giao đã chọn
  const filteredSubmissions = useMemo(() => {
    if (!currentAssignment) return [];
    return submissions.filter(s => {
      const matchAssign = s.assignmentId === currentAssignment.id || s.assignmentCode === currentAssignment.code;
      if (!matchAssign) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.studentName.toLowerCase().includes(q) || s.studentClass.toLowerCase().includes(q);
      }
      return true;
    });
  }, [submissions, currentAssignment, search]);

  // Thống kê điểm số
  const stats = useMemo(() => {
    if (filteredSubmissions.length === 0) {
      return { avg: 0, max: 0, min: 0, passCount: 0, passRate: 0, excCount: 0, excRate: 0 };
    }
    const scores = filteredSubmissions.map(s => s.score);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Number((sum / scores.length).toFixed(2));
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passCount = scores.filter(s => s >= 5).length;
    const passRate = Math.round((passCount / scores.length) * 100);
    const excCount = scores.filter(s => s >= 8).length;
    const excRate = Math.round((excCount / scores.length) * 100);

    return { avg, max, min, passCount, passRate, excCount, excRate };
  }, [filteredSubmissions]);

  // Dữ liệu biểu đồ phổ điểm (Histogram)
  const chartData = useMemo(() => {
    const buckets = [
      { range: '0 - 2.0', count: 0, color: '#ef4444' },
      { range: '2.1 - 4.9', count: 0, color: '#f97316' },
      { range: '5.0 - 6.4', count: 0, color: '#eab308' },
      { range: '6.5 - 7.9', count: 0, color: '#3b82f6' },
      { range: '8.0 - 10', count: 0, color: '#10b981' },
    ];

    filteredSubmissions.forEach(s => {
      const score = s.score;
      if (score < 2.05) buckets[0].count++;
      else if (score < 5.0) buckets[1].count++;
      else if (score < 6.5) buckets[2].count++;
      else if (score < 8.0) buckets[3].count++;
      else buckets[4].count++;
    });

    return buckets;
  }, [filteredSubmissions]);

  // Phân tích câu hỏi khó/dễ
  const questionItemStats = useMemo(() => {
    if (filteredSubmissions.length === 0) return [];

    const statsMap: Record<string, { total: number; correct: number; content: string }> = {};

    filteredSubmissions.forEach(sub => {
      sub.detail.forEach(d => {
        if (!statsMap[d.questionId]) {
          statsMap[d.questionId] = {
            total: 0,
            correct: 0,
            content: questionsMap[d.questionId]?.content || `Câu ${d.questionId}`,
          };
        }
        statsMap[d.questionId].total++;
        if (d.isCorrect || d.scoreEarned >= d.maxScore * 0.7) {
          statsMap[d.questionId].correct++;
        }
      });
    });

    return Object.entries(statsMap).map(([id, val], idx) => ({
      index: idx + 1,
      content: val.content,
      correctRate: Math.round((val.correct / Math.max(1, val.total)) * 100),
    }));
  }, [filteredSubmissions, questionsMap]);

  // Danh sách học sinh chưa nộp bài (đối chiếu danh sách học sinh của lớp)
  const unsubmittedStudents = useMemo(() => {
    if (!currentAssignment) return [];
    const submittedNames = new Set(filteredSubmissions.map(s => s.studentName.trim().toLowerCase()));

    let targetStudents = students;
    if (currentAssignment.targetClass !== 'Tất cả') {
      targetStudents = students.filter(s => s.className === currentAssignment.targetClass);
    }

    return targetStudents.filter(s => !submittedNames.has(s.name.trim().toLowerCase()));
  }, [students, currentAssignment, filteredSubmissions]);

  const handleExportExcel = () => {
    if (!currentAssignment) return;
    exportResultsToExcel(currentAssignment, filteredSubmissions, questionItemStats);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Tiêu đề & Chọn bài kiểm tra */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kết quả & Bảng điểm kiểm tra
          </h1>
          <p className="text-sm text-slate-500">
            Thống kê phổ điểm, phân tích độ khó câu hỏi và xuất bảng điểm Excel cho giáo viên.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Chọn bài giao */}
          <select
            value={selectedAssignmentId}
            onChange={e => setSelectedAssignmentId(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 bg-white shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            {assignments.length === 0 ? (
              <option value="">-- Chưa có bài kiểm tra nào --</option>
            ) : (
              assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.code}) - Lớp {a.targetClass}
                </option>
              ))
            )}
          </select>

          {/* Xuất Excel */}
          <button
            onClick={handleExportExcel}
            disabled={filteredSubmissions.length === 0}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Xuất Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* THẺ THỐNG KÊ NHANH */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Số bài đã nộp</span>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {filteredSubmissions.length}
          </div>
          <span className="text-[11px] text-slate-400">Học sinh đã làm</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Điểm trung bình</span>
          <div className="mt-2 text-2xl font-extrabold text-blue-700 font-mono">
            {stats.avg}
          </div>
          <span className="text-[11px] text-slate-400">Thang điểm 10</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Cao nhất / Thấp nhất</span>
          <div className="mt-2 text-xl font-extrabold text-slate-800 font-mono">
            <span className="text-emerald-600">{stats.max}</span> / <span className="text-rose-600">{stats.min}</span>
          </div>
          <span className="text-[11px] text-slate-400">Khoảng biên điểm</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Tỉ lệ Đạt (≥ 5.0)</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            {stats.passRate}%
          </div>
          <span className="text-[11px] text-slate-400">{stats.passCount} học sinh</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Tỉ lệ Giỏi (≥ 8.0)</span>
          <div className="mt-2 text-2xl font-extrabold text-purple-600 font-mono">
            {stats.excRate}%
          </div>
          <span className="text-[11px] text-slate-400">{stats.excCount} học sinh</span>
        </div>
      </div>

      {/* BIỂU ĐỒ PHỔ ĐIỂM (HISTOGRAM) & PHÂN TÍCH ĐỘ KHÓ CÂU HỎI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ cột phổ điểm */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Biểu đồ phân bố phổ điểm học sinh
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} học sinh`, 'Số lượng']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Phân tích tỷ lệ đúng từng câu (Phát hiện câu khó / dễ) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            Phân tích tỷ lệ đúng từng câu hỏi
          </h3>
          <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
            {questionItemStats.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">Chưa có dữ liệu bài nộp để phân tích.</p>
            ) : (
              questionItemStats.map(qs => (
                <div key={qs.index} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3">
                  <div className="flex-1 truncate">
                    <span className="font-bold text-slate-900 mr-1.5">Câu {qs.index}:</span>
                    <span className="text-slate-600 truncate">{qs.content}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          qs.correctRate >= 70 ? 'bg-emerald-500' : qs.correctRate >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${qs.correctRate}%` }}
                      ></div>
                    </div>
                    <span className="font-mono font-bold w-10 text-right">{qs.correctRate}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BẢNG ĐIỂM CHI TIẾT TỪNG HỌC SINH */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Danh sách học sinh đã nộp bài ({filteredSubmissions.length})
            </h3>
            <p className="text-xs text-slate-500">Bấm "Xem chi tiết" để xem bài làm và chấm điểm tự luận</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên học sinh, lớp..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Chưa có học sinh nào nộp bài cho bài kiểm tra này.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-3 border-b">STT</th>
                  <th className="p-3 border-b">Họ và tên</th>
                  <th className="p-3 border-b">Lớp</th>
                  <th className="p-3 border-b text-center">Điểm số</th>
                  <th className="p-3 border-b text-center">Thời gian làm</th>
                  <th className="p-3 border-b text-center">Rời tab</th>
                  <th className="p-3 border-b text-center">Thời điểm nộp</th>
                  <th className="p-3 border-b text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub, idx) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{sub.studentName}</td>
                    <td className="p-3 font-semibold text-slate-700">{sub.studentClass}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-extrabold text-sm ${
                          sub.score >= 8
                            ? 'bg-purple-100 text-purple-800'
                            : sub.score >= 5
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sub.score}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {Math.floor(sub.durationSeconds / 60)}m {sub.durationSeconds % 60}s
                    </td>
                    <td className="p-3 text-center">
                      {sub.tabLeavesCount > 0 ? (
                        <span className="font-bold text-rose-600 font-mono">
                          {sub.tabLeavesCount} lần
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-3 text-center text-slate-500">
                      {new Date(sub.submittedAt).toLocaleTimeString('vi-VN')} {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setDetailSub(sub)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Xem / Chấm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(sub.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Xóa bài làm này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DANH SÁCH HỌC SINH CHƯA NỘP BÀI */}
      {unsubmittedStudents.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Học sinh chưa nộp bài ({unsubmittedStudents.length} em):
            </h4>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {unsubmittedStudents.map(s => (
              <span
                key={s.id}
                className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold"
              >
                {s.name} ({s.className})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT & CHẤM ĐIỂM TỰ LUẬN */}
      <SubmissionDetailModal
        isOpen={Boolean(detailSub)}
        submission={detailSub}
        questionsMap={questionsMap}
        onGradeEssay={gradeEssay}
        onUpdateScore={updateSubmissionScore}
        onClose={() => setDetailSub(null)}
      />

      {/* MODAL XÁC NHẬN XÓA BÀI NỘP */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        title="Xóa kết quả bài thi này?"
        message="Hành động này sẽ xóa vĩnh viễn kết quả làm bài của học sinh và cập nhật lên Google Sheet. Bạn có chắc chắn không?"
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteSubmission(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};
