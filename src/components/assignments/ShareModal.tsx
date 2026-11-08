/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Assignment } from '../../types';
import { X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  assignment: Assignment | null;
  onOpenStudentTest: (code: string) => void;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  assignment,
  onOpenStudentTest,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const studentUrl = assignment ? `${baseUrl}?code=${assignment.code}` : '';

  useEffect(() => {
    if (studentUrl) {
      QRCode.toDataURL(studentUrl, { width: 260, margin: 2, color: { dark: '#1e3a8a', light: '#ffffff' } })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error(err));
    }
  }, [studentUrl]);

  if (!isOpen || !assignment) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center">
        <div className="flex justify-between items-center mb-4">
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">Mã QR & Link giao bài</h3>
            <p className="text-xs text-slate-500">{assignment.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mã bài nổi bật */}
        <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 mb-5">
          <span className="text-xs font-semibold text-blue-700 block">MÃ BÀI KIỂM TRA</span>
          <span className="text-3xl font-extrabold font-mono text-blue-800 tracking-wider">
            {assignment.code}
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Lớp nhận: <strong>{assignment.targetClass}</strong> · Thời gian: {assignment.durationMinutes} phút
          </span>
        </div>

        {/* Mã QR */}
        {qrDataUrl && (
          <div className="p-4 bg-white border border-slate-200 rounded-2xl inline-block shadow-xs mb-4">
            <img src={qrDataUrl} alt="QR Code" className="w-52 h-52 mx-auto" />
            <p className="text-[11px] text-slate-400 mt-2">Học sinh quét mã bằng Zalo hoặc Camera điện thoại</p>
          </div>
        )}

        {/* Đường link sao chép */}
        <div className="space-y-3 text-left">
          <label className="block text-xs font-bold text-slate-700">Link làm bài trực tiếp:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={studentUrl}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-700 focus:outline-hidden"
            />
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </button>
          </div>
        </div>

        {/* Nút thử làm bài ngay */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenStudentTest(assignment.code);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Mở làm thử ngay
          </button>
        </div>
      </div>
    </div>
  );
};
