// src/components/NotificationsModal.tsx
import React from 'react';
import {
  Bell,
  CheckCircle,
  AlertOctagon,
  Clock,
  Send,
  AlertTriangle,
  X,
} from 'lucide-react';
import { NotificationItem } from '../types/index.ts';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: number) => Promise<void>;
  onNavigateToTask?: (id: number) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onNavigateToTask,
}) => {
  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overdue_alert':
        return <AlertOctagon className="w-4 h-4 text-red-600" />;
      case 'revision_requested':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'task_assigned':
        return <Send className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">System Notifications</h3>
            <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              Asia/Dhaka
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg">
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto divide-y divide-slate-100 flex-1 space-y-2 text-xs">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.isRead) onMarkRead(n.id);
                if (n.linkId && onNavigateToTask) onNavigateToTask(n.linkId);
              }}
              className={`p-3 rounded-xl transition cursor-pointer flex items-start space-x-3 ${
                n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100'
              }`}
            >
              <div className="p-2 bg-white rounded-lg shadow-2xs shrink-0 mt-0.5 border border-slate-100">
                {getTypeIcon(n.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900">{n.title}</h4>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                  )}
                </div>
                <p className="text-slate-600 mt-1 leading-relaxed text-[11px]">{n.message}</p>
                <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
                  {new Date(n.createdAt).toLocaleDateString('en-GB')} at{' '}
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              No recent notifications logged.
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
