/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { Question, GradeLevel, CognitiveLevel, QuestionType, SubQuestionDS } from '../types';

export interface ParseResult {
  questions: Question[];
  errors: { line: number; message: string }[];
  totalParsed: number;
}

/**
 * Phân tích file Excel (.xlsx, .xls, .csv)
 * YÊU CẦU: Chỉ lấy dữ liệu xác thực từ file gốc, không được bịa đặt.
 */
export async function parseExcelFile(
  file: File,
  defaultGrade: GradeLevel = '11',
  defaultTopic: string = 'Cơ khí & Động cơ đốt trong'
): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rows.length < 2) {
    return {
      questions: [],
      errors: [{ line: 1, message: 'File Excel không có dữ liệu câu hỏi hoặc thiếu dòng tiêu đề.' }],
      totalParsed: 0,
    };
  }

  // Tìm hàng tiêu đề (header)
  const headerRow = rows[0].map((c: any) => (c ? String(c).trim().toLowerCase() : ''));
  const colIndex = {
    grade: headerRow.findIndex((h: string) => h.includes('lớp') || h.includes('grade')),
    topic: headerRow.findIndex((h: string) => h.includes('chủ đề') || h.includes('bài') || h.includes('topic')),
    level: headerRow.findIndex((h: string) => h.includes('mức độ') || h.includes('level')),
    type: headerRow.findIndex((h: string) => h.includes('loại') || h.includes('dạng') || h.includes('type')),
    content: headerRow.findIndex((h: string) => h.includes('nội dung') || h.includes('câu hỏi') || h.includes('content')),
    optA: headerRow.findIndex((h: string) => h === 'a' || h.includes('đáp án a') || h.includes('phương án a') || h.includes('ý a')),
    optB: headerRow.findIndex((h: string) => h === 'b' || h.includes('đáp án b') || h.includes('phương án b') || h.includes('ý b')),
    optC: headerRow.findIndex((h: string) => h === 'c' || h.includes('đáp án c') || h.includes('phương án c') || h.includes('ý c')),
    optD: headerRow.findIndex((h: string) => h === 'd' || h.includes('đáp án d') || h.includes('phương án d') || h.includes('ý d')),
    correct: headerRow.findIndex((h: string) => h.includes('đúng') || h.includes('đáp án đúng') || h.includes('key')),
    explanation: headerRow.findIndex((h: string) => h.includes('lời giải') || h.includes('gợi ý') || h.includes('giải thích')),
    points: headerRow.findIndex((h: string) => h.includes('điểm') || h.includes('point')),
  };

  const questions: Question[] = [];
  const errors: { line: number; message: string }[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || !row.some((cell: any) => cell !== null && cell !== '')) {
      continue; // Bỏ qua dòng trống
    }

    const lineNum = r + 1;
    const content = colIndex.content >= 0 ? String(row[colIndex.content] || '').trim() : String(row[4] || '').trim();

    if (!content) {
      errors.push({ line: lineNum, message: `Dòng ${lineNum}: Thiếu nội dung câu hỏi trong file gốc.` });
      continue;
    }

    // Xác định mức độ nhận thức
    let rawLevel = colIndex.level >= 0 ? String(row[colIndex.level] || '').trim().toLowerCase() : '';
    let level: CognitiveLevel = 'Biet';
    if (rawLevel.includes('vận') || rawLevel.includes('vd')) level = 'VanDung';
    else if (rawLevel.includes('hiểu') || rawLevel.includes('th')) level = 'Hieu';

    // Xác định loại câu hỏi
    let rawType = colIndex.type >= 0 ? String(row[colIndex.type] || '').trim().toUpperCase() : 'TN';
    let type: QuestionType = 'TN';
    if (rawType.includes('ĐS') || rawType.includes('DS') || rawType.includes('ĐÚNG')) type = 'DS';
    else if (rawType.includes('TLN') || rawType.includes('NGẮN')) type = 'TLN';
    else if (rawType.includes('TL') || rawType.includes('LUẬN')) type = 'TL';

    // Lớp và chủ đề
    const grade = (colIndex.grade >= 0 && row[colIndex.grade] ? String(row[colIndex.grade]).trim() : defaultGrade) as GradeLevel;
    const topic = colIndex.topic >= 0 && row[colIndex.topic] ? String(row[colIndex.topic]).trim() : defaultTopic;

    const optA = colIndex.optA >= 0 ? String(row[colIndex.optA] || '').trim() : '';
    const optB = colIndex.optB >= 0 ? String(row[colIndex.optB] || '').trim() : '';
    const optC = colIndex.optC >= 0 ? String(row[colIndex.optC] || '').trim() : '';
    const optD = colIndex.optD >= 0 ? String(row[colIndex.optD] || '').trim() : '';
    const correctRaw = colIndex.correct >= 0 ? String(row[colIndex.correct] || '').trim() : '';
    const explanation = colIndex.explanation >= 0 ? String(row[colIndex.explanation] || '').trim() : '';
    const points = colIndex.points >= 0 && Number(row[colIndex.points]) ? Number(row[colIndex.points]) : (type === 'DS' ? 1.0 : type === 'TN' ? 0.25 : 0.5);

    if (type === 'TN') {
      const correctOpt = correctRaw.toUpperCase().charAt(0) as 'A' | 'B' | 'C' | 'D';
      if (!['A', 'B', 'C', 'D'].includes(correctOpt)) {
        errors.push({ line: lineNum, message: `Dòng ${lineNum}: Câu trắc nghiệm thiếu hoặc đáp án đúng không hợp lệ: "${correctRaw}". File gốc cần ghi A, B, C hoặc D.` });
        continue;
      }
      if (!optA || !optB || !optC || !optD) {
        errors.push({ line: lineNum, message: `Dòng ${lineNum}: Câu hỏi trắc nghiệm cần đủ 4 phương án A, B, C, D trong file gốc.` });
        continue;
      }

      questions.push({
        id: `q_ex_${Date.now()}_${r}`,
        grade,
        topic,
        level,
        type: 'TN',
        content,
        options: { A: optA, B: optB, C: optC, D: optD },
        correctOption: correctOpt,
        explanation,
        points: points || 0.25,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else if (type === 'DS') {
      // Đúng/Sai: CẦN ĐỦ 4 LỆNH HỎI a, b, c, d
      if (!optA || !optB || !optC || !optD) {
        errors.push({ line: lineNum, message: `Dòng ${lineNum}: Câu hỏi Đúng/Sai thiếu phương án (chuẩn cần đủ 4 ý a, b, c, d ở các cột tương ứng).` });
        continue;
      }

      // Phân tích đáp án Đúng/Sai từ chuỗi correctRaw (VD: Đ-S-Đ-Đ hoặc T-F-T-T hoặc 1-0-1-1)
      const isCorrectList: boolean[] = [];
      const parts = correctRaw.split(/[-,\s./]+/).map(p => p.trim().toUpperCase()).filter(Boolean);

      if (parts.length >= 4) {
        parts.slice(0, 4).forEach(p => {
          isCorrectList.push(p === 'Đ' || p === 'D' || p === 'T' || p === 'TRUE' || p === 'ĐÚNG' || p === '1');
        });
      } else {
        errors.push({ line: lineNum, message: `Dòng ${lineNum}: Câu Đúng/Sai thiếu định dạng đáp án 4 ý (VD file gốc cần ghi rõ: "Đ-S-Đ-Đ" hoặc "T-F-T-T").` });
        continue;
      }

      const subQuestions: SubQuestionDS[] = [
        { id: `sub_a_${r}`, label: 'a', content: optA, isCorrect: isCorrectList[0] },
        { id: `sub_b_${r}`, label: 'b', content: optB, isCorrect: isCorrectList[1] },
        { id: `sub_c_${r}`, label: 'c', content: optC, isCorrect: isCorrectList[2] },
        { id: `sub_d_${r}`, label: 'd', content: optD, isCorrect: isCorrectList[3] },
      ];

      questions.push({
        id: `q_ex_${Date.now()}_${r}`,
        grade,
        topic,
        level,
        type: 'DS',
        content,
        subQuestions,
        explanation,
        points: points || 1.0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else if (type === 'TLN') {
      if (!correctRaw) {
        errors.push({ line: lineNum, message: `Dòng ${lineNum}: Câu hỏi trả lời ngắn thiếu đáp án chuẩn trong file gốc.` });
        continue;
      }
      questions.push({
        id: `q_ex_${Date.now()}_${r}`,
        grade,
        topic,
        level,
        type: 'TLN',
        content,
        shortAnswer: correctRaw,
        explanation,
        points: points || 0.5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      questions.push({
        id: `q_ex_${Date.now()}_${r}`,
        grade,
        topic,
        level,
        type: 'TL',
        content,
        essayGuide: correctRaw || explanation || '',
        explanation,
        points: points || 1.5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  return {
    questions,
    errors,
    totalParsed: questions.length,
  };
}

/**
 * Phân tích file Word (.docx)
 * YÊU CẦU: Chỉ lấy dữ liệu xác thực từ file gốc, không được bịa đặt.
 */
export async function parseDocxFile(
  file: File,
  defaultGrade: GradeLevel = '11',
  defaultTopic: string = 'Cơ khí & Động cơ đốt trong'
): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  // Trích xuất cả HTML để nhận diện in đậm/gạch chân đáp án đúng
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const rawTextResult = await mammoth.extractRawText({ arrayBuffer: buffer });

  return parseTextOrHtmlContent(htmlResult.value || rawTextResult.value, defaultGrade, defaultTopic);
}

/**
 * Phân tích chuỗi Text hoặc HTML từ Word/TXT
 * Hỗ trợ nhận diện chuẩn 3 phần cấu trúc đề thi Bộ GD&ĐT:
 * - PHẦN I: Trắc nghiệm 4 lựa chọn (TN)
 * - PHẦN II: Trắc nghiệm Đúng/Sai (DS, 4 lệnh hỏi a, b, c, d)
 * - PHẦN III: Trắc nghiệm trả lời ngắn (TLN)
 * - PHẦN IV: Tự luận (TL)
 */
export function parseTextOrHtmlContent(
  textOrHtml: string,
  defaultGrade: GradeLevel = '11',
  defaultTopic: string = 'Công nghệ THPT'
): ParseResult {
  // Chuẩn hóa xuống dạng plain text có đánh dấu định dạng in đậm / gạch chân
  let text = textOrHtml
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, ' **$1** ')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, ' **$1** ')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, ' __$1__ ')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const questions: Question[] = [];
  const errors: { line: number; message: string }[] = [];

  // Tách văn bản theo các PHẦN (nếu văn bản có đề mục PHẦN I, PHẦN II, PHẦN III)
  const sectionSplitRegex = /(?:^|\n)\s*(?:PHẦN|Phần)\s+(I{1,3}|IV|[1-4])[:.\s]/i;
  const hasSections = sectionSplitRegex.test(text);

  interface RawSection {
    sectionNumber: 1 | 2 | 3 | 4;
    content: string;
  }

  const sections: RawSection[] = [];

  if (hasSections) {
    const rawParts = text.split(/(?:^|\n)\s*(?=(?:PHẦN|Phần)\s+(?:I{1,3}|IV|[1-4])[:.\s])/i);
    rawParts.forEach(part => {
      const trimmed = part.trim();
      if (!trimmed) return;

      const headerMatch = trimmed.match(/^(?:PHẦN|Phần)\s+(I{1,3}|IV|[1-4])[:.\s]/i);
      if (headerMatch) {
        const secLabel = headerMatch[1].toUpperCase();
        let secNum: 1 | 2 | 3 | 4 = 1;
        if (secLabel === 'I' || secLabel === '1') secNum = 1;
        else if (secLabel === 'II' || secLabel === '2') secNum = 2;
        else if (secLabel === 'III' || secLabel === '3') secNum = 3;
        else if (secLabel === 'IV' || secLabel === '4') secNum = 4;

        sections.push({ sectionNumber: secNum, content: trimmed });
      }
    });
  }

  // Nếu không có chia phần rõ ràng, coi toàn bộ là 1 khối duy nhất
  if (sections.length === 0) {
    sections.push({ sectionNumber: 1, content: text });
  }

  let globalCount = 0;

  sections.forEach(section => {
    // Tách các câu hỏi trong phần: Câu 1, Câu 2...
    const questionRegex = /(?:^|\n)(?:Câu|Bài)\s+(\d+)[:.]\s*([\s\S]*?)(?=(?:\n(?:Câu|Bài)\s+\d+[:.]|$))/gi;
    let match;

    while ((match = questionRegex.exec(section.content)) !== null) {
      globalCount++;
      const qNum = match[1];
      const qBody = match[2].trim();

      if (!qBody) {
        errors.push({ line: Number(qNum) || globalCount, message: `Câu ${qNum} không có nội dung trong file gốc.` });
        continue;
      }

      // Xác định loại câu hỏi theo Section hoặc nội dung
      let forceType: QuestionType | null = null;
      if (section.sectionNumber === 1) forceType = 'TN';
      else if (section.sectionNumber === 2) forceType = 'DS';
      else if (section.sectionNumber === 3) forceType = 'TLN';
      else if (section.sectionNumber === 4) forceType = 'TL';

      const isTrueFalse = forceType === 'DS' || (/^[a-d]\s*[\).]/im.test(qBody) && (qBody.includes('[Đ]') || qBody.includes('[S]') || qBody.includes('(Đ)') || qBody.includes('(S)')));
      const isShortAnswer = forceType === 'TLN' || /(?:Đáp án ngắn|Trả lời ngắn|Đáp số)[:.]/i.test(qBody);
      const isEssay = forceType === 'TL' || /(?:Tự luận|Hướng dẫn chấm)[:.]/i.test(qBody);

      if (isTrueFalse) {
        // --- DẠNG ĐÚNG / SAI (4 Ý a, b, c, d) ---
        const lines = qBody.split('\n').map(l => l.trim()).filter(Boolean);
        const subQuestions: SubQuestionDS[] = [];
        let mainContent = '';

        for (const line of lines) {
          const subMatch = line.match(/^([a-d])\s*[\).]\s*(.*)$/i);
          if (subMatch) {
            const label = subMatch[1].toLowerCase() as 'a' | 'b' | 'c' | 'd';
            let subText = subMatch[2];
            const hasTrue = /\[(Đ|Đúng|T|True|1)\]|\((Đ|Đúng|T|True|1)\)/i.test(subText);
            const hasFalse = /\[(S|Sai|F|False|0)\]|\((S|Sai|F|False|0)\)/i.test(subText);

            if (!hasTrue && !hasFalse) {
              errors.push({ line: Number(qNum) || globalCount, message: `Câu ${qNum} ý ${label}) thiếu đánh dấu [Đ] hoặc [S] trong file gốc.` });
            }

            subText = subText.replace(/\[(?:Đ|S|Đúng|Sai|T|F|1|0)\]|\((?:Đ|S|Đúng|Sai|T|F|1|0)\)/gi, '').replace(/\*\*/g, '').replace(/__/g, '').trim();

            if (subText) {
              subQuestions.push({
                id: `sq_${qNum}_${label}`,
                label,
                content: subText,
                isCorrect: hasTrue,
              });
            }
          } else if (subQuestions.length === 0) {
            mainContent += (mainContent ? ' ' : '') + line;
          }
        }

        if (!mainContent) {
          errors.push({ line: Number(qNum) || globalCount, message: `Câu ${qNum} dạng Đúng/Sai thiếu nội dung câu hỏi dẫn đề trong file gốc.` });
          continue;
        }

        if (subQuestions.length < 4) {
          errors.push({
            line: Number(qNum) || globalCount,
            message: `Câu ${qNum} dạng Đúng/Sai chỉ có ${subQuestions.length}/4 lệnh hỏi trong file gốc (chuẩn Bộ GD&ĐT yêu cầu đúng 4 ý a, b, c, d).`,
          });
          continue;
        }

        questions.push({
          id: `q_txt_${Date.now()}_${globalCount}`,
          grade: defaultGrade,
          topic: defaultTopic,
          level: 'Hieu',
          type: 'DS',
          content: mainContent,
          subQuestions: subQuestions.slice(0, 4),
          points: 1.0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else if (isShortAnswer && !isEssay) {
        // --- DẠNG TRẢ LỜI NGẮN (TLN) ---
        const ansMatch = qBody.match(/(?:Đáp án ngắn|Trả lời ngắn|Đáp số|Đáp án)[:.]\s*(.*)$/im);
        const shortAns = ansMatch ? ansMatch[1].replace(/\*\*/g, '').replace(/__/g, '').trim() : '';
        const mainContent = qBody.replace(/(?:Đáp án ngắn|Trả lời ngắn|Đáp số|Đáp án)[:.]\s*.*$/im, '').replace(/\*\*/g, '').replace(/__/g, '').trim();

        if (!mainContent) {
          errors.push({ line: Number(qNum) || globalCount, message: `Câu ${qNum} dạng trả lời ngắn thiếu nội dung đề bài trong file gốc.` });
          continue;
        }

        if (!shortAns) {
          errors.push({ line: Number(qNum) || globalCount, message: `Câu ${qNum} dạng trả lời ngắn thiếu đáp số chuẩn trong file gốc (thêm "Đáp án ngắn: ...").` });
          continue;
        }

        questions.push({
          id: `q_txt_${Date.now()}_${globalCount}`,
          grade: defaultGrade,
          topic: defaultTopic,
          level: 'VanDung',
          type: 'TLN',
          content: mainContent,
          shortAnswer: shortAns,
          points: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else if (isEssay) {
        // --- DẠNG TỰ LUẬN ---
        const guideMatch = qBody.match(/(?:Tự luận|Hướng dẫn chấm|Đáp án)[:.]\s*(.*)$/im);
        const essayGuide = guideMatch ? guideMatch[1].trim() : '';
        const mainContent = qBody.replace(/(?:Tự luận|Hướng dẫn chấm|Đáp án)[:.]\s*.*$/im, '').trim();

        if (!mainContent) {
          errors.push({ line: Number(qNum) || globalCount, message: `Câu ${qNum} tự luận thiếu nội dung câu hỏi trong file gốc.` });
          continue;
        }

        questions.push({
          id: `q_txt_${Date.now()}_${globalCount}`,
          grade: defaultGrade,
          topic: defaultTopic,
          level: 'VanDung',
          type: 'TL',
          content: mainContent,
          essayGuide,
          points: 1.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        // --- DẠNG TRẮC NGHIỆM 4 LỰA CHỌN (TN) ---
        let correctOpt: 'A' | 'B' | 'C' | 'D' | undefined;
        const ansLineMatch = qBody.match(/(?:Đáp án|Đáp án đúng|Chọn)[:.]\s*([A-D])/i);
        if (ansLineMatch) {
          correctOpt = ansLineMatch[1].toUpperCase() as any;
        }

        const optMatchA = qBody.match(/(?:^|\n)\s*(?:\*\*|__)?A\s*[\).]\s*(.*?)(?=(?:\n\s*(?:\*\*|__)?B\s*[\).]|Đáp án|$))/s);
        const optMatchB = qBody.match(/(?:^|\n)\s*(?:\*\*|__)?B\s*[\).]\s*(.*?)(?=(?:\n\s*(?:\*\*|__)?C\s*[\).]|Đáp án|$))/s);
        const optMatchC = qBody.match(/(?:^|\n)\s*(?:\*\*|__)?C\s*[\).]\s*(.*?)(?=(?:\n\s*(?:\*\*|__)?D\s*[\).]|Đáp án|$))/s);
        const optMatchD = qBody.match(/(?:^|\n)\s*(?:\*\*|__)?D\s*[\).]\s*(.*?)(?=(?:\n\s*Đáp án|$))/s);

        // Nhận diện đáp án đúng qua in đậm **A.** hoặc gạch chân __A.__
        if (!correctOpt) {
          if (optMatchA && (optMatchA[0].includes('**A') || optMatchA[0].includes('__A'))) correctOpt = 'A';
          else if (optMatchB && (optMatchB[0].includes('**B') || optMatchB[0].includes('__B'))) correctOpt = 'B';
          else if (optMatchC && (optMatchC[0].includes('**C') || optMatchC[0].includes('__C'))) correctOpt = 'C';
          else if (optMatchD && (optMatchD[0].includes('**D') || optMatchD[0].includes('__D'))) correctOpt = 'D';
        }

        const splitA = qBody.split(/(?:^|\n)\s*(?:\*\*|__)?A\s*[\).]/);
        const content = splitA[0].replace(/\*\*/g, '').replace(/__/g, '').trim();

        const optA = optMatchA ? optMatchA[1].replace(/\*\*/g, '').replace(/__/g, '').trim() : '';
        const optB = optMatchB ? optMatchB[1].replace(/\*\*/g, '').replace(/__/g, '').trim() : '';
        const optC = optMatchC ? optMatchC[1].replace(/\*\*/g, '').replace(/__/g, '').trim() : '';
        const optD = optMatchD ? optMatchD[1].replace(/\*\*/g, '').replace(/__/g, '').trim() : '';

        let explanation = '';
        const expMatch = qBody.match(/(?:Lời giải|Hướng dẫn|Giải thích)[:.]\s*(.*)$/is);
        if (expMatch) explanation = expMatch[1].trim();

        if (!content) {
          errors.push({ line: Number(qNum) || globalCount, message: `Câu ${qNum} thiếu nội dung câu hỏi trong file gốc.` });
          continue;
        }

        if (!optA || !optB || !optC || !optD) {
          errors.push({ line: Number(qNum) || globalCount, message: `Câu ${qNum} trắc nghiệm thiếu phương án lựa chọn trong file gốc (cần đủ A, B, C, D).` });
          continue;
        }

        if (!correctOpt) {
          errors.push({ line: Number(qNum) || globalCount, message: `Câu ${qNum} thiếu chỉ định đáp án đúng trong file gốc (VD thêm dòng "Đáp án: B" hoặc in đậm chữ cái B).` });
          continue;
        }

        questions.push({
          id: `q_txt_${Date.now()}_${globalCount}`,
          grade: defaultGrade,
          topic: defaultTopic,
          level: 'Biet',
          type: 'TN',
          content,
          options: { A: optA, B: optB, C: optC, D: optD },
          correctOption: correctOpt,
          explanation,
          points: 0.25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  });

  if (questions.length === 0) {
    errors.push({
      line: 1,
      message: 'Không tìm thấy câu hỏi hợp lệ trong tài liệu. Vui lòng kiểm tra định dạng hoặc tải file đề mẫu để đối chiếu.',
    });
  }

  return { questions, errors, totalParsed: questions.length };
}

/**
 * Tải file mẫu Excel (.xlsx) chuẩn cấu trúc đề thi 10 điểm (12 TN + 4 DS + 6 TLN)
 */
export function downloadSampleExcel() {
  const sampleData: any[] = [
    // PHẦN I: 12 CÂU TRẮC NGHIỆM (3.0 ĐIỂM)
    { 'Lớp': '11', 'Chủ đề/Bài': 'Cơ khí chế tạo & Vật liệu', 'Mức độ': 'Biết', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Thép cacbon là hợp kim của sắt (Fe) và cacbon (C) với hàm lượng cacbon trong giới hạn nào?', 'Đáp án A': 'Lớn hơn 2,14%', 'Đáp án B': 'Nhỏ hơn hoặc bằng 2,14%', 'Đáp án C': 'Từ 3% đến 5%', 'Đáp án D': 'Lớn hơn 5%', 'Đáp án đúng': 'B', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Cơ khí chế tạo & Vật liệu', 'Mức độ': 'Biết', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Gang xám là vật liệu cơ khí được sử dụng phổ biến để đúc chi tiết nào sau đây?', 'Đáp án A': 'Thân máy, vỏ hộp giảm tốc', 'Đáp án B': 'Lò xo giảm xóc', 'Đáp án C': 'Dây dẫn điện', 'Đáp án D': 'Lưỡi cắt gọt kim loại', 'Đáp án đúng': 'A', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Cơ khí chế tạo & Vật liệu', 'Mức độ': 'Hiểu', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Phương pháp gia công kim loại nào sau đây thuộc nhóm gia công cắt gọt có phôi?', 'Đáp án A': 'Hàn hồ quang', 'Đáp án B': 'Rèn tự do', 'Đáp án C': 'Phay mặt phẳng', 'Đáp án D': 'Dập nguội', 'Đáp án đúng': 'C', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Cơ khí chế tạo & Vật liệu', 'Mức độ': 'Hiểu', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Trên máy tiện vạn năng, chuyển động chính cắt gọt là chuyển động nào?', 'Đáp án A': 'Chuyển động tịnh tiến của dao tiện', 'Đáp án B': 'Chuyển động quay tròn của phôi', 'Đáp án C': 'Chuyển động quay tròn của dao tiện', 'Đáp án D': 'Chuyển động tịnh tiến của ụ động', 'Đáp án đúng': 'B', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Cơ cấu truyền lực', 'Mức độ': 'Biết', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Cơ cấu biến đổi chuyển động nào biến đổi chuyển động quay thành chuyển động tịnh tiến qua lại?', 'Đáp án A': 'Cơ cấu tay quay con trượt', 'Đáp án B': 'Bộ truyền đai dẹt', 'Đáp án C': 'Bộ truyền xích con lăn', 'Đáp án D': 'Bộ truyền bánh răng trụ', 'Đáp án đúng': 'A', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Cơ cấu truyền lực', 'Mức độ': 'Vận dụng', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Bộ truyền bánh răng ăn khớp ngoài có Z1 = 25 răng, Z2 = 75 răng. Tỉ số truyền i của bộ truyền là:', 'Đáp án A': 'i = 0,33', 'Đáp án B': 'i = 3', 'Đáp án C': 'i = 5', 'Đáp án D': 'i = 2', 'Đáp án đúng': 'B', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Động cơ đốt trong', 'Mức độ': 'Biết', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Điểm chết dưới (ĐCD) của piston trong xilanh động cơ đốt trong được định nghĩa là gì?', 'Đáp án A': 'Vị trí piston ở gần trục khuỷu nhất', 'Đáp án B': 'Vị trí piston ở xa trục khuỷu nhất', 'Đáp án C': 'Vị trí bugi đánh lửa', 'Đáp án D': 'Vị trí vòi phun bắt đầu phun nhiên liệu', 'Đáp án đúng': 'A', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Động cơ đốt trong', 'Mức độ': 'Biết', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Thể tích không gian trong xilanh giới hạn bởi ĐCT và ĐCD được gọi là gì?', 'Đáp án A': 'Thể tích buồng cháy Vc', 'Đáp án B': 'Thể tích công tác Vh', 'Đáp án C': 'Thể tích toàn phần Va', 'Đáp án D': 'Tỉ số nén epsilon', 'Đáp án đúng': 'B', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Động cơ đốt trong', 'Mức độ': 'Hiểu', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Trong động cơ 4 kỳ, kỳ nào là kỳ duy nhất sinh công làm quay trục khuỷu?', 'Đáp án A': 'Kỳ 1 nạp', 'Đáp án B': 'Kỳ 2 nén', 'Đáp án C': 'Kỳ 3 nổ (cháy - giãn nở)', 'Đáp án D': 'Kỳ 4 xả', 'Đáp án đúng': 'C', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Động cơ đốt trong', 'Mức độ': 'Hiểu', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Ở kỳ nén của động cơ điêzen 4 kỳ, chất môi giới được nén trong xilanh là gì?', 'Đáp án A': 'Không khí sạch thuần túy', 'Đáp án B': 'Hòa khí gồm xăng và không khí', 'Đáp án C': 'Hỗn hợp dầu điêzen và không khí', 'Đáp án D': 'Khí xả từ chu trình trước', 'Đáp án đúng': 'A', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Hệ thống cơ khí', 'Mức độ': 'Biết', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Cơ cấu phối khí dùng xupap trong động cơ đốt trong có nhiệm vụ gì?', 'Đáp án A': 'Đóng mở cửa nạp và cửa thải đúng thời điểm quy định', 'Đáp án B': 'Làm mát xilanh và nắp máy', 'Đáp án C': 'Bôi trơn các bề mặt ma sát', 'Đáp án D': 'Cung cấp tia lửa điện đốt cháy hòa khí', 'Đáp án đúng': 'A', 'Điểm': 0.25 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'An toàn lao động', 'Mức độ': 'Biết', 'Loại câu': 'TN', 'Nội dung câu hỏi': 'Quy tắc an toàn nào sau đây là BẮT BUỘC khi vận hành máy tiện kim loại?', 'Đáp án A': 'Đeo găng tay vải bảo hộ khi gia công', 'Đáp án B': 'Đeo kính bảo hộ, mặc quần áo gọn gàng và không dùng găng tay khi trục quay', 'Đáp án C': 'Cúi sát đầu vào phôi để quan sát vết cắt', 'Đáp án D': 'Dùng tay không gạt phoi vụn nóng', 'Đáp án đúng': 'B', 'Điểm': 0.25 },

    // PHẦN II: 4 CÂU ĐÚNG / SAI (4.0 ĐIỂM, MỖI CÂU ĐỦ 4 LỆNH HỎI a, b, c, d)
    {
      'Lớp': '11', 'Chủ đề/Bài': 'Động cơ đốt trong', 'Mức độ': 'Hiểu', 'Loại câu': 'DS',
      'Nội dung câu hỏi': 'Xét nguyên lý hoạt động của động cơ xăng 4 kỳ một xilanh trong một chu trình công tác:',
      'Đáp án A': 'Ở kỳ nạp, piston đi từ ĐCT xuống ĐCD, hòa khí xăng-không khí được hút vào xilanh.',
      'Đáp án B': 'Ở kỳ nén, cả hai xupap nạp và thải đều mở để hòa khí lưu thông.',
      'Đáp án C': 'Cuối kỳ nén, bugi bật tia lửa điện để đốt cháy hòa khí đã được nén áp suất cao.',
      'Đáp án D': 'Sau một chu trình hoàn thành 4 kỳ, trục khuỷu của động cơ quay đúng 2 vòng (720 độ).',
      'Đáp án đúng': 'Đ-S-Đ-Đ', 'Điểm': 1.0,
    },
    {
      'Lớp': '11', 'Chủ đề/Bài': 'Động cơ đốt trong', 'Mức độ': 'Hiểu', 'Loại câu': 'DS',
      'Nội dung câu hỏi': 'Về sự khác biệt giữa động cơ điêzen 4 kỳ và động cơ xăng 4 kỳ:',
      'Đáp án A': 'Động cơ điêzen dùng vòi phun nhiên liệu áp suất cao, không có bugi đánh lửa.',
      'Đáp án B': 'Tỉ số nén epsilon của động cơ điêzen thường nhỏ hơn tỉ số nén của động cơ xăng.',
      'Đáp án C': 'Động cơ điêzen tự bốc cháy hòa khí nhờ nhiệt độ và áp suất cao ở cuối kỳ nén.',
      'Đáp án D': 'Hiệu suất nhiệt của động cơ điêzen thường cao hơn hiệu suất của động cơ xăng.',
      'Đáp án đúng': 'Đ-S-Đ-Đ', 'Điểm': 1.0,
    },
    {
      'Lớp': '11', 'Chủ đề/Bài': 'Cơ khí chế tạo & Vật liệu', 'Mức độ': 'Hiểu', 'Loại câu': 'DS',
      'Nội dung câu hỏi': 'Nhận định về đặc tính cơ học và phạm vi ứng dụng của vật liệu kim loại cơ khí:',
      'Đáp án A': 'Thép cacbon có độ bền và tính dẻo tốt hơn gang xám nên dùng chế tạo chi tiết chịu lực lớn.',
      'Đáp án B': 'Gang xám có tính đúc rất tốt và khả năng giảm chấn rung động cao.',
      'Đáp án C': 'Đồng và hợp kim của đồng có tính dẫn điện, dẫn nhiệt kém hơn thép.',
      'Đáp án D': 'Nhôm và hợp kim nhôm có khối lượng riêng nhỏ, chống ăn mòn tốt trong khí quyển.',
      'Đáp án đúng': 'Đ-Đ-S-Đ', 'Điểm': 1.0,
    },
    {
      'Lớp': '11', 'Chủ đề/Bài': 'Gia công cơ khí', 'Mức độ': 'Hiểu', 'Loại câu': 'DS',
      'Nội dung câu hỏi': 'Nhận định về các phương pháp gia công cơ khí thông dụng trong chế tạo máy:',
      'Đáp án A': 'Tiện là phương pháp gia công chủ yếu để tạo các bề mặt tròn xoay (mặt trụ, mặt côn, ren).',
      'Đáp án B': 'Phay có thể gia công được các mặt phẳng, rãnh then, then hoa và bánh răng.',
      'Đáp án C': 'Khoan là phương pháp gia công tạo lỗ từ phôi đặc bằng dụng cụ cắt gọi là mũi khoan.',
      'Đáp án D': 'Mài là phương pháp gia công thô nhằm bóc tách nhanh lượng dư kim loại lớn.',
      'Đáp án đúng': 'Đ-Đ-Đ-S', 'Điểm': 1.0,
    },

    // PHẦN III: 6 CÂU TRẢ LỜI NGẮN (3.0 ĐIỂM, MỖI CÂU 0.5Đ)
    { 'Lớp': '11', 'Chủ đề/Bài': 'Cơ cấu truyền lực', 'Mức độ': 'Vận dụng', 'Loại câu': 'TLN', 'Nội dung câu hỏi': 'Một bộ truyền đai có đường kính bánh dẫn D1 = 120 mm quay với tốc độ n1 = 1400 vòng/phút, bánh bị dẫn có đường kính D2 = 240 mm (bỏ qua trượt đai). Tính tốc độ quay n2 của bánh bị dẫn (vòng/phút)?', 'Đáp án đúng': '700|700 vòng/phút', 'Điểm': 0.5 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Cơ cấu truyền lực', 'Mức độ': 'Vận dụng', 'Loại câu': 'TLN', 'Nội dung câu hỏi': 'Hộp giảm tốc bánh răng có tỉ số truyền i = 4. Trục vào quay với tốc độ n1 = 1200 vòng/phút. Tốc độ quay của trục ra n2 là bao nhiêu vòng/phút?', 'Đáp án đúng': '300|300 vòng/phút', 'Điểm': 0.5 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Động cơ đốt trong', 'Mức độ': 'Vận dụng', 'Loại câu': 'TLN', 'Nội dung câu hỏi': 'Động cơ 4 kỳ 1 xilanh có đường kính D = 80 mm và hành trình piston S = 90 mm. Thể tích công tác Vh của xilanh xấp xỉ bao nhiêu cm³? (Lấy số nguyên gần nhất).', 'Đáp án đúng': '452|452cm3', 'Điểm': 0.5 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Động cơ đốt trong', 'Mức độ': 'Vận dụng', 'Loại câu': 'TLN', 'Nội dung câu hỏi': 'Một động cơ có thể tích toàn phần Va = 500 cm³ và thể tích buồng cháy Vc = 50 cm³. Tỉ số nén epsilon của động cơ này bằng bao nhiêu?', 'Đáp án đúng': '10', 'Điểm': 0.5 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'Gia công cơ khí', 'Mức độ': 'Vận dụng', 'Loại câu': 'TLN', 'Nội dung câu hỏi': 'Khi tiện một chi tiết trục thép có đường kính d = 50 mm với tốc độ cắt v = 62,8 m/phút. Tính số vòng quay n của trục chính máy tiện (vòng/phút)? (Lấy số nguyên).', 'Đáp án đúng': '400|400 vòng/phút', 'Điểm': 0.5 },
    { 'Lớp': '11', 'Chủ đề/Bài': 'An toàn cơ khí', 'Mức độ': 'Hiểu', 'Loại câu': 'TLN', 'Nội dung câu hỏi': 'Trong an toàn xưởng cơ khí, khoảng cách an toàn tối thiểu từ bệ máy tiện đến lối đi bộ chính là bao nhiêu mét theo tiêu chuẩn TCVN? (Ghi số thập phân, vd: 1.0 hoặc 1.5).', 'Đáp án đúng': '1.0|1|1m', 'Điểm': 0.5 },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 8 },  // Lớp
    { wch: 25 }, // Chủ đề
    { wch: 12 }, // Mức độ
    { wch: 10 }, // Loại câu
    { wch: 45 }, // Nội dung
    { wch: 25 }, // A
    { wch: 25 }, // B
    { wch: 25 }, // C
    { wch: 25 }, // D
    { wch: 14 }, // Đáp án đúng
    { wch: 8 },  // Điểm
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DeThiMau');
  XLSX.writeFile(workbook, 'De_Thi_Mau_10_Diem_Cong_Nghe_11.xlsx');
}

/**
 * Tải file đề thi gốc mẫu (.docx) đầy đủ chuẩn 10 điểm (12 TN + 4 Đ/S + 6 TLN)
 * Dữ liệu kỹ thuật chuẩn xác thực môn Công nghệ 11
 */
export async function downloadSampleOriginalExamDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ text: 'TRƯỜNG THPT CHUYÊN LÊ KHIẾT', alignment: 'center' }),
          new Paragraph({ text: 'TỔ: VẬT LÍ - CÔNG NGHỆ', alignment: 'center' }),
          new Paragraph({
            text: 'ĐỀ THI KIỂM TRA ĐỊNH KÌ MÔN CÔNG NGHỆ 11 (CÔNG NGHỆ CƠ KHÍ)',
            heading: HeadingLevel.HEADING_1,
            alignment: 'center',
            spacing: { before: 100, after: 150 },
          }),
          new Paragraph({
            text: 'Thời gian làm bài: 45 phút · Tổng điểm: 10.0 điểm',
            alignment: 'center',
            spacing: { after: 200 },
          }),

          // --- PHẦN I ---
          new Paragraph({
            children: [
              new TextRun({
                text: 'PHẦN I. Thí sinh trả lời từ câu 1 đến câu 12. Mỗi câu hỏi thí sinh chỉ chọn một phương án. (3,0 điểm - Mỗi câu đúng 0,25 điểm)',
                bold: true,
              }),
            ],
            spacing: { before: 150, after: 100 },
          }),

          // 12 câu TN
          ...[
            { num: 1, text: 'Thép cacbon là hợp kim của sắt (Fe) và cacbon (C) với hàm lượng cacbon trong giới hạn nào?', a: 'Lớn hơn 2,14%', b: 'Nhỏ hơn hoặc bằng 2,14%', c: 'Từ 3% đến 5%', d: 'Lớn hơn 5%', key: 'B' },
            { num: 2, text: 'Gang xám là vật liệu cơ khí được sử dụng phổ biến để đúc chi tiết nào sau đây?', a: 'Thân máy, vỏ hộp giảm tốc', b: 'Lò xo giảm xóc chịu uốn', c: 'Dây dẫn điện cao áp', d: 'Lưỡi cắt gọt kim loại', key: 'A' },
            { num: 3, text: 'Phương pháp gia công kim loại nào sau đây thuộc nhóm gia công cắt gọt có phoi?', a: 'Hàn hồ quang điện', b: 'Rèn tự do nhiệt', c: 'Phay mặt phẳng chi tiết', d: 'Dập vuốt nguội', key: 'C' },
            { num: 4, text: 'Trên máy tiện vạn năng kim loại, chuyển động chính cắt gọt là chuyển động nào?', a: 'Chuyển động tịnh tiến của dao tiện', b: 'Chuyển động quay tròn của phôi', c: 'Chuyển động quay tròn của dao tiện', d: 'Chuyển động tịnh tiến ụ động', key: 'B' },
            { num: 5, text: 'Cơ cấu biến đổi chuyển động nào biến đổi chuyển động quay thành chuyển động tịnh tiến qua lại?', a: 'Cơ cấu tay quay con trượt', b: 'Bộ truyền đai dẹt', c: 'Bộ truyền xích con lăn', d: 'Bộ truyền bánh răng trụ', key: 'A' },
            { num: 6, text: 'Bộ truyền bánh răng ăn khớp ngoài có Z1 = 25 răng, Z2 = 75 răng. Tỉ số truyền i của bộ truyền là:', a: 'i = 0,33', b: 'i = 3', c: 'i = 5', d: 'i = 2', key: 'B' },
            { num: 7, text: 'Điểm chết dưới (ĐCD) của piston trong xilanh động cơ đốt trong được định nghĩa là gì?', a: 'Vị trí piston ở gần trục khuỷu nhất', b: 'Vị trí piston ở xa trục khuỷu nhất', c: 'Vị trí bugi đánh lửa', d: 'Vị trí vòi phun bắt đầu phun nhiên liệu', key: 'A' },
            { num: 8, text: 'Thể tích không gian trong xilanh giới hạn bởi ĐCT và ĐCD được gọi là gì?', a: 'Thể tích buồng cháy Vc', b: 'Thể tích công tác Vh', c: 'Thể tích toàn phần Va', d: 'Tỉ số nén epsilon', key: 'B' },
            { num: 9, text: 'Trong động cơ 4 kỳ, kỳ nào là kỳ duy nhất sinh công làm quay trục khuỷu?', a: 'Kỳ 1 nạp', b: 'Kỳ 2 nén', c: 'Kỳ 3 nổ (cháy - giãn nở)', d: 'Kỳ 4 xả', key: 'C' },
            { num: 10, text: 'Ở kỳ nén của động cơ điêzen 4 kỳ, chất môi giới được nén trong xilanh là gì?', a: 'Không khí sạch thuần túy', b: 'Hòa khí gồm xăng và không khí', c: 'Hỗn hợp dầu điêzen và không khí', d: 'Khí xả từ chu trình trước', key: 'A' },
            { num: 11, text: 'Cơ cấu phối khí dùng xupap trong động cơ đốt trong có nhiệm vụ gì?', a: 'Đóng mở cửa nạp và cửa thải đúng thời điểm quy định', b: 'Làm mát xilanh và nắp máy', c: 'Bôi trơn các bề mặt ma sát', d: 'Cung cấp tia lửa điện đốt cháy hòa khí', key: 'A' },
            { num: 12, text: 'Quy tắc an toàn nào sau đây là BẮT BUỘC khi vận hành máy tiện kim loại?', a: 'Đeo găng tay vải bảo hộ khi gia công', b: 'Đeo kính bảo hộ, mặc gọn gàng và không dùng găng tay khi trục quay', c: 'Cúi sát đầu vào phôi quan sát vết cắt', d: 'Dùng tay gạt phoi vụn nóng', key: 'B' },
          ].flatMap(q => [
            new Paragraph({
              children: [
                new TextRun({ text: `Câu ${q.num}. `, bold: true }),
                new TextRun(q.text),
              ],
            }),
            new Paragraph({ text: `A. ${q.a}` }),
            new Paragraph({ text: `B. ${q.b}` }),
            new Paragraph({ text: `C. ${q.c}` }),
            new Paragraph({ text: `D. ${q.d}` }),
            new Paragraph({ text: `Đáp án: ${q.key}`, spacing: { after: 120 } }),
          ]),

          // --- PHẦN II ---
          new Paragraph({
            children: [
              new TextRun({
                text: 'PHẦN II. Thí sinh trả lời từ câu 1 đến câu 4. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn Đúng hoặc Sai. (4,0 điểm - Mỗi câu 1,0 điểm, đúng 1 ý 0,1đ, 2 ý 0,25đ, 3 ý 0,5đ, 4 ý 1,0đ)',
                bold: true,
              }),
            ],
            spacing: { before: 180, after: 120 },
          }),

          // 4 câu Đúng/Sai, mỗi câu đủ 4 ý a, b, c, d
          ...[
            {
              num: 1,
              lead: 'Xét chu trình làm việc của động cơ xăng 4 kỳ một xilanh trong một chu trình công tác:',
              items: [
                { label: 'a', text: 'Ở kỳ nạp, piston đi từ ĐCT xuống ĐCD, hòa khí xăng-không khí được hút vào xilanh.', ans: 'Đ' },
                { label: 'b', text: 'Ở kỳ nén, cả hai xupap nạp và thải đều mở để hòa khí lưu thông.', ans: 'S' },
                { label: 'c', text: 'Cuối kỳ nén, bugi bật tia lửa điện để đốt cháy hòa khí nén áp suất cao.', ans: 'Đ' },
                { label: 'd', text: 'Sau khi hoàn thành 4 kỳ, trục khuỷu của động cơ quay đúng 2 vòng (720 độ).', ans: 'Đ' },
              ],
            },
            {
              num: 2,
              lead: 'Về sự khác biệt giữa động cơ điêzen 4 kỳ và động cơ xăng 4 kỳ:',
              items: [
                { label: 'a', text: 'Động cơ điêzen dùng vòi phun nhiên liệu áp suất cao, không có bugi đánh lửa.', ans: 'Đ' },
                { label: 'b', text: 'Tỉ số nén của động cơ điêzen thường nhỏ hơn tỉ số nén của động cơ xăng.', ans: 'S' },
                { label: 'c', text: 'Động cơ điêzen tự bốc cháy hòa khí nhờ nhiệt độ và áp suất cao ở cuối kỳ nén.', ans: 'Đ' },
                { label: 'd', text: 'Hiệu suất nhiệt của động cơ điêzen thường cao hơn hiệu suất của động cơ xăng.', ans: 'Đ' },
              ],
            },
            {
              num: 3,
              lead: 'Nhận định về đặc tính cơ học và phạm vi ứng dụng của vật liệu kim loại cơ khí:',
              items: [
                { label: 'a', text: 'Thép cacbon có độ bền và tính dẻo tốt hơn gang xám nên dùng chế tạo chi tiết chịu lực lớn.', ans: 'Đ' },
                { label: 'b', text: 'Gang xám có tính đúc rất tốt và khả năng giảm chấn rung động cao.', ans: 'Đ' },
                { label: 'c', text: 'Đồng và hợp kim của đồng có tính dẫn điện, dẫn nhiệt kém hơn thép.', ans: 'S' },
                { label: 'd', text: 'Nhôm và hợp kim nhôm có khối lượng riêng nhỏ, chống ăn mòn tốt trong khí quyển.', ans: 'Đ' },
              ],
            },
            {
              num: 4,
              lead: 'Nhận định về các phương pháp gia công cơ khí thông dụng trong chế tạo máy:',
              items: [
                { label: 'a', text: 'Tiện là phương pháp gia công chủ yếu để tạo các bề mặt tròn xoay (mặt trụ, mặt côn, ren).', ans: 'Đ' },
                { label: 'b', text: 'Phay có thể gia công được các mặt phẳng, rãnh then, then hoa và bánh răng.', ans: 'Đ' },
                { label: 'c', text: 'Khoan là phương pháp gia công tạo lỗ từ phôi đặc bằng dụng cụ cắt gọi là mũi khoan.', ans: 'Đ' },
                { label: 'd', text: 'Mài là phương pháp gia công thô nhằm bóc tách nhanh lượng dư kim loại lớn.', ans: 'S' },
              ],
            },
          ].flatMap(q => [
            new Paragraph({
              children: [
                new TextRun({ text: `Câu ${q.num}. `, bold: true }),
                new TextRun(q.lead),
              ],
            }),
            ...q.items.map(it => new Paragraph({ text: `${it.label}) ${it.text} [${it.ans}]` })),
            new Paragraph({ text: '', spacing: { after: 120 } }),
          ]),

          // --- PHẦN III ---
          new Paragraph({
            children: [
              new TextRun({
                text: 'PHẦN III. Thí sinh trả lời từ câu 1 đến câu 6. Thí sinh điền đáp số ngắn vào ô tương ứng. (3,0 điểm - Mỗi câu 0,5 điểm)',
                bold: true,
              }),
            ],
            spacing: { before: 180, after: 120 },
          }),

          // 6 câu Trả lời ngắn
          ...[
            { num: 1, text: 'Một bộ truyền đai có đường kính bánh dẫn D1 = 120 mm quay với tốc độ n1 = 1400 vòng/phút, bánh bị dẫn có đường kính D2 = 240 mm (bỏ qua trượt đai). Tính tốc độ quay n2 của bánh bị dẫn (vòng/phút)?', ans: '700' },
            { num: 2, text: 'Hộp giảm tốc bánh răng có tỉ số truyền i = 4. Trục vào quay với tốc độ n1 = 1200 vòng/phút. Tốc độ quay của trục ra n2 là bao nhiêu vòng/phút?', ans: '300' },
            { num: 3, text: 'Động cơ 4 kỳ 1 xilanh có đường kính D = 80 mm và hành trình piston S = 90 mm. Thể tích công tác Vh của xilanh xấp xỉ bao nhiêu cm³? (Lấy số nguyên gần nhất).', ans: '452' },
            { num: 4, text: 'Một động cơ có thể tích toàn phần Va = 500 cm³ và thể tích buồng cháy Vc = 50 cm³. Tỉ số nén epsilon của động cơ này bằng bao nhiêu?', ans: '10' },
            { num: 5, text: 'Khi tiện một chi tiết trục thép có đường kính d = 50 mm với tốc độ cắt v = 62,8 m/phút. Tính số vòng quay n của trục chính máy tiện (vòng/phút)? (Lấy số nguyên).', ans: '400' },
            { num: 6, text: 'Trong an toàn xưởng cơ khí, khoảng cách an toàn tối thiểu từ bệ máy tiện đến lối đi bộ chính là bao nhiêu mét theo tiêu chuẩn TCVN? (Ghi số thập phân, vd: 1.0).', ans: '1.0' },
          ].flatMap(q => [
            new Paragraph({
              children: [
                new TextRun({ text: `Câu ${q.num}. `, bold: true }),
                new TextRun(q.text),
              ],
            }),
            new Paragraph({ text: `Đáp án ngắn: ${q.ans}`, spacing: { after: 120 } }),
          ]),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'De_Thi_Goc_Mau_10_Diem_Cong_Nghe_11.docx';
  a.click();
  URL.revokeObjectURL(url);
}

// Alias để tương thích với các component QuestionBankView & ImportModal
export const downloadSampleDocx = downloadSampleOriginalExamDocx;
