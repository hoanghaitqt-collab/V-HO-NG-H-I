/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Assignment, Question, Exam, StudentSubmission, StudentSubmissionDetail } from '../../types';
import { callAppsScript } from '../../services/syncService';
import { gradeStudentSubmission, shuffleArray } from '../../services/gradingService';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  Send,
  HelpCircle,
  ShieldAlert,
  ArrowLeft,
  Check,
} from 'lucide-react';

interface StudentExamViewProps {
  initialCode: string;
  onExitStudentMode?: () => void;
  // Local fallbacks if running in demo or offline mode
  localAssignments?: Assignment[];
  localExams?: Exam[];
  localQuestionsMap?: Record<string, Question>;
  onLocalSubmit?: (submission: StudentSubmission) => void;
  scriptUrl?: string;
}

export const StudentExamView: React.FC<StudentExamViewProps> = ({
  initialCode,
  onExitStudentMode,
  localAssignments = [],
  localExams = [],
  localQuestionsMap = {},
  onLocalSubmit,
  scriptUrl,
}) => {
  // Step 1: Info (Name & Class) -> Step 2: Testing -> Step 3: Finished
  const [step, setStep] = useState<'info' | 'testing' | 'finished'>('info');

  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');

  // Dữ liệu bài thi đã lược đáp án
  const [assignmentData, setAssignmentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Trạng thái làm bài
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45 * 60);
  const [tabLeavesCount, setTabLeavesCount] = useState<number>(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kết quả sau khi nộp
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    total: number;
    detail?: StudentSubmissionDetail[];
    showAnswer?: boolean;
  } | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  // 1. Tải đề thi từ Google Apps Script (action: publicAssignment) hoặc fallback local
  useEffect(() => {
    let isMounted = true;
    async function loadTest() {
      setIsLoading(true);
      setLoadError(null);

      const code = initialCode.trim().toUpperCase();

      // Thử gọi server Apps Script nếu có URL
      if (scriptUrl && scriptUrl.startsWith('http')) {
        try {
          const res = await callAppsScript(scriptUrl, { action: 'publicAssignment', code });
          if (res && res.ok && res.assignment) {
            if (isMounted) {
              setAssignmentData(res.assignment);
              setSecondsRemaining(res.assignment.durationMinutes * 60);
              setIsLoading(false);
            }
            return;
          }
        } catch (e) {
          console.warn('Không thể tải qua Apps Script, chuyển sang bộ đệm cục bộ:', e);
        }
      }

      // Fallback: Tìm trong local assignments
      const targetAssign = localAssignments.find(
        a => a.code.toUpperCase() === code || a.id === initialCode
      ) || localAssignments[0];

      if (!targetAssign) {
        if (isMounted) {
          setLoadError(`Không tìm thấy bài kiểm tra với mã: ${code}`);
          setIsLoading(false);
        }
        return;
      }

      const targetExam = localExams.find(e => e.id === targetAssign.examId) || localExams[0];
      if (!targetExam) {
        if (isMounted) {
          setLoadError('Không tìm thấy đề thi liên kết với bài này.');
          setIsLoading(false);
        }
        return;
      }

      // Chuẩn hóa và LƯỢC BỎ toàn bộ đáp án đúng
      const sanitizedQuestions = targetExam.questions.map((ref, idx) => {
        const q = localQuestionsMap[ref.questionId];
        if (!q) return null;

        let options = q.options ? { ...q.options } : undefined;

        // Nếu có xáo đề riêng cho học sinh
        if (targetAssign.shuffleForStudent && q.type === 'TN' && options && !q.lockOptionOrder) {
          const optsArray = [
            { key: 'A', text: options.A || '' },
            { key: 'B', text: options.B || '' },
            { key: 'C', text: options.C || '' },
            { key: 'D', text: options.D || '' },
          ];
          const permuted = shuffleArray(optsArray);
          options = {
            A: permuted[0].text,
            B: permuted[1].text,
            C: permuted[2].text,
            D: permuted[3].text,
          };
        }

        return {
          id: q.id,
          grade: q.grade,
          topic: q.topic,
          level: q.level,
          type: q.type,
          content: q.content,
          options,
          subQuestions: q.subQuestions?.map(sq => ({
            id: sq.id,
            label: sq.label,
            content: sq.content,
          })),
          points: ref.points,
          section: ref.section,
          imageUrl: q.imageUrl,
        };
      }).filter(Boolean);

      if (isMounted) {
        setAssignmentData({
          id: targetAssign.id,
          code: targetAssign.code,
          title: targetAssign.title,
          targetClass: targetAssign.targetClass,
          durationMinutes: targetAssign.durationMinutes,
          allowReviewAfterSubmit: targetAssign.allowReviewAfterSubmit,
          questions: targetAssign.shuffleForStudent ? shuffleArray(sanitizedQuestions) : sanitizedQuestions,
        });
        setSecondsRemaining(targetAssign.durationMinutes * 60);
        setIsLoading(false);
      }
    }

    loadTest();
    return () => {
      isMounted = false;
    };
  }, [initialCode, scriptUrl, localAssignments, localExams, localQuestionsMap]);

  // 2. Chống gian lận: Bắt sự kiện rời tab hoặc mất tiêu điểm cửa sổ
  useEffect(() => {
    if (step !== 'testing') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabLeavesCount(c => c + 1);
        setShowTabWarning(true);
      }
    };

    const handleWindowBlur = () => {
      setTabLeavesCount(c => c + 1);
      setShowTabWarning(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [step]);

  // 3. Đếm ngược thời gian làm bài
  useEffect(() => {
    if (step !== 'testing') return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Hết giờ -> Tự động nộp bài
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // Bắt đầu làm bài
  const handleStartTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      alert('Vui lòng nhập Họ và tên của bạn!');
      return;
    }
    if (!studentClass.trim()) {
      alert('Vui lòng nhập Lớp của bạn!');
      return;
    }
    startTimeRef.current = Date.now();
    setStep('testing');
  };

  // Nộp bài
  const handleFinalSubmit = async (autoSubmit = false) => {
    if (isSubmitting) return;
    if (!autoSubmit && !window.confirm('Bạn có chắc chắn muốn nộp bài kiểm tra ngay bây giờ?')) {
      return;
    }

    setIsSubmitting(true);
    const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);

    // 1. Thử gửi lên Google Apps Script nếu có URL
    if (scriptUrl && scriptUrl.startsWith('http')) {
      try {
        const payload = {
          action: 'submit',
          code: assignmentData.code,
          student: { name: studentName, class: studentClass },
          answers,
          meta: { durationSec, tabLeaves: tabLeavesCount },
        };
        const res = await callAppsScript(scriptUrl, payload);
        if (res && res.ok) {
          setSubmissionResult({
            score: res.score,
            total: res.total,
            detail: res.detail,
            showAnswer: res.showAnswer,
          });
          setStep('finished');
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          setIsSubmitting(false);
          return;
        }
      } catch (e) {
        console.warn('Lỗi gửi qua Apps Script, lưu điểm nội bộ:', e);
      }
    }

    // 2. Fallback: Chấm điểm bằng công cụ tính điểm chuẩn Bộ GD&ĐT
    const targetAssign = localAssignments.find(a => a.code === assignmentData.code) || localAssignments[0];
    const targetExam = localExams.find(e => e.id === targetAssign?.examId) || localExams[0];

    const { score, totalScore, detail } = gradeStudentSubmission(targetExam, localQuestionsMap, answers);

    const subId = `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newSubmission: StudentSubmission = {
      id: subId,
      assignmentId: targetAssign.id,
      assignmentCode: targetAssign.code,
      assignmentTitle: targetAssign.title,
      studentName,
      studentClass,
      score,
      totalScore,
      durationSeconds: durationSec,
      tabLeavesCount,
      submittedAt: Date.now(),
      answers,
      detail,
      essayGraded: false,
      updatedAt: Date.now(),
    };

    if (onLocalSubmit) {
      onLocalSubmit(newSubmission);
    }

    setSubmissionResult({
      score,
      total: totalScore,
      detail: assignmentData.allowReviewAfterSubmit ? detail : undefined,
      showAnswer: assignmentData.allowReviewAfterSubmit,
    });
    setStep('finished');
    setIsSubmitting(false);

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border border-slate-100">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="font-bold text-slate-800 text-lg">Đang tải đề kiểm tra...</h3>
          <p className="text-xs text-slate-500 mt-1">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Không thể mở bài kiểm tra</h3>
          <p className="text-sm text-slate-600 mt-2">{loadError}</p>
          {onExitStudentMode && (
            <button
              onClick={onExitStudentMode}
              className="mt-6 px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Quay lại trang chính
            </button>
          )}
        </div>
      </div>
    );
  }

  const questionsList = assignmentData?.questions || [];
  const currentQ = questionsList[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      {/* Nút thoát chế độ học sinh (nếu giáo viên đang bấm làm thử) */}
      {onExitStudentMode && (
        <div className="bg-slate-900 text-white py-2 px-4 text-xs font-semibold flex items-center justify-between no-print">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Đang ở chế độ xem thử của Học sinh (Không hiển thị đáp án trước khi nộp)
          </span>
          <button
            onClick={onExitStudentMode}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-bold transition flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Thoát về Giáo viên
          </button>
        </div>
      )}

      {/* BƯỚC 1: NHẬP THÔNG TIN HỌC SINH */}
      {step === 'info' && (
        <div className="max-w-md mx-auto pt-12 sm:pt-20 px-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
            <div className="text-center pb-6 border-b border-slate-100">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold font-mono text-xs mb-2">
                MÃ BÀI: {assignmentData.code}
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                {assignmentData.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Thời gian: <strong className="text-slate-800">{assignmentData.durationMinutes} phút</strong> · Lớp:{' '}
                <strong className="text-slate-800">{assignmentData.targetClass}</strong>
              </p>
            </div>

            <form onSubmit={handleStartTest} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên học sinh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lớp học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentClass}
                  onChange={e => setStudentClass(e.target.value)}
                  placeholder="VD: 11A1, 10B2..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Hướng dẫn quy chế */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" /> Quy định làm bài:
                </div>
                <p>· Đồng hồ đếm ngược sẽ bắt đầu chạy ngay khi bấm "Bắt đầu làm bài".</p>
                <p>· Hệ thống tự động ghi nhận nếu bạn chuyển tab hoặc rời màn hình thi.</p>
                <p>· Hết giờ hệ thống sẽ tự động thu bài.</p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                Bắt đầu làm bài thi <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BƯỚC 2: MÀN HÌNH LÀM BÀI TRỰC TUYẾN */}
      {step === 'testing' && currentQ && (
        <div className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
          {/* Thanh đầu trang: Tên học sinh, Lớp, Đồng hồ đếm ngược */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 sticky top-2 z-20 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-slate-900 text-sm sm:text-base">{studentName}</div>
              <div className="text-xs text-slate-500">Lớp: {studentClass} · {assignmentData.title}</div>
            </div>

            <div className="flex items-center gap-3">
              {/* Cảnh báo rời tab */}
              {tabLeavesCount > 0 && (
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Rời tab: {tabLeavesCount} lần
                </div>
              )}

              {/* Đồng hồ */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-extrabold text-base sm:text-lg border ${
                  secondsRemaining < 300
                    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>

              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Nộp bài</span>
                <span className="sm:hidden">Nộp</span>
              </button>
            </div>
          </div>

          {/* CẢNH BÁO POPUP RỜI TAB NẾU CÓ */}
          {showTabWarning && (
            <div className="p-3 bg-rose-600 text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>CẢNH BÁO: Bạn vừa rời khỏi màn hình làm bài! Số lần thoát tab ({tabLeavesCount}) đã được ghi lại.</span>
              </div>
              <button
                onClick={() => setShowTabWarning(false)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white font-extrabold"
              >
                Đã hiểu
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* VÙNG CÂU HỎI HIỆN TẠI (3 Cột) */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono">
                    Câu {currentQuestionIndex + 1} / {questionsList.length}
                  </span>
                  <span className="text-slate-500">
                    (Phần {currentQ.section || 1} · {currentQ.points || 0.25} điểm)
                  </span>
                </div>
              </div>

              {/* Nội dung câu hỏi */}
              <div className="text-base font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
                {currentQ.content}
              </div>

              {/* Ảnh minh họa nếu có */}
              {currentQ.imageUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block max-w-md">
                  <img src={currentQ.imageUrl} alt="Hình minh họa" className="max-h-60 rounded-xl object-contain" />
                </div>
              )}

              {/* KHU VỰC PHƯƠNG ÁN TRẢ LỜI */}
              {currentQ.type === 'TN' && currentQ.options && (
                <div className="space-y-3 pt-2">
                  {(['A', 'B', 'C', 'D'] as const).map(letter => {
                    const optText = currentQ.options?.[letter];
                    if (!optText) return null;
                    const isSelected = answers[currentQ.id] === letter;

                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: letter }))}
                        className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-semibold shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="flex-1 text-sm pt-0.5">{optText}</span>
                        {isSelected && <Check className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* DẠNG ĐÚNG / SAI (4 Ý) */}
              {currentQ.type === 'DS' && currentQ.subQuestions && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-purple-700">
                    Chọn Đúng hoặc Sai cho từng ý dưới đây:
                  </p>
                  {currentQ.subQuestions.map((sq: any) => {
                    const currentAns = answers[currentQ.id]?.[sq.label];

                    return (
                      <div
                        key={sq.label}
                        className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                      >
                        <span className="font-medium text-slate-800">
                          <strong className="text-slate-900 mr-1">{sq.label})</strong> {sq.content}
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setAnswers(prev => ({
                                ...prev,
                                [currentQ.id]: {
                                  ...(prev[currentQ.id] || {}),
                                  [sq.label]: true,
                                },
                              }));
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                              currentAns === true
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            ĐÚNG
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnswers(prev => ({
                                ...prev,
                                [currentQ.id]: {
                                  ...(prev[currentQ.id] || {}),
                                  [sq.label]: false,
                                },
                              }));
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                              currentAns === false
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            SAI
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DẠNG TRẢ LỜI NGẮN */}
              {currentQ.type === 'TLN' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Nhập câu trả lời ngắn của bạn:
                  </label>
                  <input
                    type="text"
                    value={answers[currentQ.id] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                    placeholder="Điền kết quả hoặc từ khóa ngắn..."
                    className="w-full p-3.5 rounded-2xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* DẠNG TỰ LUẬN */}
              {currentQ.type === 'TL' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Bài làm tự luận:
                  </label>
                  <textarea
                    rows={6}
                    value={answers[currentQ.id] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                    placeholder="Nhập nội dung trình bày bài làm của bạn..."
                    className="w-full p-3.5 rounded-2xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Nút chuyển câu trước / sau */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs disabled:opacity-40 hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Câu trước
                </button>

                <button
                  type="button"
                  disabled={currentQuestionIndex === questionsList.length - 1}
                  onClick={() => setCurrentQuestionIndex(i => Math.min(questionsList.length - 1, i + 1))}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-40"
                >
                  Câu tiếp theo <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BẢNG CHUYỂN CÂU HỎI (1 Cột) */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
              <h4 className="font-bold text-slate-900 text-xs">Danh sách câu hỏi</h4>

              <div className="grid grid-cols-5 gap-2">
                {questionsList.map((qItem: any, idx: number) => {
                  const isCurrent = currentQuestionIndex === idx;
                  const ans = answers[qItem.id];
                  const isAnswered =
                    ans !== undefined &&
                    (typeof ans === 'object' ? Object.keys(ans).length > 0 : String(ans).trim().length > 0);

                  return (
                    <button
                      key={qItem.id}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-9 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center ${
                        isCurrent
                          ? 'ring-2 ring-blue-600 ring-offset-2 bg-blue-600 text-white'
                          : isAnswered
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-400"></span>
                  <span>Đã trả lời</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-200"></span>
                  <span>Chưa trả lời</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BƯỚC 3: MÀN HÌNH KẾT QUẢ VÀ ĐÁP ÁN */}
      {step === 'finished' && submissionResult && (
        <div className="max-w-2xl mx-auto pt-8 sm:pt-16 px-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Award className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900">
              Nộp bài thành công!
            </h2>
            <p className="text-sm text-slate-500">
              Học sinh: <strong className="text-slate-800">{studentName}</strong> · Lớp:{' '}
              <strong className="text-slate-800">{studentClass}</strong>
            </p>

            {/* Khung điểm số */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-200 max-w-sm mx-auto">
              <span className="text-xs font-bold text-blue-700 block uppercase tracking-wider">
                ĐIỂM SỐ ĐẠT ĐƯỢC
              </span>
              <div className="mt-1 text-5xl font-extrabold font-mono text-blue-800">
                {submissionResult.score}{' '}
                <span className="text-2xl text-slate-500 font-normal">/ {submissionResult.total}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {submissionResult.score >= 8
                  ? '🌟 Xuất sắc! Kết quả rất ấn tượng!'
                  : submissionResult.score >= 5
                  ? '👍 Đạt yêu cầu! Cần tiếp tục ôn luyện các câu nâng cao.'
                  : '📖 Cần ôn tập kĩ hơn phần kiến thức kỹ thuật.'}
              </p>
            </div>

            {/* Chi tiết từng câu nếu được xem */}
            {submissionResult.showAnswer && submissionResult.detail && (
              <div className="text-left pt-6 border-t border-slate-100 space-y-4">
                <h4 className="font-bold text-slate-900 text-sm">Xem lại đáp án bài thi:</h4>
                <div className="space-y-3">
                  {submissionResult.detail.map((d, i) => (
                    <div
                      key={d.questionId}
                      className={`p-4 rounded-2xl border text-xs ${
                        d.isCorrect
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-rose-200 bg-rose-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span>Câu {i + 1} ({d.type})</span>
                        <span className={d.isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                          +{d.scoreEarned} / {d.maxScore} điểm
                        </span>
                      </div>
                      <div className="text-slate-700">
                        Bạn chọn: <strong className="font-mono">{JSON.stringify(d.studentAnswer)}</strong>
                      </div>
                      <div className="text-slate-900 mt-0.5">
                        Đáp án đúng: <strong className="font-mono text-emerald-800">{JSON.stringify(d.correctAnswer)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {onExitStudentMode && (
              <div className="pt-4">
                <button
                  onClick={onExitStudentMode}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Quay lại bảng quản lý giáo viên
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
