"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Database, X, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";

export interface SaveToastData {
  id: string;
  entryId: string;
  title: string;
  timestamp: number;
  messageCount: number;
  collectionPath: string;
  actionType?: "entry_saved" | "title_updated" | "location_pinned" | "reflection_generated";
}

interface SaveConfirmationToastProps {
  toastData: SaveToastData | null;
  onDismiss: () => void;
  onOpenDetails: () => void;
  autoDismissMs?: number;
}

const ACTION_LABELS: Record<NonNullable<SaveToastData["actionType"]>, string> = {
  entry_saved: "JOURNAL ENTRY SAVED",
  title_updated: "TITLE UPDATED & SAVED",
  location_pinned: "LOCATION PINNED & SAVED",
  reflection_generated: "REFLECTION SAVED TO CLOUD",
};

export function SaveConfirmationToast({
  toastData,
  onDismiss,
  onOpenDetails,
  autoDismissMs = 4500,
}: SaveConfirmationToastProps) {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!toastData || isPaused) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [toastData, isPaused, autoDismissMs, onDismiss]);

  return (
    <aside aria-label="Notifications" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 pointer-events-none">
      <AnimatePresence>
        {toastData && (
          <motion.div
            key={toastData.id}
            id="save-success-toast"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            role="status"
            aria-live="polite"
            className="pointer-events-auto w-full sm:w-[380px] bg-[#141415] border border-[#d4ff33]/40 shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-4 text-[#e4e4e7] relative overflow-hidden"
          >
            {/* Top Status Strip */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#d4ff33]/15 border border-[#d4ff33]/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#d4ff33]" />
                </div>
                <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#d4ff33]">
                  {ACTION_LABELS[toastData.actionType || "entry_saved"]}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[0.55rem] uppercase tracking-wider text-[rgba(228,228,231,0.5)] bg-[#18181b] border border-[rgba(228,228,231,0.1)] px-1.5 py-0.5">
                  FIRESTORE
                </span>
                <button
                  id="dismiss-save-toast-btn"
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
            <div className="space-y-1.5 mb-3">
              <h4
                id="save-toast-entry-title"
                className="font-syne text-[0.95rem] font-bold text-[#e4e4e7] tracking-[-0.01em] truncate"
              >
                {toastData.title || "Untitled Reflection"}
              </h4>

              <div className="flex items-center gap-1.5 text-[0.62rem] font-mono text-[rgba(228,228,231,0.6)] truncate">
                <Database className="w-3.5 h-3.5 text-[rgba(228,228,231,0.4)] shrink-0" />
                <span className="truncate">{toastData.collectionPath}</span>
              </div>

              <div className="flex items-center gap-3 pt-0.5 text-[0.58rem] font-mono text-[rgba(228,228,231,0.4)]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#d4ff33]/80" />
                  OWNER-ISOLATED
                </span>
                <span>•</span>
                <span>{toastData.messageCount} {toastData.messageCount === 1 ? "MSG" : "MSGS"} PERSISTED</span>
                <span>•</span>
                <span>{new Date(toastData.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[rgba(228,228,231,0.08)]">
              <button
                id="view-save-confirmation-btn"
                type="button"
                onClick={onOpenDetails}
                className="font-mono text-[0.62rem] font-bold text-[#d4ff33] hover:underline cursor-pointer uppercase flex items-center gap-1"
              >
                <span>VIEW CONFIRMATION</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>

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
