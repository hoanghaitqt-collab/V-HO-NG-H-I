/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/layout/Navigation';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/Toast';
import { DashboardView } from './components/dashboard/DashboardView';
import { QuestionBankView } from './components/questions/QuestionBankView';
import { ImportModal } from './components/questions/ImportModal';
import { ExamBuilderView } from './components/exams/ExamBuilderView';
import { ExamShufflerView } from './components/shuffler/ExamShufflerView';
import { AssignmentManagerView } from './components/assignments/AssignmentManagerView';
import { ResultsView } from './components/results/ResultsView';
import { ClassManagerView } from './components/classes/ClassManagerView';
import { SettingsView } from './components/settings/SettingsView';
import { StudentExamView } from './components/student/StudentExamView';

/**
 * Nội dung chính của giao diện Giáo viên
 */
const TeacherWorkspace: React.FC<{
  onOpenStudentTest: (code?: string) => void;
}> = ({ onOpenStudentTest }) => {
  const { activeTab, importQuestions, questions, exams, assignments, addSubmission } = useApp();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden text-slate-800">
      {/* Sidebar điều hướng bên trái */}
      <Navigation />

      {/* Vùng nội dung chính */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header trên cùng */}
        <Header onOpenStudentTest={onOpenStudentTest} />

        {/* Nội dung theo từng tab */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onOpenStudentTest={onOpenStudentTest}
            />
          )}

          {activeTab === 'questions' && (
            <QuestionBankView onOpenImportModal={() => setIsImportModalOpen(true)} />
          )}

          {activeTab === 'exams' && <ExamBuilderView />}

          {activeTab === 'shuffler' && <ExamShufflerView />}

          {activeTab === 'assignments' && (
            <AssignmentManagerView onOpenStudentTest={onOpenStudentTest} />
          )}

          {activeTab === 'results' && <ResultsView />}

          {activeTab === 'classes' && <ClassManagerView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Modal Tải file câu hỏi toàn cục */}
      <ImportModal
        isOpen={isImportModalOpen}
        onImport={importQuestions}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Thông báo Toast */}
      <ToastContainer />
    </div>
  );
};

/**
 * Wrapper chuyển đổi linh hoạt giữa giao diện Học sinh và Giáo viên
 */
const AppRoot: React.FC = () => {
  const { assignments, exams, questions, addSubmission, settings } = useApp();

  // Kiểm tra mã bài từ query param URL (?code=...)
  const [studentCode, setStudentCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) return code;
    }
    return null;
  });

  const [isTeacherTestMode, setIsTeacherTestMode] = useState<boolean>(false);

  // Map câu hỏi
  const questionsMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    questions.forEach(q => {
      map[q.id] = q;
    });
    return map;
  }, [questions]);

  // Nếu đang có mã học sinh (truy cập link hoặc giáo viên bấm làm thử)
  if (studentCode) {
    return (
      <StudentExamView
        initialCode={studentCode}
        onExitStudentMode={
          isTeacherTestMode
            ? () => {
                setStudentCode(null);
                setIsTeacherTestMode(false);
                // Xóa param ?code trên URL nếu có
                if (window.history.pushState) {
                  const newurl = window.location.protocol + '//' + window.location.host + window.location.pathname;
                  window.history.pushState({ path: newurl }, '', newurl);
                }
              }
            : undefined
        }
        localAssignments={assignments}
        localExams={exams}
        localQuestionsMap={questionsMap}
        onLocalSubmit={addSubmission}
        scriptUrl={settings.scriptUrl}
      />
    );
  }

  // Giao diện Giáo viên
  return (
    <TeacherWorkspace
      onOpenStudentTest={(code?: string) => {
        setStudentCode(code || assignments[0]?.code || 'CN1101');
        setIsTeacherTestMode(true);
      }}
    />
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppRoot />
    </AppProvider>
  );
}
