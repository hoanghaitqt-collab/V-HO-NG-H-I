/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Question, GradeLevel, CognitiveLevel, QuestionType } from '../../types';
import {
  parseExcelFile,
  parseDocxFile,
  parseTextOrHtmlContent,
  downloadSampleExcel,
  downloadSampleDocx,
} from '../../services/fileParser';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle,
  Download,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onImport: (questions: Question[]) => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onImport, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [parseErrors, setParseErrors] = useState<{ line: number; message: string }[]>([]);

  // Các thiết lập mặc định nếu file thiếu
  const [defaultGrade, setDefaultGrade] = useState<GradeLevel>('11');
  const [defaultTopic, setDefaultTopic] = useState<string>('Cơ khí & Động cơ đốt trong');

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);
    setParseErrors([]);
    setParsedQuestions([]);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let res;

      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        res = await parseExcelFile(file, defaultGrade, defaultTopic);
      } else if (ext === 'docx') {
        res = await parseDocxFile(file, defaultGrade, defaultTopic);
      } else if (ext === 'txt') {
        const text = await file.text();
        res = parseTextOrHtmlContent(text, defaultGrade, defaultTopic);
      } else {
        alert('Định dạng file không hỗ trợ. Vui lòng chọn file .docx, .xlsx, .csv hoặc .txt');
        setIsLoading(false);
        return;
      }

      setParsedQuestions(res.questions);
      setParseErrors(res.errors);
      setSelectedIds(new Set(res.questions.map(q => q.id)));
    } catch (err: any) {
      console.error(err);
      setParseErrors([{ line: 0, message: `Không thể đọc file: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === parsedQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parsedQuestions.map(q => q.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleRemoveQuestion = (id: string) => {
    setParsedQuestions(prev => prev.filter(q => q.id !== id));
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
  };

  const handleUpdateItem = (id: string, updates: Partial<Question>) => {
    setParsedQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, ...updates, updatedAt: Date.now() } : q))
    );
  };

  const handleBatchTagGrade = (g: GradeLevel) => {
    setParsedQuestions(prev =>
      prev.map(q => (selectedIds.has(q.id) ? { ...q, grade: g } : q))
    );
  };

  const handleBatchTagLevel = (l: CognitiveLevel) => {
    setParsedQuestions(prev =>
      prev.map(q => (selectedIds.has(q.id) ? { ...q, level: l } : q))
    );
  };

  const handleFinalSave = () => {
    const toSave = parsedQuestions.filter(q => selectedIds.has(q.id));
    if (toSave.length === 0) {
      alert('Chưa có câu hỏi nào được chọn để lưu!');
      return;
    }
    onImport(toSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-6 flex flex-col max-h-[92vh]">
        {/* Tiêu đề & Tải file mẫu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Tải file câu hỏi vào ngân hàng
            </h3>
            <p className="text-xs text-slate-500">
              Hỗ trợ file Word (.docx), Excel (.xlsx, .csv) và Text (.txt). Tự động phân loại và nhận diện đáp án.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadSampleExcel}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition"
              title="Tải file mẫu Excel chuẩn để soạn câu hỏi"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Mẫu Excel (.xlsx)
            </button>
            <button
              onClick={downloadSampleDocx}
              className="px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition"
              title="Tải file mẫu Word chuẩn"
            >
              <FileText className="w-3.5 h-3.5" /> Mẫu Word (.docx)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Khu vực kéo thả file */}
        {parsedQuestions.length === 0 && (
          <div className="my-6">
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50 scale-101'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Upload className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">
                Kéo và thả file câu hỏi vào đây
              </h4>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                Chấp nhận file Word (.docx), Excel (.xlsx, .csv) hoặc Text (.txt).
              </p>

              <label className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md cursor-pointer transition">
                <Upload className="w-4 h-4" />
                Chọn file từ máy tính
                <input
                  type="file"
                  accept=".docx,.xlsx,.xls,.csv,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>

              {/* Tùy chọn mặc định */}
              <div className="mt-6 pt-6 border-t border-slate-200/60 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
                <span>Gán mặc định nếu file thiếu:</span>
                <select
                  value={defaultGrade}
                  onChange={e => setDefaultGrade(e.target.value as GradeLevel)}
                  className="px-2 py-1 rounded-lg border border-slate-300 font-semibold"
                >
                  <option value="10">Lớp 10</option>
                  <option value="11">Lớp 11</option>
                  <option value="12">Lớp 12</option>
                </select>
                <input
                  type="text"
                  value={defaultTopic}
                  onChange={e => setDefaultTopic(e.target.value)}
                  placeholder="Chủ đề mặc định..."
                  className="px-2 py-1 rounded-lg border border-slate-300 max-w-[200px]"
                />
              </div>
            </div>

            {isLoading && (
              <div className="mt-4 text-center text-sm font-semibold text-blue-600 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Đang đọc và phân tích cấu trúc câu hỏi...
              </div>
            )}
          </div>
        )}

        {/* BẢNG BÁO LỖI ĐỊNH DẠNG THEO DÒNG */}
        {parseErrors.length > 0 && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <div className="font-bold flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Báo cáo lỗi định dạng ({parseErrors.length} phát hiện):
            </div>
            <ul className="list-disc list-inside space-y-1 max-h-24 overflow-y-auto">
              {parseErrors.map((err, idx) => (
                <li key={idx}>
                  {err.line > 0 ? `Dòng/Câu ${err.line}: ` : ''}
                  {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* BẢNG XEM TRƯỚC VÀ RÀ SOÁT CÂU HỎI */}
        {parsedQuestions.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Thanh công cụ rà soát hàng loạt */}
            <div className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 px-4 rounded-2xl border border-slate-200 mb-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-blue-600"
                >
                  {selectedIds.size === parsedQuestions.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  Chọn tất cả ({selectedIds.size}/{parsedQuestions.length})
                </button>
                <span className="text-slate-400">|</span>
                <span className="font-medium text-slate-600 truncate max-w-xs">
                  File: <strong className="text-slate-900">{fileName}</strong>
                </span>
              </div>

              {/* Gắn nhãn hàng loạt */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Gán nhanh câu đã chọn:</span>
                <select
                  onChange={e => e.target.value && handleBatchTagGrade(e.target.value as GradeLevel)}
                  className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="">Lớp...</option>
                  <option value="10">Lớp 10</option>
                  <option value="11">Lớp 11</option>
                  <option value="12">Lớp 12</option>
                </select>

                <select
                  onChange={e => e.target.value && handleBatchTagLevel(e.target.value as CognitiveLevel)}
                  className="px-2 py-1 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="">Mức độ...</option>
                  <option value="Biet">Nhận biết</option>
                  <option value="Hieu">Thông hiểu</option>
                  <option value="VanDung">Vận dụng</option>
                </select>

                <button
                  onClick={() => {
                    setParsedQuestions([]);
                    setFileName('');
                  }}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 underline"
                >
                  Chọn file khác
                </button>
              </div>
            </div>

            {/* Danh sách rà soát */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {parsedQuestions.map((q, idx) => {
                const isSelected = selectedIds.has(q.id);
                return (
                  <div
                    key={q.id}
                    className={`p-4 transition-colors ${
                      isSelected ? 'bg-white' : 'bg-slate-50/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(q.id)}
                        className="mt-1 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        {/* Hàng nhãn & chỉnh sửa nhanh */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-bold text-slate-800 text-xs">
                            Câu {idx + 1}
                          </span>

                          <select
                            value={q.grade}
                            onChange={e => handleUpdateItem(q.id, { grade: e.target.value as GradeLevel })}
                            className="px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200 bg-slate-100"
                          >
                            <option value="10">Lớp 10</option>
                            <option value="11">Lớp 11</option>
                            <option value="12">Lớp 12</option>
                          </select>

                          <select
                            value={q.type}
                            onChange={e => handleUpdateItem(q.id, { type: e.target.value as QuestionType })}
                            className="px-2 py-0.5 rounded text-[11px] font-bold border border-blue-200 bg-blue-50 text-blue-700"
                          >
                            <option value="TN">TN 4 LC</option>
                            <option value="DS">Đúng / Sai</option>
                            <option value="TLN">Trả lời ngắn</option>
                            <option value="TL">Tự luận</option>
                          </select>

                          <select
                            value={q.level}
                            onChange={e => handleUpdateItem(q.id, { level: e.target.value as CognitiveLevel })}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-200 bg-purple-50 text-purple-700"
                          >
                            <option value="Biet">Nhận biết</option>
                            <option value="Hieu">Thông hiểu</option>
                            <option value="VanDung">Vận dụng</option>
                          </select>

                          <input
                            type="text"
                            value={q.topic}
                            onChange={e => handleUpdateItem(q.id, { topic: e.target.value })}
                            placeholder="Chủ đề..."
                            className="px-2 py-0.5 text-xs border border-slate-200 rounded max-w-[180px]"
                          />
                        </div>

                        {/* Nội dung câu hỏi có thể sửa trực tiếp */}
                        <textarea
                          rows={2}
                          value={q.content}
                          onChange={e => handleUpdateItem(q.id, { content: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 font-medium"
                        />

                        {/* Chi tiết đáp án */}
                        {q.type === 'TN' && q.options && (
                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            {(['A', 'B', 'C', 'D'] as const).map(k => (
                              <div
                                key={k}
                                onClick={() => handleUpdateItem(q.id, { correctOption: k })}
                                className={`p-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer ${
                                  q.correctOption === k
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                                    : 'border-slate-200 bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span className="font-extrabold">{k}.</span>
                                <span className="truncate">{q.options?.[k] || ''}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'DS' && q.subQuestions && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                            {q.subQuestions.map(sq => (
                              <div
                                key={sq.label}
                                className="flex items-center justify-between p-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                              >
                                <span className="font-medium truncate mr-2">
                                  {sq.label}) {sq.content}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                    sq.isCorrect
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  {sq.isCorrect ? 'Đ' : 'S'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'TLN' && (
                          <div className="mt-1.5 text-xs text-amber-700">
                            Đáp án chấp nhận:{' '}
                            <strong className="font-mono">{q.shortAnswer || '(chưa có)'}</strong>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Xóa câu này khỏi danh sách nhập"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nút lưu câu hỏi vào ngân hàng */}
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Đã chọn <strong className="text-blue-600">{selectedIds.size}</strong> trên tổng số{' '}
                <strong>{parsedQuestions.length}</strong> câu
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleFinalSave}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Lưu {selectedIds.size} câu vào Ngân hàng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
