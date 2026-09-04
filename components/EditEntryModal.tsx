"use client";

import React, { useState, useEffect } from "react";
import { X, Check, FileEdit, Trash2 } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { JournalMessage } from "@/types/journal";
import { stripHtml } from "@/lib/htmlUtils";

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: JournalMessage | null;
  onSave: (messageId: string, updatedContent: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
}

function EditEntryModalDialog({
  message,
  onSave,
  onDelete,
  onClose,
}: {
  message: JournalMessage;
  onSave: (messageId: string, updatedContent: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [draftHtml, setDraftHtml] = useState(message.content);
  const [plainText, setPlainText] = useState(() => stripHtml(message.content));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!draftHtml.trim() && !plainText.trim()) return;
    setIsSaving(true);
    try {
      await onSave(message.id, draftHtml || plainText);
      onClose();
    } catch (err) {
      console.error("Failed to update journal entry:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (window.confirm("Are you sure you want to remove this journal entry?")) {
      setIsSaving(true);
      try {
        await onDelete(message.id);
        onClose();
      } catch (err) {
        console.error("Failed to delete journal entry:", err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-3xl bg-[#141415] border border-[rgba(228,228,231,0.2)] shadow-2xl rounded flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(228,228,231,0.15)] bg-[#0c0c0d]">
          <div className="flex items-center gap-2.5">
            <FileEdit className="w-4 h-4 text-[#d4ff33]" />
            <h3 className="font-syne text-base font-bold text-[#e4e4e7] uppercase tracking-wide">
              Edit Formatted Journal Entry
            </h3>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-[rgba(228,228,231,0.5)] hover:text-[#d4ff33] rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scroll">
          <div className="flex items-center justify-between font-mono text-[0.6rem] uppercase tracking-wider text-[rgba(228,228,231,0.5)]">
            <span>
              Recorded: {new Date(message.timestamp).toLocaleString()}
            </span>
            <span className="text-[#d4ff33]">
              RICH TEXT FORMATTING PERSISTED
            </span>
          </div>

          {/* Rich Text Editor */}
          <RichTextEditor
            initialValue={message.content}
            onChange={(html, text) => {
              setDraftHtml(html);
              setPlainText(text);
            }}
            placeholder="Edit your journal reflection with rich text formatting..."
            minHeight="180px"
            onSave={handleSave}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[rgba(228,228,231,0.15)] bg-[#0c0c0d]">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Entry</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-[rgba(228,228,231,0.7)] hover:text-[#e4e4e7] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || (!draftHtml.trim() && !plainText.trim())}
              className="px-4 py-2 bg-[#d4ff33] hover:bg-[#e2ff66] text-[#0c0c0d] font-mono text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditEntryModal(props: EditEntryModalProps) {
  if (!props.isOpen || !props.message) return null;
  return <EditEntryModalDialog key={props.message.id} {...props} message={props.message} />;
}
