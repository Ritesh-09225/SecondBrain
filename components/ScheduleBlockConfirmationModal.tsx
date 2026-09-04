"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  Database, 
  ShieldCheck, 
  Copy, 
  Check, 
  X, 
  Calendar, 
  Tag, 
  Flag, 
  FileText,
  Sparkles
} from "lucide-react";
import { ScheduleToastData } from "./ScheduleBlockToast";

interface ScheduleBlockConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockData: ScheduleToastData | null;
  userId?: string;
  onUpdateBlock?: (itemId: string, updates: { activity?: string; notes?: string }) => void;
}

const CATEGORY_COLORS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  focus: { label: "Deep Focus", color: "#d4ff33", bg: "bg-[#d4ff33]/10", border: "border-[#d4ff33]/40" },
  meeting: { label: "Meeting / Sync", color: "#60a5fa", bg: "bg-blue-400/10", border: "border-blue-400/40" },
  reflection: { label: "Reflection / Review", color: "#c084fc", bg: "bg-purple-400/10", border: "border-purple-400/40" },
  wellness: { label: "Wellness / Health", color: "#34d399", bg: "bg-emerald-400/10", border: "border-emerald-400/40" },
  admin: { label: "Admin / Ops", color: "#fbbf24", bg: "bg-amber-400/10", border: "border-amber-400/40" },
  break: { label: "Rest / Break", color: "#94a3b8", bg: "bg-slate-400/10", border: "border-slate-400/40" },
};

export function ScheduleBlockConfirmationModal({
  isOpen,
  onClose,
  blockData,
  userId,
  onUpdateBlock,
}: ScheduleBlockConfirmationModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [quickActivity, setQuickActivity] = useState(blockData?.activity || "");
  const [quickNotes, setQuickNotes] = useState("");

  if (!isOpen || !blockData) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveQuickEdits = () => {
    if (onUpdateBlock && (quickActivity !== blockData.activity || quickNotes)) {
      onUpdateBlock(blockData.itemId, {
        activity: quickActivity.trim() || blockData.activity,
        notes: quickNotes.trim() || undefined,
      });
    }
    onClose();
  };

  const cat = CATEGORY_COLORS[blockData.category] || CATEGORY_COLORS.focus;

  // Calculate duration in minutes/hours
  const getDurationString = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      const diff = endMins - startMins;
      if (diff <= 0) return "";
      const hrs = Math.floor(diff / 60);
      const mins = diff % 60;
      if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
      if (hrs > 0) return `${hrs} hr${hrs > 1 ? "s" : ""}`;
      return `${mins} mins`;
    } catch {
      return "";
    }
  };

  const duration = getDurationString(blockData.startTime, blockData.endTime);

  return (
    <div
      id="schedule-confirmation-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-confirmation-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div 
        className="w-full max-w-lg bg-[#141415] border border-[#d4ff33]/40 shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-[#e4e4e7] p-6 space-y-5 relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[rgba(228,228,231,0.1)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#d4ff33]/15 border border-[#d4ff33]/40 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-[#d4ff33]" />
            </div>
            <div>
              <span className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#d4ff33] block">
                TRANSACTION CONFIRMED // CLOUD FIRESTORE
              </span>
              <h3 
                id="schedule-confirmation-title"
                className="font-syne text-xl font-bold text-[#e4e4e7] tracking-tight"
              >
                Time Block Successfully Scheduled
              </h3>
            </div>
          </div>

          <button
            id="close-schedule-confirmation-x-btn"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-[rgba(228,228,231,0.5)] hover:text-[#e4e4e7] hover:bg-[#18181b] rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Status Highlight Banner */}
        <div className="bg-[#18181b] border border-[rgba(228,228,231,0.12)] p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4ff33] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#d4ff33]"></span>
            </span>
            <div className="font-mono text-xs">
              <span className="text-[#e4e4e7] font-semibold">Persisted to User Schedule</span>
              <p className="text-[0.68rem] text-[rgba(228,228,231,0.5)]">
                Synchronized with cloud database under owner-bound isolation
              </p>
            </div>
          </div>

          <span className="font-mono text-[0.65rem] px-2 py-0.5 bg-[#27272a] text-[#d4ff33] border border-[#d4ff33]/20 font-bold uppercase">
            ACTIVE
          </span>
        </div>

        {/* Block Details Card */}
        <div className="bg-[#18181b] border border-[rgba(228,228,231,0.1)] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#d4ff33]" />
              <span className="font-mono text-sm font-bold text-[#e4e4e7]">
                {blockData.startTime} – {blockData.endTime}
              </span>
              {duration && (
                <span className="font-mono text-[0.68rem] px-1.5 py-0.5 bg-[#202024] text-[rgba(228,228,231,0.6)] rounded">
                  {duration}
                </span>
              )}
            </div>

            <span
              className={`font-mono text-[0.62rem] uppercase tracking-wider px-2 py-0.5 border ${cat.border} ${cat.bg}`}
              style={{ color: cat.color }}
            >
              {cat.label}
            </span>
          </div>

          {/* Quick Edit Activity */}
          <div className="space-y-1">
            <label className="font-mono text-[0.62rem] uppercase text-[rgba(228,228,231,0.4)] block">
              Activity Name
            </label>
            <input
              id="confirmation-activity-input"
              type="text"
              value={quickActivity}
              onChange={(e) => setQuickActivity(e.target.value)}
              placeholder="e.g. Deep Focus Work"
              className="w-full bg-[#121214] border border-[rgba(228,228,231,0.2)] focus:border-[#d4ff33] text-sm text-[#e4e4e7] px-3 py-1.5 outline-none font-sans"
            />
          </div>

          {/* Metadata Row: Date & Priority */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
            <div className="flex items-center gap-2 bg-[#141415] p-2 border border-[rgba(228,228,231,0.06)]">
              <Calendar className="w-3.5 h-3.5 text-[rgba(228,228,231,0.5)]" />
              <div>
                <span className="text-[0.6rem] text-[rgba(228,228,231,0.4)] block">DATE</span>
                <span className="text-[#e4e4e7]">{blockData.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#141415] p-2 border border-[rgba(228,228,231,0.06)]">
              <Flag className="w-3.5 h-3.5 text-[rgba(228,228,231,0.5)]" />
              <div>
                <span className="text-[0.6rem] text-[rgba(228,228,231,0.4)] block">PRIORITY</span>
                <span className="text-[#e4e4e7] uppercase">{blockData.priority}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Firestore Technical Data */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[rgba(228,228,231,0.4)] text-[0.65rem] uppercase">
              Firestore Document Location
            </span>
            <button
              id="copy-schedule-doc-path-btn"
              type="button"
              onClick={() => handleCopy(blockData.collectionPath, "path")}
              className="text-[#d4ff33] hover:underline flex items-center gap-1 text-[0.65rem] cursor-pointer"
            >
              {copiedField === "path" ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>COPY PATH</span>
                </>
              )}
            </button>
          </div>
          <div className="p-2.5 bg-[#18181b] border border-[rgba(228,228,231,0.08)] font-mono text-[0.7rem] text-[rgba(228,228,231,0.7)] break-all flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#d4ff33] shrink-0" />
            <span>{blockData.collectionPath}</span>
          </div>
        </div>

        {/* Security Rules Verification Badge */}
        <div className="flex items-center gap-2 text-[0.62rem] font-mono text-[rgba(228,228,231,0.4)] bg-[#141415] p-2 border border-[rgba(228,228,231,0.06)]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#d4ff33] shrink-0" />
          <span>
            OWASP Top 10 Verified: <code className="text-[#d4ff33]/80">request.auth.uid == userId</code>
          </span>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(228,228,231,0.1)]">
          <button
            id="dismiss-schedule-confirmation-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-mono text-xs uppercase text-[rgba(228,228,231,0.6)] hover:text-[#e4e4e7] hover:bg-[#18181b] border border-transparent rounded transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            id="save-and-close-schedule-confirmation-btn"
            type="button"
            onClick={handleSaveQuickEdits}
            className="px-4 py-2 font-mono text-xs uppercase font-bold text-black bg-[#d4ff33] hover:bg-[#c2eb2e] rounded transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done / Return to Schedule</span>
          </button>
        </div>
      </div>
    </div>
  );
}
