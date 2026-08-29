import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start p-3.5 rounded-lg shadow-xl border text-sm transition transform translate-y-0 ${
            t.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : t.type === 'error'
              ? 'bg-red-950 text-red-100 border-red-800'
              : 'bg-slate-900 text-slate-100 border-slate-700'
          }`}
        >
          <div className="mr-3 flex-shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 text-red-400" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-sky-400" />}
          </div>
          <div className="flex-1 font-medium leading-relaxed">{t.message}</div>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
