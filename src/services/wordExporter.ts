/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { Exam, Question, ShuffledExamPackage, ShuffledExamCode, AppSettings } from '../types';

/**
 * Xuất đề thi chuẩn định dạng Word (.docx) kèm đáp án và ma trận
 */
export async function exportExamToDocx(
  exam: Exam,
  questionsMap: Record<string, Question>,
  settings: Partial<AppSettings> = {},
  includeAnswerKey = true
) {
  const schoolName = settings.schoolName || 'TRƯỜNG THPT CHUYÊN LÊ KHIẾT';
  const teacherName = settings.teacherName || 'VÕ HOÀNG HẢI';
  const schoolYear = exam.schoolYear || settings.schoolYear || '2026 - 2027';

  const docChildren: any[] = [];

  // 1. Tiêu đề đầu trang (Header chuẩn giáo dục Việt Nam)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ text: schoolName.toUpperCase(), alignment: AlignmentType.CENTER }),
              new Paragraph({ text: 'TỔ: VẬT LÍ - CÔNG NGHỆ', alignment: AlignmentType.CENTER }),
              new Paragraph({ text: '-----------------------', alignment: AlignmentType.CENTER }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: exam.title.toUpperCase(), bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ text: `Môn: Công nghệ ${exam.grade} (Tổ: Vật lí - Công nghệ)`, alignment: AlignmentType.CENTER }),
              new Paragraph({ text: `Giáo viên ra đề: ${teacherName}`, alignment: AlignmentType.CENTER }),
              new Paragraph({ text: `Thời gian làm bài: ${exam.durationMinutes} phút · Năm học: ${schoolYear}`, alignment: AlignmentType.CENTER }),
            ],
          }),
        ],
      }),
    ],
  });

  docChildren.push(headerTable);
  docChildren.push(new Paragraph({ text: '', spacing: { after: 150 } }));

  // Khung thông tin học sinh
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Họ và tên học sinh: ........................................................................ ' }),
        new TextRun({ text: 'Lớp: ........................ ' }),
        new TextRun({ text: 'Mã đề thi: GỐC', bold: true }),
      ],
      spacing: { after: 200 },
    })
  );

  // Phân nhóm câu hỏi theo 4 phần
  const s1List: { ref: any; q: Question }[] = [];
  const s2List: { ref: any; q: Question }[] = [];
  const s3List: { ref: any; q: Question }[] = [];
  const s4List: { ref: any; q: Question }[] = [];

  exam.questions.forEach(ref => {
    const q = questionsMap[ref.questionId];
    if (!q) return;
    if (ref.section === 1 || q.type === 'TN') s1List.push({ ref, q });
    else if (ref.section === 2 || q.type === 'DS') s2List.push({ ref, q });
    else if (ref.section === 3 || q.type === 'TLN') s3List.push({ ref, q });
    else s4List.push({ ref, q });
  });

  let qIndex = 1;

  // PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN
  if (s1List.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `PHẦN I. Thí sinh trả lời từ câu ${qIndex} đến câu ${qIndex + s1List.length - 1}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.`,
            bold: true,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    s1List.forEach(({ ref, q }) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${qIndex}. `, bold: true }),
            new TextRun({ text: q.content }),
          ],
          spacing: { before: 100 },
        })
      );

      if (q.options) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'A. ', bold: true }),
              new TextRun({ text: `${q.options.A || ''}         ` }),
              new TextRun({ text: 'B. ', bold: true }),
              new TextRun({ text: `${q.options.B || ''}         ` }),
              new TextRun({ text: 'C. ', bold: true }),
              new TextRun({ text: `${q.options.C || ''}         ` }),
              new TextRun({ text: 'D. ', bold: true }),
              new TextRun({ text: `${q.options.D || ''}` }),
            ],
            spacing: { after: 100 },
          })
        );
      }
      qIndex++;
    });
  }

  // PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI
  if (s2List.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `PHẦN II. Thí sinh trả lời từ câu ${qIndex} đến câu ${qIndex + s2List.length - 1}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.`,
            bold: true,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    s2List.forEach(({ ref, q }) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${qIndex}. `, bold: true }),
            new TextRun({ text: q.content }),
          ],
          spacing: { before: 100 },
        })
      );

      if (q.subQuestions && q.subQuestions.length > 0) {
        q.subQuestions.forEach(sq => {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: `    ${sq.label}) `, bold: true }),
                new TextRun({ text: sq.content }),
              ],
            })
          );
        });
      }
      qIndex++;
    });
  }

  // PHẦN III: TRẮC NGHIỆM TRẢ LỜI NGẮN
  if (s3List.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `PHẦN III. Thí sinh trả lời từ câu ${qIndex} đến câu ${qIndex + s3List.length - 1}. Viết câu trả lời vào phiếu làm bài.`,
            bold: true,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    s3List.forEach(({ ref, q }) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${qIndex}. `, bold: true }),
            new TextRun({ text: q.content }),
          ],
          spacing: { before: 100, after: 100 },
        })
      );
      qIndex++;
    });
  }

  // PHẦN IV: TỰ LUẬN
  if (s4List.length > 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `PHẦN IV. TỰ LUẬN (${exam.sectionPoints.section4} điểm)`,
            bold: true,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    s4List.forEach(({ ref, q }) => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${qIndex}. `, bold: true }),
            new TextRun({ text: `(${ref.points} điểm) ${q.content}` }),
          ],
          spacing: { before: 100, after: 100 },
        })
      );
      qIndex++;
    });
  }

  docChildren.push(
    new Paragraph({
      text: '-------------------------- HẾT --------------------------',
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 400 },
    })
  );

  // ĐÁP ÁN & HƯỚNG DẪN CHẤM
  if (includeAnswerKey) {
    docChildren.push(
      new Paragraph({
        text: 'HƯỚNG DẪN CHẤM VÀ ĐÁP ÁN CHI TIẾT',
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
      })
    );

    // Bảng đáp án Phần I
    if (s1List.length > 0) {
      docChildren.push(new Paragraph({ children: [new TextRun({ text: '1. Đáp án Phần I (Trắc nghiệm nhiều lựa chọn):', bold: true })] }));
      let startIdx = 1;
      const keyRows: TableRow[] = [];
      const cellsPerCol = 10;
      for (let i = 0; i < s1List.length; i += cellsPerCol) {
        const chunk = s1List.slice(i, i + cellsPerCol);
        const headerCells = chunk.map((_, idx) => new TableCell({ children: [new Paragraph({ text: `Câu ${startIdx + i + idx}`, alignment: AlignmentType.CENTER })] }));
        const ansCells = chunk.map(item => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${item.q.correctOption || 'A'}`, bold: true })], alignment: AlignmentType.CENTER })] }));
        keyRows.push(new TableRow({ children: headerCells }));
        keyRows.push(new TableRow({ children: ansCells }));
      }
      docChildren.push(new Table({ rows: keyRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      docChildren.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    }

    // Đáp án Phần II
    if (s2List.length > 0) {
      docChildren.push(new Paragraph({ children: [new TextRun({ text: '2. Đáp án Phần II (Đúng/Sai):', bold: true })] }));
      s2List.forEach((item, idx) => {
        const sq = item.q.subQuestions || [];
        const dsKey = sq.map(s => `${s.label}) ${s.isCorrect ? 'Đ' : 'S'}`).join('   ');
        docChildren.push(new Paragraph({ text: `Câu ${s1List.length + 1 + idx}: ${dsKey}` }));
      });
      docChildren.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    }

    // Đáp án Phần III
    if (s3List.length > 0) {
      docChildren.push(new Paragraph({ children: [new TextRun({ text: '3. Đáp án Phần III (Trả lời ngắn):', bold: true })] }));
      s3List.forEach((item, idx) => {
        docChildren.push(new Paragraph({ text: `Câu ${s1List.length + s2List.length + 1 + idx}: ${item.q.shortAnswer || ''}` }));
      });
      docChildren.push(new Paragraph({ text: '', spacing: { after: 150 } }));
    }

    // Hướng dẫn chấm Phần IV
    if (s4List.length > 0) {
      docChildren.push(new Paragraph({ children: [new TextRun({ text: '4. Hướng dẫn chấm Phần IV (Tự luận):', bold: true })] }));
      s4List.forEach((item, idx) => {
        docChildren.push(new Paragraph({ children: [new TextRun({ text: `Câu ${s1List.length + s2List.length + s3List.length + 1 + idx}:`, bold: true })] }));
        docChildren.push(new Paragraph({ text: item.q.essayGuide || item.q.explanation || 'Chấm theo biểu điểm chi tiết của giáo viên.' }));
      });
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children: docChildren }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `De_Thi_${exam.title.replace(/\s+/g, '_')}_Goc.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Xuất trọn bộ các mã đề xáo (.docx) kèm BẢNG ĐÁP ÁN CHÉO TỔNG HỢP và BẢNG ĐỐI CHIẾU
 */
export async function exportShuffledExamPackageToDocx(
  pkg: ShuffledExamPackage,
  settings: Partial<AppSettings> = {}
) {
  const schoolName = settings.schoolName || 'TRƯỜNG THPT CHUYÊN LÊ KHIẾT';
  const schoolYear = pkg.schoolYear || settings.schoolYear || '2026 - 2027';

  const docChildren: any[] = [];

  // 1. Trang BẢNG ĐÁP ÁN TỔNG HỢP CÁC MÃ ĐỀ
  docChildren.push(
    new Paragraph({
      text: 'BẢNG ĐÁP ÁN CHÉO VÀ MA TRẬN ĐỐI CHIẾU CÁC MÃ ĐỀ THI',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );
  docChildren.push(
    new Paragraph({
      text: `Đề thi: ${pkg.examTitle} | Lớp: ${pkg.grade} | Năm học: ${schoolYear}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Tạo bảng đáp án chéo
  const totalQuestions = pkg.codes[0]?.questions.length || 0;
  const headerCells = [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Câu \\ Mã đề', bold: true })], alignment: AlignmentType.CENTER })] })];
  pkg.codes.forEach(c => {
    headerCells.push(new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Mã ${c.code}`, bold: true })], alignment: AlignmentType.CENTER })] }));
  });

  const rows = [new TableRow({ children: headerCells })];

  for (let qNum = 1; qNum <= totalQuestions; qNum++) {
    const rowCells = [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Câu ${qNum}`, bold: true })], alignment: AlignmentType.CENTER })] })];
    pkg.codes.forEach(c => {
      const ans = c.answerKey[qNum] || '-';
      rowCells.push(new TableCell({ children: [new Paragraph({ text: ans, alignment: AlignmentType.CENTER })] }));
    });
    rows.push(new TableRow({ children: rowCells }));
  }

  docChildren.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));

  // Ngắt trang để in từng mã đề
  docChildren.push(new Paragraph({ text: '', pageBreakBefore: true }));

  // In từng mã đề
  pkg.codes.forEach((codeObj, cIdx) => {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: schoolName.toUpperCase() + ' - MÃ ĐỀ: ' + codeObj.code, bold: true }),
        ],
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
      })
    );
    docChildren.push(
      new Paragraph({
        text: `BÀI KIỂM TRA MÔN CÔNG NGHỆ ${pkg.grade} - THỜI GIAN: ${pkg.durationMinutes} PHÚT`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
    docChildren.push(
      new Paragraph({
        text: 'Họ và tên: .............................................................. Lớp: ................ Số báo danh: ................',
        spacing: { after: 250 },
      })
    );

    codeObj.questions.forEach(qItem => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Câu ${qItem.displayIndex}. `, bold: true }),
            new TextRun({ text: qItem.content }),
          ],
          spacing: { before: 80 },
        })
      );

      if (qItem.type === 'TN' && qItem.options) {
        docChildren.push(
          new Paragraph({
            children: qItem.options.flatMap(opt => [
              new TextRun({ text: `${opt.key}. `, bold: true }),
              new TextRun({ text: `${opt.text}    ` }),
            ]),
            spacing: { after: 80 },
          })
        );
      } else if (qItem.type === 'DS' && qItem.subQuestions) {
        qItem.subQuestions.forEach(sq => {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: `    ${sq.label}) `, bold: true }),
                new TextRun({ text: sq.content }),
              ],
            })
          );
        });
      }
    });

    if (cIdx < pkg.codes.length - 1) {
      docChildren.push(new Paragraph({ text: '', pageBreakBefore: true }));
    }
  });

  const doc = new Document({
    sections: [{ properties: {}, children: docChildren }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bo_Ma_De_${pkg.examTitle.replace(/\s+/g, '_')}_Word.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
