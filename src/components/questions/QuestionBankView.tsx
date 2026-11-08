/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Question, GradeLevel, CognitiveLevel, QuestionType } from '../../types';
import { QuestionModal } from './QuestionModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { downloadSampleExcel, downloadSampleDocx } from '../../services/fileParser';
import {
  Search,
  Plus,
  Upload,
  FileSpreadsheet,
  FileText,
  Edit2,
  Trash2,
  Lock,
  CheckCircle2,
  Filter,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

interface QuestionBankViewProps {
  onOpenImportModal: () => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({ onOpenImportModal }) => {
  const { questions, addQuestion, updateQuestion, deleteQuestion } = useApp();

  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Danh sách chủ đề duy nhất từ ngân hàng
  const allTopics = useMemo(() => {
    const set = new Set<string>();
    questions.forEach(q => {
      if (q.topic) set.add(q.topic);
    });
    return Array.from(set);
  }, [questions]);

  // Lọc câu hỏi
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (filterGrade !== 'all' && q.grade !== filterGrade) return false;
      if (filterTopic !== 'all' && q.topic !== filterTopic) return false;
      if (filterLevel !== 'all' && q.level !== filterLevel) return false;
      if (filterType !== 'all' && q.type !== filterType) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const inContent = q.content.toLowerCase().includes(query);
        const inTopic = q.topic.toLowerCase().includes(query);
        const inOptions = q.options
          ? Object.values(q.options).some(v => v?.toLowerCase().includes(query))
          : false;
        return inContent || inTopic || inOptions;
      }

      return true;
    });
  }, [questions, filterGrade, filterTopic, filterLevel, filterType, search]);

  const totalPages = Math.ceil(filteredQuestions.length / pageSize) || 1;
  const paginatedQuestions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, page]);

  const handleEditClick = (q: Question) => {
    setEditingQuestion(q);
    setIsQuestionModalOpen(true);
  };

  const handleCreateClick = () => {
    setEditingQuestion(null);
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = (qData: any) => {
    if (editingQuestion) {
      updateQuestion(qData);
    } else {
      addQuestion(qData);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      deleteQuestion(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Tiêu đề & Nút thao tác hàng đầu */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Ngân hàng câu hỏi Công nghệ
          </h1>
          <p className="text-sm text-slate-500">
            Tổng cộng: <strong className="text-slate-800">{questions.length}</strong> câu hỏi chuẩn CT GDPT 2018 (Công nghiệp).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Nút Tải file câu hỏi (LỚN, NỔI BẬT) */}
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
          >
            <Upload className="w-4 h-4" />
            <span>📂 Tải file câu hỏi</span>
          </button>

          {/* Nút Thêm câu hỏi thủ công */}
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm thủ công</span>
          </button>

          {/* Tải mẫu */}
          <div className="hidden sm:flex items-center gap-1.5 border border-slate-200 bg-white rounded-xl p-1">
            <button
              onClick={downloadSampleExcel}
              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1"
              title="Tải file mẫu Excel"
            >
              <FileSpreadsheet className="w-4 h-4" /> Mẫu Excel
            </button>
            <span className="text-slate-200">|</span>
            <button
              onClick={downloadSampleDocx}
              className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-semibold flex items-center gap-1"
              title="Tải file mẫu Word"
            >
              <FileText className="w-4 h-4" /> Mẫu Word
            </button>
          </div>
        </div>
      </div>

      {/* BỘ LỌC & TÌM KIẾM */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm kiếm nội dung câu hỏi, chủ đề hoặc phương án..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Lọc Lớp */}
          <select
            value={filterGrade}
            onChange={e => {
              setFilterGrade(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">Tất cả các lớp</option>
            <option value="10">Lớp 10 (Thiết kế & Công nghệ)</option>
            <option value="11">Lớp 11 (Cơ khí & ĐCĐT)</option>
            <option value="12">Lớp 12 (Điện - Điện tử)</option>
          </select>

          {/* Lọc Loại câu */}
          <select
            value={filterType}
            onChange={e => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="all">Tất cả dạng câu</option>
            <option value="TN">Trắc nghiệm (4 LC)</option>
            <option value="DS">Đúng / Sai (4 ý)</option>
            <option value="TLN">Trả lời ngắn</option>
            <option value="TL">Tự luận</option>
          </select>
        </div>

        {/* Hàng 2 bộ lọc: Mức độ & Chủ đề */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Mức độ:
          </span>
          {['all', 'Biet', 'Hieu', 'VanDung'].map(lvl => (
            <button
              key={lvl}
              onClick={() => {
                setFilterLevel(lvl);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filterLevel === lvl
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lvl === 'all'
                ? 'Tất cả'
                : lvl === 'Biet'
                ? 'Nhận biết'
                : lvl === 'Hieu'
                ? 'Thông hiểu'
                : 'Vận dụng'}
            </button>
          ))}

          {allTopics.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-slate-500 font-medium">Chủ đề:</span>
              <select
                value={filterTopic}
                onChange={e => {
                  setFilterTopic(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
              >
                <option value="all">Tất cả chủ đề ({allTopics.length})</option>
                {allTopics.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* DANH SÁCH CÂU HỎI */}
      {filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy câu hỏi phù hợp</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            Hãy thử thay đổi bộ lọc tìm kiếm hoặc bấm nút bên dưới để tải thêm câu hỏi vào ngân hàng.
          </p>
          <button
            onClick={onOpenImportModal}
            className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-xs"
          >
            Tải file câu hỏi ngay
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedQuestions.map((q, idx) => {
            const globalIndex = (page - 1) * pageSize + idx + 1;

            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                      <span className="font-extrabold text-blue-700 font-mono">
                        Câu {globalIndex}
                      </span>
                      <span className="font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                        Lớp {q.grade}
                      </span>
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {q.type === 'TN'
                          ? 'Trắc nghiệm 4 LC'
                          : q.type === 'DS'
                          ? 'Đúng / Sai'
                          : q.type === 'TLN'
                          ? 'Trả lời ngắn'
                          : 'Tự luận'}
                      </span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-md ${
                          q.level === 'Biet'
                            ? 'bg-emerald-50 text-emerald-700'
                            : q.level === 'Hieu'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {q.level === 'Biet' ? 'Nhận biết' : q.level === 'Hieu' ? 'Thông hiểu' : 'Vận dụng'}
                      </span>
                      <span className="text-slate-500">· {q.topic}</span>

                      {q.lockOptionOrder && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" /> Cố định đáp án
                        </span>
                      )}

                      {q.isDemo && (
                        <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                          DEMO
                        </span>
                      )}

                      <span className="ml-auto text-slate-600 font-mono font-bold">
                        {q.points || 0.25} điểm
                      </span>
                    </div>

                    {/* Nội dung câu hỏi */}
                    <div className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
                      {q.content}
                    </div>

                    {/* Ảnh minh họa nếu có */}
                    {q.imageUrl && (
                      <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-sm">
                        <img
                          src={q.imageUrl}
                          alt="Minh họa câu hỏi"
                          className="max-h-48 rounded-lg object-contain"
                        />
                      </div>
                    )}

                    {/* Phương án trắc nghiệm */}
                    {q.type === 'TN' && q.options && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {(['A', 'B', 'C', 'D'] as const).map(letter => {
                          const text = q.options?.[letter];
                          if (!text) return null;
                          const isCorrect = q.correctOption === letter;

                          return (
                            <div
                              key={letter}
                              className={`p-2 rounded-xl border flex items-start gap-2 ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-semibold'
                                  : 'border-slate-200 bg-slate-50/60 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {letter}
                              </span>
                              <span className="flex-1">{text}</span>
                              {isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Dạng Đúng / Sai 4 ý */}
                    {q.type === 'DS' && q.subQuestions && (
                      <div className="mt-3 space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                        {q.subQuestions.map(sq => (
                          <div key={sq.label} className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-800">
                              <strong className="text-slate-900">{sq.label})</strong> {sq.content}
                            </span>
                            <span
                              className={`px-2 py-0.5 font-bold rounded ${
                                sq.isCorrect
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {sq.isCorrect ? 'ĐÚNG' : 'SAI'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Dạng Trả lời ngắn */}
                    {q.type === 'TLN' && (
                      <div className="mt-2 text-xs bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-200">
                        Đáp án được chấp nhận: <strong className="font-mono">{q.shortAnswer}</strong>
                      </div>
                    )}

                    {/* Dạng Tự luận */}
                    {q.type === 'TL' && q.essayGuide && (
                      <div className="mt-2 text-xs bg-slate-50 text-slate-700 p-2.5 rounded-xl border border-slate-200 whitespace-pre-line">
                        <strong>Hướng dẫn chấm:</strong> {q.essayGuide}
                      </div>
                    )}

                    {/* Lời giải */}
                    {q.explanation && (
                      <div className="mt-2 text-xs text-slate-500 italic">
                        💡 <strong>Lời giải:</strong> {q.explanation}
                      </div>
                    )}
                  </div>

                  {/* Nút Sửa / Xóa */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditClick(q)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(q.id)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Xóa câu hỏi khỏi ngân hàng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PHÂN TRANG */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-xs text-slate-500">
            Hiển thị <strong>{paginatedQuestions.length}</strong> trên{' '}
            <strong>{filteredQuestions.length}</strong> câu
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50"
            >
              Trang trước
            </button>
            <span className="text-xs font-bold text-slate-700 px-2 font-mono">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA CÂU HỎI */}
      <QuestionModal
        isOpen={isQuestionModalOpen}
        questionToEdit={editingQuestion}
        onSave={handleSaveQuestion}
        onClose={() => {
          setIsQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
      />

      {/* MODAL XÁC NHẬN XÓA */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        title="Xóa câu hỏi khỏi ngân hàng?"
        message="Hành động này sẽ xóa câu hỏi và đồng bộ xóa lên Google Sheet. Bạn có chắc chắn muốn xóa không?"
        confirmLabel="Xóa câu hỏi"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};
