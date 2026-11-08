/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Assignment } from '../../types';
import { ShareModal } from './ShareModal';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Send,
  Plus,
  QrCode,
  Play,
  BarChart3,
  Trash2,
  Clock,
  CheckCircle2,
  Users,
  Copy,
  Calendar,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react';

interface AssignmentManagerViewProps {
  onOpenStudentTest: (code: string) => void;
}

export const AssignmentManagerView: React.FC<AssignmentManagerViewProps> = ({ onOpenStudentTest }) => {
  const { exams, classes, assignments, createAssignment, updateAssignment, deleteAssignment, submissions, setActiveTab } = useApp();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(exams[0]?.id || '');
  const [title, setTitle] = useState('');
  const [targetClass, setTargetClass] = useState('Tất cả');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [openAt, setOpenAt] = useState(new Date().toISOString().slice(0, 16));
  const [closeAt, setCloseAt] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [shuffleForStudent, setShuffleForStudent] = useState(true);
  const [allowReviewAfterSubmit, setAllowReviewAfterSubmit] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(1);

  // Modal chia sẻ QR
  const [sharingAssign, setSharingAssign] = useState<Assignment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const exam = exams.find(ex => ex.id === selectedExamId) || exams[0];
    if (!exam) {
      alert('Vui lòng chọn 1 đề thi!');
      return;
    }

    const assignTitle = title.trim() || `Kiểm tra Online: ${exam.title}`;

    createAssignment({
      title: assignTitle,
      examId: exam.id,
      targetClass,
      durationMinutes: durationMinutes || exam.durationMinutes,
      openAt: new Date(openAt).toISOString(),
      closeAt: new Date(closeAt).toISOString(),
      maxAttempts,
      shuffleForStudent,
      allowReviewAfterSubmit,
      status: 'open',
    });

    setIsCreateOpen(false);
    setTitle('');
  };

  const handleToggleStatus = (assign: Assignment) => {
    const nextStatus = assign.status === 'open' ? 'closed' : 'open';
    updateAssignment({ ...assign, status: nextStatus });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Tiêu đề & Nút Tạo bài giao */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Giao bài kiểm tra trực tuyến
          </h1>
          <p className="text-sm text-slate-500">
            Học sinh làm bài trên điện thoại hoặc máy tính. Tự động chấm điểm, tính thời gian và chống gian lận thoát tab.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
        >
          <Plus className="w-4 h-4" /> Giao bài mới cho lớp
        </button>
      </div>

      {/* FORM TẠO BÀI GIAO MỚI */}
      {isCreateOpen && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500 p-6 sm:p-8 shadow-lg space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              Thiết lập bài kiểm tra online mới
            </h3>
            <button
              onClick={() => setIsCreateOpen(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700"
            >
              Đóng form
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Chọn đề thi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn đề thi đã tạo
                </label>
                <select
                  value={selectedExamId}
                  onChange={e => {
                    setSelectedExamId(e.target.value);
                    const ex = exams.find(x => x.id === e.target.value);
                    if (ex) {
                      setTitle(`Kiểm tra Online: ${ex.title}`);
                      setDurationMinutes(ex.durationMinutes);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} (Lớp {ex.grade} - {ex.questions.length} câu)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tên bài giao */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên bài kiểm tra (Hiển thị cho học sinh)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Kiểm tra Online Giữa kì I..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Lớp nhận */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lớp được làm bài
                </label>
                <select
                  value={targetClass}
                  onChange={e => setTargetClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="Tất cả">Tất cả các lớp</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>
                      Lớp {c.name} ({c.grade})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thời gian làm bài (Phút)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(parseInt(e.target.value) || 45)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thời điểm mở bài
                </label>
                <input
                  type="datetime-local"
                  value={openAt}
                  onChange={e => setOpenAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thời điểm đóng bài
                </label>
                <input
                  type="datetime-local"
                  value={closeAt}
                  onChange={e => setCloseAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Checkbox tùy chọn */}
            <div className="pt-2 flex flex-wrap gap-6 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={shuffleForStudent}
                  onChange={e => setShuffleForStudent(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Xáo thứ tự câu và đáp án riêng cho từng học sinh</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={allowReviewAfterSubmit}
                  onChange={e => setAllowReviewAfterSubmit(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Cho phép học sinh xem đáp án và giải thích sau khi nộp</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Phát hành bài kiểm tra
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DANH SÁCH BÀI KIỂM TRA ĐÃ GIAO */}
      <div className="space-y-4">
        {assignments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Send className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Chưa có bài kiểm tra online nào</h3>
            <p className="mt-1 text-sm text-slate-500">
              Bấm nút "Giao bài mới cho lớp" để phát hành bài kiểm tra có mã QR cho học sinh.
            </p>
          </div>
        ) : (
          assignments.map(assign => {
            const assignSubmissions = submissions.filter(s => s.assignmentId === assign.id || s.assignmentCode === assign.code);
            const isOpen = assign.status === 'open';

            return (
              <div
                key={assign.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs hover:shadow-xs transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold text-slate-900">{assign.title}</span>
                      <span className="font-mono text-sm font-extrabold px-3 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                        MÃ: {assign.code}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isOpen
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {isOpen ? 'Đang mở làm bài' : 'Đã khóa bài'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span>Lớp: <strong className="text-slate-800">{assign.targetClass}</strong></span>
                      <span>·</span>
                      <span>Thời gian: <strong className="text-slate-800">{assign.durationMinutes} phút</strong></span>
                      <span>·</span>
                      <span>Đã nộp: <strong className="text-emerald-700 font-mono text-sm">{assignSubmissions.length}</strong> bài</span>
                      <span>·</span>
                      <span>
                        Hạn chót: {new Date(assign.closeAt).toLocaleDateString('vi-VN')} {new Date(assign.closeAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* CÁC NÚT THAO TÁC */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Lấy link & QR */}
                    <button
                      onClick={() => setSharingAssign(assign)}
                      className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition"
                      title="Mở mã QR và Link chia sẻ cho học sinh"
                    >
                      <QrCode className="w-4 h-4" /> Link & QR
                    </button>

                    {/* Thử làm bài */}
                    <button
                      onClick={() => onOpenStudentTest(assign.code)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                      title="Mở giao diện học sinh để làm thử"
                    >
                      <Play className="w-4 h-4" /> Làm thử
                    </button>

                    {/* Xem bảng điểm bài này */}
                    <button
                      onClick={() => setActiveTab('results')}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <BarChart3 className="w-4 h-4 text-blue-600" /> Bảng điểm ({assignSubmissions.length})
                    </button>

                    {/* Khóa / Mở bài */}
                    <button
                      onClick={() => handleToggleStatus(assign)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                      title={isOpen ? 'Khóa bài thi (dừng nhận bài)' : 'Mở lại bài thi'}
                    >
                      {isOpen ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
                    </button>

                    {/* Xóa bài giao */}
                    <button
                      onClick={() => setDeleteConfirmId(assign.id)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Xóa bài giao"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL MÃ QR & LINK CHIA SẺ */}
      <ShareModal
        isOpen={Boolean(sharingAssign)}
        assignment={sharingAssign}
        onOpenStudentTest={onOpenStudentTest}
        onClose={() => setSharingAssign(null)}
      />

      {/* MODAL XÁC NHẬN XÓA BÀI GIAO */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        title="Xóa bài kiểm tra online?"
        message="Hành động này sẽ xóa bài kiểm tra và link học sinh làm bài. Bạn có chắc chắn không?"
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteAssignment(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};
