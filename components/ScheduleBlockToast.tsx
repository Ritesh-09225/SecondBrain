"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle2, 
  Clock, 
  Database, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  RotateCcw,
  Tag,
  Calendar
} from "lucide-react";

export interface ScheduleToastData {
  id: string;
  itemId: string;
  activity: string;
  startTime: string;
  endTime: string;
  category: string;
  priority: string;
  date: string;
  collectionPath: string;
  timestamp: number;
}

interface ScheduleBlockToastProps {
  toastData: ScheduleToastData | null;
  onDismiss: () => void;
  onOpenDetails: (data: ScheduleToastData) => void;
  onUndo?: (itemId: string) => void;
  autoDismissMs?: number;
}

const CATEGORY_COLORS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  focus: { label: "FOCUS", color: "#d4ff33", bg: "bg-[#d4ff33]/10", border: "border-[#d4ff33]/40" },
  meeting: { label: "MEETING", color: "#60a5fa", bg: "bg-blue-400/10", border: "border-blue-400/40" },
  reflection: { label: "REFLECTION", color: "#c084fc", bg: "bg-purple-400/10", border: "border-purple-400/40" },
  wellness: { label: "WELLNESS", color: "#34d399", bg: "bg-emerald-400/10", border: "border-emerald-400/40" },
  admin: { label: "ADMIN", color: "#fbbf24", bg: "bg-amber-400/10", border: "border-amber-400/40" },
  break: { label: "BREAK", color: "#94a3b8", bg: "bg-slate-400/10", border: "border-slate-400/40" },
};

export function ScheduleBlockToast({
  toastData,
  onDismiss,
  onOpenDetails,
  onUndo,
  autoDismissMs = 5000,
}: ScheduleBlockToastProps) {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!toastData || isPaused) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [toastData, isPaused, autoDismissMs, onDismiss]);

  const catStyle = toastData ? (CATEGORY_COLORS[toastData.category] || CATEGORY_COLORS.focus) : CATEGORY_COLORS.focus;

  return (
    <aside
      aria-label="Schedule Notifications"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 pointer-events-none"
    >
      <AnimatePresence>
        {toastData && (
          <motion.div
            key={toastData.id}
            id="schedule-block-added-toast"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            role="status"
            aria-live="polite"
            className="pointer-events-auto w-full sm:w-[400px] bg-[#141415] border border-[#d4ff33]/40 shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-4 text-[#e4e4e7] relative overflow-hidden"
          >
            {/* Top Status Strip */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#d4ff33]/15 border border-[#d4ff33]/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#d4ff33]" />
                </div>
                <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#d4ff33]">
                  TIME BLOCK ADDED
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[0.55rem] uppercase tracking-wider text-[rgba(228,228,231,0.5)] bg-[#18181b] border border-[rgba(228,228,231,0.1)] px-1.5 py-0.5">
                  SAVED TO FIRESTORE
                </span>
                <button
                  id="dismiss-schedule-toast-btn"
                  type="button"
                  onClick={onDismiss}
                  aria-label="Dismiss notification"
                  className="p-1 text-[rgba(228,228,231,0.5)] hover:text-[#e4e4e7] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between gap-2">
                <h4
                  id="schedule-toast-activity-title"
                  className="font-syne text-[0.95rem] font-bold text-[#e4e4e7] tracking-tight truncate"
                >
                  {toastData.activity || "New Focus Block"}
                </h4>

                {/* Category Pill */}
                <span
                  id="schedule-toast-category-badge"
                  className={`font-mono text-[0.6rem] uppercase tracking-wider px-2 py-0.5 border shrink-0 ${catStyle.border} ${catStyle.bg}`}
                  style={{ color: catStyle.color }}
                >
                  {catStyle.label}
                </span>
              </div>

              {/* Time window & Date */}
              <div className="flex items-center gap-3 text-xs font-mono text-[rgba(228,228,231,0.75)]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#d4ff33]" />
                  <span id="schedule-toast-time-window">
                    {toastData.startTime} - {toastData.endTime}
                  </span>
                </div>
                <span className="text-[rgba(228,228,231,0.3)]">•</span>
                <div className="flex items-center gap-1.5 text-[0.68rem] text-[rgba(228,228,231,0.5)]">
                  <Calendar className="w-3 h-3 text-[rgba(228,228,231,0.4)]" />
                  <span>{toastData.date}</span>
                </div>
              </div>

              {/* Firestore Path & Owner-Bound Badge */}
              <div className="flex items-center gap-1.5 text-[0.62rem] font-mono text-[rgba(228,228,231,0.5)] truncate">
                <Database className="w-3 h-3 text-[rgba(228,228,231,0.4)] shrink-0" />
                <span className="truncate">{toastData.collectionPath}</span>
              </div>

              <div className="flex items-center gap-2 pt-0.5 text-[0.58rem] font-mono text-[rgba(228,228,231,0.4)]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#d4ff33]/80" />
                  OWNER-BOUND
                </span>
                <span>•</span>
                <span className="uppercase">PRIORITY: {toastData.priority}</span>
                <span>•</span>
                <span>{new Date(toastData.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2.5 border-t border-[rgba(228,228,231,0.08)]">
              <div className="flex items-center gap-3">
                <button
                  id="view-schedule-confirmation-btn"
                  type="button"
                  onClick={() => onOpenDetails(toastData)}
                  className="font-mono text-[0.65rem] font-bold text-[#d4ff33] hover:underline cursor-pointer uppercase flex items-center gap-1"
                >
                  <span>VIEW DETAILS</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>

                {onUndo && (
                  <button
                    id="undo-schedule-block-btn"
                    type="button"
                    onClick={() => onUndo(toastData.itemId)}
                    className="font-mono text-[0.65rem] text-[rgba(228,228,231,0.6)] hover:text-red-400 cursor-pointer uppercase flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Undo</span>
                  </button>
                )}
              </div>

              <span className="font-mono text-[0.55rem] text-[rgba(228,228,231,0.4)]">
                {isPaused ? "PAUSED" : "AUTO-CLOSING"}
              </span>
            </div>

            {/* Auto-Dismiss Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[rgba(228,228,231,0.08)]">
              <motion.div
                key={`bar-${toastData.id}-${isPaused ? "paused" : "running"}`}
                className="h-full bg-[#d4ff33]"
                initial={{ width: "100%" }}
                animate={{ width: isPaused ? undefined : "0%" }}
                transition={{ duration: autoDismissMs / 1000, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
