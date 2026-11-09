/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Exam, Question, GradeLevel, CognitiveLevel, QuestionType, ExamQuestionRef } from '../../types';
import { ExamPreviewModal } from './ExamPreviewModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { exportExamToDocx } from '../../services/wordExporter';
import {
  FilePlus,
  Wand2,
  ListCheck,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Printer,
  Shuffle,
  Trash2,
  ArrowUpDown,
  RefreshCw,
  Download,
  AlertTriangle,
  Eye,
  Plus,
  Upload,
  Info,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { OriginalExamUploadSection } from './OriginalExamUploadSection';

export const ExamBuilderView: React.FC = () => {
  const { questions, exams, addExam, deleteExam, setActiveTab, settings, importQuestions, saveShuffledPackage } = useApp();

  const [mode, setMode] = useState<'matrix' | 'manual' | 'import'>('matrix');

  // Thông tin đề
  const [title, setTitle] = useState('Kiểm tra Giữa kì I - Công nghệ');
  const [grade, setGrade] = useState<GradeLevel>('11');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [schoolYear, setSchoolYear] = useState(settings.schoolYear || '2026 - 2027');
  const [term, setTerm] = useState<Exam['term']>('giua_ky_1');

  // Điểm từng phần theo chuẩn Bộ GD&ĐT: Phần 1: 3.0đ, Phần 2: 4.0đ, Phần 3: 3.0đ, Tổng 10.0đ
  const [s1Points, setS1Points] = useState<number>(3.0); // Phần I: TN 4 lựa chọn (tối thiểu 12 câu, 3.0đ)
  const [s2Points, setS2Points] = useState<number>(4.0); // Phần II: Trắc nghiệm Đúng/Sai (đúng 4 câu, 4.0đ)
  const [s3Points, setS3Points] = useState<number>(3.0); // Phần III: Trả lời ngắn (tối thiểu 1 câu, 3.0đ)
  const [s4Points, setS4Points] = useState<number>(0.0); // Phần IV: Tự luận (tùy chọn)

  // Danh sách câu hỏi đang chọn trong đề thi (Khởi tạo rỗng, sẵn sàng tải đề gốc hoặc bốc ma trận)
  const [selectedRefs, setSelectedRefs] = useState<ExamQuestionRef[]>([]);

  // Bộ lọc thủ công
  const [manualFilterTopic, setManualFilterTopic] = useState('all');
  const [manualFilterLevel, setManualFilterLevel] = useState('all');
  const [manualFilterType, setManualFilterType] = useState('all');

  // Cấu hình Ma trận tự động chuẩn (12 TN: 6 Biết, 4 Hiểu, 2 Vận dụng; 4 Đ/S: 2 Biết, 2 Hiểu; 6 TLN: 6 Vận dụng)
  const [matrixConfig, setMatrixConfig] = useState<
    { topic: string; bietTN: number; hieuTN: number; vdTN: number; bietDS: number; hieuDS: number; tln: number; tl: number }[]
  >([
    { topic: 'Cơ khí chế tạo & Vật liệu', bietTN: 3, hieuTN: 2, vdTN: 1, bietDS: 1, hieuDS: 1, tln: 3, tl: 0 },
    { topic: 'Động cơ đốt trong', bietTN: 3, hieuTN: 2, vdTN: 1, bietDS: 1, hieuDS: 1, tln: 3, tl: 0 },
  ]);

  // Preview modal
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Map câu hỏi để truy xuất nhanh
  const questionsMap = useMemo(() => {
    const map: Record<string, Question> = {};
    questions.forEach(q => {
      map[q.id] = q;
    });
    return map;
  }, [questions]);

  // Câu hỏi thuộc khối lớp đã chọn
  const gradeQuestions = useMemo(() => {
    return questions.filter(q => q.grade === grade);
  }, [questions, grade]);

  // Danh sách chủ đề của khối lớp này
  const gradeTopics = useMemo(() => {
    const s = new Set<string>();
    gradeQuestions.forEach(q => q.topic && s.add(q.topic));
    return Array.from(s);
  }, [gradeQuestions]);

  // Cập nhật ma trận theo các chủ đề có sẵn
  const syncMatrixTopics = () => {
    if (gradeTopics.length === 0) return;
    setMatrixConfig(
      gradeTopics.map(t => ({
        topic: t,
        bietTN: 1,
        hieuTN: 1,
        vdTN: 0,
        bietDS: 0,
        hieuDS: 1,
        tln: 0,
        tl: 0,
      }))
    );
  };

  // Tính tổng điểm hiện tại
  const currentTotalPoints = useMemo(() => {
    return Number(
      selectedRefs.reduce((acc, r) => acc + (r.points || 0), 0).toFixed(2)
    );
  }, [selectedRefs]);

  // TỰ ĐỘNG RÚT CÂU HỎI THEO MA TRẬN
  const handleGenerateFromMatrix = () => {
    const newRefs: ExamQuestionRef[] = [];
    const usedIds = new Set<string>();
    let shortages = 0;

    matrixConfig.forEach(row => {
      const topic = row.topic;

      // Hàm con rút ngẫu nhiên
      const pickRandom = (type: QuestionType, level: CognitiveLevel, count: number, section: 1 | 2 | 3 | 4, pts: number) => {
        if (count <= 0) return;
        const pool = gradeQuestions.filter(
          q => q.topic === topic && q.type === type && q.level === level && !usedIds.has(q.id)
        );
        if (pool.length < count) {
          shortages += count - pool.length;
        }
        // Xáo ngẫu nhiên và lấy
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const picked = shuffled.slice(0, count);
        picked.forEach(q => {
          usedIds.add(q.id);
          newRefs.push({ questionId: q.id, points: pts, section });
        });
      };

      // 1. TN Nhận biết
      pickRandom('TN', 'Biet', row.bietTN, 1, 0.25);
      // 2. TN Thông hiểu
      pickRandom('TN', 'Hieu', row.hieuTN, 1, 0.25);
      // 3. TN Vận dụng
      pickRandom('TN', 'VanDung', row.vdTN, 1, 0.25);
      // 4. Đúng sai Nhận biết & Thông hiểu
      pickRandom('DS', 'Biet', row.bietDS, 2, 1.0);
      pickRandom('DS', 'Hieu', row.hieuDS, 2, 1.0);
      // 5. Trả lời ngắn
      pickRandom('TLN', 'VanDung', row.tln, 3, 0.5);
      // 6. Tự luận
      pickRandom('TL', 'VanDung', row.tl, 4, 1.5);
    });

    if (newRefs.length === 0) {
      alert('Không tìm thấy câu hỏi phù hợp trong ngân hàng cho ma trận đã nhập. Vui lòng bổ sung câu hỏi hoặc nới lỏng yêu cầu.');
      return;
    }

    if (shortages > 0) {
      alert(`Đã tạo đề với ${newRefs.length} câu. Ngân hàng còn thiếu ${shortages} câu để đáp ứng trọn vẹn ma trận.`);
    }

    // Tự động điều chỉnh điểm cho cân đối theo điểm từng phần
    const s1 = newRefs.filter(r => r.section === 1);
    const s2 = newRefs.filter(r => r.section === 2);
    const s3 = newRefs.filter(r => r.section === 3);
    const s4 = newRefs.filter(r => r.section === 4);

    if (s1.length > 0) s1.forEach(r => (r.points = Number((s1Points / s1.length).toFixed(2))));
    if (s2.length > 0) s2.forEach(r => (r.points = Number((s2Points / s2.length).toFixed(2))));
    if (s3.length > 0) s3.forEach(r => (r.points = Number((s3Points / s3.length).toFixed(2))));
    if (s4.length > 0) s4.forEach(r => (r.points = Number((s4Points / s4.length).toFixed(2))));

    setSelectedRefs(newRefs);
  };

  // Chọn thủ công câu hỏi
  const handleToggleManualQuestion = (q: Question) => {
    const isSelected = selectedRefs.some(r => r.questionId === q.id);
    if (isSelected) {
      setSelectedRefs(prev => prev.filter(r => r.questionId !== q.id));
    } else {
      let section: 1 | 2 | 3 | 4 = 1;
      let pts = 0.25;
      if (q.type === 'DS') {
        section = 2;
        pts = 1.0;
      } else if (q.type === 'TLN') {
        section = 3;
        pts = 0.5;
      } else if (q.type === 'TL') {
        section = 4;
        pts = 1.5;
      }

      setSelectedRefs(prev => [...prev, { questionId: q.id, points: pts, section }]);
    }
  };

  // Đổi nhanh câu hỏi cùng chủ đề & mức độ
  const handleSwapQuestion = (index: number) => {
    const targetRef = selectedRefs[index];
    const currentQ = questionsMap[targetRef.questionId];
    if (!currentQ) return;

    const usedIds = new Set(selectedRefs.map(r => r.questionId));
    // Tìm các câu thay thế tương đương
    const candidates = gradeQuestions.filter(
      q =>
        q.id !== currentQ.id &&
        !usedIds.has(q.id) &&
        q.type === currentQ.type &&
        (q.topic === currentQ.topic || q.level === currentQ.level)
    );

    if (candidates.length === 0) {
      alert('Không còn câu hỏi thay thế cùng dạng trong ngân hàng.');
      return;
    }

    const replacement = candidates[Math.floor(Math.random() * candidates.length)];
    setSelectedRefs(prev => {
      const copy = [...prev];
      copy[index] = { ...targetRef, questionId: replacement.id };
      return copy;
    });
  };

  // Xóa câu khỏi đề
  const handleRemoveQuestionFromExam = (index: number) => {
    setSelectedRefs(prev => prev.filter((_, i) => i !== index));
  };

  // Di chuyển thứ tự câu (lên / xuống)
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= selectedRefs.length) return;

    setSelectedRefs(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // ============================================================
  // BỘ KIỂM TRA TÍNH HỢP LỆ ĐỀ THI THEO CHUẨN BỘ GD&ĐT:
  // - Phần 1 (3.0 điểm): Tối thiểu đúng 12 câu TN 4 lựa chọn (0.25đ/câu)
  // - Phần 2 (4.0 điểm): Trắc nghiệm Đúng/Sai có đúng 4 câu, mỗi câu có đủ 4 lệnh hỏi a, b, c, d (1.0đ/câu)
  // - Phần 3 (3.0 điểm): Tối thiểu 1 câu trả lời ngắn / tự luận
  // - Tổng toàn đề: Đúng 10.0 điểm
  // ============================================================
  const validation = useMemo(() => {
    const s1Refs = selectedRefs.filter(r => r.section === 1);
    const s2Refs = selectedRefs.filter(r => r.section === 2);
    const s3Refs = selectedRefs.filter(r => r.section === 3);
    const s4Refs = selectedRefs.filter(r => r.section === 4);

    const s1Pts = Number(s1Refs.reduce((sum, r) => sum + (r.points || 0), 0).toFixed(2));
    const s2Pts = Number(s2Refs.reduce((sum, r) => sum + (r.points || 0), 0).toFixed(2));
    const s3Pts = Number(s3Refs.reduce((sum, r) => sum + (r.points || 0), 0).toFixed(2));
    const s4Pts = Number(s4Refs.reduce((sum, r) => sum + (r.points || 0), 0).toFixed(2));
    const totalPts = Number((s1Pts + s2Pts + s3Pts + s4Pts).toFixed(2));

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Kiểm tra Phần 1: Tối thiểu 12 câu TN 4 lựa chọn, 3.0 điểm
    const s1CountValid = s1Refs.length >= 12;
    if (!s1CountValid) {
      errors.push(`Phần 1: Cần tối thiểu 12 câu trắc nghiệm 4 lựa chọn (hiện có ${s1Refs.length}/12 câu).`);
    }
    const s1PointsValid = Math.abs(s1Pts - 3.0) < 0.05;
    if (!s1PointsValid) {
      warnings.push(`Phần 1: Tổng điểm hiện tại là ${s1Pts}đ (chuẩn quy định là 3.0 điểm).`);
    }

    // 2. Kiểm tra Phần 2: Đúng 4 câu Đúng/Sai, mỗi câu có đủ 4 lệnh hỏi a, b, c, d, 4.0 điểm
    const s2CountValid = s2Refs.length === 4;
    if (!s2CountValid) {
      errors.push(`Phần 2: Cần đúng 4 câu trắc nghiệm Đúng/Sai (hiện có ${s2Refs.length} câu).`);
    }

    // Kiểm tra từng câu Phần 2 xem có đủ 4 lệnh hỏi con không
    const invalidDSQuestions: { index: number; subCount: number; content: string }[] = [];
    s2Refs.forEach((ref, idx) => {
      const q = questionsMap[ref.questionId];
      const subCount = q?.subQuestions?.length || 0;
      if (subCount !== 4) {
        invalidDSQuestions.push({
          index: idx + 1,
          subCount,
          content: q?.content ? q.content.slice(0, 45) + '...' : `Câu ID ${ref.questionId}`,
        });
      }
    });

    const dsSubValid = invalidDSQuestions.length === 0;
    if (!dsSubValid) {
      invalidDSQuestions.forEach(item => {
        errors.push(`Phần 2 - Câu ${item.index}: Chỉ có ${item.subCount}/4 lệnh hỏi. Bắt buộc mỗi câu phải có đủ 4 lệnh hỏi a, b, c, d.`);
      });
    }

    const s2PointsValid = Math.abs(s2Pts - 4.0) < 0.05;
    if (!s2PointsValid) {
      warnings.push(`Phần 2: Tổng điểm hiện tại là ${s2Pts}đ (chuẩn quy định là 4.0 điểm).`);
    }

    // 3. Kiểm tra Phần 3: Tối thiểu 1 câu, 3.0 điểm
    const s3TotalCount = s3Refs.length + s4Refs.length;
    const s3CountValid = s3TotalCount >= 1;
    if (!s3CountValid) {
      errors.push(`Phần 3: Cần tối thiểu 1 câu trả lời ngắn hoặc tự luận (hiện có 0 câu).`);
    }
    const s3PointsValid = Math.abs(s3Pts + s4Pts - 3.0) < 0.05;
    if (!s3PointsValid) {
      warnings.push(`Phần 3: Tổng điểm hiện tại là ${(s3Pts + s4Pts).toFixed(2)}đ (chuẩn quy định là 3.0 điểm).`);
    }

    // 4. Kiểm tra tổng điểm toàn đề: Đúng 10.0 điểm
    const totalPointsValid = Math.abs(totalPts - 10.0) < 0.05;
    if (!totalPointsValid) {
      errors.push(`Tổng điểm toàn đề hiện là ${totalPts}đ (yêu cầu chuẩn phải đúng 10.0 điểm).`);
    }

    const isValid = s1CountValid && s2CountValid && dsSubValid && s3CountValid && totalPointsValid;

    return {
      isValid,
      s1Count: s1Refs.length,
      s1Pts,
      s1CountValid,
      s1PointsValid,
      s2Count: s2Refs.length,
      s2Pts,
      s2CountValid,
      s2PointsValid,
      dsSubValid,
      invalidDSQuestions,
      s3Count: s3TotalCount,
      s3Pts: Number((s3Pts + s4Pts).toFixed(2)),
      s3CountValid,
      s3PointsValid,
      totalPts,
      totalPointsValid,
      errors,
      warnings,
    };
  }, [selectedRefs, questionsMap]);

  // Kiểm tra tính hợp lệ của Ma trận đề thi trước khi bốc ngẫu nhiên
  const matrixValidation = useMemo(() => {
    const totalTN = matrixConfig.reduce((sum, r) => sum + (r.bietTN || 0) + (r.hieuTN || 0) + (r.vdTN || 0), 0);
    const totalDS = matrixConfig.reduce((sum, r) => sum + (r.bietDS || 0) + (r.hieuDS || 0), 0);
    const totalTLN = matrixConfig.reduce((sum, r) => sum + (r.tln || 0) + (r.tl || 0), 0);
    const expectedPoints = Number((totalTN * 0.25 + totalDS * 1.0 + totalTLN * 0.5).toFixed(2));

    const isTNValid = totalTN >= 12;
    const isDSValid = totalDS === 4;
    const isTLNValid = totalTLN >= 1;
    const isPointsValid = Math.abs(expectedPoints - 10.0) < 0.05;

    return {
      totalTN,
      totalDS,
      totalTLN,
      expectedPoints,
      isTNValid,
      isDSValid,
      isTLNValid,
      isPointsValid,
      isMatrixValid: isTNValid && isDSValid && isTLNValid,
    };
  }, [matrixConfig]);

  // Cân bằng tổng điểm đúng 10 điểm (theo điểm từng phần)
  const handleBalancePoints = () => {
    const s1 = selectedRefs.filter(r => r.section === 1);
    const s2 = selectedRefs.filter(r => r.section === 2);
    const s3 = selectedRefs.filter(r => r.section === 3);
    const s4 = selectedRefs.filter(r => r.section === 4);

    const updated = selectedRefs.map(ref => {
      if (ref.section === 1 && s1.length > 0) return { ...ref, points: Number((s1Points / s1.length).toFixed(2)) };
      if (ref.section === 2 && s2.length > 0) return { ...ref, points: Number((s2Points / s2.length).toFixed(2)) };
      if (ref.section === 3 && s3.length > 0) return { ...ref, points: Number((s3Points / s3.length).toFixed(2)) };
      if (ref.section === 4 && s4.length > 0) return { ...ref, points: Number((s4Points / s4.length).toFixed(2)) };
      return ref;
    });

    setSelectedRefs(updated);
  };

  // Tự động chuẩn hóa điểm theo chuẩn Bộ GD&ĐT:
  // Phần 1: 3.0đ (0.25đ/câu), Phần 2: 4.0đ (1.0đ/câu), Phần 3: 3.0đ (chia đều), Tổng 10.0đ
  const handleAutoStandardizePoints = () => {
    const s1Refs = selectedRefs.filter(r => r.section === 1);
    const s2Refs = selectedRefs.filter(r => r.section === 2);
    const s3Refs = selectedRefs.filter(r => r.section === 3);
    const s4Refs = selectedRefs.filter(r => r.section === 4);

    const s1PerQ = s1Refs.length > 0 ? Number((3.0 / s1Refs.length).toFixed(2)) : 0.25;
    const s2PerQ = s2Refs.length > 0 ? Number((4.0 / s2Refs.length).toFixed(2)) : 1.0;
    const p3Count = s3Refs.length + s4Refs.length;
    const s3PerQ = p3Count > 0 ? Number((3.0 / p3Count).toFixed(2)) : 0.5;

    let runningTotal = 0;
    const updated = selectedRefs.map((ref, idx) => {
      let pts = ref.points;
      if (ref.section === 1) pts = s1PerQ;
      else if (ref.section === 2) pts = s2PerQ;
      else if (ref.section === 3 || ref.section === 4) pts = s3PerQ;

      runningTotal += pts;
      return { ...ref, points: pts };
    });

    // Bù sai số làm tròn cho câu cuối cùng để tổng chính xác 10.0đ
    if (updated.length > 0) {
      const diff = Number((10.0 - runningTotal).toFixed(2));
      if (diff !== 0) {
        updated[updated.length - 1].points = Number((updated[updated.length - 1].points + diff).toFixed(2));
      }
    }

    setS1Points(3.0);
    setS2Points(4.0);
    setS3Points(3.0);
    setS4Points(0.0);
    setSelectedRefs(updated);
  };

  // Nạp ma trận mẫu chuẩn Bộ GD&ĐT (12 TN - 4 Đ/S - 6 TLN = 10 điểm)
  const handleResetStandardMatrix = () => {
    setMatrixConfig([
      { topic: 'Cơ khí chế tạo & Vật liệu', bietTN: 3, hieuTN: 2, vdTN: 1, bietDS: 1, hieuDS: 1, tln: 3, tl: 0 },
      { topic: 'Động cơ đốt trong', bietTN: 3, hieuTN: 2, vdTN: 1, bietDS: 1, hieuDS: 1, tln: 3, tl: 0 },
    ]);
  };

  // Lưu đề thi (kiểm tra tính hợp lệ trước khi lưu)
  const handleSaveExam = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề kiểm tra!');
      return;
    }
    if (selectedRefs.length === 0) {
      alert('Đề thi chưa có câu hỏi nào. Vui lòng chọn hoặc tạo câu hỏi!');
      return;
    }

    // Kiểm tra cấu trúc chuẩn Bộ GD&ĐT
    if (!validation.isValid) {
      const errorMsg = [
        'CẢNH BÁO: Cấu trúc đề thi chưa đạt chuẩn theo quy định của Bộ GD&ĐT:',
        ...validation.errors.map(e => `• ${e}`),
        '',
        'Bạn có muốn chuẩn hóa điểm ngay hoặc vẫn tiếp tục lưu đề thi này?',
      ].join('\n');

      const proceed = confirm(errorMsg);
      if (!proceed) {
        return;
      }
    }

    const newExam = addExam({
      title,
      grade,
      subject: 'Công nghệ',
      durationMinutes,
      schoolYear,
      term,
      sectionPoints: {
        section1: s1Points,
        section2: s2Points,
        section3: s3Points,
        section4: s4Points,
      },
      totalPoints: currentTotalPoints,
      questions: selectedRefs,
    });

    // Mở xem trước
    setPreviewExam(newExam);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Tiêu đề trang */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Soạn đề kiểm tra môn Công nghệ
          </h1>
          <p className="text-sm text-slate-500">
            Hỗ trợ cấu trúc 4 phần chuẩn Bộ GD&ĐT 2018: TN 4 lựa chọn, Đúng/Sai, Trả lời ngắn, Tự luận.
          </p>
        </div>

        {/* CÁC NÚT CHỨC NĂNG HÀNG NGANG VỚI MÀU SẮC BẮT MẮT RIÊNG BIỆT */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút 1: Tải file đề gốc (Tím Indigo) */}
          <button
            onClick={() => setMode('import')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98 ${
              mode === 'import'
                ? 'bg-indigo-700 text-white shadow-md ring-2 ring-indigo-400 ring-offset-1'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Upload className="w-4 h-4" /> 📂 Tải file đề gốc
          </button>

          {/* Nút 2: Tự động theo Ma trận (Xanh dương Blue) */}
          <button
            onClick={() => setMode('matrix')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98 ${
              mode === 'matrix'
                ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-400 ring-offset-1'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Wand2 className="w-4 h-4 text-amber-300" /> ✨ Tạo theo Ma trận
          </button>

          {/* Nút 3: Chọn thủ công (Cam Amber) */}
          <button
            onClick={() => setMode('manual')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98 ${
              mode === 'manual'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400 ring-offset-1'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            <ListCheck className="w-4 h-4" /> 📋 Chọn thủ công
          </button>

          {/* Nút 4: Xem trước & In (Xanh ngọc Teal) */}
          <button
            onClick={() => {
              const currentExamObj: Exam = {
                id: 'preview_temp',
                title: title || 'Đề kiểm tra Công nghệ',
                grade,
                subject: 'Công nghệ',
                durationMinutes,
                schoolYear,
                term,
                sectionPoints: { section1: s1Points, section2: s2Points, section3: s3Points, section4: s4Points },
                totalPoints: currentTotalPoints,
                questions: selectedRefs,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              setPreviewExam(currentExamObj);
            }}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98"
          >
            <Eye className="w-4 h-4" /> 👁 Xem trước & In
          </button>

          {/* Nút 5: Lưu đề thi (Xanh lá Emerald) */}
          <button
            onClick={handleSaveExam}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition cursor-pointer active:scale-98"
          >
            <CheckCircle className="w-4 h-4" /> 💾 Lưu đề thi
          </button>

          {/* Nút 6: Xáo mã đề (Tím Purple) */}
          <button
            onClick={() => setActiveTab('shuffler')}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition cursor-pointer active:scale-98"
            title="Chuyển sang trang xáo trộn nhiều mã đề"
          >
            <Shuffle className="w-4 h-4" /> 🔀 Xáo mã đề
          </button>
        </div>
      </div>

      {/* BƯỚC 1: THÔNG TIN ĐỀ & CẤU TRÚC ĐIỂM */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-extrabold">
            1
          </span>
          Thông tin đề kiểm tra
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Tên đề thi</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              placeholder="VD: Kiểm tra Giữa kì I - Công nghệ 11..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Khối lớp</label>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value as GradeLevel)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="10">Khối 10 (Thiết kế & Công nghệ)</option>
              <option value="11">Khối 11 (Công nghệ Cơ khí)</option>
              <option value="12">Khối 12 (Điện - Điện tử)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian làm bài</label>
            <select
              value={durationMinutes}
              onChange={e => setDurationMinutes(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value={15}>15 phút</option>
              <option value={45}>45 phút (1 tiết)</option>
              <option value={60}>60 phút</option>
              <option value={90}>90 phút (Học kì)</option>
            </select>
          </div>
        </div>

        {/* Cài đặt điểm từng phần */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <span className="text-xs font-bold text-slate-800">
                Phân bổ điểm đề thi (Chuẩn Bộ GD&ĐT: Phần 1: 3.0đ · Phần 2: 4.0đ · Phần 3: 3.0đ)
              </span>
              <span className={`ml-2 text-xs font-bold font-mono px-2 py-0.5 rounded-full ${Number((s1Points + s2Points + s3Points + s4Points).toFixed(2)) === 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                Tổng: {Number((s1Points + s2Points + s3Points + s4Points).toFixed(2))} / 10.0đ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoStandardizePoints}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                title="Tự động gán: Phần 1 = 3đ, Phần 2 = 4đ, Phần 3 = 3đ"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" /> Chuẩn hóa 3đ - 4đ - 3đ
              </button>
              <button
                type="button"
                onClick={handleBalancePoints}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50"
              >
                <RefreshCw className="w-3 h-3" /> Cân đối lại câu hỏi
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 block">Phần I: TN 4 LC</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={s1Points}
                onChange={e => setS1Points(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold font-mono text-sm"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 block">Phần II: Đúng / Sai</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={s2Points}
                onChange={e => setS2Points(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold font-mono text-sm"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 block">Phần III: Trả lời ngắn</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={s3Points}
                onChange={e => setS3Points(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold font-mono text-sm"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 block">Phần IV: Tự luận</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={s4Points}
                onChange={e => setS4Points(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* BƯỚC 2: PHƯƠNG THỨC CHỌN CÁCH TẠO ĐỀ (SẮP XẾP HÀNG NGANG, MÀU SẮC BẮT MẮT) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-extrabold">
              2
            </span>
            Chọn phương thức tạo đề thi
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Chọn 1 trong 3 cách: Tải file đề gốc có sẵn (Word/Excel), tạo tự động theo Ma trận tỉ lệ, hoặc chọn thủ công từng câu.
          </p>
        </div>

        {/* 3 NÚT PHƯƠNG THỨC TẠO ĐỀ NẰM THEO HÀNG NGANG VỚI MÀU SẮC RIÊNG BIỆT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* NÚT 1: TẢI FILE ĐỀ GỐC (MÀU TÍM INDIGO) */}
          <button
            type="button"
            onClick={() => setMode('import')}
            className={`p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 border-2 ${
              mode === 'import'
                ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-indigo-600 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400 ring-offset-2'
                : 'bg-indigo-50/50 hover:bg-indigo-50 text-slate-800 border-indigo-200/80 hover:border-indigo-400'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
                mode === 'import' ? 'bg-white/20 text-white' : 'bg-indigo-600 text-white shadow-xs'
              }`}
            >
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-sm font-bold ${mode === 'import' ? 'text-white' : 'text-indigo-950'}`}>
                  📂 Tải file đề gốc
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    mode === 'import' ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  Tiện nhất
                </span>
              </div>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  mode === 'import' ? 'text-indigo-100' : 'text-slate-600'
                }`}
              >
                Nhập file Word (.docx), Excel, tự động tách 4 phần & sinh mã xáo ngay.
              </p>
            </div>
          </button>

          {/* NÚT 2: TỰ ĐỘNG THEO MA TRẬN (MÀU XANH DƯƠNG BLUE) */}
          <button
            type="button"
            onClick={() => setMode('matrix')}
            className={`p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 border-2 ${
              mode === 'matrix'
                ? 'bg-gradient-to-br from-blue-600 to-sky-700 text-white border-blue-600 shadow-md shadow-blue-600/30 ring-2 ring-blue-400 ring-offset-2'
                : 'bg-blue-50/50 hover:bg-blue-50 text-slate-800 border-blue-200/80 hover:border-blue-400'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
                mode === 'matrix' ? 'bg-white/20 text-white' : 'bg-blue-600 text-white shadow-xs'
              }`}
            >
              <Wand2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-sm font-bold ${mode === 'matrix' ? 'text-white' : 'text-blue-950'}`}>
                  ✨ Tự động theo Ma trận
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    mode === 'matrix' ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  Chuẩn Bộ GD
                </span>
              </div>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  mode === 'matrix' ? 'text-blue-100' : 'text-slate-600'
                }`}
              >
                Bốc ngẫu nhiên câu hỏi theo cấu trúc ma trận Biết, Hiểu, Vận dụng.
              </p>
            </div>
          </button>

          {/* NÚT 3: CHỌN THỦ CÔNG (MÀU CAM AMBER) */}
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 border-2 ${
              mode === 'manual'
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-500 shadow-md shadow-amber-500/30 ring-2 ring-amber-400 ring-offset-2'
                : 'bg-amber-50/50 hover:bg-amber-50 text-slate-800 border-amber-200/80 hover:border-amber-400'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
                mode === 'manual' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white shadow-xs'
              }`}
            >
              <ListCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-sm font-bold ${mode === 'manual' ? 'text-white' : 'text-amber-950'}`}>
                  📋 Chọn thủ công
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    mode === 'manual' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Tự chọn
                </span>
              </div>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  mode === 'manual' ? 'text-amber-100' : 'text-slate-600'
                }`}
              >
                Chủ động lọc theo bài học và tick chọn từng câu hỏi từ ngân hàng.
              </p>
            </div>
          </button>
        </div>

        {/* CHẾ ĐỘ TẢI FILE ĐỀ GỐC */}
        {mode === 'import' && (
          <OriginalExamUploadSection
            grade={grade}
            setGrade={setGrade}
            schoolYear={schoolYear}
            settings={settings}
            onExamCreated={(newExam, shuffledPkg) => {
              addExam(newExam);
              if (shuffledPkg) {
                saveShuffledPackage(shuffledPkg);
                setActiveTab('shuffler');
              } else {
                setPreviewExam(newExam);
              }
            }}
            onAddQuestionsToBank={qs => {
              importQuestions(qs);
            }}
            onPreviewOriginalExam={(exam, map) => {
              setPreviewExam(exam);
            }}
          />
        )}

        {/* CHẾ ĐỘ MA TRẬN TỰ ĐỘNG */}
        {mode === 'matrix' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Nhập số lượng câu hỏi theo từng chủ đề và mức độ. Hệ thống sẽ tự động bốc ngẫu nhiên câu hỏi hợp lệ.
              </span>
              <button
                type="button"
                onClick={syncMatrixTopics}
                className="text-blue-600 font-bold hover:underline"
              >
                Cập nhật các chủ đề của Lớp {grade}
              </button>
            </div>

            {/* BẢNG KIỂM TRA TÍNH HỢP LỆ MA TRẬN */}
            <div className={`p-3.5 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
              matrixValidation.isMatrixValid && matrixValidation.isPointsValid
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Kiểm tra ma trận:
                </span>
                <span className={`px-2 py-0.5 rounded font-bold font-mono ${matrixValidation.isTNValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  Phần 1: {matrixValidation.totalTN} / 12 câu TN {matrixValidation.isTNValid ? '✓' : '(Thiếu)'}
                </span>
                <span className={`px-2 py-0.5 rounded font-bold font-mono ${matrixValidation.isDSValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  Phần 2: {matrixValidation.totalDS} / 4 câu Đ/S {matrixValidation.isDSValid ? '✓' : '(Cần đúng 4)'}
                </span>
                <span className={`px-2 py-0.5 rounded font-bold font-mono ${matrixValidation.isTLNValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  Phần 3: {matrixValidation.totalTLN} câu TLN/TL (≥1) {matrixValidation.isTLNValid ? '✓' : '(Thiếu)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Dự kiến:</span>
                <span className={`font-mono font-extrabold px-2 py-0.5 rounded ${matrixValidation.isPointsValid ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'}`}>
                  {matrixValidation.expectedPoints} / 10.0đ
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3 border-b">Chủ đề</th>
                    <th className="p-3 border-b text-center">TN Biết</th>
                    <th className="p-3 border-b text-center">TN Hiểu</th>
                    <th className="p-3 border-b text-center">TN Vận dụng</th>
                    <th className="p-3 border-b text-center">Đ/S Biết</th>
                    <th className="p-3 border-b text-center">Đ/S Hiểu</th>
                    <th className="p-3 border-b text-center">Trả lời ngắn</th>
                    <th className="p-3 border-b text-center">Tự luận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrixConfig.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-semibold text-slate-900 max-w-[200px]">
                        <input
                          type="text"
                          value={row.topic}
                          onChange={e => {
                            const copy = [...matrixConfig];
                            copy[idx].topic = e.target.value;
                            setMatrixConfig(copy);
                          }}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.bietTN}
                          onChange={e => {
                            const copy = [...matrixConfig];
                            copy[idx].bietTN = parseInt(e.target.value) || 0;
                            setMatrixConfig(copy);
                          }}
                          className="w-12 text-center px-1 py-1 border border-slate-200 rounded font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.hieuTN}
                          onChange={e => {
                            const copy = [...matrixConfig];
                            copy[idx].hieuTN = parseInt(e.target.value) || 0;
                            setMatrixConfig(copy);
                          }}
                          className="w-12 text-center px-1 py-1 border border-slate-200 rounded font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.vdTN}
                          onChange={e => {
                            const copy = [...matrixConfig];
                            copy[idx].vdTN = parseInt(e.target.value) || 0;
                            setMatrixConfig(copy);
                          }}
                          className="w-12 text-center px-1 py-1 border border-slate-200 rounded font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.bietDS}
                          onChange={e => {
                            const copy = [...matrixConfig];
                            copy[idx].bietDS = parseInt(e.target.value) || 0;
                            setMatrixConfig(copy);
                          }}
                          className="w-12 text-center px-1 py-1 border border-slate-200 rounded font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.hieuDS}
                          onChange={e => {
                            const copy = [...matrixConfig];
                            copy[idx].hieuDS = parseInt(e.target.value) || 0;
                            setMatrixConfig(copy);
                          }}
                          className="w-12 text-center px-1 py-1 border border-slate-200 rounded font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.tln}
                          onChange={e => {
                            const copy = [...matrixConfig];
                            copy[idx].tln = parseInt(e.target.value) || 0;
                            setMatrixConfig(copy);
                          }}
                          className="w-12 text-center px-1 py-1 border border-slate-200 rounded font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.tl}
                          onChange={e => {
                            const copy = [...matrixConfig];
                            copy[idx].tl = parseInt(e.target.value) || 0;
                            setMatrixConfig(copy);
                          }}
                          className="w-12 text-center px-1 py-1 border border-slate-200 rounded font-mono font-bold"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetStandardMatrix}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1.5"
                title="Thiết lập nhanh: 12 TN (3đ), 4 Đ/S (4đ), 6 TLN (3đ)"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Nạp ma trận chuẩn 10đ (12 TN - 4 Đ/S - 6 TLN)
              </button>

              <button
                type="button"
                onClick={handleGenerateFromMatrix}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Wand2 className="w-4 h-4 text-amber-300" /> Bốc câu hỏi tự động theo Ma trận
              </button>
            </div>
          </div>
        )}

        {/* CHẾ ĐỘ THỦ CÔNG */}
        {mode === 'manual' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={manualFilterTopic}
                onChange={e => setManualFilterTopic(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-300"
              >
                <option value="all">Tất cả chủ đề</option>
                {gradeTopics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={manualFilterLevel}
                onChange={e => setManualFilterLevel(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-300"
              >
                <option value="all">Mọi mức độ</option>
                <option value="Biet">Nhận biết</option>
                <option value="Hieu">Thông hiểu</option>
                <option value="VanDung">Vận dụng</option>
              </select>

              <select
                value={manualFilterType}
                onChange={e => setManualFilterType(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-300"
              >
                <option value="all">Mọi loại câu</option>
                <option value="TN">Trắc nghiệm 4 LC</option>
                <option value="DS">Đúng / Sai</option>
                <option value="TLN">Trả lời ngắn</option>
                <option value="TL">Tự luận</option>
              </select>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {gradeQuestions
                .filter(q => {
                  if (manualFilterTopic !== 'all' && q.topic !== manualFilterTopic) return false;
                  if (manualFilterLevel !== 'all' && q.level !== manualFilterLevel) return false;
                  if (manualFilterType !== 'all' && q.type !== manualFilterType) return false;
                  return true;
                })
                .map(q => {
                  const isChecked = selectedRefs.some(r => r.questionId === q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => handleToggleManualQuestion(q)}
                      className={`p-3 text-xs flex items-start gap-3 cursor-pointer transition ${
                        isChecked ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-800">{q.type}</span>
                          <span className="text-slate-500">· {q.topic}</span>
                          <span className="font-semibold text-slate-600">· {q.level}</span>
                        </div>
                        <p className="text-slate-900 font-medium line-clamp-2">{q.content}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* DANH SÁCH CÂU HỎI TRONG ĐỀ THI HIỆN TẠI & BẢNG KIỂM TRA TÍNH HỢP LỆ */}
      {mode !== 'import' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
          {/* BẢNG KIỂM TRA TÍNH HỢP LỆ THEO CHUẨN BỘ GD&ĐT */}
          <div className={`rounded-2xl border p-4 sm:p-5 transition-all ${
            validation.isValid
              ? 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-green-50 border-emerald-300'
              : 'bg-gradient-to-br from-amber-50 via-rose-50/40 to-orange-50 border-amber-300'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  validation.isValid ? 'bg-emerald-600 text-white shadow-xs' : 'bg-amber-600 text-white shadow-xs'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    Kiểm tra tính hợp lệ đề thi (Chuẩn Bộ GD&ĐT 2025/2018)
                    {validation.isValid ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider">
                        ✓ Đạt chuẩn 100%
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white uppercase tracking-wider">
                        Chưa đạt ({validation.errors.length} tiêu chí)
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Quy chuẩn: Phần 1 (3đ) ≥ 12 câu TN · Phần 2 (4đ) đúng 4 câu Đ/S (đủ 4 lệnh hỏi a, b, c, d) · Phần 3 (3đ) ≥ 1 câu · Tổng 10.0đ.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAutoStandardizePoints}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-98 cursor-pointer"
                  title="Tự động gán điểm chuẩn 3đ - 4đ - 3đ và làm tròn chính xác 10.0 điểm"
                >
                  <Sparkles className="w-3.5 h-3.5" /> ⚡ Tự động chuẩn hóa điểm 10.0đ
                </button>
              </div>
            </div>

            {/* GRID 4 TIÊU CHÍ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3.5">
              {/* Tiêu chí 1: Phần 1 (3.0đ) */}
              <div className={`p-3 rounded-xl border ${
                validation.s1CountValid && validation.s1PointsValid
                  ? 'bg-white border-emerald-200'
                  : 'bg-white/80 border-amber-300'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800">Phần I: TN 4 Lựa chọn</span>
                  {validation.s1CountValid && validation.s1PointsValid ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Đạt</span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-0.5"><AlertCircle className="w-3.5 h-3.5" /> Cần sửa</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Số câu (≥ 12):</span>
                    <strong className={validation.s1CountValid ? 'text-emerald-700 font-mono' : 'text-rose-600 font-mono'}>
                      {validation.s1Count} / 12 câu
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng điểm:</span>
                    <strong className={validation.s1PointsValid ? 'text-emerald-700 font-mono' : 'text-amber-600 font-mono'}>
                      {validation.s1Pts} / 3.0 đ
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tiêu chí 2: Phần 2 (4.0đ) */}
              <div className={`p-3 rounded-xl border ${
                validation.s2CountValid && validation.dsSubValid && validation.s2PointsValid
                  ? 'bg-white border-emerald-200'
                  : 'bg-white/80 border-amber-300'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800">Phần II: Đúng / Sai</span>
                  {validation.s2CountValid && validation.dsSubValid && validation.s2PointsValid ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Đạt</span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-0.5"><AlertCircle className="w-3.5 h-3.5" /> Cần sửa</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Số câu (= 4):</span>
                    <strong className={validation.s2CountValid ? 'text-emerald-700 font-mono' : 'text-rose-600 font-mono'}>
                      {validation.s2Count} / 4 câu
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Lệnh hỏi (đủ 4 ý a,b,c,d):</span>
                    <strong className={validation.dsSubValid ? 'text-emerald-700' : 'text-rose-600'}>
                      {validation.dsSubValid ? 'Đủ 4 ý' : `${validation.invalidDSQuestions.length} câu thiếu`}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng điểm:</span>
                    <strong className={validation.s2PointsValid ? 'text-emerald-700 font-mono' : 'text-amber-600 font-mono'}>
                      {validation.s2Pts} / 4.0 đ
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tiêu chí 3: Phần 3 (3.0đ) */}
              <div className={`p-3 rounded-xl border ${
                validation.s3CountValid && validation.s3PointsValid
                  ? 'bg-white border-emerald-200'
                  : 'bg-white/80 border-amber-300'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800">Phần III: TL Ngắn / Tự luận</span>
                  {validation.s3CountValid && validation.s3PointsValid ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Đạt</span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-0.5"><AlertCircle className="w-3.5 h-3.5" /> Cần sửa</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Số câu (≥ 1):</span>
                    <strong className={validation.s3CountValid ? 'text-emerald-700 font-mono' : 'text-rose-600 font-mono'}>
                      {validation.s3Count} câu
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng điểm:</span>
                    <strong className={validation.s3PointsValid ? 'text-emerald-700 font-mono' : 'text-amber-600 font-mono'}>
                      {validation.s3Pts} / 3.0 đ
                    </strong>
                  </div>
                </div>
              </div>

              {/* Tiêu chí 4: Toàn đề (10.0đ) */}
              <div className={`p-3 rounded-xl border ${
                validation.totalPointsValid
                  ? 'bg-white border-emerald-200'
                  : 'bg-white/80 border-rose-300'
              }`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-800">Toàn đề thi</span>
                  {validation.totalPointsValid ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Chuẩn</span>
                  ) : (
                    <span className="text-rose-700 font-bold flex items-center gap-0.5"><XCircle className="w-3.5 h-3.5" /> Sai điểm</span>
                  )}
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Tổng số câu:</span>
                    <strong className="text-slate-800 font-mono">
                      {selectedRefs.length} câu
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng điểm (= 10đ):</span>
                    <strong className={validation.totalPointsValid ? 'text-emerald-700 font-mono font-bold' : 'text-rose-600 font-mono font-bold'}>
                      {validation.totalPts} / 10.0 đ
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* NỘI DUNG LỖI CHI TIẾT NẾU CHƯA ĐẠT */}
            {!validation.isValid && (
              <div className="mt-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  Cần điều chỉnh các tiêu chí sau trước khi lưu hoặc in đề thi:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800 font-medium">
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {validation.warnings.map((warn, i) => (
                    <li key={`w_${i}`} className="text-amber-800">{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Danh sách câu hỏi trong đề ({selectedRefs.length} câu)
              </h3>
              <p className="text-xs text-slate-500">
                Tổng điểm hiện tại:{' '}
                <strong className={validation.totalPointsValid ? 'text-emerald-600' : 'text-amber-600'}>
                  {currentTotalPoints} / 10.0 điểm
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoStandardizePoints}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Chuẩn hóa điểm 10.0đ
              </button>
              <button
                type="button"
                onClick={handleBalancePoints}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cân đối lại điểm
              </button>
            </div>
          </div>

        {selectedRefs.length === 0 ? (
          <div className="py-10 px-6 text-center bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Chưa có câu hỏi nào trong đề thi</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Bạn có thể tải file đề gốc (.docx) có sẵn để tạo và xáo đề tự động, hoặc tạo đề theo Ma trận, hoặc tự chọn từng câu từ ngân hàng câu hỏi.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('import')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Upload className="w-3.5 h-3.5" /> 📂 Tải file đề gốc ngay
              </button>
              <button
                type="button"
                onClick={() => setMode('matrix')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Wand2 className="w-3.5 h-3.5" /> ✨ Tạo theo Ma trận
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <ListCheck className="w-3.5 h-3.5" /> 📋 Chọn thủ công
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedRefs.map((ref, idx) => {
              const q = questionsMap[ref.questionId];
              if (!q) return null;

              return (
                <div
                  key={`${ref.questionId}_${idx}`}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-blue-700">Phần {ref.section} ({q.type})</span>
                        <span className="text-slate-500 truncate">· {q.topic}</span>
                        <span className="font-semibold text-slate-600">· {q.level}</span>
                      </div>
                      <p className="font-medium text-slate-900 line-clamp-2 leading-relaxed">
                        {q.content}
                      </p>
                    </div>
                  </div>

                  {/* Điểm & Nút thao tác đổi/di chuyển */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Điểm:</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="10"
                        value={ref.points}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setSelectedRefs(prev => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], points: val };
                            return copy;
                          });
                        }}
                        className="w-14 text-center px-1.5 py-1 border border-slate-200 rounded font-mono font-bold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSwapQuestion(idx)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Đổi nhanh câu khác cùng chủ đề/mức độ"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveQuestion(idx, 'up')}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 rounded-lg"
                      title="Chuyển lên trên"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      disabled={idx === selectedRefs.length - 1}
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 rounded-lg"
                      title="Chuyển xuống dưới"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestionFromExam(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title="Bỏ câu này khỏi đề"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* DANH SÁCH ĐỀ THI ĐÃ LƯU TRONG HỆ THỐNG */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Các đề thi đã lưu ({exams.length} đề)
        </h3>

        {exams.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Chưa có đề thi nào được lưu trong hệ thống. Hãy tải file đề gốc hoặc soạn đề thi mới bằng các nút phía trên.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {exams.map(exam => (
            <div key={exam.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{exam.title}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">
                    Lớp {exam.grade}
                  </span>
                  {exam.isDemo && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      DEMO
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Thời gian: {exam.durationMinutes} phút · Số câu: {exam.questions.length} câu · Tổng điểm: {exam.totalPoints}đ
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setPreviewExam(exam)}
                  className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-98"
                >
                  <Eye className="w-3.5 h-3.5" /> 👁 Xem / In
                </button>

                <button
                  onClick={() => exportExamToDocx(exam, questionsMap, settings, true)}
                  className="px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-98"
                  title="Xuất file Word (.docx) đề gốc kèm đáp án"
                >
                  <Download className="w-3.5 h-3.5" /> 📄 Word
                </button>

                <button
                  onClick={() => setActiveTab('shuffler')}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-98"
                >
                  <Shuffle className="w-3.5 h-3.5" /> 🔀 Xáo đề
                </button>

                <button
                  onClick={() => setDeleteConfirmId(exam.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Xóa đề thi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* MODAL XEM TRƯỚC ĐỀ THI */}
      <ExamPreviewModal
        isOpen={Boolean(previewExam)}
        exam={previewExam}
        questionsMap={questionsMap}
        settings={settings}
        onClose={() => setPreviewExam(null)}
      />

      {/* MODAL XÁC NHẬN XÓA ĐỀ */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmId)}
        title="Xóa đề kiểm tra?"
        message="Hành động này sẽ xóa đề thi khỏi danh sách và cập nhật lên Google Sheet. Bạn có chắc chắn không?"
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteExam(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};
