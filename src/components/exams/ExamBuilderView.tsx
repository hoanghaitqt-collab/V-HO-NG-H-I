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

  // Điểm từng phần
  const [s1Points, setS1Points] = useState<number>(3.0); // TN
  const [s2Points, setS2Points] = useState<number>(2.0); // DS
  const [s3Points, setS3Points] = useState<number>(2.0); // TLN
  const [s4Points, setS4Points] = useState<number>(3.0); // TL

  // Danh sách câu hỏi đang chọn cho đề
  const [selectedRefs, setSelectedRefs] = useState<ExamQuestionRef[]>([
    { questionId: 'demo-q3', points: 1.0, section: 1 },
    { questionId: 'demo-q4', points: 1.0, section: 1 },
    { questionId: 'demo-q5', points: 2.0, section: 2 },
    { questionId: 'demo-q7', points: 2.0, section: 3 },
    { questionId: 'demo-q10', points: 4.0, section: 4 },
  ]);

  // Bộ lọc thủ công
  const [manualFilterTopic, setManualFilterTopic] = useState('all');
  const [manualFilterLevel, setManualFilterLevel] = useState('all');
  const [manualFilterType, setManualFilterType] = useState('all');

  // Cấu hình Ma trận tự động
  const [matrixConfig, setMatrixConfig] = useState<
    { topic: string; bietTN: number; hieuTN: number; vdTN: number; bietDS: number; hieuDS: number; tln: number; tl: number }[]
  >([
    { topic: 'Cơ khí chế tạo & Vật liệu', bietTN: 2, hieuTN: 1, vdTN: 1, bietDS: 0, hieuDS: 1, tln: 0, tl: 1 },
    { topic: 'Động cơ đốt trong', bietTN: 1, hieuTN: 1, vdTN: 0, bietDS: 0, hieuDS: 1, tln: 1, tl: 0 },
    { topic: 'Kĩ thuật điện', bietTN: 1, hieuTN: 0, vdTN: 0, bietDS: 0, hieuDS: 0, tln: 1, tl: 0 },
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

  // Cân bằng tổng điểm đúng 10 điểm
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

  // Lưu đề thi
  const handleSaveExam = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề kiểm tra!');
      return;
    }
    if (selectedRefs.length === 0) {
      alert('Đề thi chưa có câu hỏi nào. Vui lòng chọn hoặc tạo câu hỏi!');
      return;
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700">
              Phân bổ điểm cho 4 phần (Tổng: 10 điểm)
            </span>
            <button
              type="button"
              onClick={handleBalancePoints}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Cân đối lại điểm câu hỏi
            </button>
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

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3 border-b">Chủ đề</th>
                    <th className="p-3 border-b text-center">TN Biết</th>
                    <th className="p-3 border-b text-center">TN Hiểu</th>
                    <th className="p-3 border-b text-center">TN Vận dụng</th>
                    <th className="p-3 border-b text-center">Đúng/Sai</th>
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGenerateFromMatrix}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Wand2 className="w-4 h-4" /> Bốc câu hỏi tự động theo Ma trận
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

      {/* DANH SÁCH CÂU HỎI TRONG ĐỀ THI HIỆN TẠI */}
      {mode !== 'import' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Danh sách câu hỏi trong đề ({selectedRefs.length} câu)
            </h3>
            <p className="text-xs text-slate-500">
              Tổng điểm hiện tại:{' '}
              <strong className={currentTotalPoints === 10 ? 'text-emerald-600' : 'text-amber-600'}>
                {currentTotalPoints} / 10 điểm
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBalancePoints}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Cân đối lại điểm
            </button>
          </div>
        </div>

        {selectedRefs.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Chưa có câu hỏi nào trong đề. Vui lòng bấm tạo theo Ma trận hoặc chọn thủ công.
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
