"use client";

import React, { useEffect, useRef, useState } from "react";
import type Quill from "quill";

interface RichTextEditorProps {
  initialValue?: string;
  value?: string;
  onChange: (html: string, plainText: string) => void;
  placeholder?: string;
  minHeight?: string;
  onSubmit?: () => void;
  onSave?: () => void;
  disabled?: boolean;
}

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["blockquote", "code-block"],
  [{ color: ["#e4e4e7", "#d4ff33", "#a1a1aa", "#60a5fa", "#f43f5e", "#fbbf24"] }],
  ["link", "clean"],
];

export function RichTextEditor({
  initialValue = "",
  value,
  onChange,
  placeholder = "Draft your journal reflection... (use formatting, headers, lists, or quotes)",
  minHeight = "130px",
  onSubmit,
  onSave,
  disabled = false,
}: RichTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<Quill | null>(null);
  const [stats, setStats] = useState({ words: 0, chars: 0 });
  const [isReady, setIsReady] = useState(false);

  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;
    onSaveRef.current = onSave;
  });

  // Initialize Quill instance client-side
  useEffect(() => {
    let isCancelled = false;
    const container = containerRef.current;
    if (!container) return;

    // Reset container to avoid duplicate toolbars on re-render / strict mode
    container.innerHTML = "";
    const editorHost = document.createElement("div");
    container.appendChild(editorHost);

    import("quill").then(({ default: QuillConstructor }) => {
      if (isCancelled || !editorHost) return;

      const quill = new QuillConstructor(editorHost, {
        theme: "snow",
        placeholder,
        readOnly: disabled,
        modules: {
          toolbar: TOOLBAR_OPTIONS,
        },
      });

      quillInstanceRef.current = quill;

      const startContent = value !== undefined ? value : initialValue;
      if (startContent && startContent.trim()) {
        quill.root.innerHTML = startContent;
        // Compute initial stats
        const text = quill.getText().trim();
        const words = text ? text.split(/\s+/).length : 0;
        setStats({ words, chars: text.length });
      }

      // Handle text changes
      quill.on("text-change", () => {
        const html = quill.root.innerHTML;
        const text = quill.getText();
        const trimmedText = text.trim();
        const isBlank = trimmedText.length === 0;

        const words = trimmedText ? trimmedText.split(/\s+/).length : 0;
        setStats({ words, chars: trimmedText.length });

        onChangeRef.current(isBlank ? "" : html, trimmedText);
      });

      // Keyboard shortcuts inside Quill editor
      quill.root.addEventListener("keydown", (e: KeyboardEvent) => {
        // Cmd/Ctrl + Enter: submit / reflect
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          onSubmitRef.current?.();
        }
        // Cmd/Ctrl + S: explicit save
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          onSaveRef.current?.();
        }
      });

      setIsReady(true);
    });

    return () => {
      isCancelled = true;
      quillInstanceRef.current = null;
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []); // Run once on mount

  // Sync external value updates if value prop changes externally
  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (!quill || value === undefined) return;

    const currentHtml = quill.root.innerHTML;
    const isCurrentlyEmpty = quill.getText().trim().length === 0;

    // Only update if value is meaningfully different and not triggered by self
    if (value === "" && !isCurrentlyEmpty) {
      quill.root.innerHTML = "";
      setStats({ words: 0, chars: 0 });
    } else if (value !== currentHtml && value !== "") {
      const selection = quill.getSelection();
      quill.root.innerHTML = value;
      if (selection) {
        quill.setSelection(selection.index, selection.length);
      }
      const text = quill.getText().trim();
      const words = text ? text.split(/\s+/).length : 0;
      setStats({ words, chars: text.length });
    }
  }, [value]);

  // Update disabled state if changed
  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (!quill) return;
    quill.enable(!disabled);
  }, [disabled]);

  return (
    <div className="rich-text-editor-container flex flex-col w-full group">
      {/* Quill Mount Point */}
      <div 
        ref={containerRef} 
        style={{ minHeight }}
        className="w-full relative transition-all" 
      />

      {/* Footer Stats & Hints */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#141415] border-x border-b border-[rgba(228,228,231,0.15)] font-mono text-[0.55rem] text-[rgba(228,228,231,0.4)] uppercase tracking-wider rounded-b">
        <div className="flex items-center gap-3">
          <span>{stats.words} {stats.words === 1 ? "WORD" : "WORDS"}</span>
          <span>•</span>
          <span>{stats.chars} CHARACTERS</span>
          {isReady && (
            <>
              <span>•</span>
              <span className="text-[#d4ff33]/80">QUILL RICH TEXT ACTIVE</span>
            </>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[rgba(228,228,231,0.4)]">
          <span>⌘/CTRL + ENTER: REFLECT</span>
          <span>•</span>
          <span>⌘/CTRL + S: SAVE</span>
        </div>
      </div>
    </div>
  );
}
