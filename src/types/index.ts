/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Định nghĩa dữ liệu cho ứng dụng Trợ lý Giáo viên Công nghệ THPT

export type GradeLevel = '10' | '11' | '12';

export type CognitiveLevel = 'Biet' | 'Hieu' | 'VanDung';

export type QuestionType = 'TN' | 'DS' | 'TLN' | 'TL';
// TN: Trắc nghiệm 4 lựa chọn (Phần I)
// DS: Đúng / Sai 4 ý (Phần II)
// TLN: Trả lời ngắn (Phần III)
// TL: Tự luận (Phần IV)

export interface SubQuestionDS {
  id: string;
  label: 'a' | 'b' | 'c' | 'd';
  content: string;
  isCorrect: boolean; // Đúng (true) hoặc Sai (false)
}

export interface Question {
  id: string;
  grade: GradeLevel;
  topic: string; // VD: "Bản vẽ kĩ thuật", "Cơ khí chế tạo", "Động cơ đốt trong", "Kĩ thuật điện", "Kĩ thuật điện tử"
  level: CognitiveLevel; // 'Biet' | 'Hieu' | 'VanDung'
  type: QuestionType;
  content: string;
  options?: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
  };
  correctOption?: 'A' | 'B' | 'C' | 'D'; // Cho TN
  subQuestions?: SubQuestionDS[]; // Cho Đúng/Sai 4 ý
  shortAnswer?: string; // Cho Trả lời ngắn (nhiều đáp án cách nhau bằng dấu |)
  essayGuide?: string; // Cho Tự luận (hướng dẫn chấm)
  explanation?: string; // Lời giải/Gợi ý
  points?: number;
  imageUrl?: string; // Link hoặc base64 ảnh minh họa
  lockOptionOrder?: boolean; // Không xáo đáp án (vd: "Cả A và B", "Hình vẽ trên")
  isDemo?: boolean;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface ExamQuestionRef {
  questionId: string;
  points: number;
  section: 1 | 2 | 3 | 4;
}

export interface ExamMatrixItem {
  topic: string;
  biet: number;
  hieu: number;
  vanDung: number;
  type: QuestionType;
}

export interface Exam {
  id: string;
  title: string;
  grade: GradeLevel;
  subject: string; // "Công nghệ"
  durationMinutes: number; // 15, 45, 60, 90
  schoolYear: string; // "2024-2025"
  term: '15_phut' | 'giua_ky_1' | 'cuoi_ky_1' | 'giua_ky_2' | 'cuoi_ky_2';
  questions: ExamQuestionRef[];
  sectionPoints: {
    section1: number; // Phần I: TN
    section2: number; // Phần II: Đúng/Sai
    section3: number; // Phần III: Trả lời ngắn
    section4: number; // Phần IV: Tự luận
  };
  totalPoints: number; // Mặc định 10
  matrix?: ExamMatrixItem[];
  isDemo?: boolean;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface ShuffledQuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  originalKey: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface ShuffledQuestionItem {
  originalQuestionId: string;
  displayIndex: number; // Thứ tự câu trong mã đề (1, 2, 3...)
  section: 1 | 2 | 3 | 4;
  content: string;
  type: QuestionType;
  options?: ShuffledQuestionOption[];
  subQuestions?: SubQuestionDS[];
  correctDisplayOption?: 'A' | 'B' | 'C' | 'D';
  shortAnswer?: string;
  essayGuide?: string;
  points: number;
  imageUrl?: string;
  topic?: string;
  level?: CognitiveLevel;
}

export interface ShuffledExamCode {
  code: string; // VD: "101", "102"
  questions: ShuffledQuestionItem[];
  answerKey: Record<number, string>; // Câu # -> 'A' | 'Đ-S-Đ-Đ' | '50'
  originalToShuffledMap: Record<number, number>; // Số thứ tự gốc -> Số thứ tự trong mã đề
}

export interface ShuffledExamPackage {
  id: string;
  examId: string;
  examTitle: string;
  grade: GradeLevel;
  durationMinutes: number;
  schoolYear: string;
  term: string;
  codes: ShuffledExamCode[];
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface Assignment {
  id: string;
  code: string; // 6 ký tự ngẫu nhiên (VD: "CN8899")
  title: string;
  examId: string;
  targetClass: string; // "11A1" hoặc "Tất cả"
  durationMinutes: number;
  openAt: string; // ISO String
  closeAt: string; // ISO String
  maxAttempts: number; // Mặc định 1
  shuffleForStudent: boolean; // Xáo riêng từng học sinh
  allowReviewAfterSubmit: boolean; // Xem đáp án sau khi nộp
  status: 'open' | 'closed' | 'scheduled';
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface StudentSubmissionDetail {
  questionId: string;
  type: QuestionType;
  scoreEarned: number;
  maxScore: number;
  studentAnswer: any; // 'A' | { a: boolean, b: boolean, c: boolean, d: boolean } | string
  correctAnswer?: any;
  isCorrect?: boolean;
  teacherComment?: string;
}

export interface StudentSubmission {
  id: string;
  assignmentId: string;
  assignmentCode: string;
  assignmentTitle: string;
  studentName: string;
  studentClass: string;
  score: number;
  totalScore: number;
  durationSeconds: number;
  tabLeavesCount: number;
  submittedAt: number;
  answers: Record<string, any>;
  detail: StudentSubmissionDetail[];
  essayGraded?: boolean;
  updatedAt: number;
  deleted?: boolean;
}

export interface Student {
  id: string;
  className: string;
  studentId?: string;
  name: string;
  birthDate?: string;
  gender?: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface ClassGroup {
  id: string;
  name: string; // "10A1", "11B2", "12A3"
  grade: GradeLevel;
  academicYear: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface AppSettings {
  scriptUrl: string; // URL Web App Apps Script (/exec)
  sheetUrl: string; // URL Google Sheet
  teacherPin: string; // PIN giáo viên
  teacherName: string;
  schoolName: string;
  schoolYear: string;
  autoSync: boolean;
  syncIntervalSeconds: number;
  lastSyncTime: number | null;
}

export type SyncState = 'synced' | 'syncing' | 'error' | 'offline';

export interface SyncQueueItem {
  sheet: 'Questions' | 'Exams' | 'Assignments' | 'Classes' | 'Students' | 'Results' | 'Settings';
  id: string;
  data: any;
  deleted?: boolean;
  timestamp: number;
}
