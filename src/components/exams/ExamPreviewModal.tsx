/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Exam, Question, AppSettings } from '../../types';
import { exportExamToDocx } from '../../services/wordExporter';
import { X, Printer, Download, FileText, CheckCircle2, Grid, Award } from 'lucide-react';

interface ExamPreviewModalProps {
  isOpen: boolean;
  exam: Exam | null;
  questionsMap: Record<string, Question>;
  settings: AppSettings;
  onClose: () => void;
}

export const ExamPreviewModal: React.FC<ExamPreviewModalProps> = ({
  isOpen,
  exam,
  questionsMap,
  settings,
  onClose,
}) => {
  const [tab, setTab] = useState<'exam' | 'answers' | 'matrix'>('exam');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !exam) return null;

  // Phân loại câu hỏi theo 4 phần
  const s1List = exam.questions.filter(r => r.section === 1 || questionsMap[r.questionId]?.type === 'TN');
  const s2List = exam.questions.filter(r => r.section === 2 || questionsMap[r.questionId]?.type === 'DS');
  const s3List = exam.questions.filter(r => r.section === 3 || questionsMap[r.questionId]?.type === 'TLN');
  const s4List = exam.questions.filter(r => r.section === 4 || questionsMap[r.questionId]?.type === 'TL');

  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      await exportExamToDocx(exam, questionsMap, settings, true);
    } catch (e: any) {
      alert(`Lỗi xuất file Word: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-8 shadow-2xl border border-slate-100 my-4 flex flex-col max-h-[95vh]">
        {/* Thanh công cụ Modal (Ẩn khi in) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {exam.title}
            </h3>
            <p className="text-xs text-slate-500">
              Công nghệ {exam.grade} · Thời gian: {exam.durationMinutes} phút · Tổng điểm: {exam.totalPoints}đ
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Chuyển tab xem */}
            <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setTab('exam')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  tab === 'exam' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Đề kiểm tra
              </button>
              <button
                onClick={() => setTab('answers')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  tab === 'answers' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Đáp án
              </button>
              <button
                onClick={() => setTab('matrix')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  tab === 'matrix' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Ma trận đề
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 text-slate-700 transition"
              title="In đề ra giấy hoặc xuất PDF"
            >
              <Printer className="w-4 h-4" /> In / PDF
            </button>

            <button
              onClick={handleExportWord}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              title="Xuất file Word (.docx) chuẩn"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Đang xuất...' : 'Xuất Word (.docx)'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NỘI DUNG XEM TRƯỚC VÀ IN */}
        <div className="flex-1 overflow-y-auto mt-4 p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-inner text-slate-900 font-sans">
          {tab === 'exam' && (
            <div className="space-y-6 max-w-3xl mx-auto print:max-w-none print:p-0">
              {/* Tiêu đề in chuẩn Bộ GD&ĐT */}
              <div className="grid grid-cols-2 text-center text-xs pb-4 border-b border-slate-300">
                <div>
                  <div className="font-bold uppercase">{settings.schoolName || 'TRƯỜNG THPT'}</div>
                  <div>TỔ BỘ MÔN CÔNG NGHỆ</div>
                  <div className="mt-1 font-serif">---------------</div>
                </div>
                <div>
                  <div className="font-bold text-sm uppercase">{exam.title}</div>
                  <div>MÔN: CÔNG NGHỆ {exam.grade} (CÔNG NGHIỆP)</div>
                  <div>Thời gian: {exam.durationMinutes} phút (Không kể phát đề)</div>
                  <div className="font-bold mt-1">MÃ ĐỀ THI: GỐC</div>
                </div>
              </div>

              {/* Thông tin học sinh */}
              <div className="text-xs space-y-1.5 pt-2">
                <div className="flex justify-between border-b border-dotted border-slate-400 pb-1">
                  <span>Họ và tên học sinh: ........................................................................</span>
                  <span>Lớp: ....................</span>
                </div>
              </div>

              {/* PHẦN I */}
              {s1List.length > 0 && (
                <div className="space-y-3">
                  <div className="font-bold text-xs uppercase bg-slate-100 p-2 rounded-lg border border-slate-200">
                    PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn ({exam.sectionPoints.section1} điểm).
                    <span className="font-normal text-slate-600 block text-[11px] lowercase">
                      Thí sinh trả lời từ câu 1 đến câu {s1List.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.
                    </span>
                  </div>

                  {s1List.map((ref, idx) => {
                    const q = questionsMap[ref.questionId];
                    if (!q) return null;
                    return (
                      <div key={ref.questionId} className="page-break-inside-avoid text-sm space-y-1.5">
                        <div className="font-semibold">
                          Câu {idx + 1}. <span className="font-normal">{q.content}</span>
                        </div>
                        {q.imageUrl && (
                          <img src={q.imageUrl} alt="" className="max-h-40 my-2 rounded border border-slate-200" />
                        )}
                        {q.options && (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-4">
                            <div><strong className="font-bold">A.</strong> {q.options.A}</div>
                            <div><strong className="font-bold">B.</strong> {q.options.B}</div>
                            <div><strong className="font-bold">C.</strong> {q.options.C}</div>
                            <div><strong className="font-bold">D.</strong> {q.options.D}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PHẦN II */}
              {s2List.length > 0 && (
                <div className="space-y-3 pt-3">
                  <div className="font-bold text-xs uppercase bg-slate-100 p-2 rounded-lg border border-slate-200">
                    PHẦN II. Câu trắc nghiệm đúng sai ({exam.sectionPoints.section2} điểm).
                    <span className="font-normal text-slate-600 block text-[11px] lowercase">
                      Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.
                    </span>
                  </div>

                  {s2List.map((ref, idx) => {
                    const q = questionsMap[ref.questionId];
                    if (!q) return null;
                    return (
                      <div key={ref.questionId} className="page-break-inside-avoid text-sm space-y-1.5">
                        <div className="font-semibold">
                          Câu {s1List.length + idx + 1}. <span className="font-normal">{q.content}</span>
                        </div>
                        {q.subQuestions && (
                          <div className="space-y-1 pl-4 text-xs">
                            {q.subQuestions.map(sq => (
                              <div key={sq.label} className="flex items-center justify-between">
                                <span><strong>{sq.label})</strong> {sq.content}</span>
                                <span className="text-slate-400 font-mono">[  ] Đ   [  ] S</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PHẦN III */}
              {s3List.length > 0 && (
                <div className="space-y-3 pt-3">
                  <div className="font-bold text-xs uppercase bg-slate-100 p-2 rounded-lg border border-slate-200">
                    PHẦN III. Câu trắc nghiệm trả lời ngắn ({exam.sectionPoints.section3} điểm).
                  </div>

                  {s3List.map((ref, idx) => {
                    const q = questionsMap[ref.questionId];
                    if (!q) return null;
                    return (
                      <div key={ref.questionId} className="page-break-inside-avoid text-sm space-y-1.5">
                        <div className="font-semibold">
                          Câu {s1List.length + s2List.length + idx + 1}. <span className="font-normal">{q.content}</span>
                        </div>
                        <div className="pl-4 text-xs text-slate-500 italic">
                          Viết câu trả lời vào ô tương ứng trên phiếu làm bài.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PHẦN IV */}
              {s4List.length > 0 && (
                <div className="space-y-3 pt-3">
                  <div className="font-bold text-xs uppercase bg-slate-100 p-2 rounded-lg border border-slate-200">
                    PHẦN IV. Tự luận ({exam.sectionPoints.section4} điểm).
                  </div>

                  {s4List.map((ref, idx) => {
                    const q = questionsMap[ref.questionId];
                    if (!q) return null;
                    return (
                      <div key={ref.questionId} className="page-break-inside-avoid text-sm space-y-1.5">
                        <div className="font-semibold">
                          Câu {s1List.length + s2List.length + s3List.length + idx + 1}. ({ref.points} điểm){' '}
                          <span className="font-normal">{q.content}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-center font-bold text-xs text-slate-500 py-6">
                -------------------------- HẾT --------------------------
              </div>
            </div>
          )}

          {tab === 'answers' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <h4 className="text-base font-bold text-center uppercase">
                Đáp án và Hướng dẫn chấm chi tiết
              </h4>

              {/* Bảng đáp án Phần I */}
              {s1List.length > 0 && (
                <div>
                  <h5 className="font-bold text-xs mb-2">1. Đáp án Phần I (Trắc nghiệm nhiều lựa chọn):</h5>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-center text-xs">
                    {s1List.map((ref, idx) => {
                      const q = questionsMap[ref.questionId];
                      return (
                        <div key={ref.questionId} className="p-2 border border-slate-200 rounded-lg bg-slate-50">
                          <div className="text-slate-500 text-[10px]">Câu {idx + 1}</div>
                          <div className="font-extrabold text-blue-700 text-sm mt-0.5">
                            {q?.correctOption || '-'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Đáp án Phần II */}
              {s2List.length > 0 && (
                <div>
                  <h5 className="font-bold text-xs mb-2">2. Đáp án Phần II (Đúng / Sai):</h5>
                  <div className="space-y-2 text-xs">
                    {s2List.map((ref, idx) => {
                      const q = questionsMap[ref.questionId];
                      const sq = q?.subQuestions || [];
                      return (
                        <div key={ref.questionId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                          <span className="font-bold">Câu {s1List.length + idx + 1}</span>
                          <div className="flex gap-4">
                            {sq.map(s => (
                              <span key={s.label}>
                                <strong>{s.label})</strong> {s.isCorrect ? 'Đ' : 'S'}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Đáp án Phần III */}
              {s3List.length > 0 && (
                <div>
                  <h5 className="font-bold text-xs mb-2">3. Đáp án Phần III (Trả lời ngắn):</h5>
                  <div className="space-y-2 text-xs">
                    {s3List.map((ref, idx) => {
                      const q = questionsMap[ref.questionId];
                      return (
                        <div key={ref.questionId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                          <span className="font-bold">Câu {s1List.length + s2List.length + idx + 1}</span>
                          <span className="font-mono font-bold text-emerald-700">{q?.shortAnswer || '-'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hướng dẫn Phần IV */}
              {s4List.length > 0 && (
                <div>
                  <h5 className="font-bold text-xs mb-2">4. Hướng dẫn chấm Phần IV (Tự luận):</h5>
                  <div className="space-y-3 text-xs">
                    {s4List.map((ref, idx) => {
                      const q = questionsMap[ref.questionId];
                      return (
                        <div key={ref.questionId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                          <div className="font-bold">Câu {s1List.length + s2List.length + s3List.length + idx + 1} ({ref.points} điểm):</div>
                          <div className="whitespace-pre-line text-slate-700 leading-relaxed">
                            {q?.essayGuide || q?.explanation || 'Theo biểu điểm giáo viên.'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'matrix' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <h4 className="text-base font-bold text-center uppercase">
                Bảng Ma trận và Đặc tả đề kiểm tra
              </h4>
              <p className="text-xs text-slate-500 text-center">
                Cấu trúc đề kiểm tra đánh giá định kì môn Công nghệ {exam.grade}
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 border-b">TT</th>
                      <th className="p-2.5 border-b">Chủ đề</th>
                      <th className="p-2.5 border-b text-center">Nhận biết</th>
                      <th className="p-2.5 border-b text-center">Thông hiểu</th>
                      <th className="p-2.5 border-b text-center">Vận dụng</th>
                      <th className="p-2.5 border-b text-center">Tổng câu</th>
                      <th className="p-2.5 border-b text-center">Tổng điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Tổng hợp ma trận từ các câu hỏi có trong đề */}
                    {Array.from(new Set(exam.questions.map(r => questionsMap[r.questionId]?.topic).filter(Boolean))).map((topic, i) => {
                      const topicRefs = exam.questions.filter(r => questionsMap[r.questionId]?.topic === topic);
                      const biet = topicRefs.filter(r => questionsMap[r.questionId]?.level === 'Biet').length;
                      const hieu = topicRefs.filter(r => questionsMap[r.questionId]?.level === 'Hieu').length;
                      const vd = topicRefs.filter(r => questionsMap[r.questionId]?.level === 'VanDung').length;
                      const totalPts = topicRefs.reduce((acc, r) => acc + (r.points || 0), 0);

                      return (
                        <tr key={topic}>
                          <td className="p-2.5 font-mono text-center">{i + 1}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{topic}</td>
                          <td className="p-2.5 text-center font-mono">{biet}</td>
                          <td className="p-2.5 text-center font-mono">{hieu}</td>
                          <td className="p-2.5 text-center font-mono">{vd}</td>
                          <td className="p-2.5 text-center font-bold font-mono">{topicRefs.length}</td>
                          <td className="p-2.5 text-center font-bold text-blue-700 font-mono">{totalPts.toFixed(2)}đ</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td colSpan={2} className="p-2.5 text-right">Tổng cộng:</td>
                      <td className="p-2.5 text-center font-mono">
                        {exam.questions.filter(r => questionsMap[r.questionId]?.level === 'Biet').length}
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        {exam.questions.filter(r => questionsMap[r.questionId]?.level === 'Hieu').length}
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        {exam.questions.filter(r => questionsMap[r.questionId]?.level === 'VanDung').length}
                      </td>
                      <td className="p-2.5 text-center font-mono">{exam.questions.length}</td>
                      <td className="p-2.5 text-center text-blue-700 font-mono">{exam.totalPoints}đ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
