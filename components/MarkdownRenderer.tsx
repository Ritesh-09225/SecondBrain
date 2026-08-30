"use client";

import React from "react";
import Markdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert max-w-none text-[rgba(228,228,231,0.75)] leading-[1.7] font-sans text-base">
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg md:text-xl font-syne font-bold uppercase tracking-wider text-[#e4e4e7] mt-6 mb-3 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base md:text-lg font-syne font-bold uppercase tracking-wider text-[#e4e4e7] mt-5 mb-2.5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-syne font-bold uppercase tracking-[0.1em] text-[#e4e4e7] mt-6 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 last:mb-0 leading-[1.7] text-[rgba(228,228,231,0.7)]">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-none pl-0 space-y-2 mb-4 text-[rgba(228,228,231,0.7)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-2 mb-4 text-[rgba(228,228,231,0.7)]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed flex items-start gap-2">
              <span className="text-[#d4ff33] font-mono shrink-0 select-none">—</span>
              <span>{children}</span>
            </li>
          ),
          hr: () => (
            <hr className="border-0 border-t border-[rgba(228,228,231,0.1)] my-6" />
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#d4ff33] pl-4 italic text-[#e4e4e7] my-4 bg-[#18181b] py-2.5 pr-3">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-[#18181b] text-[#d4ff33] border border-[rgba(228,228,231,0.1)] px-1.5 py-0.5 text-xs font-mono">
              {children}
            </code>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[#e4e4e7]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[#e4e4e7]">{children}</em>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}


