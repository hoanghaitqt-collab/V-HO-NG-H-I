/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, Exam, ClassGroup, Student, Assignment } from '../types';

export const DEMO_QUESTIONS: Question[] = [
  // 1. Lớp 10 - Bản vẽ kỹ thuật (TN)
  {
    id: 'demo-q1',
    grade: '10',
    topic: 'Vẽ kĩ thuật & Thiết kế',
    level: 'Biet',
    type: 'TN',
    content: 'Trong phương pháp chiếu góc thứ nhất, hướng chiếu từ trước tới (từ trước ra sau) cho ta hình chiếu nào sau đây?',
    options: {
      A: 'Hình chiếu đứng',
      B: 'Hình chiếu bằng',
      C: 'Hình chiếu cạnh',
      D: 'Hình chiếu trục đo',
    },
    correctOption: 'A',
    explanation: 'Hình chiếu từ trước ra sau thu được hình chiếu đứng trên mặt phẳng hình chiếu đứng.',
    points: 0.25,
    isDemo: true,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 24,
  },

  // 2. Lớp 10 - Quy trình thiết kế (TN)
  {
    id: 'demo-q2',
    grade: '10',
    topic: 'Quy trình thiết kế kĩ thuật',
    level: 'Hieu',
    type: 'TN',
    content: 'Bước đầu tiên và mang tính chất định hướng trong quy trình thiết kế kỹ thuật là gì?',
    options: {
      A: 'Tìm kiếm thông tin và đề xuất giải pháp',
      B: 'Xác định vấn đề, yêu cầu cần giải quyết',
      C: 'Chế tạo mô hình thử nghiệm',
      D: 'Lập hồ sơ kỹ thuật của sản phẩm',
    },
    correctOption: 'B',
    explanation: 'Quy trình thiết kế kỹ thuật luôn khởi đầu bằng việc phát hiện nhu cầu, xác định rõ vấn đề và các tiêu chí kỹ thuật cần đạt.',
    points: 0.25,
    isDemo: true,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 24,
  },

  // 3. Lớp 11 - Cơ khí chế tạo: Vật liệu kim loại (TN)
  {
    id: 'demo-q3',
    grade: '11',
    topic: 'Cơ khí chế tạo & Vật liệu',
    level: 'Biet',
    type: 'TN',
    content: 'Thép cacbon là hợp kim của sắt (Fe) và cacbon (C), trong đó hàm lượng cacbon chiếm tỉ lệ bao nhiêu?',
    options: {
      A: 'Lớn hơn 2,14%',
      B: 'Nhỏ hơn hoặc bằng 2,14%',
      C: 'Từ 3% đến 5%',
      D: 'Chính xác 0,5%',
    },
    correctOption: 'B',
    explanation: 'Thép là hợp kim Fe-C có hàm lượng C ≤ 2,14%. Nếu hàm lượng C > 2,14% thì gọi là gang.',
    points: 0.25,
    isDemo: true,
    createdAt: Date.now() - 3600000 * 20,
    updatedAt: Date.now() - 3600000 * 20,
  },

  // 4. Lớp 11 - Cơ cấu truyền lực: Bánh răng (TN - Vận dụng)
  {
    id: 'demo-q4',
    grade: '11',
    topic: 'Cơ khí chế tạo & Vật liệu',
    level: 'VanDung',
    type: 'TN',
    content: 'Một cặp bánh răng ăn khớp ngoài có bánh dẫn gồm số răng Z1 = 20 răng quay với tốc độ n1 = 1200 vòng/phút. Bánh bị dẫn có số răng Z2 = 60 răng. Tốc độ quay n2 của bánh bị dẫn là bao nhiêu?',
    options: {
      A: '400 vòng/phút',
      B: '3600 vòng/phút',
      C: '600 vòng/phút',
      D: '200 vòng/phút',
    },
    correctOption: 'A',
    explanation: 'Tỉ số truyền i = n1 / n2 = Z2 / Z1 => n2 = n1 * (Z1 / Z2) = 1200 * (20 / 60) = 400 vòng/phút.',
    points: 0.25,
    lockOptionOrder: false,
    isDemo: true,
    createdAt: Date.now() - 3600000 * 18,
    updatedAt: Date.now() - 3600000 * 18,
  },

  // 5. Lớp 11 - Động cơ đốt trong: Nguyên lý 4 kỳ (Đúng / Sai 4 ý)
  {
    id: 'demo-q5',
    grade: '11',
    topic: 'Động cơ đốt trong',
    level: 'Hieu',
    type: 'DS',
    content: 'Xét nguyên lý hoạt động của động cơ điêzen 4 kỳ trong một chu trình công tác. Hãy nhận định tính Đúng (Đ) hoặc Sai (S) của các phát biểu sau:',
    subQuestions: [
      {
        id: 'sub-1',
        label: 'a',
        content: 'Ở kỳ nạp, xupap nạp mở, xupap thải đóng, không khí sạch được hút vào xilanh động cơ.',
        isCorrect: true,
      },
      {
        id: 'sub-2',
        label: 'b',
        content: 'Ở kỳ nén, hòa khí gồm xăng và không khí được nén với áp suất và nhiệt độ cao.',
        isCorrect: false, // Sai vì động cơ diesel chỉ nén không khí thuần túy
      },
      {
        id: 'sub-3',
        label: 'c',
        content: 'Cuối kỳ nén, vòi phun phun tơi nhiên liệu điêzen vào buồng cháy gặp không khí nóng tự bốc cháy.',
        isCorrect: true,
      },
      {
        id: 'sub-4',
        label: 'd',
        content: 'Trong cả chu trình 4 kỳ, trục khuỷu quay đúng 1 vòng (360 độ).',
        isCorrect: false, // Sai: Động cơ 4 kỳ trục khuỷu quay 2 vòng (720 độ)
      },
    ],
    explanation: 'Động cơ Diesel kỳ nạp chỉ hút không khí sạch, không có bộ chế hòa khí. Chu trình 4 kỳ trục khuỷu quay 2 vòng (720 độ).',
    points: 1.0,
    isDemo: true,
    createdAt: Date.now() - 3600000 * 15,
    updatedAt: Date.now() - 3600000 * 15,
  },

  // 6. Lớp 12 - Mạch điện 3 pha (TN)
  {
    id: 'demo-q6',
    grade: '12',
    topic: 'Kĩ thuật điện',
    level: 'Biet',
    type: 'TN',
    content: 'Trong mạch điện ba pha hình sao đối xứng (Y), mối quan hệ giữa điện áp dây Ud và điện áp pha Up là:',
    options: {
      A: 'Ud = √3 × Up',
      B: 'Ud = Up',
      C: 'Ud = Up / √3',
      D: 'Ud = 3 × Up',
    },
    correctOption: 'A',
    explanation: 'Đối với mạch nối hình sao đối xứng: Id = Ip và Ud = √3 * Up.',
    points: 0.25,
    lockOptionOrder: true, // công thức toán học đối xứng
    isDemo: true,
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12,
  },

  // 7. Lớp 12 - Kỹ thuật điện: Tính toán công suất 3 pha (Trả lời ngắn)
  {
    id: 'demo-q7',
    grade: '12',
    topic: 'Kĩ thuật điện',
    level: 'VanDung',
    type: 'TLN',
    content: 'Một nguồn điện 3 pha đối xứng nối hình sao có điện áp pha Up = 220 V. Tính trị số điện áp dây Ud (V) của nguồn điện này? (Lấy √3 ≈ 1,732; làm tròn đến hàng đơn vị).',
    shortAnswer: '381|380|381V|380V',
    explanation: 'Ud = √3 * Up ≈ 1,732 * 220 = 381,04 V (chấp nhận 381 hoặc 380 tiêu chuẩn lưới điện VN).',
    points: 0.5,
    isDemo: true,
    createdAt: Date.now() - 3600000 * 10,
    updatedAt: Date.now() - 3600000 * 10,
  },

  // 8. Lớp 12 - Linh kiện bán dẫn: Diode & Transistor (Đúng / Sai 4 ý)
  {
    id: 'demo-q8',
    grade: '12',
    topic: 'Kĩ thuật điện tử',
    level: 'Hieu',
    type: 'DS',
    content: 'Cho các phát biểu về linh kiện bán dẫn và vi mạch điện tử công nghiệp:',
    subQuestions: [
      {
        id: 'sub-d1',
        label: 'a',
        content: 'Diode bán dẫn có tính chất dẫn điện theo cả hai chiều như nhau.',
        isCorrect: false, // Diode chỉ dẫn điện theo 1 chiều từ Anot sang Katot
      },
      {
        id: 'sub-d2',
        label: 'b',
        content: 'Transistor (BJT) là linh kiện có 3 cực: E (Emiter), B (Bazơ) và C (Colector).',
        isCorrect: true,
      },
      {
        id: 'sub-d3',
        label: 'c',
        content: 'Tirixto (SCR) được dùng làm linh kiện chỉnh lưu có điều khiển trong các mạch biến đổi điện áp.',
        isCorrect: true,
      },
      {
        id: 'sub-d4',
        label: 'd',
        content: 'Quang điện trở có trị số điện trở tăng mạnh khi được chiếu sáng.',
        isCorrect: false, // Quang điện trở: khi chiếu sáng thì điện trở giảm mạnh
      },
    ],
    explanation: 'Diode chỉ dẫn điện 1 chiều. Quang điện trở (LDR) giảm điện trở khi cường độ ánh sáng tăng.',
    points: 1.0,
    isDemo: true,
    createdAt: Date.now() - 3600000 * 8,
    updatedAt: Date.now() - 3600000 * 8,
  },

  // 9. Lớp 12 - Mạch khuếch đại thuật toán OA (Trả lời ngắn)
  {
    id: 'demo-q9',
    grade: '12',
    topic: 'Kĩ thuật điện tử',
    level: 'VanDung',
    type: 'TLN',
    content: 'Trong mạch khuếch đại đảo dùng OA, điện trở hồi tiếp Rf = 100 kΩ và điện trở vào R1 = 10 kΩ. Hệ số khuếch đại điện áp (về độ lớn |K|) của mạch là bao nhiêu?',
    shortAnswer: '10|10 lần',
    explanation: 'Hệ số khuếch đại điện áp mạch đảo: K = -Rf / R1 => |K| = 100 / 10 = 10.',
    points: 0.5,
    isDemo: true,
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5,
  },

  // 10. Lớp 11 - An toàn lao động & Bảo dưỡng cơ khí (Tự luận)
  {
    id: 'demo-q10',
    grade: '11',
    topic: 'Cơ khí chế tạo & Vật liệu',
    level: 'VanDung',
    type: 'TL',
    content: 'Em hãy nêu 03 nguyên tắc an toàn lao động cơ bản khi vận hành máy tiện kim loại trong xưởng cơ khí thực hành. Giải thích vì sao người thợ tuyệt đối không được đeo găng tay vải khi thao tác gá phôi đang quay.',
    essayGuide: '- Nêu được 3 nguyên tắc an toàn: trang phục gọn gàng, kiểm tra che chắn bảo vệ, dừng máy trước khi đo kiểm/thay dao (0.75đ)\n- Giải thích việc không đeo găng tay: găng tay dễ bị các chi tiết quay (trục xoay, mâm cặp, phôi tiện) cuốn vào, gây tai nạn đứt gãy hoặc kẹp ngón tay đặc biệt nguy hiểm (0.75đ).',
    points: 1.5,
    isDemo: true,
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 2,
  },
];

export const DEMO_CLASSES: ClassGroup[] = [
  {
    id: 'demo-class-1',
    name: '11A1',
    grade: '11',
    academicYear: '2024-2025',
    note: 'Lớp chọn tự nhiên - Định hướng Công nghiệp',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'demo-class-2',
    name: '12A3',
    grade: '12',
    academicYear: '2024-2025',
    note: 'Lớp chuẩn bị thi ĐGNL & Tốt nghiệp THPT',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'demo-class-3',
    name: '10B2',
    grade: '10',
    academicYear: '2024-2025',
    note: 'Học kì 1 - Thiết kế kỹ thuật',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const DEMO_STUDENTS: Student[] = [
  { id: 'demo-s1', className: '11A1', studentId: 'HS1101', name: 'Nguyễn Văn An', birthDate: '2008-05-12', gender: 'Nam', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'demo-s2', className: '11A1', studentId: 'HS1102', name: 'Trần Thị Mai', birthDate: '2008-09-24', gender: 'Nữ', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'demo-s3', className: '11A1', studentId: 'HS1103', name: 'Lê Hoàng Nam', birthDate: '2008-01-15', gender: 'Nam', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'demo-s4', className: '11A1', studentId: 'HS1104', name: 'Phạm Thu Hương', birthDate: '2008-11-03', gender: 'Nữ', createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'demo-s5', className: '11A1', studentId: 'HS1105', name: 'Vũ Đức Minh', birthDate: '2008-07-30', gender: 'Nam', createdAt: Date.now(), updatedAt: Date.now() },
];

export const DEMO_EXAM: Exam = {
  id: 'demo-exam-1',
  title: 'Kiểm tra Giữa kì I - Công nghệ 11 (Cơ khí & Động cơ đốt trong)',
  grade: '11',
  subject: 'Công nghệ',
  durationMinutes: 45,
  schoolYear: '2024-2025',
  term: 'giua_ky_1',
  sectionPoints: {
    section1: 3.0,
    section2: 2.0,
    section3: 2.0,
    section4: 3.0,
  },
  totalPoints: 10,
  questions: [
    { questionId: 'demo-q3', points: 1.0, section: 1 },
    { questionId: 'demo-q4', points: 1.0, section: 1 },
    { questionId: 'demo-q5', points: 2.0, section: 2 },
    { questionId: 'demo-q7', points: 2.0, section: 3 },
    { questionId: 'demo-q10', points: 4.0, section: 4 },
  ],
  isDemo: true,
  createdAt: Date.now() - 3600000 * 12,
  updatedAt: Date.now() - 3600000 * 12,
};

export const DEMO_ASSIGNMENT: Assignment = {
  id: 'demo-assign-1',
  code: 'CN1101',
  title: 'Kiểm tra Online: Giữa kì I - Công nghệ 11',
  examId: 'demo-exam-1',
  targetClass: '11A1',
  durationMinutes: 45,
  openAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  closeAt: new Date(Date.now() + 3600000 * 168).toISOString(),
  maxAttempts: 1,
  shuffleForStudent: true,
  allowReviewAfterSubmit: true,
  status: 'open',
  createdAt: Date.now() - 3600000 * 10,
  updatedAt: Date.now() - 3600000 * 10,
};
