"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  Database, 
  ShieldCheck, 
  Copy, 
  Check, 
  X, 
  FileText, 
  MapPin, 
  Clock, 
  ExternalLink,
  Layers
} from "lucide-react";
import { JournalInteraction } from "@/types/journal";
import { SaveToastData } from "./SaveConfirmationToast";

interface SaveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  toastData: SaveToastData | null;
  activeEntry: JournalInteraction | null;
  userId?: string;
}

export function SaveConfirmationModal({
  isOpen,
  onClose,
  toastData,
  activeEntry,
  userId,
}: SaveConfirmationModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentEntry = activeEntry;
  const entryId = toastData?.entryId || currentEntry?.id || "unknown";
  const entryTitle = toastData?.title || currentEntry?.title || "Untitled Reflection";
  const messageCount = toastData?.messageCount ?? (currentEntry?.messages?.length || 0);
  const location = currentEntry?.location;
  const fullPath = `/users/${userId || "current-user"}/interactions/${entryId}`;
  const saveTime = toastData?.timestamp 
    ? new Date(toastData.timestamp).toLocaleString()
    : new Date().toLocaleString();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div
      id="save-confirmation-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div 
        className="w-full max-w-lg bg-[#141415] border border-[#d4ff33]/40 shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-[#e4e4e7] p-6 space-y-6 relative overflow-hidden"
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
                id="confirmation-modal-title"
                className="font-syne text-xl font-bold text-[#e4e4e7] tracking-tight"
              >
                Journal Entry Successfully Saved
              </h3>
            </div>
          </div>

          <button
            id="close-confirmation-modal-x-btn"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-[rgba(228,228,231,0.5)] hover:text-[#e4e4e7] hover:bg-[#18181b] rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Highlight Banner */}
        <div className="bg-[#18181b] border border-[rgba(228,228,231,0.12)] p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4ff33] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#d4ff33]"></span>
            </span>
            <span className="font-mono text-xs text-[#e4e4e7]">
              Database Write Verified & State Synchronized
            </span>
          </div>
          <span className="font-mono text-[0.6rem] uppercase tracking-wider text-[#d4ff33] bg-[#d4ff33]/10 border border-[#d4ff33]/30 px-2 py-0.5">
            READY
          </span>
        </div>

        {/* Metadata Details Grid */}
        <div className="space-y-3 font-mono text-xs">
          {/* Document Title */}
          <div className="p-3 bg-[#0c0c0d] border border-[rgba(228,228,231,0.08)] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[0.6rem] text-[rgba(228,228,231,0.4)] uppercase block">ENTRY TITLE</span>
              <p className="font-syne font-bold text-sm text-[#e4e4e7] truncate">{entryTitle}</p>
            </div>
            <FileText className="w-4 h-4 text-[rgba(228,228,231,0.4)] shrink-0" />
          </div>

          {/* Firestore Path */}
          <div className="p-3 bg-[#0c0c0d] border border-[rgba(228,228,231,0.08)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[0.6rem] text-[rgba(228,228,231,0.4)] uppercase">FIRESTORE DOCUMENT PATH</span>
              <button
                id="copy-firestore-path-btn"
                type="button"
                onClick={() => handleCopy(fullPath, "path")}
                className="text-[0.6rem] text-[#d4ff33] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedField === "path" ? (
                  <>
                    <Check className="w-2.5 h-2.5" />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-2.5 h-2.5" />
                    <span>COPY PATH</span>
                  </>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[0.72rem] text-[rgba(228,228,231,0.7)] break-all font-mono">
              <Database className="w-3.5 h-3.5 text-[#d4ff33] shrink-0" />
              <span>{fullPath}</span>
            </div>
          </div>

          {/* 2-Column Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Security Isolation */}
            <div className="p-3 bg-[#0c0c0d] border border-[rgba(228,228,231,0.08)]">
              <span className="text-[0.6rem] text-[rgba(228,228,231,0.4)] uppercase block mb-1">SECURITY ACCESS</span>
              <div className="flex items-center gap-1.5 text-[0.7rem] text-[#e4e4e7]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#d4ff33]" />
                <span>Owner-Bound Isolated</span>
              </div>
              <p className="text-[0.58rem] text-[rgba(228,228,231,0.4)] mt-1 font-sans">
                Rule: <code className="font-mono text-[#d4ff33]/80">request.auth.uid == userId</code>
              </p>
            </div>

            {/* Total Messages */}
            <div className="p-3 bg-[#0c0c0d] border border-[rgba(228,228,231,0.08)]">
              <span className="text-[0.6rem] text-[rgba(228,228,231,0.4)] uppercase block mb-1">CONTENT STORED</span>
              <div className="flex items-center gap-1.5 text-[0.7rem] text-[#e4e4e7]">
                <Layers className="w-3.5 h-3.5 text-[#d4ff33]" />
                <span>{messageCount} {messageCount === 1 ? "Message Turn" : "Message Turns"}</span>
              </div>
              <p className="text-[0.58rem] text-[rgba(228,228,231,0.4)] mt-1 font-sans">
                Multi-turn conversation history
              </p>
            </div>

            {/* Pinned Location */}
            <div className="p-3 bg-[#0c0c0d] border border-[rgba(228,228,231,0.08)]">
              <span className="text-[0.6rem] text-[rgba(228,228,231,0.4)] uppercase block mb-1">PINNED LOCATION</span>
              <div className="flex items-center gap-1.5 text-[0.7rem] text-[#e4e4e7] truncate">
                <MapPin className="w-3.5 h-3.5 text-[#d4ff33] shrink-0" />
                <span className="truncate">{location ? location.name : "None attached"}</span>
              </div>
              {location && (
                <p className="text-[0.58rem] text-[rgba(228,228,231,0.4)] mt-1 truncate">
                  {location.formattedAddress}
                </p>
              )}
            </div>

            {/* Timestamp */}
            <div className="p-3 bg-[#0c0c0d] border border-[rgba(228,228,231,0.08)]">
              <span className="text-[0.6rem] text-[rgba(228,228,231,0.4)] uppercase block mb-1">PERSISTED AT</span>
              <div className="flex items-center gap-1.5 text-[0.7rem] text-[#e4e4e7]">
                <Clock className="w-3.5 h-3.5 text-[#d4ff33]" />
                <span>{saveTime}</span>
              </div>
              <p className="text-[0.58rem] text-[rgba(228,228,231,0.4)] mt-1 font-sans">
                Server timestamp synchronized
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(228,228,231,0.1)]">
          <button
            id="close-confirmation-modal-btn"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-[#d4ff33] hover:bg-[#e2ff66] text-[#0c0c0d] font-syne font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
