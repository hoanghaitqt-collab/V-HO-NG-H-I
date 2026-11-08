/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { RefreshCw, PlayCircle, Settings, ShieldCheck, AlertCircle } from 'lucide-react';

interface HeaderProps {
  onOpenStudentTest: (code?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenStudentTest }) => {
  const {
    settings,
    syncState,
    lastSyncTime,
    syncQueueCount,
    triggerSync,
    setActiveTab,
    assignments,
  } = useApp();

  const activeAssign = assignments.find(a => a.status === 'open') || assignments[0];

  const renderSyncBadge = () => {
    if (syncState === 'syncing') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Đang đồng bộ Sheet...</span>
        </div>
      );
    }

    if (syncState === 'synced') {
      const timeStr = lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Đã đồng bộ {timeStr ? `(${timeStr})` : ''}</span>
        </div>
      );
    }

    if (syncState === 'error') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>Lỗi kết nối</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        <span>Chưa nối Sheet</span>
      </div>
    );
  };

  return (
    <header className="h-18 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Thông tin trường & giáo viên */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <h2 className="text-sm font-bold text-slate-900 truncate">
            {settings.schoolName || 'TRƯỜNG THPT CHUYÊN LÊ KHIẾT'}
          </h2>
          <p className="text-xs text-slate-500 truncate">
            Năm học {settings.schoolYear || '2026 - 2027'}
          </p>
        </div>
      </div>

      {/* Các nút hành động chính */}
      <div className="flex items-center gap-2.5">
        {/* Nút Làm thử giao diện học sinh */}
        <button
          onClick={() => onOpenStudentTest(activeAssign?.code || 'CN1101')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs md:text-sm hover:bg-emerald-700 active:scale-98 transition shadow-xs whitespace-nowrap"
          title="Mở giao diện làm bài như học sinh để kiểm tra đề"
        >
          <PlayCircle className="w-4 h-4 text-emerald-100" />
          <span className="hidden sm:inline">Làm thử như học sinh</span>
          <span className="sm:hidden">Làm thử</span>
        </button>

        {/* Trạng thái đồng bộ */}
        <div className="hidden md:block">{renderSyncBadge()}</div>

        {/* Nút đồng bộ nhanh */}
        <button
          onClick={() => triggerSync()}
          disabled={syncState === 'syncing'}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-xs md:text-sm transition shadow-2xs relative"
          title="Đồng bộ 2 chiều ngay với Google Sheet"
        >
          <RefreshCw className={`w-4 h-4 text-blue-600 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Đồng bộ</span>
          {syncQueueCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {syncQueueCount}
            </span>
          )}
        </button>

        {/* Nút Cài đặt */}
        <button
          onClick={() => setActiveTab('settings')}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          title="Cài đặt Google Sheet & Apps Script"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
