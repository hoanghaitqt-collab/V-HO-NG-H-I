/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Shuffle,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Sliders,
  Check,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  Question,
  Exam,
  GradeLevel,
  ExamQuestionRef,
  ShuffledExamPackage,
  AppSettings,
} from '../../types';
import {
  parseDocxFile,
  parseExcelFile,
  parseTextOrHtmlContent,
  downloadSampleOriginalExamDocx,
  downloadSampleExcel,
} from '../../services/fileParser';
import { generateShuffledCodes, ShufflerOptions } from '../../services/gradingService';

interface OriginalExamUploadSectionProps {
  grade: GradeLevel;
  setGrade: (grade: GradeLevel) => void;
  schoolYear: string;
  settings: Partial<AppSettings>;
  onExamCreated: (newExam: Exam, shuffledPackage?: ShuffledExamPackage) => void;
  onAddQuestionsToBank: (questions: Question[]) => void;
  onPreviewOriginalExam: (exam: Exam, map: Record<string, Question>) => void;
}

export const OriginalExamUploadSection: React.FC<OriginalExamUploadSectionProps> = ({
  grade,
  setGrade,
  schoolYear,
  settings,
  onExamCreated,
  onAddQuestionsToBank,
  onPreviewOriginalExam,
}) => {
  const [examTitle, setExamTitle] = useState('Đề kiểm tra môn Công nghệ 11 (Công nghệ Cơ khí) - Đề gốc');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [term, setTerm] = useState<Exam['term']>('giua_ky_1');

  // File parsing states
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [parseErrors, setParseErrors] = useState<{ line: number; message: string }[]>([]);
  const [questionPoints, setQuestionPoints] = useState<Record<string, number>>({});

  // Options
  const [addToBank, setAddToBank] = useState(true);

  // Shuffler settings (Hoán vị câu & hoán vị đáp án)
  const [numberOfCodes, setNumberOfCodes] = useState<number>(4);
  const [startingCode, setStartingCode] = useState<number>(101);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [respectLockOptionOrder, setRespectLockOptionOrder] = useState(true);
  const [separateSections, setSeparateSections] = useState(true);

  // Xử lý đọc file đề thi gốc (.docx, .xlsx, .txt)
  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);
    setParseErrors([]);

    const ext = file.name.split('.').pop()?.toLowerCase();
    const topic = grade === '11' ? 'Cơ khí & Động cơ đốt trong' : grade === '10' ? 'Thiết kế & Vẽ kĩ thuật' : 'Kĩ thuật điện';

    try {
      let result;
      if (ext === 'docx') {
        result = await parseDocxFile(file, grade, topic);
      } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        result = await parseExcelFile(file, grade, topic);
      } else if (ext === 'txt') {
        const text = await file.text();
        result = parseTextOrHtmlContent(text, grade, topic);
      } else {
        alert('Định dạng file không được hỗ trợ. Vui lòng chọn file .docx, .xlsx hoặc .txt!');
        setIsLoading(false);
        return;
      }

      setParsedQuestions(result.questions);
      setParseErrors(result.errors);

      // Tự động phân bổ điểm ban đầu chuẩn xác theo cấu trúc 3đ - 4đ - 3đ = 10đ:
      // Phần 1 (TN): 3.0 điểm
      // Phần 2 (Đ/S): 4.0 điểm
      // Phần 3 (TLN / TL): 3.0 điểm
      const tnList = result.questions.filter(q => q.type === 'TN');
      const dsList = result.questions.filter(q => q.type === 'DS');
      const tlnList = result.questions.filter(q => q.type === 'TLN' || q.type === 'TL');

      const pointsMap: Record<string, number> = {};
      const tnPts = tnList.length > 0 ? Number((3.0 / tnList.length).toFixed(2)) : 0.25;
      const dsPts = dsList.length > 0 ? Number((4.0 / dsList.length).toFixed(2)) : 1.0;
      const tlnPts = tlnList.length > 0 ? Number((3.0 / tlnList.length).toFixed(2)) : 0.5;

      result.questions.forEach(q => {
        if (q.type === 'TN') pointsMap[q.id] = tnPts;
        else if (q.type === 'DS') pointsMap[q.id] = dsPts;
        else pointsMap[q.id] = tlnPts;
      });
      setQuestionPoints(pointsMap);

      // Cập nhật tên đề thi nếu tên file có ý nghĩa
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/[_|-]+/g, ' ');
      if (cleanFileName.length > 5) {
        setExamTitle(`Đề thi: ${cleanFileName}`);
      }
    } catch (err: any) {
      alert(`Lỗi phân tích file đề gốc: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Cân đối điểm tự động chuẩn Bộ GD&ĐT (Phần 1: 3đ, Phần 2: 4đ, Phần 3: 3đ = 10.0đ)
  const handleNormalizePointsToTen = () => {
    if (parsedQuestions.length === 0) return;

    const tnList = parsedQuestions.filter(q => q.type === 'TN');
    const dsList = parsedQuestions.filter(q => q.type === 'DS');
    const tlnList = parsedQuestions.filter(q => q.type === 'TLN' || q.type === 'TL');

    const newPoints: Record<string, number> = {};
    const tnPts = tnList.length > 0 ? Number((3.0 / tnList.length).toFixed(2)) : 0.25;
    const dsPts = dsList.length > 0 ? Number((4.0 / dsList.length).toFixed(2)) : 1.0;
    const tlnPts = tlnList.length > 0 ? Number((3.0 / tlnList.length).toFixed(2)) : 0.5;

    let runningTotal = 0;
    parsedQuestions.forEach(q => {
      let pts = 0.25;
      if (q.type === 'TN') pts = tnPts;
      else if (q.type === 'DS') pts = dsPts;
      else pts = tlnPts;

      runningTotal += pts;
      newPoints[q.id] = pts;
    });

    // Bù sai số cho câu cuối cùng để tổng vừa đúng 10.0đ
    if (parsedQuestions.length > 0) {
      const lastQ = parsedQuestions[parsedQuestions.length - 1];
      const diff = Number((10.0 - runningTotal).toFixed(2));
      if (diff !== 0) {
        newPoints[lastQ.id] = Number(((newPoints[lastQ.id] || 0) + diff).toFixed(2));
      }
    }

    setQuestionPoints(newPoints);
  };

  const totalPoints = Number(
    parsedQuestions.reduce((acc, q) => acc + (questionPoints[q.id] || 0), 0).toFixed(2)
  );

  // ============================================================
  // BỘ KIỂM TRA TÍNH HỢP LỆ ĐỀ GỐC THEO CHUẨN BỘ GD&ĐT:
  // - Phần 1 (3 điểm): Tối thiểu đúng 12 câu TN 4 lựa chọn (≥ 12 câu, 3.0đ)
  // - Phần 2 (4 điểm): Đúng 4 câu Đúng/Sai, mỗi câu đủ 4 lệnh hỏi a, b, c, d (1.0đ/câu, 4.0đ)
  // - Phần 3 (3 điểm): Tối thiểu 1 câu (≥ 1 câu, 3.0đ)
  // - Tổng đề thi: Đúng 10.0 điểm
  // ============================================================
  const uploadedValidation = useMemo(() => {
    const tnQuestions = parsedQuestions.filter(q => q.type === 'TN');
    const dsQuestions = parsedQuestions.filter(q => q.type === 'DS');
    const tlnQuestions = parsedQuestions.filter(q => q.type === 'TLN' || q.type === 'TL');

    const s1Pts = Number(tnQuestions.reduce((sum, q) => sum + (questionPoints[q.id] || 0), 0).toFixed(2));
    const s2Pts = Number(dsQuestions.reduce((sum, q) => sum + (questionPoints[q.id] || 0), 0).toFixed(2));
    const s3Pts = Number(tlnQuestions.reduce((sum, q) => sum + (questionPoints[q.id] || 0), 0).toFixed(2));
    const totalPts = Number((s1Pts + s2Pts + s3Pts).toFixed(2));

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Phần 1: Tối thiểu 12 câu TN 4 lựa chọn, 3.0đ
    const s1CountValid = tnQuestions.length >= 12;
    if (!s1CountValid) {
      errors.push(`Phần 1: Tệp gốc có ${tnQuestions.length}/12 câu trắc nghiệm 4 lựa chọn (cần tối thiểu 12 câu).`);
    }
    const s1PointsValid = Math.abs(s1Pts - 3.0) < 0.05;
    if (!s1PointsValid && tnQuestions.length > 0) {
      warnings.push(`Phần 1: Tổng điểm là ${s1Pts}đ (chuẩn quy định là 3.0 điểm).`);
    }

    // 2. Phần 2: Đúng 4 câu Đúng/Sai, mỗi câu đủ 4 lệnh hỏi a, b, c, d, 4.0đ
    const s2CountValid = dsQuestions.length === 4;
    if (!s2CountValid) {
      errors.push(`Phần 2: Tệp gốc có ${dsQuestions.length} câu Đúng/Sai (chuẩn quy định là đúng 4 câu).`);
    }

    const invalidDS: { index: number; subCount: number }[] = [];
    dsQuestions.forEach((q, idx) => {
      const subCount = q.subQuestions?.length || 0;
      if (subCount !== 4) {
        invalidDS.push({ index: idx + 1, subCount });
      }
    });

    const dsSubValid = invalidDS.length === 0;
    if (!dsSubValid) {
      invalidDS.forEach(item => {
        errors.push(`Phần 2 - Câu ${item.index}: Chỉ có ${item.subCount}/4 lệnh hỏi con. Bắt buộc tệp gốc phải có đủ 4 lệnh hỏi a, b, c, d.`);
      });
    }
    const s2PointsValid = Math.abs(s2Pts - 4.0) < 0.05;
    if (!s2PointsValid && dsQuestions.length > 0) {
      warnings.push(`Phần 2: Tổng điểm là ${s2Pts}đ (chuẩn quy định là 4.0 điểm).`);
    }

    // 3. Phần 3: Tối thiểu 1 câu, 3.0đ
    const s3CountValid = tlnQuestions.length >= 1;
    if (!s3CountValid) {
      errors.push(`Phần 3: Cần tối thiểu 1 câu trả lời ngắn hoặc tự luận trong tệp gốc.`);
    }
    const s3PointsValid = Math.abs(s3Pts - 3.0) < 0.05;
    if (!s3PointsValid && tlnQuestions.length > 0) {
      warnings.push(`Phần 3: Tổng điểm là ${s3Pts}đ (chuẩn quy định là 3.0 điểm).`);
    }

    // 4. Tổng điểm: Đúng 10.0đ
    const totalPointsValid = Math.abs(totalPts - 10.0) < 0.05;
    if (!totalPointsValid) {
      errors.push(`Tổng điểm đề thi là ${totalPts}đ (yêu cầu chuẩn phải đúng 10.0 điểm).`);
    }

    const isValid = s1CountValid && s2CountValid && dsSubValid && s3CountValid && totalPointsValid;

    return {
      isValid,
      tnCount: tnQuestions.length,
      s1Pts,
      s1CountValid,
      s1PointsValid,
      dsCount: dsQuestions.length,
      s2Pts,
      s2CountValid,
      s2PointsValid,
      dsSubValid,
      invalidDS,
      tlnCount: tlnQuestions.length,
      s3Pts,
      s3CountValid,
      s3PointsValid,
      totalPts,
      totalPointsValid,
      errors,
      warnings,
    };
  }, [parsedQuestions, questionPoints]);

  // Xây dựng Exam object từ các câu hỏi đã parse
  const buildExamObject = (): { exam: Exam; map: Record<string, Question> } => {
    const qMap: Record<string, Question> = {};
    parsedQuestions.forEach(q => {
      qMap[q.id] = q;
    });

    const refs: ExamQuestionRef[] = parsedQuestions.map(q => {
      let section: 1 | 2 | 3 | 4 = 1;
      if (q.type === 'DS') section = 2;
      else if (q.type === 'TLN') section = 3;
      else if (q.type === 'TL') section = 4;

      return {
        questionId: q.id,
        points: questionPoints[q.id] || 0.25,
        section,
      };
    });

    const s1Pts = refs.filter(r => r.section === 1).reduce((sum, r) => sum + r.points, 0);
    const s2Pts = refs.filter(r => r.section === 2).reduce((sum, r) => sum + r.points, 0);
    const s3Pts = refs.filter(r => r.section === 3).reduce((sum, r) => sum + r.points, 0);
    const s4Pts = refs.filter(r => r.section === 4).reduce((sum, r) => sum + r.points, 0);

    const exam: Exam = {
      id: `exam_imported_${Date.now()}`,
      title: examTitle.trim() || 'Đề thi gốc môn Công nghệ',
      grade,
      subject: 'Công nghệ',
      durationMinutes,
      totalPoints,
      schoolYear: schoolYear || '2026 - 2027',
      term,
      questions: refs,
      sectionPoints: {
        section1: Number(s1Pts.toFixed(2)),
        section2: Number(s2Pts.toFixed(2)),
        section3: Number(s3Pts.toFixed(2)),
        section4: Number(s4Pts.toFixed(2)),
      },
      matrix: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return { exam, map: qMap };
  };

  // Tạo đề thi gốc
  const handleCreateOriginalExamOnly = () => {
    if (parsedQuestions.length === 0) {
      alert('Vui lòng tải lên file đề thi gốc hợp lệ trước!');
      return;
    }

    if (!uploadedValidation.isValid) {
      const errorMsg = [
        'CẢNH BÁO: Tệp đề gốc chưa đạt chuẩn cấu trúc Bộ GD&ĐT:',
        ...uploadedValidation.errors.map((e: string) => `• ${e}`),
        '',
        'Bạn có muốn lưu đề này không?',
      ].join('\n');

      const proceed = confirm(errorMsg);
      if (!proceed) return;
    }

    const { exam } = buildExamObject();

    if (addToBank) {
      onAddQuestionsToBank(parsedQuestions);
    }

    onExamCreated(exam);
  };

  // Tạo đề thi gốc VÀ XÁO NGAY THÀNH NHIỀU MÃ ĐỀ (hoán vị câu, hoán vị đáp án)
  const handleCreateAndShuffleImmediately = () => {
    if (parsedQuestions.length === 0) {
      alert('Vui lòng tải lên file đề thi gốc hợp lệ trước!');
      return;
    }

    if (!uploadedValidation.isValid) {
      const errorMsg = [
        'CẢNH BÁO: Tệp đề gốc chưa đạt chuẩn cấu trúc Bộ GD&ĐT:',
        ...uploadedValidation.errors.map((e: string) => `• ${e}`),
        '',
        'Bạn có muốn tiếp tục xáo mã đề từ tệp đề gốc này không?',
      ].join('\n');

      const proceed = confirm(errorMsg);
      if (!proceed) return;
    }

    const { exam, map } = buildExamObject();

    const options: ShufflerOptions = {
      numberOfCodes,
      startingCode,
      shuffleQuestions,
      shuffleOptions,
      respectLockOptionOrder,
      separateSections,
    };

    const codes = generateShuffledCodes(exam, map, options);

    const shuffledPkg: ShuffledExamPackage = {
      id: `pkg_from_orig_${Date.now()}`,
      examId: exam.id,
      examTitle: exam.title,
      grade: exam.grade,
      durationMinutes: exam.durationMinutes,
      schoolYear: exam.schoolYear,
      term: exam.term,
      codes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (addToBank) {
      onAddQuestionsToBank(parsedQuestions);
    }

    onExamCreated(exam, shuffledPkg);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KHU VỰC TẢI FILE ĐỀ GỐC */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 rounded-2xl p-6 sm:p-8 text-center transition flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
          <Upload className="w-8 h-8" />
        </div>

        <div>
          <h4 className="text-base font-extrabold text-slate-900">
            Kéo thả file đề thi gốc hoặc chọn từ máy tính
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
            Hỗ trợ file Word (<code className="font-mono text-blue-700">.docx</code>), Excel (<code className="font-mono text-blue-700">.xlsx, .csv</code>), hoặc Text (<code className="font-mono text-blue-700">.txt</code>). Hệ thống tự nhận diện các Phần I, II, III, IV và đáp án.
          </p>
        </div>

        {/* Nút chọn file & Nút tải mẫu sắp xếp hàng ngang với màu sắc riêng biệt */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 cursor-pointer transition active:scale-98">
            <Upload className="w-4 h-4" />
            <span>📂 Chọn file đề gốc</span>
            <input
              type="file"
              accept=".docx,.xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />
          </label>

          <button
            type="button"
            onClick={downloadSampleOriginalExamDocx}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs shadow-xs transition active:scale-98"
            title="Tải file Word chuẩn đề thi 4 phần có đáp án"
          >
            <Download className="w-4 h-4" />
            <span>📄 Tải đề gốc mẫu Word (.docx)</span>
          </button>

          <button
            type="button"
            onClick={downloadSampleExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs shadow-xs transition active:scale-98"
            title="Tải bảng mẫu Excel các câu hỏi"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📊 Tải mẫu Excel (.xlsx)</span>
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs pt-2 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Đang phân tích cấu trúc đề thi gốc, vui lòng chờ trong giây lát...
          </div>
        )}
      </div>

      {/* KHI ĐÃ CÓ CÂU HỎI TỪ FILE ĐỀ GỐC */}
      {parsedQuestions.length > 0 && (
        <div className="space-y-6">
          {/* Thông tin cấu hình Đề thi gốc */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Thông tin đề thi gốc đã nhập ({fileName})
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Nhận diện: {parsedQuestions.length} câu
              </span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên đề thi gốc</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  placeholder="Nhập tên đề kiểm tra..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp</label>
                <select
                  value={grade}
                  onChange={e => setGrade(e.target.value as GradeLevel)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="10">Khối 10 (Thiết kế & Công nghệ)</option>
                  <option value="11">Khối 11 (Công nghệ Cơ khí)</option>
                  <option value="12">Khối 12 (Điện - Điện tử)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kỳ kiểm tra</label>
                <select
                  value={term}
                  onChange={e => setTerm(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="15_phut">Kiểm tra Thường xuyên (15 phút)</option>
                  <option value="giua_ky_1">Kiểm tra Giữa kì I</option>
                  <option value="cuoi_ky_1">Kiểm tra Cuối kì I</option>
                  <option value="giua_ky_2">Kiểm tra Giữa kì II</option>
                  <option value="cuoi_ky_2">Kiểm tra Cuối kì II</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian làm bài</label>
                <select
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value={15}>15 phút</option>
                  <option value={45}>45 phút (1 tiết)</option>
                  <option value={60}>60 phút</option>
                  <option value={90}>90 phút (Học kì)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tổng điểm đề thi</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono bg-white text-blue-700">
                    {totalPoints} / 10.0 đ
                  </div>
                  <button
                    type="button"
                    onClick={handleNormalizePointsToTen}
                    className="px-2.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold shrink-0 transition"
                    title="Cân đối lại điểm các câu để tổng vừa đúng 10 điểm"
                  >
                    Chuẩn hóa 10đ
                  </button>
                </div>
              </div>
            </div>

            {/* Báo cáo lỗi / cảnh báo định dạng nếu có */}
            {parseErrors.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Có {parseErrors.length} lưu ý khi đọc file đề gốc (dữ liệu thật, không bịa đặt):
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] max-h-24 overflow-y-auto">
                  {parseErrors.map((err, i) => (
                    <li key={i}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* BẢNG KIỂM TRA TÍNH HỢP LỆ CỦA TỆP ĐỀ GỐC THEO CHUẨN BỘ GD&ĐT */}
          <div className={`rounded-2xl border p-4 sm:p-5 transition-all ${
            uploadedValidation.isValid
              ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-green-50 border-emerald-300'
              : 'bg-gradient-to-br from-amber-50 via-rose-50/40 to-orange-50 border-amber-300'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  uploadedValidation.isValid ? 'bg-emerald-600 text-white shadow-xs' : 'bg-amber-600 text-white shadow-xs'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    Kiểm tra tính hợp lệ đề thi gốc (Chuẩn Bộ GD&ĐT 2025/2018)
                    {uploadedValidation.isValid ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider">
                        ✓ Đạt chuẩn 100%
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white uppercase tracking-wider">
                        Chưa đạt chuẩn ({uploadedValidation.errors.length} lỗi)
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Dữ liệu được trích xuất 100% nguyên bản từ tệp gốc: Phần 1 (≥ 12 câu TN, 3đ) · Phần 2 (đúng 4 câu Đ/S đủ 4 lệnh hỏi, 4đ) · Phần 3 (≥ 1 câu, 3đ) · Tổng 10.0đ.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleNormalizePointsToTen}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-98 cursor-pointer"
                  title="Tự động chuẩn hóa phân bổ 3đ - 4đ - 3đ = 10.0đ"
                >
                  <Sparkles className="w-3.5 h-3.5" /> ⚡ Chuẩn hóa 3đ - 4đ - 3đ
                </button>
              </div>
            </div>

            {/* GRID 4 TIÊU CHÍ TỆP GỐC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3.5">
              {/* Tiêu chí 1: Phần 1 */}
              <div className={`p-3 rounded-xl border ${
                uploadedValidation.s1CountValid && uploadedValidation.s1PointsValid
                  ? 'bg-white border-emerald-200'
                  : 'bg-white/80 border-amber-300'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800">Phần I: TN 4 Lựa chọn</span>
                  {uploadedValidation.s1CountValid && uploadedValidation.s1PointsValid ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Đạt</span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-0.5"><AlertCircle className="w-3.5 h-3.5" /> Chưa đạt</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Số câu (≥ 12):</span>
                    <strong className={uploadedValidation.s1CountValid ? 'text-emerald-700 font-mono' : 'text-rose-600 font-mono'}>
                      {uploadedValidation.tnCount} / 12 câu
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng điểm:</span>
                    <strong className={uploadedValidation.s1PointsValid ? 'text-emerald-700 font-mono' : 'text-amber-600 font-mono'}>
                      {uploadedValidation.s1Pts} / 3.0 đ
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tiêu chí 2: Phần 2 */}
              <div className={`p-3 rounded-xl border ${
                uploadedValidation.s2CountValid && uploadedValidation.dsSubValid && uploadedValidation.s2PointsValid
                  ? 'bg-white border-emerald-200'
                  : 'bg-white/80 border-amber-300'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800">Phần II: Đúng / Sai</span>
                  {uploadedValidation.s2CountValid && uploadedValidation.dsSubValid && uploadedValidation.s2PointsValid ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Đạt</span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-0.5"><AlertCircle className="w-3.5 h-3.5" /> Chưa đạt</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Số câu (= 4):</span>
                    <strong className={uploadedValidation.s2CountValid ? 'text-emerald-700 font-mono' : 'text-rose-600 font-mono'}>
                      {uploadedValidation.dsCount} / 4 câu
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Lệnh hỏi (đủ 4 ý a,b,c,d):</span>
                    <strong className={uploadedValidation.dsSubValid ? 'text-emerald-700' : 'text-rose-600'}>
                      {uploadedValidation.dsSubValid ? 'Đủ 4 ý' : `${uploadedValidation.invalidDS.length} câu thiếu`}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng điểm:</span>
                    <strong className={uploadedValidation.s2PointsValid ? 'text-emerald-700 font-mono' : 'text-amber-600 font-mono'}>
                      {uploadedValidation.s2Pts} / 4.0 đ
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tiêu chí 3: Phần 3 */}
              <div className={`p-3 rounded-xl border ${
                uploadedValidation.s3CountValid && uploadedValidation.s3PointsValid
                  ? 'bg-white border-emerald-200'
                  : 'bg-white/80 border-amber-300'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800">Phần III: TL Ngắn / Tự luận</span>
                  {uploadedValidation.s3CountValid && uploadedValidation.s3PointsValid ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Đạt</span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-0.5"><AlertCircle className="w-3.5 h-3.5" /> Chưa đạt</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Số câu (≥ 1):</span>
                    <strong className={uploadedValidation.s3CountValid ? 'text-emerald-700 font-mono' : 'text-rose-600 font-mono'}>
                      {uploadedValidation.tlnCount} câu
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng điểm:</span>
                    <strong className={uploadedValidation.s3PointsValid ? 'text-emerald-700 font-mono' : 'text-amber-600 font-mono'}>
                      {uploadedValidation.s3Pts} / 3.0 đ
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tiêu chí 4: Toàn đề */}
              <div className={`p-3 rounded-xl border ${
                uploadedValidation.totalPointsValid
                  ? 'bg-white border-emerald-200'
                  : 'bg-white/80 border-rose-300'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800">Toàn đề gốc</span>
                  {uploadedValidation.totalPointsValid ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Chuẩn</span>
                  ) : (
                    <span className="text-rose-700 font-bold flex items-center gap-0.5"><XCircle className="w-3.5 h-3.5" /> Sai điểm</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Tổng số câu:</span>
                    <strong className="text-slate-800 font-mono">
                      {parsedQuestions.length} câu
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng điểm (= 10đ):</span>
                    <strong className={uploadedValidation.totalPointsValid ? 'text-emerald-700 font-mono font-bold' : 'text-rose-600 font-mono font-bold'}>
                      {uploadedValidation.totalPts} / 10.0 đ
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* DANH SÁCH LỖI NẾU CÓ */}
            {!uploadedValidation.isValid && (
              <div className="mt-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  Cần lưu ý về cấu trúc tệp đề gốc trước khi xáo mã đề:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800 font-medium">
                  {uploadedValidation.errors.map((err: string, i: number) => (
                    <li key={i}>{err}</li>
                  ))}
                  {uploadedValidation.warnings.map((warn: string, i: number) => (
                    <li key={`uw_${i}`} className="text-amber-800">{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* BẢNG CẤU HÌNH XÁO ĐỀ TRỰC TIẾP TỪ ĐỀ GỐC */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-blue-50/80 border border-indigo-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
              <h4 className="text-sm font-extrabold text-indigo-950 flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-indigo-600" />
                Cấu hình Xáo đề (Hoán vị thứ tự câu hỏi & phương án đáp án)
              </h4>
              <span className="text-xs text-indigo-700 font-semibold bg-indigo-100/70 px-2.5 py-1 rounded-full">
                Sẵn sàng sinh mã đề
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng mã đề cần xáo</label>
                <select
                  value={numberOfCodes}
                  onChange={e => setNumberOfCodes(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={2}>2 mã đề</option>
                  <option value={4}>4 mã đề (Khuyến nghị)</option>
                  <option value={6}>6 mã đề</option>
                  <option value={8}>8 mã đề</option>
                  <option value={12}>12 mã đề</option>
                  <option value={24}>24 mã đề</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã đề bắt đầu</label>
                <input
                  type="number"
                  value={startingCode}
                  onChange={e => setStartingCode(parseInt(e.target.value) || 101)}
                  className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white text-sm font-bold font-mono text-indigo-900"
                  placeholder="101"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col justify-end space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={e => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>🔀 Hoán vị thứ tự câu hỏi</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={e => setShuffleOptions(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>🔤 Hoán vị phương án đáp án A, B, C, D</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-indigo-100/70 text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={respectLockOptionOrder}
                  onChange={e => setRespectLockOptionOrder(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-600 rounded"
                />
                <span>Giữ nguyên đáp án câu cố định ("Cả A và B", công thức)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={separateSections}
                  onChange={e => setSeparateSections(e.target.checked)}
                  className="w-3.5 h-3.5 text-indigo-600 rounded"
                />
                <span>Xáo riêng theo từng phần (Phần I, II, III, IV độc lập)</span>
              </label>
            </div>
          </div>

          {/* DANH SÁCH CÂU HỎI TRONG ĐỀ THI GỐC */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                Chi tiết câu hỏi trong đề gốc ({parsedQuestions.length} câu)
              </h4>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addToBank}
                  onChange={e => setAddToBank(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Đồng thời thêm câu hỏi vào Ngân hàng câu hỏi</span>
              </label>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
              {parsedQuestions.map((q, idx) => {
                const pts = questionPoints[q.id] || 0.25;
                return (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                              {q.type === 'TN' ? 'Phần I: TN 4 LC' : q.type === 'DS' ? 'Phần II: Đúng/Sai' : q.type === 'TLN' ? 'Phần III: Trả lời ngắn' : 'Phần IV: Tự luận'}
                            </span>
                            <span className="text-slate-500 font-medium truncate">· {q.topic}</span>
                            {q.type === 'TN' && (
                              <span className="font-bold text-emerald-700">
                                Đáp án đúng: {q.correctOption}
                              </span>
                            )}
                            {q.type === 'TLN' && (
                              <span className="font-bold text-emerald-700">
                                Đáp án: {q.shortAnswer}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-900 leading-relaxed">
                            {q.content}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Điểm:</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="10"
                            value={pts}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              setQuestionPoints(prev => ({ ...prev, [q.id]: val }));
                            }}
                            className="w-14 text-center px-1 py-0.5 border border-slate-200 rounded font-mono font-bold text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setParsedQuestions(prev => prev.filter(item => item.id !== q.id));
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Bỏ câu này khỏi đề"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Hiển thị các phương án của câu trắc nghiệm */}
                    {q.type === 'TN' && q.options && (
                      <div className="grid grid-cols-2 gap-1.5 pl-8 pt-1 text-[11px] text-slate-700">
                        <div className={`p-1 rounded ${q.correctOption === 'A' ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200' : 'bg-slate-50'}`}>
                          A. {q.options.A}
                        </div>
                        <div className={`p-1 rounded ${q.correctOption === 'B' ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200' : 'bg-slate-50'}`}>
                          B. {q.options.B}
                        </div>
                        <div className={`p-1 rounded ${q.correctOption === 'C' ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200' : 'bg-slate-50'}`}>
                          C. {q.options.C}
                        </div>
                        <div className={`p-1 rounded ${q.correctOption === 'D' ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200' : 'bg-slate-50'}`}>
                          D. {q.options.D}
                        </div>
                      </div>
                    )}

                    {/* Hiển thị các ý Đúng / Sai */}
                    {q.type === 'DS' && q.subQuestions && (
                      <div className="pl-8 pt-1 space-y-1 text-[11px]">
                        {q.subQuestions.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded">
                            <span>{sub.label}) {sub.content}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sub.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {sub.isCorrect ? 'ĐÚNG' : 'SAI'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CÁC NÚT HÀNH ĐỘNG NỔI BẬT */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Đã sẵn sàng tạo đề thi và sinh mã đề xáo
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {parsedQuestions.length} câu hỏi · {totalPoints} điểm · {numberOfCodes} mã đề xáo
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const { exam, map } = buildExamObject();
                  onPreviewOriginalExam(exam, map);
                }}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-98"
              >
                <Eye className="w-4 h-4" /> 👁 Xem trước đề gốc
              </button>

              <button
                type="button"
                onClick={handleCreateOriginalExamOnly}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-98"
              >
                <FileText className="w-4 h-4" /> 💾 Lưu đề thi gốc
              </button>

              <button
                type="button"
                onClick={handleCreateAndShuffleImmediately}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-extrabold flex items-center gap-2 transition shadow-md shadow-purple-600/30 cursor-pointer active:scale-98"
              >
                <Shuffle className="w-4 h-4 text-amber-300" />
                <span>🔀 Tạo đề & Xáo ngay thành {numberOfCodes} mã đề</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
