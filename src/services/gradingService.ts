/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, Exam, ShuffledExamCode, ShuffledQuestionItem, ShuffledQuestionOption, StudentSubmissionDetail } from '../types';

/**
 * Xáo trộn một mảng theo thuật toán Fisher-Yates
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface ShufflerOptions {
  numberOfCodes: number; // 2 - 24
  startingCode?: number; // mặc định 101
  shuffleQuestions: boolean; // Xáo thứ tự câu hỏi
  shuffleOptions: boolean; // Xáo đáp án A, B, C, D
  respectLockOptionOrder: boolean; // Giữ nguyên thứ tự đáp án cho câu đánh dấu
  separateSections: boolean; // Giữ nguyên phân định theo 4 phần
}

/**
 * Tạo gói các mã đề xáo từ 1 đề gốc
 */
export function generateShuffledCodes(
  exam: Exam,
  questionsMap: Record<string, Question>,
  options: ShufflerOptions
): ShuffledExamCode[] {
  const codes: ShuffledExamCode[] = [];
  const startNum = options.startingCode || 101;

  for (let c = 0; c < options.numberOfCodes; c++) {
    const codeStr = String(startNum + c);

    // Lấy danh sách câu hỏi gốc
    const refList = [...exam.questions];

    let orderedRefs: typeof refList = [];
    if (options.separateSections) {
      // Phân loại theo 4 phần
      const s1 = refList.filter(r => r.section === 1);
      const s2 = refList.filter(r => r.section === 2);
      const s3 = refList.filter(r => r.section === 3);
      const s4 = refList.filter(r => r.section === 4);

      const shuffledS1 = options.shuffleQuestions ? shuffleArray(s1) : s1;
      const shuffledS2 = options.shuffleQuestions ? shuffleArray(s2) : s2;
      const shuffledS3 = options.shuffleQuestions ? shuffleArray(s3) : s3;
      const shuffledS4 = options.shuffleQuestions ? shuffleArray(s4) : s4;

      orderedRefs = [...shuffledS1, ...shuffledS2, ...shuffledS3, ...shuffledS4];
    } else {
      orderedRefs = options.shuffleQuestions ? shuffleArray(refList) : refList;
    }

    const shuffledQuestions: ShuffledQuestionItem[] = [];
    const answerKey: Record<number, string> = {};
    const originalToShuffledMap: Record<number, number> = {};

    orderedRefs.forEach((ref, newIndex) => {
      const displayIndex = newIndex + 1;
      const originalIndex = exam.questions.findIndex(q => q.questionId === ref.questionId) + 1;
      originalToShuffledMap[originalIndex] = displayIndex;

      const q = questionsMap[ref.questionId];
      if (!q) return;

      if (q.type === 'TN') {
        const originalOpts = [
          { key: 'A' as const, text: q.options?.A || '' },
          { key: 'B' as const, text: q.options?.B || '' },
          { key: 'C' as const, text: q.options?.C || '' },
          { key: 'D' as const, text: q.options?.D || '' },
        ].filter(opt => opt.text.trim().length > 0);

        let finalOptions: ShuffledQuestionOption[] = [];
        let correctDisplayOption: 'A' | 'B' | 'C' | 'D' = 'A';

        if (options.shuffleOptions && (!options.respectLockOptionOrder || !q.lockOptionOrder)) {
          const permuted = shuffleArray(originalOpts);
          const letters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
          finalOptions = permuted.map((item, idx) => {
            const newKey = letters[idx];
            if (item.key === q.correctOption) {
              correctDisplayOption = newKey;
            }
            return {
              key: newKey,
              originalKey: item.key,
              text: item.text,
            };
          });
        } else {
          finalOptions = originalOpts.map(item => ({
            key: item.key,
            originalKey: item.key,
            text: item.text,
          }));
          correctDisplayOption = q.correctOption || 'A';
        }

        answerKey[displayIndex] = correctDisplayOption;

        shuffledQuestions.push({
          originalQuestionId: q.id,
          displayIndex,
          section: ref.section,
          content: q.content,
          type: 'TN',
          options: finalOptions,
          correctDisplayOption,
          points: ref.points,
          imageUrl: q.imageUrl,
          topic: q.topic,
          level: q.level,
        });
      } else if (q.type === 'DS') {
        // Đúng/Sai
        const dsKey = (q.subQuestions || []).map(sq => (sq.isCorrect ? 'Đ' : 'S')).join('-');
        answerKey[displayIndex] = dsKey;

        shuffledQuestions.push({
          originalQuestionId: q.id,
          displayIndex,
          section: ref.section,
          content: q.content,
          type: 'DS',
          subQuestions: q.subQuestions,
          points: ref.points,
          imageUrl: q.imageUrl,
          topic: q.topic,
          level: q.level,
        });
      } else if (q.type === 'TLN') {
        // Trả lời ngắn
        answerKey[displayIndex] = q.shortAnswer || '';
        shuffledQuestions.push({
          originalQuestionId: q.id,
          displayIndex,
          section: ref.section,
          content: q.content,
          type: 'TLN',
          shortAnswer: q.shortAnswer,
          points: ref.points,
          imageUrl: q.imageUrl,
          topic: q.topic,
          level: q.level,
        });
      } else {
        // Tự luận
        answerKey[displayIndex] = 'Tự luận';
        shuffledQuestions.push({
          originalQuestionId: q.id,
          displayIndex,
          section: ref.section,
          content: q.content,
          type: 'TL',
          essayGuide: q.essayGuide,
          points: ref.points,
          imageUrl: q.imageUrl,
          topic: q.topic,
          level: q.level,
        });
      }
    });

    codes.push({
      code: codeStr,
      questions: shuffledQuestions,
      answerKey,
      originalToShuffledMap,
    });
  }

  return codes;
}

/**
 * Chấm điểm tự động bài làm học sinh theo quy chế chuẩn của Bộ GD&ĐT
 */
export function gradeStudentSubmission(
  exam: Exam,
  questionsMap: Record<string, Question>,
  studentAnswers: Record<string, any>
): { score: number; totalScore: number; detail: StudentSubmissionDetail[] } {
  let score = 0;
  let totalScore = 0;
  const detail: StudentSubmissionDetail[] = [];

  for (const ref of exam.questions) {
    const q = questionsMap[ref.questionId];
    if (!q) continue;

    const maxScore = ref.points || 0.25;
    totalScore += maxScore;
    let earned = 0;
    const stuAns = studentAnswers[q.id];

    if (q.type === 'TN') {
      const isCorrect = Boolean(stuAns && String(stuAns).toUpperCase() === (q.correctOption || '').toUpperCase());
      if (isCorrect) earned = maxScore;
      detail.push({
        questionId: q.id,
        type: 'TN',
        studentAnswer: stuAns || null,
        correctAnswer: q.correctOption,
        scoreEarned: earned,
        maxScore,
        isCorrect,
      });
    } else if (q.type === 'DS') {
      const subList = q.subQuestions || [];
      let correctCount = 0;
      subList.forEach(sq => {
        const userChoice = stuAns && typeof stuAns[sq.label] !== 'undefined' ? stuAns[sq.label] : null;
        if (userChoice === sq.isCorrect) {
          correctCount++;
        }
      });

      // Thang điểm Đúng/Sai 4 ý mới:
      // 1 ý đúng: 10%
      // 2 ý đúng: 25%
      // 3 ý đúng: 50%
      // 4 ý đúng: 100%
      let ratio = 0;
      if (correctCount === 1) ratio = 0.1;
      else if (correctCount === 2) ratio = 0.25;
      else if (correctCount === 3) ratio = 0.5;
      else if (correctCount === 4) ratio = 1.0;

      earned = maxScore * ratio;
      detail.push({
        questionId: q.id,
        type: 'DS',
        studentAnswer: stuAns || {},
        correctAnswer: subList.map(sq => ({ label: sq.label, isCorrect: sq.isCorrect })),
        scoreEarned: earned,
        maxScore,
        isCorrect: correctCount === 4,
      });
    } else if (q.type === 'TLN') {
      const rawAns = (stuAns || '').toString().trim().toLowerCase();
      const validAnswers = (q.shortAnswer || '')
        .split('|')
        .map(v => v.trim().toLowerCase())
        .filter(Boolean);

      const isCorrect = validAnswers.length > 0 && validAnswers.includes(rawAns);
      if (isCorrect) earned = maxScore;

      detail.push({
        questionId: q.id,
        type: 'TLN',
        studentAnswer: stuAns || '',
        correctAnswer: q.shortAnswer,
        scoreEarned: earned,
        maxScore,
        isCorrect,
      });
    } else {
      // Tự luận
      detail.push({
        questionId: q.id,
        type: 'TL',
        studentAnswer: stuAns || '',
        correctAnswer: q.essayGuide || '',
        scoreEarned: 0,
        maxScore,
        isCorrect: false,
      });
    }

    score += earned;
  }

  // Làm tròn 2 số thập phân
  score = Math.round(score * 100) / 100;
  totalScore = Math.round(totalScore * 100) / 100;

  return { score, totalScore, detail };
}
