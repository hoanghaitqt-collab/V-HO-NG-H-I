/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Question,
  Exam,
  ShuffledExamPackage,
  Assignment,
  StudentSubmission,
  ClassGroup,
  Student,
  AppSettings,
  SyncState,
  SyncQueueItem,
} from '../types';
import { DEMO_QUESTIONS, DEMO_CLASSES, DEMO_STUDENTS, DEMO_EXAM, DEMO_ASSIGNMENT } from '../data/demoData';
import { pushToGoogleSheet, pullFromGoogleSheet, pingAppsScript } from '../services/syncService';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AppContextType {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Dữ liệu
  questions: Question[];
  exams: Exam[];
  shuffledPackages: ShuffledExamPackage[];
  assignments: Assignment[];
  classes: ClassGroup[];
  students: Student[];
  submissions: StudentSubmission[];
  settings: AppSettings;

  // Trạng thái đồng bộ
  syncState: SyncState;
  lastSyncTime: number | null;
  syncQueueCount: number;
  syncError: string | null;

  // Thao tác đồng bộ
  triggerSync: () => Promise<boolean>;
  fullReloadFromSheet: () => Promise<boolean>;
  checkConnection: () => Promise<{ ok: boolean; message: string }>;

  // Thao tác Ngân hàng câu hỏi
  addQuestion: (q: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => Question;
  updateQuestion: (q: Question) => void;
  deleteQuestion: (id: string) => void;
  importQuestions: (newQuestions: Question[]) => void;

  // Thao tác Đề thi
  addExam: (exam: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) => Exam;
  updateExam: (exam: Exam) => void;
  deleteExam: (id: string) => void;

  // Thao tác Xáo đề
  saveShuffledPackage: (pkg: ShuffledExamPackage) => void;
  deleteShuffledPackage: (id: string) => void;

  // Thao tác Giao bài
  createAssignment: (assign: Omit<Assignment, 'id' | 'code' | 'createdAt' | 'updatedAt'>) => Assignment;
  updateAssignment: (assign: Assignment) => void;
  deleteAssignment: (id: string) => void;

  // Thao tác Kết quả & Chấm điểm
  addSubmission: (sub: StudentSubmission) => void;
  gradeEssay: (subId: string, questionId: string, score: number, comment?: string) => void;
  updateSubmissionScore: (subId: string, newScore: number) => void;
  deleteSubmission: (subId: string) => void;

  // Thao tác Lớp & Học sinh
  addClassGroup: (cg: Omit<ClassGroup, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateClassGroup: (cg: ClassGroup) => void;
  deleteClassGroup: (id: string) => void;
  addStudent: (s: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => void;
  importStudents: (list: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  deleteStudent: (id: string) => void;

  // Cài đặt
  updateSettings: (newSettings: Partial<AppSettings>) => void;

  // Thông báo (Toast)
  toasts: ToastItem[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const SETTINGS_STORAGE_KEY = 'tech_teacher_settings_v1';
const QUEUE_STORAGE_KEY = 'tech_teacher_queue_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Khởi tạo Cài đặt từ localStorage của trình duyệt
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          teacherName:
            parsed.teacherName &&
            parsed.teacherName !== 'Thầy/Cô Giáo viên Công nghệ' &&
            parsed.teacherName !== 'Thầy/cô giáo viên Công nghệ'
              ? parsed.teacherName
              : 'VÕ HOÀNG HẢI',
          schoolName:
            parsed.schoolName && parsed.schoolName !== 'Trường THPT Chuẩn Quốc Gia'
              ? parsed.schoolName
              : 'TRƯỜNG THPT CHUYÊN LÊ KHIẾT',
          schoolYear:
            parsed.schoolYear && parsed.schoolYear !== '2024-2025'
              ? parsed.schoolYear
              : '2026 - 2027',
        };
      }
    } catch (e) {}
    return {
      scriptUrl: '',
      sheetUrl: '',
      teacherPin: '123456',
      teacherName: 'VÕ HOÀNG HẢI',
      schoolName: 'TRƯỜNG THPT CHUYÊN LÊ KHIẾT',
      schoolYear: '2026 - 2027',
      autoSync: true,
      syncIntervalSeconds: 60,
      lastSyncTime: null,
    };
  });

  // Hàng đợi đồng bộ khi mất mạng hoặc chờ gửi
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(() => {
    try {
      const q = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (q) return JSON.parse(q);
    } catch (e) {}
    return [];
  });

  // Dữ liệu làm việc (In-memory state)
  const [questions, setQuestions] = useState<Question[]>(DEMO_QUESTIONS);
  const [exams, setExams] = useState<Exam[]>([DEMO_EXAM]);
  const [shuffledPackages, setShuffledPackages] = useState<ShuffledExamPackage[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([DEMO_ASSIGNMENT]);
  const [classes, setClasses] = useState<ClassGroup[]>(DEMO_CLASSES);
  const [students, setStudents] = useState<Student[]>(DEMO_STUDENTS);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);

  // Trạng thái đồng bộ
  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Lưu cài đặt vào localStorage
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showToast('Đã lưu cấu hình cài đặt thành công!', 'success');
  }, [showToast]);

  // Đưa một thao tác vào hàng đợi đẩy
  const enqueueSyncItem = useCallback((sheet: SyncQueueItem['sheet'], id: string, data: any, deleted = false) => {
    setSyncQueue(prev => {
      // Nếu đã có mục cùng sheet và id trong hàng đợi, thay thế
      const filtered = prev.filter(item => !(item.sheet === sheet && item.id === id));
      const nextQueue: SyncQueueItem[] = [...filtered, { sheet, id, data, deleted, timestamp: Date.now() }];
      try {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(nextQueue));
      } catch (e) {}
      return nextQueue;
    });
  }, []);

  // Xóa khỏi hàng đợi sau khi đẩy thành công
  const clearSyncQueue = useCallback(() => {
    setSyncQueue([]);
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (e) {}
  }, []);

  // Hàm kích hoạt đồng bộ 2 chiều (ĐẨY + KÉO)
  const triggerSync = useCallback(async (): Promise<boolean> => {
    if (!settings.scriptUrl || !settings.scriptUrl.startsWith('http')) {
      setSyncState('offline');
      return false;
    }

    setSyncState('syncing');
    setSyncError(null);

    try {
      // 1. ĐẨY hàng đợi nếu có
      if (syncQueue.length > 0) {
        const pushRes = await pushToGoogleSheet(settings.scriptUrl, settings.teacherPin, syncQueue);
        if (pushRes && pushRes.ok) {
          clearSyncQueue();
        } else {
          throw new Error(pushRes.error || 'Lỗi khi đẩy dữ liệu lên Google Sheet');
        }
      }

      // 2. KÉO dữ liệu mới từ Google Sheet
      const sinceTime = lastSyncTime || 0;
      const pullRes = await pullFromGoogleSheet(settings.scriptUrl, settings.teacherPin, sinceTime);

      if (pullRes && pullRes.ok) {
        const items = pullRes.items || [];
        if (items.length > 0) {
          // Áp dụng dữ liệu vào in-memory state
          items.forEach((item: any) => {
            const sheet = item.sheet;
            const data = item.data;
            const isDel = item.deleted;

            if (sheet === 'Questions') {
              setQuestions(prev => {
                if (isDel) return prev.filter(q => q.id !== item.id);
                const existingIdx = prev.findIndex(q => q.id === item.id);
                if (existingIdx >= 0) {
                  const copy = [...prev];
                  copy[existingIdx] = data;
                  return copy;
                }
                return [data, ...prev];
              });
            } else if (sheet === 'Exams') {
              setExams(prev => {
                if (isDel) return prev.filter(x => x.id !== item.id);
                const existingIdx = prev.findIndex(x => x.id === item.id);
                if (existingIdx >= 0) {
                  const copy = [...prev];
                  copy[existingIdx] = data;
                  return copy;
                }
                return [data, ...prev];
              });
            } else if (sheet === 'Assignments') {
              setAssignments(prev => {
                if (isDel) return prev.filter(a => a.id !== item.id);
                const existingIdx = prev.findIndex(a => a.id === item.id);
                if (existingIdx >= 0) {
                  const copy = [...prev];
                  copy[existingIdx] = data;
                  return copy;
                }
                return [data, ...prev];
              });
            } else if (sheet === 'Classes') {
              setClasses(prev => {
                if (isDel) return prev.filter(c => c.id !== item.id);
                const existingIdx = prev.findIndex(c => c.id === item.id);
                if (existingIdx >= 0) {
                  const copy = [...prev];
                  copy[existingIdx] = data;
                  return copy;
                }
                return [...prev, data];
              });
            } else if (sheet === 'Students') {
              setStudents(prev => {
                if (isDel) return prev.filter(s => s.id !== item.id);
                const existingIdx = prev.findIndex(s => s.id === item.id);
                if (existingIdx >= 0) {
                  const copy = [...prev];
                  copy[existingIdx] = data;
                  return copy;
                }
                return [...prev, data];
              });
            } else if (sheet === 'Results') {
              setSubmissions(prev => {
                if (isDel) return prev.filter(s => s.id !== item.id);
                const existingIdx = prev.findIndex(s => s.id === item.id);
                if (existingIdx >= 0) {
                  const copy = [...prev];
                  copy[existingIdx] = data;
                  return copy;
                }
                return [data, ...prev];
              });
            }
          });
        }

        const now = pullRes.now || Date.now();
        setLastSyncTime(now);
        setSyncState('synced');
        return true;
      } else {
        throw new Error(pullRes.error || 'Lỗi khi kéo dữ liệu');
      }
    } catch (err: any) {
      console.error('Đồng bộ thất bại:', err);
      setSyncState('error');
      setSyncError(err.message || 'Lỗi kết nối');
      return false;
    }
  }, [settings.scriptUrl, settings.teacherPin, syncQueue, lastSyncTime, clearSyncQueue]);

  // Tải lại toàn bộ dữ liệu từ Sheet (since = 0)
  const fullReloadFromSheet = useCallback(async (): Promise<boolean> => {
    if (!settings.scriptUrl) {
      showToast('Chưa cấu hình URL Google Apps Script trong Cài đặt', 'error');
      return false;
    }

    setSyncState('syncing');
    try {
      const pullRes = await pullFromGoogleSheet(settings.scriptUrl, settings.teacherPin, 0);
      if (pullRes && pullRes.ok) {
        const items = pullRes.items || [];
        const newQ: Question[] = [];
        const newE: Exam[] = [];
        const newA: Assignment[] = [];
        const newC: ClassGroup[] = [];
        const newS: Student[] = [];
        const newR: StudentSubmission[] = [];

        items.forEach((item: any) => {
          if (item.deleted) return;
          if (item.sheet === 'Questions') newQ.push(item.data);
          else if (item.sheet === 'Exams') newE.push(item.data);
          else if (item.sheet === 'Assignments') newA.push(item.data);
          else if (item.sheet === 'Classes') newC.push(item.data);
          else if (item.sheet === 'Students') newS.push(item.data);
          else if (item.sheet === 'Results') newR.push(item.data);
        });

        if (newQ.length > 0) setQuestions(newQ);
        if (newE.length > 0) setExams(newE);
        if (newA.length > 0) setAssignments(newA);
        if (newC.length > 0) setClasses(newC);
        if (newS.length > 0) setStudents(newS);
        if (newR.length > 0) setSubmissions(newR);

        setLastSyncTime(pullRes.now || Date.now());
        setSyncState('synced');
        showToast('Đã tải lại toàn bộ dữ liệu từ Google Sheet!', 'success');
        return true;
      }
      throw new Error(pullRes.error || 'Lỗi khi tải');
    } catch (err: any) {
      setSyncState('error');
      showToast(`Không thể tải lại: ${err.message}`, 'error');
      return false;
    }
  }, [settings.scriptUrl, settings.teacherPin, showToast]);

  // Kiểm tra kết nối
  const checkConnection = useCallback(async () => {
    return await pingAppsScript(settings.scriptUrl);
  }, [settings.scriptUrl]);

  // Tự động đồng bộ mỗi X giây nếu bật
  useEffect(() => {
    if (!settings.autoSync || !settings.scriptUrl) return;

    // Chạy đồng bộ lần đầu sau 1s
    const initialTimer = setTimeout(() => {
      triggerSync();
    }, 1000);

    const interval = setInterval(() => {
      triggerSync();
    }, (settings.syncIntervalSeconds || 60) * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [settings.autoSync, settings.syncIntervalSeconds, settings.scriptUrl, triggerSync]);

  // --- CRUD CHO CÂU HỎI ---
  const addQuestion = useCallback(
    (qData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Question => {
      const newQ: Question = {
        ...qData,
        id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setQuestions(prev => [newQ, ...prev]);
      if (!newQ.isDemo) {
        enqueueSyncItem('Questions', newQ.id, newQ, false);
      }
      showToast('Đã thêm câu hỏi mới thành công!', 'success');
      return newQ;
    },
    [enqueueSyncItem, showToast]
  );

  const updateQuestion = useCallback(
    (q: Question) => {
      const updated = { ...q, updatedAt: Date.now() };
      setQuestions(prev => prev.map(item => (item.id === q.id ? updated : item)));
      if (!updated.isDemo) {
        enqueueSyncItem('Questions', updated.id, updated, false);
      }
      showToast('Đã cập nhật câu hỏi!', 'success');
    },
    [enqueueSyncItem, showToast]
  );

  const deleteQuestion = useCallback(
    (id: string) => {
      const target = questions.find(q => q.id === id);
      setQuestions(prev => prev.filter(q => q.id !== id));
      if (target && !target.isDemo) {
        enqueueSyncItem('Questions', id, { id, updatedAt: Date.now() }, true);
      }
      showToast('Đã xóa câu hỏi khỏi ngân hàng', 'info');
    },
    [questions, enqueueSyncItem, showToast]
  );

  const importQuestions = useCallback(
    (newQuestions: Question[]) => {
      setQuestions(prev => [...newQuestions, ...prev]);
      newQuestions.forEach(q => {
        enqueueSyncItem('Questions', q.id, q, false);
      });
      showToast(`Đã lưu ${newQuestions.length} câu hỏi vào ngân hàng!`, 'success');
      triggerSync();
    },
    [enqueueSyncItem, showToast, triggerSync]
  );

  // --- CRUD CHO ĐỀ THI ---
  const addExam = useCallback(
    (examData: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>): Exam => {
      const newExam: Exam = {
        ...examData,
        id: `exam_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setExams(prev => [newExam, ...prev]);
      if (!newExam.isDemo) {
        enqueueSyncItem('Exams', newExam.id, newExam, false);
      }
      showToast('Đã tạo đề thi thành công!', 'success');
      return newExam;
    },
    [enqueueSyncItem, showToast]
  );

  const updateExam = useCallback(
    (exam: Exam) => {
      const updated = { ...exam, updatedAt: Date.now() };
      setExams(prev => prev.map(item => (item.id === exam.id ? updated : item)));
      if (!updated.isDemo) {
        enqueueSyncItem('Exams', updated.id, updated, false);
      }
      showToast('Đã cập nhật đề thi!', 'success');
    },
    [enqueueSyncItem, showToast]
  );

  const deleteExam = useCallback(
    (id: string) => {
      const target = exams.find(e => e.id === id);
      setExams(prev => prev.filter(e => e.id !== id));
      if (target && !target.isDemo) {
        enqueueSyncItem('Exams', id, { id, updatedAt: Date.now() }, true);
      }
      showToast('Đã xóa đề thi', 'info');
    },
    [exams, enqueueSyncItem, showToast]
  );

  // --- CRUD CHO MÃ ĐỀ XÁO ---
  const saveShuffledPackage = useCallback(
    (pkg: ShuffledExamPackage) => {
      setShuffledPackages(prev => {
        const filtered = prev.filter(p => p.id !== pkg.id);
        return [pkg, ...filtered];
      });
      showToast(`Đã lưu ${pkg.codes.length} mã đề xáo thành công!`, 'success');
    },
    [showToast]
  );

  const deleteShuffledPackage = useCallback(
    (id: string) => {
      setShuffledPackages(prev => prev.filter(p => p.id !== id));
      showToast('Đã xóa gói mã đề xáo', 'info');
    },
    [showToast]
  );

  // --- CRUD CHO GIAO BÀI ---
  const createAssignment = useCallback(
    (assignData: Omit<Assignment, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Assignment => {
      // Sinh mã bài 6 ký tự ngẫu nhiên (VD: "CN8812")
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const code = `CN${randomNum}`;
      const newAssign: Assignment = {
        ...assignData,
        id: `assign_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        code,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setAssignments(prev => [newAssign, ...prev]);
      enqueueSyncItem('Assignments', newAssign.id, newAssign, false);
      showToast(`Đã tạo bài giao mới thành công! Mã bài: ${code}`, 'success');
      return newAssign;
    },
    [enqueueSyncItem, showToast]
  );

  const updateAssignment = useCallback(
    (assign: Assignment) => {
      const updated = { ...assign, updatedAt: Date.now() };
      setAssignments(prev => prev.map(a => (a.id === assign.id ? updated : a)));
      enqueueSyncItem('Assignments', updated.id, updated, false);
      showToast('Đã cập nhật thông tin bài giao!', 'success');
    },
    [enqueueSyncItem, showToast]
  );

  const deleteAssignment = useCallback(
    (id: string) => {
      setAssignments(prev => prev.filter(a => a.id !== id));
      enqueueSyncItem('Assignments', id, { id, updatedAt: Date.now() }, true);
      showToast('Đã xóa bài giao', 'info');
    },
    [enqueueSyncItem, showToast]
  );

  // --- CRUD CHO KẾT QUẢ & CHẤM ĐIỂM ---
  const addSubmission = useCallback(
    (sub: StudentSubmission) => {
      setSubmissions(prev => [sub, ...prev]);
      enqueueSyncItem('Results', sub.id, sub, false);
    },
    [enqueueSyncItem]
  );

  const gradeEssay = useCallback(
    (subId: string, questionId: string, score: number, comment?: string) => {
      setSubmissions(prev =>
        prev.map(sub => {
          if (sub.id !== subId) return sub;

          let diffScore = 0;
          const updatedDetail = sub.detail.map(d => {
            if (d.questionId === questionId) {
              diffScore = score - d.scoreEarned;
              return {
                ...d,
                scoreEarned: score,
                isCorrect: score > 0,
                teacherComment: comment || d.teacherComment,
              };
            }
            return d;
          });

          const newScore = Math.round((sub.score + diffScore) * 100) / 100;
          const updatedSub = {
            ...sub,
            score: newScore,
            detail: updatedDetail,
            essayGraded: true,
            updatedAt: Date.now(),
          };

          enqueueSyncItem('Results', updatedSub.id, updatedSub, false);
          return updatedSub;
        })
      );
      showToast('Đã lưu điểm tự luận thành công!', 'success');
    },
    [enqueueSyncItem, showToast]
  );

  const updateSubmissionScore = useCallback(
    (subId: string, newScore: number) => {
      setSubmissions(prev =>
        prev.map(sub => {
          if (sub.id !== subId) return sub;
          const updated = { ...sub, score: newScore, updatedAt: Date.now() };
          enqueueSyncItem('Results', updated.id, updated, false);
          return updated;
        })
      );
      showToast('Đã điều chỉnh điểm của học sinh!', 'success');
    },
    [enqueueSyncItem, showToast]
  );

  const deleteSubmission = useCallback(
    (subId: string) => {
      setSubmissions(prev => prev.filter(s => s.id !== subId));
      enqueueSyncItem('Results', subId, { id: subId, updatedAt: Date.now() }, true);
      showToast('Đã xóa kết quả bài làm của học sinh', 'info');
    },
    [enqueueSyncItem, showToast]
  );

  // --- CRUD LỚP HỌC & HỌC SINH ---
  const addClassGroup = useCallback(
    (cgData: Omit<ClassGroup, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newClass: ClassGroup = {
        ...cgData,
        id: `class_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setClasses(prev => [...prev, newClass]);
      enqueueSyncItem('Classes', newClass.id, newClass, false);
      showToast(`Đã thêm lớp ${newClass.name}!`, 'success');
    },
    [enqueueSyncItem, showToast]
  );

  const updateClassGroup = useCallback(
    (cg: ClassGroup) => {
      const updated = { ...cg, updatedAt: Date.now() };
      setClasses(prev => prev.map(c => (c.id === cg.id ? updated : c)));
      enqueueSyncItem('Classes', updated.id, updated, false);
      showToast('Đã cập nhật thông tin lớp!', 'success');
    },
    [enqueueSyncItem, showToast]
  );

  const deleteClassGroup = useCallback(
    (id: string) => {
      setClasses(prev => prev.filter(c => c.id !== id));
      enqueueSyncItem('Classes', id, { id, updatedAt: Date.now() }, true);
      showToast('Đã xóa lớp học', 'info');
    },
    [enqueueSyncItem, showToast]
  );

  const addStudent = useCallback(
    (sData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newStudent: Student = {
        ...sData,
        id: `stu_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setStudents(prev => [...prev, newStudent]);
      enqueueSyncItem('Students', newStudent.id, newStudent, false);
      showToast(`Đã thêm học sinh ${newStudent.name}!`, 'success');
    },
    [enqueueSyncItem, showToast]
  );

  const importStudents = useCallback(
    (list: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const newItems: Student[] = list.map((s, idx) => ({
        ...s,
        id: `stu_${Date.now()}_${idx}_${Math.floor(Math.random() * 1000)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
      setStudents(prev => [...prev, ...newItems]);
      newItems.forEach(s => enqueueSyncItem('Students', s.id, s, false));
      showToast(`Đã nhập danh sách ${newItems.length} học sinh thành công!`, 'success');
    },
    [enqueueSyncItem, showToast]
  );

  const deleteStudent = useCallback(
    (id: string) => {
      setStudents(prev => prev.filter(s => s.id !== id));
      enqueueSyncItem('Students', id, { id, updatedAt: Date.now() }, true);
      showToast('Đã xóa học sinh khỏi danh sách', 'info');
    },
    [enqueueSyncItem, showToast]
  );

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        questions,
        exams,
        shuffledPackages,
        assignments,
        classes,
        students,
        submissions,
        settings,
        syncState,
        lastSyncTime,
        syncQueueCount: syncQueue.length,
        syncError,
        triggerSync,
        fullReloadFromSheet,
        checkConnection,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        importQuestions,
        addExam,
        updateExam,
        deleteExam,
        saveShuffledPackage,
        deleteShuffledPackage,
        createAssignment,
        updateAssignment,
        deleteAssignment,
        addSubmission,
        gradeEssay,
        updateSubmissionScore,
        deleteSubmission,
        addClassGroup,
        updateClassGroup,
        deleteClassGroup,
        addStudent,
        importStudents,
        deleteStudent,
        updateSettings,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
