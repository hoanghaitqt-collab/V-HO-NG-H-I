/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Exam, Question, ShuffledExamPackage, ShuffledExamCode } from '../../types';
import { generateShuffledCodes, ShufflerOptions } from '../../services/gradingService';
import { exportShuffledExamPackageToDocx } from '../../services/wordExporter';
import {
  Shuffle,
  Download,
  Printer,
  Save,
  CheckCircle2,
  Table,
  FileText,
  Sliders,
  Eye,
  Check,
} from 'lucide-react';

export const ExamShufflerView: React.FC = () => {
  const { exams, questions, saveShuffledPackage, settings } = useApp();

  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [numberOfCodes, setNumberOfCodes] = useState<number>(4);
  const [startingCode, setStartingCode] = useState<number>(101);

  // Tùy chọn xáo đề
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [respectLockOptionOrder, setRespectLockOptionOrder] = useState(true);
  const [separateSections, setSeparateSections] = useState(true);

  // Kết quả sau khi xáo
  const [generatedPackage, setGeneratedPackage] = useState<ShuffledExamPackage | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'crossRef' | 'detail'>('matrix');
  const [viewCode, setViewCode] = useState<string>('101');
  const [isExporting, setIsExporting] = useState(false);

  const selectedExam = useMemo(() => {
    return exams.find(e => e.id === selectedExamId) || exams[0];
  }, [exams, selectedExamId]);

  const questionsMap = useMemo(() => {
    const map: Record<string, Question> = {};
    questions.forEach(q => {
      map[q.id] = q;
    });
    return map;
  }, [questions]);

  // Tiến hành xáo đề
  const handleShuffle = () => {
    if (!selectedExam) {
      alert('Vui lòng chọn 1 đề thi để xáo!');
      return;
    }

    const options: ShufflerOptions = {
      numberOfCodes,
      startingCode,
      shuffleQuestions,
      shuffleOptions,
      respectLockOptionOrder,
      separateSections,
    };

    const codes = generateShuffledCodes(selectedExam, questionsMap, options);

    const pkg: ShuffledExamPackage = {
      id: `pkg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      grade: selectedExam.grade,
      durationMinutes: selectedExam.durationMinutes,
      schoolYear: selectedExam.schoolYear,
      term: selectedExam.term,
      codes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setGeneratedPackage(pkg);
    setViewCode(codes[0]?.code || '101');
    saveShuffledPackage(pkg);
  };

  const handleExportWordAll = async () => {
    if (!generatedPackage) return;
    setIsExporting(true);
    try {
      await exportShuffledExamPackageToDocx(generatedPackage, settings);
    } catch (err: any) {
      alert(`Lỗi xuất Word: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Tiêu đề trang */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Xáo trộn mã đề kiểm tra
          </h1>
          <p className="text-sm text-slate-500">
            Tạo từ 2 đến 24 mã đề kèm bảng đáp án chéo chấm nhanh và bảng đối chiếu câu hỏi gốc.
          </p>
        </div>

        {generatedPackage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> In bảng đáp án
            </button>
            <button
              onClick={handleExportWordAll}
              disabled={isExporting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Đang xuất Word...' : 'Xuất trọn bộ mã đề (.docx)'}
            </button>
          </div>
        )}
      </div>

      {/* KHỐI CẤU HÌNH XÁO ĐỀ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-purple-600" />
          Cài đặt tham số xáo đề
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chọn đề thi gốc */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Đề thi gốc cần xáo
            </label>
            <select
              value={selectedExamId}
              onChange={e => setSelectedExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            >
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} (Lớp {exam.grade} - {exam.questions.length} câu)
                </option>
              ))}
            </select>
          </div>

          {/* Số lượng mã đề cần tạo (2-24) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Số lượng mã đề (2 - 24)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="2"
                max="24"
                value={numberOfCodes}
                onChange={e => setNumberOfCodes(Math.min(24, Math.max(2, parseInt(e.target.value) || 2)))}
                className="w-24 px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
              <span className="text-xs text-slate-500 font-medium">mã đề thi</span>
            </div>
          </div>

          {/* Mã bắt đầu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã bắt đầu (VD: 101, 201...)
            </label>
            <input
              type="number"
              value={startingCode}
              onChange={e => setStartingCode(parseInt(e.target.value) || 101)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Các checkbox tùy chọn quy tắc xáo */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="flex items-start gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={e => setShuffleQuestions(e.target.checked)}
              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
            />
            <span>Xáo thứ tự câu hỏi</span>
          </label>

          <label className="flex items-start gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={e => setShuffleOptions(e.target.checked)}
              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
            />
            <span>Xáo thứ tự đáp án A/B/C/D</span>
          </label>

          <label className="flex items-start gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={respectLockOptionOrder}
              onChange={e => setRespectLockOptionOrder(e.target.checked)}
              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
            />
            <span>Giữ nguyên câu cố định ("Cả A và B", "Hình vẽ trên")</span>
          </label>

          <label className="flex items-start gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={separateSections}
              onChange={e => setSeparateSections(e.target.checked)}
              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
            />
            <span>Xáo riêng theo từng phần (I, II, III, IV)</span>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleShuffle}
            className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-sm shadow-md transition flex items-center gap-2"
          >
            <Shuffle className="w-5 h-5" />
            Bắt đầu xáo {numberOfCodes} mã đề
          </button>
        </div>
      </div>

      {/* KẾT QUẢ XÁO ĐỀ */}
      {generatedPackage && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Gói {generatedPackage.codes.length} mã đề đã tạo thành công
              </h3>
              <p className="text-xs text-slate-500">
                Đề gốc: <strong className="text-slate-800">{generatedPackage.examTitle}</strong> (Lớp {generatedPackage.grade})
              </p>
            </div>

            {/* Chuyển tab xem */}
            <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'matrix' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Bảng đáp án chéo
              </button>
              <button
                onClick={() => setActiveTab('crossRef')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'crossRef' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Bảng đối chiếu câu
              </button>
              <button
                onClick={() => setActiveTab('detail')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'detail' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600'
                }`}
              >
                Xem chi tiết mã đề
              </button>
            </div>
          </div>

          {/* TAB 1: BẢNG ĐÁP ÁN CHÉO CHẤM NHANH */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Bảng tra cứu đáp án chấm nhanh theo từng mã đề:
                </span>
                <span className="text-xs text-slate-500">
                  (Dễ dàng đối chiếu khi chấm bài giấy)
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-extrabold sticky top-0">
                    <tr>
                      <th className="p-2.5 border border-slate-200 bg-slate-200/70">Câu \ Mã</th>
                      {generatedPackage.codes.map(c => (
                        <th key={c.code} className="p-2.5 border border-slate-200 font-mono text-sm text-blue-700">
                          {c.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: generatedPackage.codes[0]?.questions.length || 0 }).map((_, idx) => {
                      const qNum = idx + 1;
                      return (
                        <tr key={qNum} className={qNum % 5 === 0 ? 'bg-slate-50 font-semibold' : ''}>
                          <td className="p-2 border border-slate-200 font-bold bg-slate-50 text-slate-700">
                            Câu {qNum}
                          </td>
                          {generatedPackage.codes.map(c => {
                            const ans = c.answerKey[qNum] || '-';
                            return (
                              <td
                                key={c.code}
                                className={`p-2 border border-slate-200 font-mono font-bold ${
                                  ans === 'A'
                                    ? 'text-blue-700'
                                    : ans === 'B'
                                    ? 'text-emerald-700'
                                    : ans === 'C'
                                    ? 'text-amber-700'
                                    : ans === 'D'
                                    ? 'text-purple-700'
                                    : 'text-slate-800'
                                }`}
                              >
                                {ans}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: BẢNG ĐỐI CHIẾU CÂU HỎI GỐC ↔ MÃ ĐỀ */}
          {activeTab === 'crossRef' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Bảng đối chiếu: Vị trí của câu hỏi trong đề gốc tương ứng với câu số mấy trong từng mã đề.
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-extrabold">
                    <tr>
                      <th className="p-2.5 border border-slate-200 bg-slate-200/70">Câu gốc #</th>
                      {generatedPackage.codes.map(c => (
                        <th key={c.code} className="p-2.5 border border-slate-200 font-mono text-blue-700">
                          Mã {c.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: generatedPackage.codes[0]?.questions.length || 0 }).map((_, idx) => {
                      const origNum = idx + 1;
                      return (
                        <tr key={origNum} className="hover:bg-slate-50">
                          <td className="p-2 border border-slate-200 font-bold bg-slate-50">
                            Gốc #{origNum}
                          </td>
                          {generatedPackage.codes.map(c => {
                            const targetNum = c.originalToShuffledMap[origNum] || '-';
                            return (
                              <td key={c.code} className="p-2 border border-slate-200 font-mono">
                                Câu {targetNum}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: XEM CHI TIẾT TỪNG MÃ ĐỀ */}
          {activeTab === 'detail' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">Chọn mã đề xem trước:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {generatedPackage.codes.map(c => (
                    <button
                      key={c.code}
                      onClick={() => setViewCode(c.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                        viewCode === c.code
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Mã {c.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nội dung mã đề được chọn */}
              {(() => {
                const curCodeObj = generatedPackage.codes.find(c => c.code === viewCode);
                if (!curCodeObj) return null;

                return (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                    <div className="text-center pb-3 border-b border-slate-200">
                      <h4 className="font-bold text-sm uppercase text-slate-900">
                        {generatedPackage.examTitle} - MÃ ĐỀ: {curCodeObj.code}
                      </h4>
                      <p className="text-slate-500 mt-1">
                        Thời gian: {generatedPackage.durationMinutes} phút · Số câu: {curCodeObj.questions.length}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {curCodeObj.questions.map(qItem => (
                        <div key={qItem.displayIndex} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                          <div className="font-semibold text-slate-900">
                            Câu {qItem.displayIndex}. {qItem.content}
                          </div>

                          {qItem.type === 'TN' && qItem.options && (
                            <div className="grid grid-cols-2 gap-2 pl-3">
                              {qItem.options.map(opt => (
                                <div
                                  key={opt.key}
                                  className={`p-1.5 rounded-lg border flex items-center gap-1.5 ${
                                    opt.key === qItem.correctDisplayOption
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                                      : 'border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>{opt.key}.</span>
                                  <span>{opt.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {qItem.type === 'DS' && qItem.subQuestions && (
                            <div className="space-y-1 pl-3 text-slate-700">
                              {qItem.subQuestions.map(sq => (
                                <div key={sq.label} className="flex justify-between">
                                  <span>{sq.label}) {sq.content}</span>
                                  <span className="font-bold font-mono">
                                    [{sq.isCorrect ? 'Đ' : 'S'}]
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {qItem.type === 'TLN' && (
                            <div className="text-amber-800 pl-3">
                              Đáp án: <strong>{qItem.shortAnswer}</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
