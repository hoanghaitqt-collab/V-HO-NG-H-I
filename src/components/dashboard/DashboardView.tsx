/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  FolderUp,
  FilePlus,
  Shuffle,
  Send,
  BarChart,
  Settings,
  HelpCircle,
  Play,
  ArrowRight,
  Database,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenImportModal: () => void;
  onOpenStudentTest: (code?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenImportModal, onOpenStudentTest }) => {
  const {
    setActiveTab,
    questions,
    exams,
    assignments,
    students,
    syncState,
    lastSyncTime,
    triggerSync,
    settings,
  } = useApp();

  const activeAssignments = assignments.filter(a => a.status === 'open');
  const qGrade10 = questions.filter(q => q.grade === '10').length;
  const qGrade11 = questions.filter(q => q.grade === '11').length;
  const qGrade12 = questions.filter(q => q.grade === '12').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Banner Chào mừng & Trạng thái đồng bộ */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10 pointer-events-none">
          <Database className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold backdrop-blur-xs mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Công nghệ THPT 2018 · Định hướng Công nghiệp
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Trợ lý Giáo viên Công nghệ
            </h1>
            <p className="mt-2 text-blue-100 text-base max-w-2xl leading-relaxed">
              Giải pháp toàn diện: Nhập ngân hàng câu hỏi, soạn ma trận đề thi chuẩn, xáo trộn nhiều mã đề, giao bài trực tuyến và tự động chấm điểm. Dữ liệu lưu an toàn trên Google Sheet.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shrink-0 text-right md:min-w-[240px]">
            <div className="text-xs text-blue-200 font-medium">Trạng thái Google Sheet</div>
            <div className="mt-1 flex items-center justify-end gap-2 font-bold text-sm">
              {syncState === 'synced' ? (
                <>
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-300">Đã đồng bộ</span>
                </>
              ) : syncState === 'syncing' ? (
                <>
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-spin"></span>
                  <span className="text-amber-300">Đang đồng bộ...</span>
                </>
              ) : syncState === 'error' ? (
                <>
                  <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                  <span className="text-rose-300">Lỗi kết nối</span>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                  <span className="text-blue-200">Chưa cấu hình URL</span>
                </>
              )}
            </div>
            <div className="mt-1 text-xs text-blue-200">
              {lastSyncTime
                ? `Lần cuối: ${new Date(lastSyncTime).toLocaleTimeString('vi-VN')}`
                : 'Chưa có lượt đồng bộ'}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => triggerSync()}
                className="px-3 py-1.5 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition shadow-xs"
              >
                Đồng bộ ngay
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CẢNH BÁO NẾU CHƯA CẤU HÌNH APPS SCRIPT */}
      {!settings.scriptUrl && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">
                Bạn đang sử dụng Dữ liệu DEMO dùng thử
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Dữ liệu chỉ lưu tạm trên bộ nhớ trình duyệt. Hãy dán URL Web App Google Apps Script trong phần Cài đặt để lưu vĩnh viễn trên Google Sheet của bạn.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shrink-0"
          >
            ⚙ Thiết lập kết nối
          </button>
        </div>
      )}

      {/* 6 Ô LỚN BẤM NHANH VÀO CHỨC NĂNG CHÍNH (Yêu cầu bắt buộc) */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>Chức năng chính</span>
          <span className="text-xs font-normal text-slate-500">(Bấm tối đa 2 cú nhấp để thao tác)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Tải file câu hỏi */}
          <button
            onClick={onOpenImportModal}
            className="group relative bg-white hover:bg-blue-50/50 border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-left transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FolderUp className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                Word / Excel / TXT
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              📂 Tải file câu hỏi
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Nhập nhanh ngân hàng câu hỏi từ file Word, Excel, CSV hoặc TXT. Tự động nhận diện đáp án.
            </p>
            <div className="mt-4 flex items-center text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
              Nhập câu hỏi ngay <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </button>

          {/* 2. Tạo đề */}
          <button
            onClick={() => setActiveTab('exams')}
            className="group relative bg-white hover:bg-orange-50/50 border-2 border-slate-200 hover:border-orange-500 rounded-2xl p-6 text-left transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FilePlus className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                Ma trận đề thi
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
              📝 Tạo đề kiểm tra
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Soạn đề theo ma trận chuẩn Bộ GD&ĐT (TN 4 lựa chọn, Đúng/Sai, Trả lời ngắn, Tự luận). Xuất Word (.docx).
            </p>
            <div className="mt-4 flex items-center text-sm font-semibold text-orange-600 group-hover:translate-x-1 transition-transform">
              Soạn đề mới <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </button>

          {/* 3. Xáo đề */}
          <button
            onClick={() => setActiveTab('shuffler')}
            className="group relative bg-white hover:bg-purple-50/50 border-2 border-slate-200 hover:border-purple-500 rounded-2xl p-6 text-left transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Shuffle className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                2 – 24 mã đề
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
              🔀 Xáo mã đề thi
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Xáo trộn thứ tự câu và đáp án A/B/C/D. Tự động sinh bảng đáp án chéo và bảng đối chiếu mã đề.
            </p>
            <div className="mt-4 flex items-center text-sm font-semibold text-purple-600 group-hover:translate-x-1 transition-transform">
              Bắt đầu xáo đề <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </button>

          {/* 4. Giao bài */}
          <button
            onClick={() => setActiveTab('assignments')}
            className="group relative bg-white hover:bg-emerald-50/50 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-left transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Send className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                Link & Mã QR
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              📤 Giao bài online
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Cài đặt giờ mở/đóng, hẹn giờ làm bài. Học sinh làm trực tiếp trên điện thoại/máy tính có chống gian lận tab.
            </p>
            <div className="mt-4 flex items-center text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
              Giao bài cho lớp <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </button>

          {/* 5. Kết quả */}
          <button
            onClick={() => setActiveTab('results')}
            className="group relative bg-white hover:bg-sky-50/50 border-2 border-slate-200 hover:border-sky-500 rounded-2xl p-6 text-left transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <BarChart className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 border border-sky-200">
                Chấm tự động & Biểu đồ
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
              📊 Kết quả chấm thi
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Xem phổ điểm, tỉ lệ đạt, phân tích câu khó/dễ, chấm điểm câu tự luận và xuất bảng điểm ra Excel.
            </p>
            <div className="mt-4 flex items-center text-sm font-semibold text-sky-600 group-hover:translate-x-1 transition-transform">
              Xem thống kê điểm <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </button>

          {/* 6. Cài đặt */}
          <button
            onClick={() => setActiveTab('settings')}
            className="group relative bg-white hover:bg-slate-100/50 border-2 border-slate-200 hover:border-slate-500 rounded-2xl p-6 text-left transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Settings className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Google Sheets
              </span>
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
              ⚙ Cài đặt kết nối
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              Dán URL Google Apps Script, sao chép mã Code.gs, cấu hình mã PIN và thông tin trường/giáo viên.
            </p>
            <div className="mt-4 flex items-center text-sm font-semibold text-slate-700 group-hover:translate-x-1 transition-transform">
              Mở cấu hình <ArrowRight className="w-4 h-4 ml-1.5" />
            </div>
          </button>
        </div>
      </div>

      {/* 4 THỐNG KÊ NHANH */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Thống kê nhanh hệ thống</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Ngân hàng câu hỏi</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {questions.length}
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <span>Lớp 10: {qGrade10}</span> ·
              <span>11: {qGrade11}</span> ·
              <span>12: {qGrade12}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Đề thi đã tạo</span>
              <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                <FilePlus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {exams.length}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Có sẵn ma trận & đáp án chi tiết
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Bài thi đang mở</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-emerald-600 font-mono tabular-nums">
              {activeAssignments.length}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Học sinh đang có thể vào làm bài
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Học sinh trong danh sách</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {students.length}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Đồng bộ theo danh sách các lớp
            </div>
          </div>
        </div>
      </div>

      {/* DANH SÁCH BÀI GIAO ĐANG HOẠT ĐỘNG */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Bài kiểm tra trực tuyến gần nhất</h3>
            <p className="text-xs text-slate-500">Mã bài và link làm bài gửi cho học sinh</p>
          </div>
          <button
            onClick={() => setActiveTab('assignments')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Chưa có bài kiểm tra nào được giao.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.slice(0, 3).map(assign => (
              <div key={assign.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{assign.title}</span>
                    <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      MÃ: {assign.code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Lớp: <span className="font-semibold text-slate-700">{assign.targetClass}</span> · Thời gian: {assign.durationMinutes} phút
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenStudentTest(assign.code)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Thử làm bài
                  </button>
                  <button
                    onClick={() => setActiveTab('results')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Bảng điểm
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
