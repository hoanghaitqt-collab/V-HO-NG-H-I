/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { Question, GradeLevel, CognitiveLevel, QuestionType, SubQuestionDS } from '../types';

export interface ParseResult {
  questions: Question[];
  errors: { line: number; message: string }[];
  totalParsed: number;
}

/**
 * Phân tích file Excel (.xlsx, .xls, .csv)
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
    optA: headerRow.findIndex((h: string) => h === 'a' || h.includes('đáp án a') || h.includes('phương án a')),
    optB: headerRow.findIndex((h: string) => h === 'b' || h.includes('đáp án b') || h.includes('phương án b')),
    optC: headerRow.findIndex((h: string) => h === 'c' || h.includes('đáp án c') || h.includes('phương án c')),
    optD: headerRow.findIndex((h: string) => h === 'd' || h.includes('đáp án d') || h.includes('phương án d')),
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
      errors.push({ line: lineNum, message: 'Dòng này thiếu nội dung câu hỏi.' });
      continue;
    }

    // Xác định mức độ
    let rawLevel = colIndex.level >= 0 ? String(row[colIndex.level] || '').trim().toLowerCase() : '';
    let level: CognitiveLevel = 'Biet';
    if (rawLevel.includes('vận') || rawLevel.includes('vd')) level = 'VanDung';
    else if (rawLevel.includes('hiểu') || rawLevel.includes('th')) level = 'Hieu';

    // Xác định loại câu
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
    const points = colIndex.points >= 0 && Number(row[colIndex.points]) ? Number(row[colIndex.points]) : (type === 'DS' ? 1.0 : 0.25);

    if (type === 'TN') {
      const correctOpt = correctRaw.toUpperCase().charAt(0) as 'A' | 'B' | 'C' | 'D';
      if (!['A', 'B', 'C', 'D'].includes(correctOpt)) {
        errors.push({ line: lineNum, message: `Câu hỏi trắc nghiệm thiếu hoặc đáp án đúng không hợp lệ: "${correctRaw}". Vui lòng điền A, B, C hoặc D.` });
        continue;
      }
      if (!optA || !optB) {
        errors.push({ line: lineNum, message: 'Câu hỏi trắc nghiệm cần ít nhất phương án A và B.' });
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
        points,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else if (type === 'DS') {
      // Đúng sai: nếu các cột A, B, C, D chứa nội dung 4 ý, và cột Đúng chứa định dạng vd "Đ-S-Đ-Đ" hoặc "T-F-T-T"
      const subContents = [optA, optB, optC, optD].filter(Boolean);
      const isCorrectList: boolean[] = [];

      if (correctRaw.includes('-') || correctRaw.includes(',')) {
        const parts = correctRaw.split(/[-,\s]+/).map(p => p.trim().toUpperCase());
        parts.forEach(p => isCorrectList.push(p === 'Đ' || p === 'D' || p === 'T' || p === 'TRUE' || p === 'ĐÚNG'));
      } else {
        // Mặc định
        isCorrectList.push(true, false, true, false);
      }

      const subQuestions: SubQuestionDS[] = [
        { id: `sub_a_${r}`, label: 'a', content: optA || 'Ý phát biểu a', isCorrect: isCorrectList[0] ?? true },
        { id: `sub_b_${r}`, label: 'b', content: optB || 'Ý phát biểu b', isCorrect: isCorrectList[1] ?? false },
        { id: `sub_c_${r}`, label: 'c', content: optC || 'Ý phát biểu c', isCorrect: isCorrectList[2] ?? true },
        { id: `sub_d_${r}`, label: 'd', content: optD || 'Ý phát biểu d', isCorrect: isCorrectList[3] ?? false },
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
        points,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else if (type === 'TLN') {
      questions.push({
        id: `q_ex_${Date.now()}_${r}`,
        grade,
        topic,
        level,
        type: 'TLN',
        content,
        shortAnswer: correctRaw || '',
        explanation,
        points,
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
        points: points || 1.0,
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
 */
export function parseTextOrHtmlContent(
  textOrHtml: string,
  defaultGrade: GradeLevel = '11',
  defaultTopic: string = 'Công nghệ THPT'
): ParseResult {
  // Chuẩn hóa xuống dạng plain text có đánh dấu
  let text = textOrHtml
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, ' **$1** ')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, ' **$1** ')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, ' __$1__ ')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '');

  const questions: Question[] = [];
  const errors: { line: number; message: string }[] = [];

  // Tách văn bản thành các khối câu hỏi theo mẫu: Câu 1, Câu 2, Bài 1,...
  const questionRegex = /(?:^|\n)(?:Câu|Bài)\s+(\d+)[:.]\s*([\s\S]*?)(?=(?:\n(?:Câu|Bài)\s+\d+[:.]|$))/gi;
  let match;
  let count = 0;

  while ((match = questionRegex.exec(text)) !== null) {
    count++;
    const qNum = match[1];
    const qBody = match[2].trim();

    try {
      // Phân tích xem đây là câu Đúng/Sai, Trả lời ngắn, hay Trắc nghiệm 4 lựa chọn
      const isTrueFalse = /^[a-d]\s*[\).]/im.test(qBody) && (qBody.includes('[Đ]') || qBody.includes('[S]') || qBody.includes('(Đ)') || qBody.includes('(S)'));
      const isShortAnswer = /(?:Đáp án ngắn|Trả lời ngắn|Đáp số)[:.]/i.test(qBody);
      const isEssay = /(?:Tự luận|Hướng dẫn chấm)[:.]/i.test(qBody);

      if (isTrueFalse) {
        // Dạng Đúng / Sai
        const lines = qBody.split('\n').map(l => l.trim()).filter(Boolean);
        const subQuestions: SubQuestionDS[] = [];
        let mainContent = '';

        for (const line of lines) {
          const subMatch = line.match(/^([a-d])\s*[\).]\s*(.*)$/i);
          if (subMatch) {
            const label = subMatch[1].toLowerCase() as 'a' | 'b' | 'c' | 'd';
            let subText = subMatch[2];
            const isCorrect = /\[(Đ|Đúng|T|True)\]|\((Đ|Đúng|T|True)\)/i.test(subText);
            subText = subText.replace(/\[(?:Đ|S|Đúng|Sai|T|F)\]|\((?:Đ|S|Đúng|Sai|T|F)\)/gi, '').trim();
            subQuestions.push({
              id: `sq_${qNum}_${label}`,
              label,
              content: subText,
              isCorrect,
            });
          } else if (subQuestions.length === 0) {
            mainContent += (mainContent ? ' ' : '') + line;
          }
        }

        if (subQuestions.length >= 2) {
          questions.push({
            id: `q_txt_${Date.now()}_${count}`,
            grade: defaultGrade,
            topic: defaultTopic,
            level: 'Hieu',
            type: 'DS',
            content: mainContent || `Câu hỏi Đúng/Sai số ${qNum}`,
            subQuestions,
            points: 1.0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      } else if (isShortAnswer) {
        // Dạng Trả lời ngắn
        const ansMatch = qBody.match(/(?:Đáp án ngắn|Trả lời ngắn|Đáp số)[:.]\s*(.*)$/i);
        const shortAns = ansMatch ? ansMatch[1].trim() : '';
        const mainContent = qBody.replace(/(?:Đáp án ngắn|Trả lời ngắn|Đáp số)[:.]\s*.*$/i, '').trim();

        questions.push({
          id: `q_txt_${Date.now()}_${count}`,
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
        // Dạng Tự luận
        const guideMatch = qBody.match(/(?:Tự luận|Hướng dẫn chấm)[:.]\s*(.*)$/i);
        const essayGuide = guideMatch ? guideMatch[1].trim() : '';
        const mainContent = qBody.replace(/(?:Tự luận|Hướng dẫn chấm)[:.]\s*.*$/i, '').trim();

        questions.push({
          id: `q_txt_${Date.now()}_${count}`,
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
        // Dạng trắc nghiệm 4 lựa chọn (A, B, C, D)
        // Tìm dòng "Đáp án: B" hoặc dấu in đậm **A.** / __A.__
        let correctOpt: 'A' | 'B' | 'C' | 'D' | undefined;
        const ansLineMatch = qBody.match(/(?:Đáp án|Đáp án đúng|Chọn)[:.]\s*([A-D])/i);
        if (ansLineMatch) {
          correctOpt = ansLineMatch[1].toUpperCase() as any;
        }

        // Tách 4 phương án A, B, C, D
        const optMatchA = qBody.match(/(?:^|\n)\s*(?:\*\*|__)?A\s*[\).]\s*(.*?)(?=(?:\n\s*(?:\*\*|__)?B\s*[\).]|Đáp án|$))/s);
        const optMatchB = qBody.match(/(?:^|\n)\s*(?:\*\*|__)?B\s*[\).]\s*(.*?)(?=(?:\n\s*(?:\*\*|__)?C\s*[\).]|Đáp án|$))/s);
        const optMatchC = qBody.match(/(?:^|\n)\s*(?:\*\*|__)?C\s*[\).]\s*(.*?)(?=(?:\n\s*(?:\*\*|__)?D\s*[\).]|Đáp án|$))/s);
        const optMatchD = qBody.match(/(?:^|\n)\s*(?:\*\*|__)?D\s*[\).]\s*(.*?)(?=(?:\n\s*Đáp án|$))/s);

        // Kiểm tra xem phương án nào được in đậm / gạch chân
        if (!correctOpt) {
          if (optMatchA && (optMatchA[0].includes('**A') || optMatchA[0].includes('__A'))) correctOpt = 'A';
          else if (optMatchB && (optMatchB[0].includes('**B') || optMatchB[0].includes('__B'))) correctOpt = 'B';
          else if (optMatchC && (optMatchC[0].includes('**C') || optMatchC[0].includes('__C'))) correctOpt = 'C';
          else if (optMatchD && (optMatchD[0].includes('**D') || optMatchD[0].includes('__D'))) correctOpt = 'D';
        }

        // Nội dung câu hỏi là phần trước đáp án A
        const splitA = qBody.split(/(?:^|\n)\s*(?:\*\*|__)?A\s*[\).]/);
        const content = splitA[0].replace(/\*\*/g, '').replace(/__/g, '').trim();

        const optA = optMatchA ? optMatchA[1].replace(/\*\*/g, '').replace(/__/g, '').trim() : '';
        const optB = optMatchB ? optMatchB[1].replace(/\*\*/g, '').replace(/__/g, '').trim() : '';
        const optC = optMatchC ? optMatchC[1].replace(/\*\*/g, '').replace(/__/g, '').trim() : '';
        const optD = optMatchD ? optMatchD[1].replace(/\*\*/g, '').replace(/__/g, '').trim() : '';

        // Tách lời giải nếu có
        let explanation = '';
        const expMatch = qBody.match(/(?:Lời giải|Hướng dẫn|Giải thích)[:.]\s*(.*)$/is);
        if (expMatch) explanation = expMatch[1].trim();

        if (!correctOpt) {
          errors.push({ line: Number(qNum), message: `Câu ${qNum} thiếu chỉ định đáp án đúng (VD: thêm dòng "Đáp án: B" hoặc in đậm chữ cái B).` });
        }

        questions.push({
          id: `q_txt_${Date.now()}_${count}`,
          grade: defaultGrade,
          topic: defaultTopic,
          level: 'Biet',
          type: 'TN',
          content: content || `Câu hỏi số ${qNum}`,
          options: { A: optA, B: optB, C: optC, D: optD },
          correctOption: correctOpt || 'A',
          explanation,
          points: 0.25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } catch (err: any) {
      errors.push({ line: Number(qNum) || count, message: `Lỗi đọc câu ${qNum}: ${err.message}` });
    }
  }

  if (questions.length === 0 && count === 0) {
    errors.push({
      line: 1,
      message: 'Không tìm thấy định dạng "Câu 1.", "Câu 2:" hoặc "A.", "B." trong tài liệu. Vui lòng tải file mẫu để kiểm tra.',
    });
  }

  return { questions, errors, totalParsed: questions.length };
}

/**
 * Tải file mẫu Excel (.xlsx) chuẩn cấu trúc ngân hàng câu hỏi môn Công nghệ
 */
export function downloadSampleExcel() {
  const sampleData = [
    {
      'Lớp': '11',
      'Chủ đề/Bài': 'Cơ khí chế tạo & Vật liệu',
      'Mức độ': 'Biết',
      'Loại câu': 'TN',
      'Nội dung câu hỏi': 'Gang là hợp kim của sắt (Fe) và cacbon (C) có hàm lượng cacbon trong khoảng nào?',
      'Đáp án A': 'Lớn hơn 2,14%',
      'Đáp án B': 'Nhỏ hơn 2,14%',
      'Đáp án C': 'Từ 0,1% đến 1,5%',
      'Đáp án D': 'Chính xác 0,5%',
      'Đáp án đúng': 'A',
      'Lời giải/Gợi ý': 'Gang có hàm lượng C > 2,14%. Thép có hàm lượng C <= 2,14%.',
      'Điểm': 0.25,
    },
    {
      'Lớp': '11',
      'Chủ đề/Bài': 'Động cơ đốt trong',
      'Mức độ': 'Hiểu',
      'Loại câu': 'DS',
      'Nội dung câu hỏi': 'Trong chu trình hoạt động của động cơ 4 kỳ, hãy nhận định tính Đúng/Sai:',
      'Đáp án A': 'Kỳ 1 nạp hòa khí vào xilanh đối với động cơ xăng',
      'Đáp án B': 'Kỳ 2 nén hòa khí, hai xupap đều đóng kín',
      'Đáp án C': 'Kỳ 3 nổ - sinh công, piston đi từ ĐCT xuống ĐCD',
      'Đáp án D': 'Kỳ 4 xả, trục khuỷu quay đúng 4 vòng',
      'Đáp án đúng': 'Đ-Đ-Đ-S',
      'Lời giải/Gợi ý': 'Kỳ 4 xả trục khuỷu chỉ hoàn thành 2 vòng quay trong cả chu trình 4 kỳ.',
      'Điểm': 1.0,
    },
    {
      'Lớp': '12',
      'Chủ đề/Bài': 'Kĩ thuật điện',
      'Mức độ': 'Vận dụng',
      'Loại câu': 'TLN',
      'Nội dung câu hỏi': 'Một tải 3 pha đối xứng nối sao có Ud = 380V. Tính điện áp pha Up (V)? (Làm tròn đơn vị)',
      'Đáp án A': '',
      'Đáp án B': '',
      'Đáp án C': '',
      'Đáp án D': '',
      'Đáp án đúng': '220|220V',
      'Lời giải/Gợi ý': 'Up = Ud / sqrt(3) = 380 / 1.732 ≈ 220 V.',
      'Điểm': 0.5,
    },
    {
      'Lớp': '10',
      'Chủ đề/Bài': 'Vẽ kĩ thuật & Thiết kế',
      'Mức độ': 'Vận dụng',
      'Loại câu': 'TL',
      'Nội dung câu hỏi': 'Hãy trình bày các bước lập bản vẽ chi tiết từ vật mẫu cơ khí trong thực tế sản xuất.',
      'Đáp án A': '',
      'Đáp án B': '',
      'Đáp án C': '',
      'Đáp án D': '',
      'Đáp án đúng': 'Bước 1: Quan sát, phân tích chi tiết. Bước 2: Chọn phương án biểu diễn. Bước 3: Vẽ phác các hình chiếu. Bước 4: Đo kích thước và ghi kích thước. Bước 5: Kiểm tra và hoàn thiện khung tên.',
      'Lời giải/Gợi ý': 'Đầy đủ 5 bước theo tiêu chuẩn TCVN.',
      'Điểm': 1.5,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  // Đặt độ rộng cột cho đẹp mắt
  worksheet['!cols'] = [
    { wch: 8 }, // Lớp
    { wch: 25 }, // Chủ đề
    { wch: 12 }, // Mức độ
    { wch: 10 }, // Loại câu
    { wch: 45 }, // Nội dung
    { wch: 25 }, // A
    { wch: 25 }, // B
    { wch: 25 }, // C
    { wch: 25 }, // D
    { wch: 14 }, // Đáp án đúng
    { wch: 30 }, // Lời giải
    { wch: 8 },  // Điểm
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CauHoi');
  XLSX.writeFile(workbook, 'Mau_Cau_Hoi_Cong_Nghe_THPT.xlsx');
}

/**
 * Tải file mẫu Word (.docx) chuẩn cấu trúc môn Công nghệ
 */
export async function downloadSampleDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'MẪU SOẠN NGÂN HÀNG CÂU HỎI MÔN CÔNG NGHỆ THPT (2018)',
            heading: HeadingLevel.HEADING_1,
            alignment: 'center',
          }),
          new Paragraph({
            text: 'Quy ước soạn: Sử dụng "Câu 1.", "Câu 2:"... Các phương án bắt đầu bằng "A.", "B.", "C.", "D.". Đáp án đúng có thể in đậm hoặc ghi dòng "Đáp án: X". Dạng Đúng/Sai dùng "a)", "b)", "c)", "d)" kèm [Đ] hoặc [S].',
            spacing: { after: 200 },
          }),

          // Câu 1
          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 1. ', bold: true }),
              new TextRun('Trong phương pháp chiếu góc thứ nhất, hình chiếu bằng có hướng chiếu từ đâu?'),
            ],
          }),
          new Paragraph({ text: 'A. Từ trước tới' }),
          new Paragraph({ children: [new TextRun({ text: 'B. Từ trên xuống', bold: true })] }),
          new Paragraph({ text: 'C. Từ trái sang' }),
          new Paragraph({ text: 'D. Từ phải sang' }),
          new Paragraph({ text: 'Đáp án: B', spacing: { after: 150 } }),

          // Câu 2
          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 2. ', bold: true }),
              new TextRun('Động cơ đốt trong 4 kỳ xăng, hãy nhận định tính Đúng/Sai của các ý sau:'),
            ],
          }),
          new Paragraph({ text: 'a) Kỳ 1 nạp hòa khí xăng và không khí vào xilanh. [Đ]' }),
          new Paragraph({ text: 'b) Kỳ 2 nén không khí thuần túy như động cơ diesel. [S]' }),
          new Paragraph({ text: 'c) Cuối kỳ nén bugi bật tia lửa điện đốt cháy hòa khí. [Đ]' }),
          new Paragraph({ text: 'd) Trục khuỷu quay 2 vòng sau mỗi chu trình 4 kỳ. [Đ]', spacing: { after: 150 } }),

          // Câu 3
          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 3. ', bold: true }),
              new TextRun('Trong mạch điện 3 pha đối xứng nối sao (Y), biết điện áp pha Up = 220V. Giá trị điện áp dây Ud xấp xỉ bao nhiêu Vôn?'),
            ],
          }),
          new Paragraph({ text: 'Đáp án ngắn: 380|381' }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Mau_Cau_Hoi_Cong_Nghe_THPT.docx';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Tải file đề thi gốc mẫu (.docx) đầy đủ 4 phần chuẩn CT GDPT 2018 môn Công nghệ
 */
export async function downloadSampleOriginalExamDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'TRƯỜNG THPT CHUYÊN LÊ KHIẾT',
            alignment: 'center',
          }),
          new Paragraph({
            text: 'TỔ: VẬT LÍ - CÔNG NGHỆ',
            alignment: 'center',
          }),
          new Paragraph({
            text: 'ĐỀ THI KIỂM TRA ĐỊNH KÌ MÔN CÔNG NGHỆ 11 (CÔNG NGHỆ CƠ KHÍ)',
            heading: HeadingLevel.HEADING_1,
            alignment: 'center',
            spacing: { before: 100, after: 150 },
          }),
          new Paragraph({
            text: 'Thời gian làm bài: 45 phút (Không kể thời gian phát đề)',
            alignment: 'center',
            spacing: { after: 200 },
          }),

          // PHẦN I
          new Paragraph({
            children: [
              new TextRun({ text: 'PHẦN I. Thí sinh trả lời từ câu 1 đến câu 4. Mỗi câu hỏi thí sinh chỉ chọn một phương án.', bold: true }),
            ],
            spacing: { before: 150, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 1. ', bold: true }),
              new TextRun('Vật liệu nào sau đây thuộc nhóm kim loại đen trong cơ khí chế tạo?'),
            ],
          }),
          new Paragraph({ text: 'A. Đồng thanh' }),
          new Paragraph({ text: 'B. Nhôm đúc' }),
          new Paragraph({ children: [new TextRun({ text: 'C. Gang xám', bold: true })] }),
          new Paragraph({ text: 'D. Hợp kim titan' }),
          new Paragraph({ text: 'Đáp án: C', spacing: { after: 120 } }),

          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 2. ', bold: true }),
              new TextRun('Trong động cơ đốt trong 4 kỳ, loại động cơ nào tự bốc cháy hòa khí do nhiệt độ và áp suất cao?'),
            ],
          }),
          new Paragraph({ text: 'A. Động cơ xăng 4 kỳ' }),
          new Paragraph({ children: [new TextRun({ text: 'B. Động cơ Điêzen (Diesel)', bold: true })] }),
          new Paragraph({ text: 'C. Động cơ xăng 2 kỳ' }),
          new Paragraph({ text: 'D. Động cơ Wankel' }),
          new Paragraph({ text: 'Đáp án: B', spacing: { after: 120 } }),

          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 3. ', bold: true }),
              new TextRun('Chi tiết nào có nhiệm vụ đóng mở các cửa nạp và cửa xả đúng thời điểm trong động cơ đốt trong?'),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: 'A. Cơ cấu phối khí (Xupap)', bold: true })] }),
          new Paragraph({ text: 'B. Thanh truyền' }),
          new Paragraph({ text: 'C. Trục khuỷu' }),
          new Paragraph({ text: 'D. Bánh đà' }),
          new Paragraph({ text: 'Đáp án: A', spacing: { after: 120 } }),

          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 4. ', bold: true }),
              new TextRun('Tỉ số truyền i giữa bánh dẫn Z1 = 20 răng và bánh bị dẫn Z2 = 60 răng là:'),
            ],
          }),
          new Paragraph({ text: 'A. i = 0,2' }),
          new Paragraph({ children: [new TextRun({ text: 'B. i = 3', bold: true })] }),
          new Paragraph({ text: 'C. i = 1/3' }),
          new Paragraph({ text: 'D. i = 4' }),
          new Paragraph({ text: 'Đáp án: B', spacing: { after: 150 } }),

          // PHẦN II
          new Paragraph({
            children: [
              new TextRun({ text: 'PHẦN II. Thí sinh trả lời từ câu 5 đến câu 6. Trong mỗi ý a), b), c), d), thí sinh chọn Đúng hoặc Sai.', bold: true }),
            ],
            spacing: { before: 150, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 5. ', bold: true }),
              new TextRun('Xét chu trình làm việc của động cơ xăng 4 kỳ một xilanh:'),
            ],
          }),
          new Paragraph({ text: 'a) Ở kỳ nạp, piston đi từ ĐCT xuống ĐCD và mở xupap nạp. [Đ]' }),
          new Paragraph({ text: 'b) Ở kỳ nén, hai xupap đều mở để hòa khí lưu thông. [S]' }),
          new Paragraph({ text: 'c) Cuối kỳ nén bugi bật tia lửa điện đốt cháy hòa khí nén. [Đ]' }),
          new Paragraph({ text: 'd) Trục khuỷu quay đúng 4 vòng sau khi hoàn thành 4 kỳ. [S]', spacing: { after: 120 } }),

          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 6. ', bold: true }),
              new TextRun('Về các phương pháp gia công cơ khí cắt gọt thông dụng:'),
            ],
          }),
          new Paragraph({ text: 'a) Tiện là phương pháp chủ yếu tạo hình bề mặt tròn xoay. [Đ]' }),
          new Paragraph({ text: 'b) Phay thường dùng để gia công mặt phẳng, rãnh then và bánh răng. [Đ]' }),
          new Paragraph({ text: 'c) Khoan chỉ tạo được lỗ tiết diện hình vuông. [S]' }),
          new Paragraph({ text: 'd) Mài là phương pháp gia công tinh bề mặt sau nhiệt luyện. [Đ]', spacing: { after: 150 } }),

          // PHẦN III
          new Paragraph({
            children: [
              new TextRun({ text: 'PHẦN III. Thí sinh trả lời từ câu 7 đến câu 8. Thí sinh điền đáp số ngắn vào ô tương ứng.', bold: true }),
            ],
            spacing: { before: 150, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 7. ', bold: true }),
              new TextRun('Động cơ 4 kỳ có đường kính xilanh D = 80mm và hành trình S = 90mm. Thể tích công tác Vh của một xilanh xấp xỉ bao nhiêu cm³? (Lấy số nguyên)'),
            ],
          }),
          new Paragraph({ text: 'Đáp án ngắn: 452|452cm3', spacing: { after: 120 } }),

          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 8. ', bold: true }),
              new TextRun('Bộ truyền đai có đường kính bánh dẫn D1 = 120mm quay n1 = 1400 vòng/phút, bánh bị dẫn D2 = 240mm. Tốc độ quay n2 của bánh bị dẫn là bao nhiêu vòng/phút?'),
            ],
          }),
          new Paragraph({ text: 'Đáp án ngắn: 700|700 vòng/phút', spacing: { after: 150 } }),

          // PHẦN IV
          new Paragraph({
            children: [
              new TextRun({ text: 'PHẦN IV. Câu hỏi tự luận.', bold: true }),
            ],
            spacing: { before: 150, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Câu 9. ', bold: true }),
              new TextRun('Nêu quy tắc an toàn lao động khi vận hành máy tiện vạn năng trong xưởng cơ khí thực hành.'),
            ],
          }),
          new Paragraph({ text: 'Tự luận: Đeo kính bảo hộ, mặc quần áo gọn gàng không đeo găng tay khi vận hành trục quay, kiểm tra kẹp chặt phôi và tháo chìa khóa mâm cặp trước khi ấn nút khởi động.', spacing: { after: 150 } }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'De_Thi_Goc_Mau_Cong_Nghe_11.docx';
  a.click();
  URL.revokeObjectURL(url);
}
