/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, Exam, ClassGroup, Student, Assignment } from '../types';

// Dữ liệu khởi tạo trống - Sẵn sàng cho giáo viên nhập ngân hàng và tạo đề mới
export const DEMO_QUESTIONS: Question[] = [];
export const DEMO_CLASSES: ClassGroup[] = [];
export const DEMO_STUDENTS: Student[] = [];

export const DEMO_EXAM: Exam = {
  id: '',
  title: '',
  grade: '11',
  subject: 'Công nghệ',
  durationMinutes: 45,
  schoolYear: '2026 - 2027',
  term: 'giua_ky_1',
  sectionPoints: {
    section1: 3.0,
    section2: 4.0,
    section3: 3.0,
    section4: 0.0,
  },
  totalPoints: 0,
  questions: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const DEMO_ASSIGNMENT: Assignment = {
  id: '',
  code: '',
  title: '',
  examId: '',
  targetClass: '',
  durationMinutes: 45,
  openAt: new Date().toISOString(),
  closeAt: new Date().toISOString(),
  maxAttempts: 1,
  shuffleForStudent: true,
  allowReviewAfterSubmit: true,
  status: 'closed',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
