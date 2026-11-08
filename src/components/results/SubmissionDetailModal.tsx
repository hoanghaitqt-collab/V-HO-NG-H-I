/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StudentSubmission, Question } from '../../types';
import { X, CheckCircle, AlertCircle, Save, ShieldAlert, Award, Clock } from 'lucide-react';

interface SubmissionDetailModalProps {
  isOpen: boolean;
  submission: StudentSubmission | null;
  questionsMap: Record<string, Question>;
  onGradeEssay: (subId: string, questionId: string, score: number, comment?: string) => void;
  onUpdateScore: (subId: string, newScore: number) => void;
  onClose: () => void;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  isOpen,
  submission,
  questionsMap,
  onGradeEssay,
  onUpdateScore,
  onClose,
}) => {
  const [essayScores, setEssayScores] = useState<Record<string, number>>({});
  const [essayComments, setEssayComments] = useState<Record<string, string>>({});
  const [manualTotalScore, setManualTotalScore] = useState<number>(0);
  const [isEditingScore, setIsEditingScore] = useState<boolean>(false);

  if (!isOpen || !submission) return null;

  const handleSaveEssay = (qId: string, maxPoints: number) => {
    const score = essayScores[qId] ?? 0;
    const comment = essayComments[qId] || '';
    if (score < 0 || score > maxPoints) {
      alert(`Điểm tự luận phải từ 0 đến ${maxPoints}`);
      return;
    }
    onGradeEssay(submission.id, qId, score, comment);
    alert('Đã lưu điểm tự luận thành công!');
  };

  const handleSaveOverallScore = () => {
    onUpdateScore(submission.id, Number(manualTotalScore));
    setIsEditingScore(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Bài làm chi tiết: {submission.studentName}
            </h3>
            <p className="text-xs text-slate-500">
              Lớp: <strong className="text-slate-800">{submission.studentClass}</strong> · Bài:{' '}
              {submission.assignmentTitle} ({submission.assignmentCode})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông tin nhanh bài nộp */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl">
            <span className="text-[11px] text-blue-700 font-semibold block">ĐIỂM TỔNG KẾT</span>
            {isEditingScore ? (
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  defaultValue={submission.score}
                  onChange={e => setManualTotalScore(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 border border-blue-400 rounded text-sm font-bold font-mono"
                />
                <button
                  onClick={handleSaveOverallScore}
                  className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-bold"
                >
                  Lưu
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-extrabold font-mono text-blue-800">
                  {submission.score} <span className="text-xs font-normal text-slate-500">/ {submission.totalScore}</span>
                </span>
                <button
                  onClick={() => {
                    setManualTotalScore(submission.score);
                    setIsEditingScore(true);
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-bold"
                >
                  Sửa
                </button>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[11px] text-slate-500 font-semibold block">THỜI GIAN LÀM</span>
            <span className="text-lg font-bold font-mono text-slate-800 mt-1 block">
              {Math.floor(submission.durationSeconds / 60)}m {submission.durationSeconds % 60}s
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[11px] text-slate-500 font-semibold block">SỐ LẦN RỜI TAB</span>
            <span
              className={`text-lg font-bold font-mono mt-1 block ${
                submission.tabLeavesCount > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-800'
              }`}
            >
              {submission.tabLeavesCount} lần
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[11px] text-slate-500 font-semibold block">THỜI ĐIỂM NỘP</span>
            <span className="text-xs font-semibold text-slate-700 mt-1 block">
              {new Date(submission.submittedAt).toLocaleTimeString('vi-VN')} ·{' '}
              {new Date(submission.submittedAt).toLocaleDateString('vi-VN')}
            </span>
          </div>
        </div>

        {/* Danh sách từng câu hỏi và phương án học sinh chọn */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {submission.detail.map((item, idx) => {
            const q = questionsMap[item.questionId];

            return (
              <div
                key={item.questionId}
                className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  item.type === 'TL'
                    ? 'border-purple-200 bg-purple-50/30'
                    : item.isCorrect
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-rose-200 bg-rose-50/30'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>
                    Câu {idx + 1} ({item.type === 'TN' ? 'Trắc nghiệm' : item.type === 'DS' ? 'Đúng/Sai' : item.type === 'TLN' ? 'Trả lời ngắn' : 'Tự luận'})
                  </span>
                  <span
                    className={`font-mono text-sm ${
                      item.isCorrect ? 'text-emerald-700' : item.type === 'TL' ? 'text-purple-700' : 'text-rose-700'
                    }`}
                  >
                    +{item.scoreEarned} / {item.maxScore} điểm
                  </span>
                </div>

                <p className="font-semibold text-slate-800">{q?.content || '(Nội dung câu hỏi)'}</p>

                {/* Học sinh chọn gì */}
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div>
                    Học sinh trả lời:{' '}
                    <strong className="text-blue-700 font-mono">
                      {typeof item.studentAnswer === 'object'
                        ? JSON.stringify(item.studentAnswer)
                        : item.studentAnswer || '(bỏ trống)'}
                    </strong>
                  </div>

                  {item.type !== 'TL' && (
                    <div className="text-slate-600">
                      Đáp án đúng:{' '}
                      <strong className="text-emerald-700 font-mono">
                        {typeof item.correctAnswer === 'object'
                          ? JSON.stringify(item.correctAnswer)
                          : item.correctAnswer}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Nếu là câu Tự luận: Khu vực chấm tay của giáo viên */}
                {item.type === 'TL' && (
                  <div className="p-3 bg-purple-100/50 border border-purple-200 rounded-xl space-y-2">
                    <span className="font-bold text-purple-900 block">
                      Giáo viên chấm điểm câu tự luận này:
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 font-medium">Nhập điểm:</span>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max={item.maxScore}
                          value={essayScores[item.questionId] ?? item.scoreEarned}
                          onChange={e =>
                            setEssayScores(prev => ({
                              ...prev,
                              [item.questionId]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold"
                        />
                        <span className="text-slate-500">/ {item.maxScore}đ</span>
                      </div>

                      <input
                        type="text"
                        placeholder="Lời phê / Nhận xét của giáo viên..."
                        value={essayComments[item.questionId] ?? (item.teacherComment || '')}
                        onChange={e =>
                          setEssayComments(prev => ({
                            ...prev,
                            [item.questionId]: e.target.value,
                          }))
                        }
                        className="flex-1 px-3 py-1 bg-white border border-slate-300 rounded text-xs"
                      />

                      <button
                        type="button"
                        onClick={() => handleSaveEssay(item.questionId, item.maxScore)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold transition flex items-center gap-1 shrink-0"
                      >
                        <Save className="w-3.5 h-3.5" /> Lưu điểm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
