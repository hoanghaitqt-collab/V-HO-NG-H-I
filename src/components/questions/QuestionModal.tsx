/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Question, GradeLevel, CognitiveLevel, QuestionType, SubQuestionDS } from '../../types';
import { X, Check, Image as ImageIcon, Lock, HelpCircle } from 'lucide-react';

interface QuestionModalProps {
  isOpen: boolean;
  questionToEdit?: Question | null;
  onSave: (q: any) => void;
  onClose: () => void;
}

const COMMON_TOPICS = [
  'Vẽ kĩ thuật & Thiết kế',
  'Quy trình thiết kế kĩ thuật',
  'Cơ khí chế tạo & Vật liệu',
  'Cơ cấu truyền và biến đổi chuyển động',
  'Động cơ đốt trong',
  'Kĩ thuật điện',
  'Mạch điện 3 pha & Máy điện',
  'Kĩ thuật điện tử',
  'Linh kiện điện tử & Vi mạch',
  'An toàn lao động & Môi trường công nghiệp',
];

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  questionToEdit,
  onSave,
  onClose,
}) => {
  const [grade, setGrade] = useState<GradeLevel>('11');
  const [topic, setTopic] = useState<string>('Cơ khí chế tạo & Vật liệu');
  const [level, setLevel] = useState<CognitiveLevel>('Biet');
  const [type, setType] = useState<QuestionType>('TN');
  const [content, setContent] = useState<string>('');
  const [points, setPoints] = useState<number>(0.25);
  const [explanation, setExplanation] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [lockOptionOrder, setLockOptionOrder] = useState<boolean>(false);

  // TN options
  const [optA, setOptA] = useState<string>('');
  const [optB, setOptB] = useState<string>('');
  const [optC, setOptC] = useState<string>('');
  const [optD, setOptD] = useState<string>('');
  const [correctOption, setCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A');

  // DS subquestions
  const [subA, setSubA] = useState<{ content: string; isCorrect: boolean }>({ content: '', isCorrect: true });
  const [subB, setSubB] = useState<{ content: string; isCorrect: boolean }>({ content: '', isCorrect: false });
  const [subC, setSubC] = useState<{ content: string; isCorrect: boolean }>({ content: '', isCorrect: true });
  const [subD, setSubD] = useState<{ content: string; isCorrect: boolean }>({ content: '', isCorrect: false });

  // TLN short answer
  const [shortAnswer, setShortAnswer] = useState<string>('');

  // TL essay guide
  const [essayGuide, setEssayGuide] = useState<string>('');

  useEffect(() => {
    if (questionToEdit) {
      setGrade(questionToEdit.grade);
      setTopic(questionToEdit.topic);
      setLevel(questionToEdit.level);
      setType(questionToEdit.type);
      setContent(questionToEdit.content);
      setPoints(questionToEdit.points || (questionToEdit.type === 'DS' ? 1.0 : 0.25));
      setExplanation(questionToEdit.explanation || '');
      setImageUrl(questionToEdit.imageUrl || '');
      setLockOptionOrder(Boolean(questionToEdit.lockOptionOrder));

      if (questionToEdit.options) {
        setOptA(questionToEdit.options.A || '');
        setOptB(questionToEdit.options.B || '');
        setOptC(questionToEdit.options.C || '');
        setOptD(questionToEdit.options.D || '');
      }
      setCorrectOption(questionToEdit.correctOption || 'A');

      if (questionToEdit.subQuestions && questionToEdit.subQuestions.length >= 4) {
        setSubA({ content: questionToEdit.subQuestions[0].content, isCorrect: questionToEdit.subQuestions[0].isCorrect });
        setSubB({ content: questionToEdit.subQuestions[1].content, isCorrect: questionToEdit.subQuestions[1].isCorrect });
        setSubC({ content: questionToEdit.subQuestions[2].content, isCorrect: questionToEdit.subQuestions[2].isCorrect });
        setSubD({ content: questionToEdit.subQuestions[3].content, isCorrect: questionToEdit.subQuestions[3].isCorrect });
      }

      setShortAnswer(questionToEdit.shortAnswer || '');
      setEssayGuide(questionToEdit.essayGuide || '');
    } else {
      // Reset form khi tạo mới
      setContent('');
      setExplanation('');
      setImageUrl('');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setCorrectOption('A');
      setSubA({ content: '', isCorrect: true });
      setSubB({ content: '', isCorrect: false });
      setSubC({ content: '', isCorrect: true });
      setSubD({ content: '', isCorrect: false });
      setShortAnswer('');
      setEssayGuide('');
      setLockOptionOrder(false);
      setPoints(type === 'DS' ? 1.0 : 0.25);
    }
  }, [questionToEdit, isOpen]);

  // Cập nhật điểm mặc định khi đổi loại câu
  const handleTypeChange = (newType: QuestionType) => {
    setType(newType);
    if (newType === 'TN') setPoints(0.25);
    else if (newType === 'DS') setPoints(1.0);
    else if (newType === 'TLN') setPoints(0.5);
    else if (newType === 'TL') setPoints(1.5);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') {
        setImageUrl(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi!');
      return;
    }

    const payload: any = {
      grade,
      topic,
      level,
      type,
      content,
      points: Number(points) || 0.25,
      explanation,
      imageUrl,
      lockOptionOrder,
    };

    if (type === 'TN') {
      payload.options = { A: optA, B: optB, C: optC, D: optD };
      payload.correctOption = correctOption;
    } else if (type === 'DS') {
      payload.subQuestions = [
        { id: 'sub_a', label: 'a', content: subA.content, isCorrect: subA.isCorrect },
        { id: 'sub_b', label: 'b', content: subB.content, isCorrect: subB.isCorrect },
        { id: 'sub_c', label: 'c', content: subC.content, isCorrect: subC.isCorrect },
        { id: 'sub_d', label: 'd', content: subD.content, isCorrect: subD.isCorrect },
      ];
    } else if (type === 'TLN') {
      payload.shortAnswer = shortAnswer;
    } else {
      payload.essayGuide = essayGuide;
    }

    if (questionToEdit) {
      payload.id = questionToEdit.id;
      payload.createdAt = questionToEdit.createdAt;
      payload.isDemo = questionToEdit.isDemo;
    }

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {questionToEdit ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới vào ngân hàng'}
            </h3>
            <p className="text-xs text-slate-500">Môn Công nghệ THPT 2018 (Tổ: Vật lí - Công nghệ)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Hàng 1: Lớp, Mức độ, Loại câu, Điểm */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lớp</label>
              <select
                value={grade}
                onChange={e => setGrade(e.target.value as GradeLevel)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="10">Lớp 10</option>
                <option value="11">Lớp 11</option>
                <option value="12">Lớp 12</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mức độ</label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value as CognitiveLevel)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Biet">Nhận biết</option>
                <option value="Hieu">Thông hiểu</option>
                <option value="VanDung">Vận dụng</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Loại câu</label>
              <select
                value={type}
                onChange={e => handleTypeChange(e.target.value as QuestionType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="TN">Trắc nghiệm (4 LC)</option>
                <option value="DS">Đúng / Sai (4 ý)</option>
                <option value="TLN">Trả lời ngắn</option>
                <option value="TL">Tự luận</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Điểm số</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="10"
                value={points}
                onChange={e => setPoints(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Chủ đề */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Chủ đề / Bài học</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="VD: Động cơ đốt trong, Kĩ thuật điện..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                required
              />
              <select
                onChange={e => {
                  if (e.target.value) setTopic(e.target.value);
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-600 bg-slate-50"
              >
                <option value="">Gợi ý chủ đề...</option>
                {COMMON_TOPICS.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nội dung câu hỏi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung câu hỏi</label>
            <textarea
              rows={3}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Nhập nội dung câu hỏi..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Chèn hình ảnh */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ảnh minh họa (tùy chọn)</label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="Dán link ảnh (URL) hoặc chọn file từ máy..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shrink-0">
                <ImageIcon className="w-4 h-4" /> Tải ảnh lên
                <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-xs text-rose-600 hover:underline shrink-0"
                >
                  Xóa ảnh
                </button>
              )}
            </div>
            {imageUrl && (
              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block max-w-xs">
                <img src={imageUrl} alt="Minh họa" className="max-h-32 rounded-lg object-contain" />
              </div>
            )}
          </div>

          {/* CHI TIẾT TỪNG LOẠI CÂU */}
          {type === 'TN' && (
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">4 Phương án (Chọn 1 đáp án đúng)</span>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lockOptionOrder}
                    onChange={e => setLockOptionOrder(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Khóa thứ tự (Không xáo A, B, C, D)</span>
                </label>
              </div>

              <div className="space-y-2">
                {(['A', 'B', 'C', 'D'] as const).map(letter => {
                  const val = letter === 'A' ? optA : letter === 'B' ? optB : letter === 'C' ? optC : optD;
                  const setVal = letter === 'A' ? setOptA : letter === 'B' ? setOptB : letter === 'C' ? setOptC : setOptD;
                  const isChecked = correctOption === letter;

                  return (
                    <div key={letter} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectOption(letter)}
                        className={`w-9 h-9 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 transition ${
                          isChecked
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                        title={`Bấm để chọn ${letter} là đáp án đúng`}
                      >
                        {letter}
                      </button>
                      <input
                        type="text"
                        value={val}
                        onChange={e => setVal(e.target.value)}
                        placeholder={`Nội dung phương án ${letter}...`}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        required={letter === 'A' || letter === 'B'}
                      />
                      {isChecked && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 shrink-0">
                          <Check className="w-4 h-4" /> Đúng
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {type === 'DS' && (
            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-3">
              <div className="text-xs font-bold text-purple-900">
                4 Ý phát biểu a), b), c), d) (Thang điểm Bộ GD&ĐT: 1 ý đúng 0.1, 2 ý 0.25, 3 ý 0.5, 4 ý 1.0)
              </div>
              {[
                { label: 'a', state: subA, set: setSubA },
                { label: 'b', state: subB, set: setSubB },
                { label: 'c', state: subC, set: setSubC },
                { label: 'd', state: subD, set: setSubD },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-8 font-bold text-slate-700 text-sm text-center">{item.label})</span>
                  <input
                    type="text"
                    value={item.state.content}
                    onChange={e => item.set({ ...item.state, content: e.target.value })}
                    placeholder={`Nội dung phát biểu ${item.label}...`}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => item.set({ ...item.state, isCorrect: !item.state.isCorrect })}
                    className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                      item.state.isCorrect
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-rose-600 text-white shadow-xs'
                    }`}
                  >
                    {item.state.isCorrect ? 'ĐÚNG' : 'SAI'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {type === 'TLN' && (
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-2">
              <label className="block text-xs font-bold text-amber-900">
                Các đáp án chấp nhận (Cách nhau bằng dấu | )
              </label>
              <input
                type="text"
                value={shortAnswer}
                onChange={e => setShortAnswer(e.target.value)}
                placeholder="VD: 380|381|380V (Hệ thống so khớp không phân biệt hoa/thường)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                required
              />
              <p className="text-[11px] text-slate-500">
                Nếu học sinh gõ 1 trong các từ khóa trên, hệ thống sẽ tự động tính điểm tối đa.
              </p>
            </div>
          )}

          {type === 'TL' && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-900">
                Hướng dẫn chấm / Biểu điểm tự luận (dành cho giáo viên chấm tay)
              </label>
              <textarea
                rows={3}
                value={essayGuide}
                onChange={e => setEssayGuide(e.target.value)}
                placeholder="Nêu các tiêu chí chấm điểm và điểm thành phần..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          )}

          {/* Lời giải chi tiết / Gợi ý */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lời giải chi tiết / Hướng dẫn giải (Hiển thị cho học sinh sau khi nộp nếu cho phép)
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Giải thích lý do chọn đáp án, công thức tính toán..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Nút hành động */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
            >
              {questionToEdit ? 'Lưu cập nhật' : 'Thêm vào ngân hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
