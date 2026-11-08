/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  FolderOpen,
  FileEdit,
  Shuffle,
  Send,
  BarChart3,
  GraduationCap,
  Settings,
  Wrench,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, questions, exams, assignments, submissions, classes } = useApp();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Trang chủ', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'questions', label: 'Ngân hàng câu hỏi', icon: <FolderOpen className="w-5 h-5" />, badge: questions.length },
    { id: 'exams', label: 'Tạo đề thi', icon: <FileEdit className="w-5 h-5" />, badge: exams.length },
    { id: 'shuffler', label: 'Xáo mã đề', icon: <Shuffle className="w-5 h-5" /> },
    { id: 'assignments', label: 'Giao bài online', icon: <Send className="w-5 h-5" />, badge: assignments.length },
    { id: 'results', label: 'Kết quả chấm thi', icon: <BarChart3 className="w-5 h-5" />, badge: submissions.length },
    { id: 'classes', label: 'Quản lý lớp học', icon: <GraduationCap className="w-5 h-5" />, badge: classes.length },
    { id: 'settings', label: 'Cài đặt & Đồng bộ', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* SIDEBAR DÀNH CHO MÁY TÍNH / TABLET */}
      <aside className="hidden lg:flex lg:flex-col w-68 bg-white border-r border-slate-200 shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight">GV Công nghệ</h1>
            <p className="text-xs text-slate-500">Định hướng Công nghiệp</p>
          </div>
        </div>

        {/* Danh sách mục điều hướng */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Chân sidebar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="text-xs text-slate-500 text-center font-medium">
            Chương trình GDPT 2018
          </div>
          <div className="text-[11px] text-slate-400 text-center mt-0.5">
            Lớp 10 · Lớp 11 · Lớp 12
          </div>
        </div>
      </aside>

      {/* THANH ĐIỀU HƯỚNG DƯỚI DÀNH CHO ĐIỆN THOẠI (Mobile Bottom Nav) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.slice(0, 5).map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="p-1 rounded-md">{item.icon}</div>
              <span className="truncate max-w-[60px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        {/* Nút thêm mở rộng menu */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[11px] font-medium transition-colors ${
            activeTab === 'settings' || activeTab === 'results' || activeTab === 'classes'
              ? 'text-blue-600 font-bold'
              : 'text-slate-500'
          }`}
        >
          <div className="p-1 rounded-md">
            <Settings className="w-5 h-5" />
          </div>
          <span>Thêm</span>
        </button>
      </div>
    </>
  );
};
