"use client";

import React, { useMemo } from "react";
import { sanitizeRichHtml, isRichHtml } from "@/lib/htmlUtils";

interface RichTextRendererProps {
  content: string;
  className?: string;
}

export function RichTextRenderer({ content, className = "" }: RichTextRendererProps) {
  const isHtml = useMemo(() => isRichHtml(content), [content]);

  const sanitizedHtml = useMemo(() => {
    if (!isHtml) return "";
    return sanitizeRichHtml(content);
  }, [content, isHtml]);

  if (!content) return null;

  if (isHtml) {
    return (
      <div
        className={`rich-text-content ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  // Fallback for plain text messages: preserve linebreaks and whitespace cleanly
  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {content}
    </div>
  );
}
