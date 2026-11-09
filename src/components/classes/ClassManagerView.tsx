/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { ClassGroup, Student, GradeLevel } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  GraduationCap,
  Plus,
  Upload,
  Users,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Calendar,
  Award,
  Search,
} from 'lucide-react';

export const ClassManagerView: React.FC = () => {
  const {
    classes,
    students,
    submissions,
    assignments,
    addClassGroup,
    updateClassGroup,
    deleteClassGroup,
    addStudent,
    importStudents,
    deleteStudent,
    settings,
  } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [searchStudent, setSearchStudent] = useState('');

  // Form thêm lớp
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<GradeLevel>('11');
  const [newClassNote, setNewClassNote] = useState('');

  // Form thêm học sinh
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentDob, setNewStudentDob] = useState('');
  const [newStudentGender, setNewStudentGender] = useState('Nam');

  const [deleteClassConfirmId, setDeleteClassConfirmId] = useState<string | null>(null);
  const [deleteStudentConfirmId, setDeleteStudentConfirmId] = useState<string | null>(null);

  const selectedClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => {
      const matchClass = s.className.toLowerCase() === selectedClass.name.toLowerCase();
      if (!matchClass) return false;
      if (searchStudent.trim()) {
        return s.name.toLowerCase().includes(searchStudent.toLowerCase());
      }
      return true;
    });
  }, [students, selectedClass, searchStudent]);

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    addClassGroup({
      name: newClassName.trim().toUpperCase(),
      grade: newClassGrade,
      academicYear: settings.schoolYear || '2026 - 2027',
      note: newClassNote,
    });

    setNewClassName('');
    setNewClassNote('');
    setIsAddClassOpen(false);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !selectedClass) return;

    addStudent({
      className: selectedClass.name,
      name: newStudentName.trim(),
      birthDate: newStudentDob,
      gender: newStudentGender,
    });

    setNewStudentName('');
    setNewStudentDob('');
    setIsAddStudentOpen(false);
  };

  // Nhập danh sách học sinh từ file Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClass) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 2) {
        alert('File không có dữ liệu học sinh.');
        return;
      }

      const list: any[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row[1]) continue;
        const name = String(row[1]).trim();
        const dob = row[2] ? String(row[2]).trim() : '';
        const gender = row[3] ? String(row[3]).trim() : 'Nam';

        list.push({
          className: selectedClass.name,
          name,
          birthDate: dob,
          gender,
        });
      }

      if (list.length > 0) {
        importStudents(list);
      } else {
        alert('Không tìm thấy họ tên học sinh ở cột thứ 2 trong file.');
      }
    } catch (err: any) {
      alert(`Lỗi đọc file Excel: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Tiêu đề trang */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản lý Lớp học & Học sinh
          </h1>
          <p className="text-sm text-slate-500">
            Tạo danh sách lớp, nhập học sinh từ Excel và theo dõi lịch sử điểm kiểm tra định kì.
          </p>
        </div>

        <button
          onClick={() => setIsAddClassOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> Thêm lớp học mới
        </button>
      </div>

      {/* FORM THÊM LỚP HỌC MỚI */}
      {isAddClassOpen && (
        <form onSubmit={handleCreateClass} className="bg-white p-6 rounded-3xl border border-blue-200 shadow-sm space-y-4 animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-900">Thêm lớp học mới</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tên lớp</label>
              <input
                type="text"
                required
                placeholder="VD: 11A1, 12B3..."
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp</label>
              <select
                value={newClassGrade}
                onChange={e => setNewClassGrade(e.target.value as GradeLevel)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="10">Khối 10</option>
                <option value="11">Khối 11</option>
                <option value="12">Khối 12</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label>
              <input
                type="text"
                placeholder="VD: Ban tự nhiên..."
                value={newClassNote}
                onChange={e => setNewClassNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddClassOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Tạo lớp
            </button>
          </div>
        </form>
      )}

      {classes.length === 0 && !isAddClassOpen && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Chưa có lớp học nào trong hệ thống</h3>
          <p className="text-sm text-slate-500 mb-6">
            Bấm nút bên dưới để tạo lớp học đầu tiên, sau đó bạn có thể thêm học sinh hoặc nhập danh sách học sinh từ file Excel.
          </p>
          <button
            onClick={() => setIsAddClassOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm lớp học đầu tiên ngay
          </button>
        </div>
      )}

      {/* DANH SÁCH CÁC THẺ LỚP */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {classes.map(c => {
          const isSelected = selectedClass?.id === c.id;
          const count = students.filter(s => s.className.toLowerCase() === c.name.toLowerCase()).length;

          return (
            <button
              key={c.id}
              onClick={() => setSelectedClassId(c.id)}
              className={`p-4 rounded-2xl border text-left shrink-0 min-w-[160px] transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Khối {c.grade}</span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  {count} HS
                </span>
              </div>
              <div className="mt-2 text-xl font-extrabold text-slate-900">{c.name}</div>
              <p className="mt-1 text-[11px] text-slate-500 truncate">{c.note || `Năm học ${settings.schoolYear || '2026 - 2027'}`}</p>
            </button>
          );
        })}
      </div>

      {/* CHI TIẾT DANH SÁCH HỌC SINH CỦA LỚP ĐƯỢC CHỌN */}
      {selectedClass && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Danh sách học sinh lớp {selectedClass.name} ({classStudents.length} học sinh)
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" /> Nhập từ Excel
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" />
              </label>

              <button
                onClick={() => setIsAddStudentOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm học sinh
              </button>

              <button
                onClick={() => setDeleteClassConfirmId(selectedClass.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                title="Xóa lớp học này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* FORM THÊM HỌC SINH */}
          {isAddStudentOpen && (
            <form onSubmit={handleCreateStudent} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-slate-900">Thêm học sinh vào lớp {selectedClass.name}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Họ và tên học sinh..."
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={newStudentDob}
                    onChange={e => setNewStudentDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <select
                    value={newStudentGender}
                    onChange={e => setNewStudentGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Lưu học sinh
                </button>
              </div>
            </form>
          )}

          {/* BẢNG HỌC SINH */}
          {classStudents.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Chưa có học sinh nào trong lớp {selectedClass.name}. Bấm "Thêm học sinh" hoặc "Nhập từ Excel".
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3 border-b">STT</th>
                    <th className="p-3 border-b">Họ và tên</th>
                    <th className="p-3 border-b">Ngày sinh</th>
                    <th className="p-3 border-b">Giới tính</th>
                    <th className="p-3 border-b text-center">Lịch sử điểm kiểm tra</th>
                    <th className="p-3 border-b text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((s, idx) => {
                    const studentSubs = submissions.filter(
                      sub => sub.studentName.toLowerCase().trim() === s.name.toLowerCase().trim()
                    );

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{s.name}</td>
                        <td className="p-3 text-slate-600">{s.birthDate || 'Chưa có'}</td>
                        <td className="p-3 text-slate-600">{s.gender || 'Nam'}</td>
                        <td className="p-3 text-center">
                          {studentSubs.length === 0 ? (
                            <span className="text-slate-400">Chưa có bài thi nào</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {studentSubs.map(sub => (
                                <span
                                  key={sub.id}
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                    sub.score >= 8
                                      ? 'bg-purple-100 text-purple-800'
                                      : sub.score >= 5
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                  title={`${sub.assignmentTitle}: ${sub.score} điểm`}
                                >
                                  {sub.score}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setDeleteStudentConfirmId(s.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONFIRM MODAL XÓA LỚP */}
      <ConfirmModal
        isOpen={Boolean(deleteClassConfirmId)}
        title="Xóa lớp học?"
        message="Hành động này sẽ xóa lớp học và đồng bộ lên Google Sheet. Bạn có chắc chắn không?"
        onConfirm={() => {
          if (deleteClassConfirmId) {
            deleteClassGroup(deleteClassConfirmId);
            setDeleteClassConfirmId(null);
          }
        }}
        onCancel={() => setDeleteClassConfirmId(null)}
      />

      {/* CONFIRM MODAL XÓA HỌC SINH */}
      <ConfirmModal
        isOpen={Boolean(deleteStudentConfirmId)}
        title="Xóa học sinh?"
        message="Bạn có chắc chắn muốn xóa học sinh này khỏi danh sách lớp không?"
        onConfirm={() => {
          if (deleteStudentConfirmId) {
            deleteStudent(deleteStudentConfirmId);
            setDeleteStudentConfirmId(null);
          }
        }}
        onCancel={() => setDeleteStudentConfirmId(null)}
      />
    </div>
  );
};
