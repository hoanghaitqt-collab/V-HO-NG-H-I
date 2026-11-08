/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GOOGLE_APPS_SCRIPT_CODE } from '../../services/syncService';
import {
  Settings,
  Database,
  Link,
  Key,
  School,
  User,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  Code,
  ShieldCheck,
  DownloadCloud,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    checkConnection,
    triggerSync,
    fullReloadFromSheet,
    syncState,
    lastSyncTime,
    syncQueueCount,
  } = useApp();

  const [scriptUrl, setScriptUrl] = useState(settings.scriptUrl || '');
  const [sheetUrl, setSheetUrl] = useState(settings.sheetUrl || '');
  const [teacherPin, setTeacherPin] = useState(settings.teacherPin || '123456');
  const [teacherName, setTeacherName] = useState(settings.teacherName || '');
  const [schoolName, setSchoolName] = useState(settings.schoolName || 'TRƯỜNG THPT CHUYÊN LÊ KHIẾT');
  const [schoolYear, setSchoolYear] = useState(settings.schoolYear || '2026 - 2027');
  const [autoSync, setAutoSync] = useState(settings.autoSync ?? true);
  const [syncIntervalSeconds, setSyncIntervalSeconds] = useState(settings.syncIntervalSeconds || 60);

  // Sync with context settings
  React.useEffect(() => {
    if (settings.schoolName) setSchoolName(settings.schoolName);
    if (settings.schoolYear) setSchoolYear(settings.schoolYear);
  }, [settings.schoolName, settings.schoolYear]);

  // Ping test result
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Copy code state
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      scriptUrl: scriptUrl.trim(),
      sheetUrl: sheetUrl.trim(),
      teacherPin: teacherPin.trim(),
      teacherName: teacherName.trim(),
      schoolName: schoolName.trim(),
      schoolYear: schoolYear.trim(),
      autoSync,
      syncIntervalSeconds: Number(syncIntervalSeconds) || 60,
    });
  };

  const handleTestConnection = async () => {
    if (!scriptUrl.trim()) {
      setTestResult({ ok: false, message: 'Vui lòng nhập URL Google Apps Script Web App trước khi kiểm tra!' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    // Lưu tạm scriptUrl trước khi test
    updateSettings({ scriptUrl: scriptUrl.trim(), teacherPin: teacherPin.trim() });

    const res = await checkConnection();
    setTestResult(res);
    setIsTesting(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Tiêu đề */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Cài đặt & Đồng bộ Google Sheet
        </h1>
        <p className="text-sm text-slate-500">
          Toàn bộ ngân hàng câu hỏi, đề thi, bài giao và kết quả được lưu trữ duy nhất trên Google Sheet của bạn.
        </p>
      </div>

      {/* FORM CẤU HÌNH KẾT NỐI */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Database className="w-5 h-5 text-blue-600" />
          Thông số kết nối Google Sheet
        </h3>

        <div className="space-y-4">
          {/* URL Web App */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              URL Web App Apps Script (kết thúc bằng /exec) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={scriptUrl}
                onChange={e => setScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              URL nhận được sau khi bấm "Triển khai mới" (New deployment) dưới dạng Web App trên Apps Script.
            </p>
          </div>

          {/* Link Google Sheet */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Link Google Sheet (Bảng tính lưu trữ)
            </label>
            <input
              type="url"
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Mã PIN giáo viên */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mã PIN bảo mật của Giáo viên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={teacherPin}
                onChange={e => setTeacherPin(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Dùng để xác thực quyền ghi/đọc dữ liệu giáo viên (học sinh không có mã này).
              </p>
            </div>

            {/* Tự động đồng bộ */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-slate-800">Tự động đồng bộ</span>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={e => setAutoSync(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
              </label>
              <div className="text-[11px] text-slate-500 mt-2">
                Tự động kéo và đẩy các thay đổi lên Google Sheet mỗi {syncIntervalSeconds} giây.
              </div>
            </div>
          </div>
        </div>

        {/* NÚT KIỂM TRA KẾT NỐI VÀ ĐỒNG BỘ */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
            </button>

            <button
              type="button"
              onClick={() => triggerSync()}
              className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Đồng bộ ngay ({syncQueueCount} chờ)
            </button>

            <button
              type="button"
              onClick={() => fullReloadFromSheet()}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              title="Tải lại toàn bộ dữ liệu sạch từ Google Sheet"
            >
              <DownloadCloud className="w-3.5 h-3.5" /> Tải lại từ Sheet
            </button>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
          >
            Lưu cài đặt
          </button>
        </div>

        {/* KẾT QUẢ KIỂM TRA KẾT NỐI */}
        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
              testResult.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div className="flex-1">
              <span className="font-bold block text-sm">{testResult.ok ? '✅ Kết nối thành công!' : '❌ Không thể kết nối!'}</span>
              <p className="mt-1 leading-relaxed">{testResult.message}</p>
              {!testResult.ok && (
                <div className="mt-2 text-[11px] text-rose-700 bg-white/70 p-2 rounded-lg border border-rose-200">
                  <strong>Khắc phục thường gặp:</strong> Khi triển khai trên Google Apps Script, mục "Người có quyền truy cập" (Who has access) bắt buộc phải chọn là <strong>"Bất kỳ ai" (Anyone)</strong> để app có thể gọi API mà không bị chặn đăng nhập Google.
                </div>
              )}
            </div>
          </div>
        )}
      </form>

      {/* THÔNG TIN GIÁO VIÊN & TRƯỜNG HỌC (Dùng in trên đề thi) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <School className="w-5 h-5 text-purple-600" />
          Thông tin hiển thị trên đề thi & phiếu chấm
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tên trường THPT</label>
            <input
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="TRƯỜNG THPT CHUYÊN LÊ KHIẾT"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tên giáo viên</label>
            <input
              type="text"
              value={teacherName}
              onChange={e => setTeacherName(e.target.value)}
              placeholder="VD: VÕ HOÀNG HẢI"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Năm học</label>
            <input
              type="text"
              value={schoolYear}
              onChange={e => setSchoolYear(e.target.value)}
              placeholder="2026 - 2027"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* HƯỚNG DẪN CÀI ĐẶT APPS SCRIPT CHI TIẾT */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <Code className="w-5 h-5 text-sky-400" />
              Hướng dẫn cài đặt Google Apps Script (3 Bước đơn giản)
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Thực hiện 1 lần duy nhất để kết nối ứng dụng với bảng tính Google Sheet của bạn.
            </p>
          </div>

          <button
            onClick={handleCopyCode}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 shrink-0"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copiedCode ? 'Đã sao chép mã Code.gs!' : '📋 Sao chép mã Code.gs'}
          </button>
        </div>

        {/* 3 Bước */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
              1
            </span>
            <h4 className="font-bold text-sm text-sky-200">Mở Google Sheet</h4>
            <p className="text-slate-300 leading-relaxed">
              Tạo một bảng tính mới trên Google Sheet. Vào menu <strong>Tiện ích mở rộng</strong> (Extensions) → Chọn <strong>Apps Script</strong>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
              2
            </span>
            <h4 className="font-bold text-sm text-sky-200">Dán mã Code.gs</h4>
            <p className="text-slate-300 leading-relaxed">
              Bấm nút <strong>"Sao chép mã Code.gs"</strong> ở trên. Xóa sạch mã mặc định trong file Code.gs của Apps Script rồi dán mã này vào. Bấm <strong>Lưu</strong> (Ctrl + S).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
              3
            </span>
            <h4 className="font-bold text-sm text-sky-200">Triển khai Web App</h4>
            <p className="text-slate-300 leading-relaxed">
              Bấm <strong>Triển khai</strong> → <strong>Triển khai mới</strong> → Chọn loại: <strong>Ứng dụng web</strong>. Tại mục quyền truy cập: Chọn <strong>Bất kỳ ai (Anyone)</strong>. Cấp quyền và dán link vào ô URL ở trên.
            </p>
          </div>
        </div>

        {/* Xem trước mã nguồn */}
        <div className="pt-2">
          <button
            onClick={() => setShowCodePreview(!showCodePreview)}
            className="text-xs text-sky-300 hover:text-sky-200 font-semibold underline"
          >
            {showCodePreview ? 'Ẩn xem trước mã Code.gs' : 'Xem nội dung mã nguồn Code.gs'}
          </button>

          {showCodePreview && (
            <pre className="mt-3 p-4 bg-slate-950 rounded-2xl text-[11px] font-mono text-emerald-400 max-h-64 overflow-y-auto border border-slate-700">
              {GOOGLE_APPS_SCRIPT_CODE}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
