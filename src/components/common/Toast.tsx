/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map(toast => {
        let bg = 'bg-slate-900 text-white';
        let icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;

        if (toast.type === 'success') {
          bg = 'bg-emerald-700 text-white shadow-lg shadow-emerald-950/20';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />;
        } else if (toast.type === 'error') {
          bg = 'bg-rose-700 text-white shadow-lg shadow-rose-950/20';
          icon = <AlertCircle className="w-5 h-5 text-rose-200 shrink-0" />;
        } else if (toast.type === 'warning') {
          bg = 'bg-amber-600 text-white shadow-lg shadow-amber-950/20';
          icon = <AlertTriangle className="w-5 h-5 text-amber-200 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-md text-sm font-medium transition-all transform animate-in fade-in slide-in-from-top-4 ${bg}`}
          >
            {icon}
            <div className="flex-1 text-sm leading-relaxed">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
