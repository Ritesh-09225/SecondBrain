"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  ArrowUp, 
  Menu, 
  PanelLeft,
  Copy, 
  Check, 
  Download, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  MapPin,
  Utensils,
  Cloud
} from "lucide-react";
import { JournalInteraction, ReflectionMode, JournalMessage, LocationPin } from "@/types/journal";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { LocationCard } from "./maps/LocationCard";
import { LocationPickerModal } from "./maps/LocationPickerModal";

export type ContentWidth = "compact" | "medium" | "wide";

interface ReflectionEditorProps {
  interaction: JournalInteraction | null;
  onSendMessage: (text: string, mode: ReflectionMode) => Promise<boolean>;
  onUpdateTitle: (title: string) => Promise<void>;
  onUpdateLocation?: (location: LocationPin | null) => Promise<void>;
  onOpenExplorer?: () => void;
  onManualSave?: () => Promise<void>;
  onOpenSaveConfirmation?: () => void;
  isLoading: boolean;
  saveStatus: "saved" | "saving" | "error";
  lastError: string | null;
  onRetry: () => void;
  onOpenSidebar: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const PROMPT_STARTERS = [
  {
    title: "Daily Alignment",
    prompt: "I am finding it increasingly difficult to separate my ambition from my peace. Every achievement feels like a temporary reprieve rather than a destination. Is this inherent to the human condition or a flaw in my philosophy?",
    mode: "reflect" as ReflectionMode,
  },
  {
    title: "Decision Clarity",
    prompt: "I'm facing a critical decision and feeling split between two paths. Help me weigh the core trade-offs, hidden assumptions, and root motives.",
    mode: "brainstorm" as ReflectionMode,
  },
  {
    title: "Executive Synthesis",
    prompt: "Here is what transpired during my week. Help me summarize the core themes, tactical takeaways, and strategic priorities for next week.",
    mode: "summarize" as ReflectionMode,
  },
  {
    title: "Shift Perspective",
    prompt: "I encountered an unexpected setback today that provoked frustration. Help me reframe this constructively and find the underlying growth opportunity.",
    mode: "reframe" as ReflectionMode,
  },
];

const MODES: Array<{ id: ReflectionMode; label: string }> = [
  { id: "reflect", label: "Reflect & Inquire" },
  { id: "summarize", label: "Synthesis" },
  { id: "brainstorm", label: "Brainstorm" },
  { id: "reframe", label: "Reframe" },
];

const WIDTH_CONFIG: Record<ContentWidth, { maxW: string; label: string; desc: string }> = {
  compact: { maxW: "max-w-[560px]", label: "COMPACT", desc: "Narrow 560px" },
  medium: { maxW: "max-w-[760px]", label: "BALANCED", desc: "Standard 760px" },
  wide: { maxW: "max-w-[980px]", label: "WIDE", desc: "Expansive 980px" },
};

export function ReflectionEditor({
  interaction,
  onSendMessage,
  onUpdateTitle,
  onUpdateLocation,
  onOpenExplorer,
  onManualSave,
  onOpenSaveConfirmation,
  isLoading,
  saveStatus,
  lastError,
  onRetry,
  onOpenSidebar,
  isSidebarOpen = true,
  onToggleSidebar,
}: ReflectionEditorProps) {
  const [inputText, setInputText] = useState("");
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>("reflect");
  const [contentWidth, setContentWidth] = useState<ContentWidth>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedWidth = localStorage.getItem("aether_content_width");
        if (savedWidth === "compact" || savedWidth === "medium" || savedWidth === "wide") {
          return savedWidth;
        }
      } catch {
        // ignore
      }
    }
    return "medium";
  });
  const [isHeaderRetracted, setIsHeaderRetracted] = useState(false);
  const [isPromptRetracted, setIsPromptRetracted] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Global shortcut: press '/' when not in an input to expand and focus prompt composer
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setIsPromptRetracted(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleWidthChange = (newWidth: ContentWidth) => {
    setContentWidth(newWidth);
    try {
      localStorage.setItem("aether_content_width", newWidth);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interaction?.messages, isLoading]);

  const startEditingTitle = () => {
    setTitleDraft(interaction?.title || "Untitled Reflection");
    setIsEditingTitle(true);
  };

  const handleTitleSubmit = async () => {
    setIsEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (interaction && trimmed && trimmed !== interaction.title) {
      await onUpdateTitle(trimmed);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || isLoading) return;

    // Immediately clear input field for crisp, immediate user feedback
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Send message to controller
    const success = await onSendMessage(textToSend, selectedMode);
    if (!success) {
      // If send failed before completing, restore the text if user has not typed something new
      setInputText((prev) => (prev === "" ? textToSend : prev));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    if (!interaction) return;
    const dateStr = new Date(interaction.createdAt).toISOString().split("T")[0];
    let markdown = `# ${interaction.title}\n\n*Created on ${new Date(interaction.createdAt).toLocaleString()}*\n\n---\n\n`;

    interaction.messages.forEach((msg) => {
      const speaker = msg.role === "user" ? "### User Reflection" : "### Aether (Gemini 3.6 Flash)";
      markdown += `${speaker} (${new Date(msg.timestamp).toLocaleTimeString()})\n\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aether-reflection-${dateStr}-${interaction.id.slice(0, 6)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const messages: JournalMessage[] = interaction?.messages || [];

  return (
    <main id="reflection-workspace" className="flex-1 flex flex-col h-screen bg-[#0c0c0d] text-[#e4e4e7] relative overflow-hidden">
      {/* Workspace Header */}
      {!isHeaderRetracted ? (
        <header className="px-6 md:px-12 py-5 flex items-center justify-between border-b border-[rgba(228,228,231,0.1)] bg-[#0c0c0d] shrink-0 z-10 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="sidebar-toggle-btn"
              onClick={onToggleSidebar || onOpenSidebar}
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              className={`p-2 text-[rgba(228,228,231,0.6)] hover:text-[#d4ff33] hover:bg-[#18181b] rounded transition-colors cursor-pointer flex items-center gap-2 ${
                !isSidebarOpen ? "border border-[rgba(228,228,231,0.15)] bg-[#141415] text-[#e4e4e7]" : ""
              }`}
            >
              <PanelLeft className={`w-4 h-4 ${!isSidebarOpen ? "text-[#d4ff33]" : ""}`} />
              {!isSidebarOpen && (
                <span className="hidden sm:inline font-mono text-[0.6rem] uppercase tracking-wider text-[rgba(228,228,231,0.8)]">
                  Sidebar
                </span>
              )}
            </button>

            <div className="flex items-center gap-3 min-w-0">
              {isEditingTitle ? (
                <input
                  id="edit-title-input"
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
                  autoFocus
                  className="font-syne text-lg font-bold text-[#e4e4e7] px-2 py-0.5 bg-[#18181b] border border-[#d4ff33] outline-none"
                />
              ) : (
                <h2
                  id="reflection-title-display"
                  onClick={startEditingTitle}
                  title="Click to rename reflection"
                  className="font-syne text-[1.2rem] font-bold tracking-[-0.02em] text-[#e4e4e7] truncate hover:text-[#d4ff33] cursor-pointer transition-colors"
                >
                  {interaction?.title || "New Reflection"}
                </h2>
              )}

              {/* Save Status */}
              <div className="hidden sm:flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-[rgba(228,228,231,0.5)] border border-[rgba(228,228,231,0.1)] px-2 py-0.5">
                {saveStatus === "saving" && (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#d4ff33]" />
                    <span className="text-[#d4ff33]">SAVING...</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <button
                    id="synced-status-badge"
                    type="button"
                    onClick={onOpenSaveConfirmation}
                    title="Saved to Firestore. Click to view confirmation & document details."
                    className="flex items-center gap-1 hover:text-[#d4ff33] transition-colors cursor-pointer"
                  >
                    <Check className="w-2.5 h-2.5 text-[#d4ff33]" />
                    <span className="text-[#d4ff33]">SYNCED</span>
                  </button>
                )}
                {saveStatus === "error" && (
                  <>
                    <AlertCircle className="w-2.5 h-2.5 text-red-400" />
                    <span className="text-red-400">ERROR</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Right */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Width Control Selector */}
            <div className="flex items-center border border-[rgba(228,228,231,0.15)] bg-[#141415] p-0.5" title="Adjust Message & Prompt Bar Width">
              {(["compact", "medium", "wide"] as ContentWidth[]).map((w) => {
                const isSelected = contentWidth === w;
                return (
                  <button
                    key={w}
                    id={`width-toggle-${w}`}
                    type="button"
                    onClick={() => handleWidthChange(w)}
                    title={`${WIDTH_CONFIG[w].label}: ${WIDTH_CONFIG[w].desc}`}
                    className={`px-2 py-1 font-mono text-[0.55rem] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? "bg-[#d4ff33] text-[#0c0c0d] font-bold"
                        : "text-[rgba(228,228,231,0.5)] hover:text-[#e4e4e7]"
                    }`}
                  >
                    {w === "compact" && <Minimize2 className="w-2.5 h-2.5" />}
                    {w === "wide" && <Maximize2 className="w-2.5 h-2.5" />}
                    <span>{WIDTH_CONFIG[w].label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden xl:flex items-center gap-3 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-[rgba(228,228,231,0.5)]">
              <span>SESSION: {interaction?.id ? interaction.id.slice(0, 8) : "NEW"}</span>
              <span>•</span>
              <span className="text-[#d4ff33]/80">GEMINI 3.1 FLASH-LITE (COST OPTIMIZED)</span>
            </div>

            {/* Pin Location Button */}
            {interaction?.location ? (
              <button
                id="header-location-pinned-btn"
                onClick={() => setIsLocationPickerOpen(true)}
                title="View / edit pinned eatery or location"
                className="pill-btn flex items-center gap-1.5 border-[#d4ff33]/50 text-[#d4ff33] bg-[#d4ff33]/10 hover:bg-[#d4ff33]/20"
              >
                <MapPin className="w-3 h-3 text-[#d4ff33]" />
                <span className="hidden sm:inline max-w-[130px] truncate">{interaction.location.name}</span>
                <span className="sm:hidden font-mono text-[0.55rem]">PIN</span>
              </button>
            ) : (
              <button
                id="header-pin-location-btn"
                onClick={() => setIsLocationPickerOpen(true)}
                title="Pin an eatery or place to this journal entry"
                className="pill-btn flex items-center gap-1.5 hover:border-[#d4ff33] hover:text-[#d4ff33]"
              >
                <MapPin className="w-3 h-3 text-[rgba(228,228,231,0.6)]" />
                <span className="hidden sm:inline">PIN LOCATION</span>
              </button>
            )}

            {/* Manual Save Button */}
            {onManualSave && (
              <button
                id="header-save-entry-btn"
                type="button"
                onClick={onManualSave}
                disabled={isLoading || saveStatus === "saving"}
                title="Save current journal entry to Firestore"
                className="pill-btn flex items-center gap-1.5 text-[0.6rem] hover:border-[#d4ff33] hover:text-[#d4ff33] disabled:opacity-30 cursor-pointer"
              >
                <Cloud className="w-3 h-3 text-[#d4ff33]" />
                <span className="hidden sm:inline">SAVE</span>
              </button>
            )}

            <button
              id="export-reflection-btn"
              onClick={handleExport}
              disabled={messages.length === 0}
              title="Export as Markdown"
              className="pill-btn disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              <span>EXPORT MD</span>
            </button>

            {/* Retract Header Button */}
            <button
              id="retract-header-btn"
              type="button"
              onClick={() => setIsHeaderRetracted(true)}
              title="Retract header bar (Zen reading mode)"
              className="pill-btn flex items-center gap-1 text-[rgba(228,228,231,0.6)] hover:text-[#d4ff33]"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">RETRACT</span>
            </button>
          </div>
        </header>
      ) : (
        /* Retracted Minimal Top Strip */
        <div id="retracted-header-strip" className="px-6 py-2 bg-[#0c0c0d] border-b border-[rgba(228,228,231,0.08)] flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="sidebar-toggle-collapsed-btn"
              onClick={onToggleSidebar || onOpenSidebar}
              aria-label="Toggle sidebar"
              className="p-1 text-[rgba(228,228,231,0.5)] hover:text-[#d4ff33] rounded cursor-pointer"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-syne font-bold text-xs text-[rgba(228,228,231,0.6)] truncate max-w-[240px]">
              {interaction?.title || "New Reflection"}
            </span>
          </div>

          <button
            id="expand-header-btn"
            type="button"
            onClick={() => setIsHeaderRetracted(false)}
            title="Expand header"
            className="pill-btn flex items-center gap-1 text-[#d4ff33] border-[#d4ff33]/40 hover:bg-[#d4ff33]/10"
          >
            <ChevronDown className="w-3 h-3" />
            <span>EXPAND HEADER</span>
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {lastError && (
        <div id="sync-error-banner" className="bg-[#18181b] border-b border-red-500/30 px-6 md:px-12 py-2.5 flex items-center justify-between text-xs text-red-400 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{lastError}</span>
          </div>
          <button
            id="retry-save-btn"
            onClick={onRetry}
            className="flex items-center gap-1 font-bold text-[#d4ff33] hover:underline cursor-pointer uppercase text-[10px]"
          >
            <RefreshCw className="w-3 h-3" />
            RETRY
          </button>
        </div>
      )}

      {/* Workspace Scroll Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-12 custom-scroll">
        <div className={`w-full ${WIDTH_CONFIG[contentWidth].maxW} mx-auto space-y-12 transition-all duration-300`}>
        {/* Pinned Location Card if present */}
        {interaction?.location && (
          <div className="location-pin-container">
            <LocationCard
              location={interaction.location}
              reflectionTitle={interaction.title}
              onEdit={() => setIsLocationPickerOpen(true)}
              onRemove={() => onUpdateLocation?.(null)}
            />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="py-8 text-center max-w-2xl mx-auto space-y-8">
            <div className="space-y-3">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#d4ff33] block">
                INTELLIGENT REFLECTIONS // ACTIVE
              </span>
              <h2 className="font-syne text-3xl sm:text-4xl font-extrabold text-[#e4e4e7] tracking-tight leading-tight">
                What is occupying your focus today?
              </h2>
              <p className="text-xs sm:text-sm text-[rgba(228,228,231,0.5)] leading-relaxed max-w-md mx-auto font-sans">
                Explore decisions, friction points, or deep introspections. Aether synthesizes your perspective and provides structured inquiry.
              </p>
            </div>

            {/* Prompt Starters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-4">
              {PROMPT_STARTERS.map((starter, i) => (
                <button
                  key={i}
                  id={`prompt-starter-${i}`}
                  onClick={() => {
                    setInputText(starter.prompt);
                    setSelectedMode(starter.mode);
                    textareaRef.current?.focus();
                  }}
                  className="p-6 border border-[rgba(228,228,231,0.1)] hover:border-[#d4ff33] bg-[#141415] transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-syne font-bold text-[#e4e4e7] group-hover:text-[#d4ff33] mb-2 uppercase tracking-wide">
                    <span>{starter.title}</span>
                    <Sparkles className="w-3 h-3 text-[rgba(228,228,231,0.4)] group-hover:text-[#d4ff33]" />
                  </div>
                  <p className="text-[12px] text-[rgba(228,228,231,0.5)] line-clamp-3 leading-relaxed font-sans">
                    &ldquo;{starter.prompt}&rdquo;
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                id={`message-${msg.id}`}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} w-full`}
              >
                {/* User Message */}
                {isUser ? (
                  <div className="user-message flex flex-col items-end w-full">
                    <div className="content font-syne text-xl sm:text-2xl md:text-[1.5rem] font-bold text-[#e4e4e7] leading-[1.2] tracking-[-0.02em] text-right whitespace-pre-wrap">
                      &lsquo;{msg.content}&rsquo;
                    </div>
                    <div className="meta-strip font-mono text-[0.55rem] uppercase tracking-[0.1em] text-[rgba(228,228,231,0.5)] flex items-center justify-end gap-3 mt-2">
                      <span>REFLECT_SENT</span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ) : (
                  /* AI Synthesis Message */
                  <div className="ai-message flex flex-col items-start w-full border-l-2 border-[#d4ff33] pl-6 md:pl-8 py-1">
                    {/* Header */}
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[#d4ff33] font-bold">
                        Aether Synthesis
                      </span>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-[rgba(228,228,231,0.5)]">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <button
                          id={`copy-btn-${msg.id}`}
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy response"
                          className="p-1 text-[rgba(228,228,231,0.4)] hover:text-[#d4ff33] transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-[#d4ff33]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Markdown Body */}
                    <div className="content w-full text-[1rem] leading-[1.7] text-[rgba(228,228,231,0.7)]">
                      <MarkdownRenderer content={msg.content} />
                    </div>

                    {/* Follow-up Action Pills */}
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedMode("reflect");
                          textareaRef.current?.focus();
                        }}
                        className="pill-btn"
                      >
                        Deepen Inquiry
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMode("summarize");
                          textareaRef.current?.focus();
                        }}
                        className="pill-btn"
                      >
                        Draft Summary
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMode("brainstorm");
                          textareaRef.current?.focus();
                        }}
                        className="pill-btn"
                      >
                        Brainstorm
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMode("reframe");
                          textareaRef.current?.focus();
                        }}
                        className="pill-btn"
                      >
                        Reframe Lens
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* AI Loading State */}
        {isLoading && (
          <div id="ai-loading-indicator" className="ai-message flex flex-col items-start w-full border-l-2 border-[#d4ff33] pl-6 md:pl-8 py-1 space-y-3">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[#d4ff33] font-bold">
              Aether Synthesis // Processing
            </span>
            <div className="flex items-center gap-2.5 font-mono text-xs text-[rgba(228,228,231,0.5)]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#d4ff33]" />
              <span>SYNTHESIZING INTROSPECTION VIA GEMINI 3.6 FLASH...</span>
            </div>
            <div className="w-full space-y-2 pt-1">
              <div className="h-2 bg-[#18181b] w-3/4 animate-pulse" />
              <div className="h-2 bg-[#18181b] w-5/6 animate-pulse" />
              <div className="h-2 bg-[#18181b] w-1/2 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Composer & Controls */}
      <div className="input-area px-4 sm:px-8 border-t border-[rgba(228,228,231,0.1)] bg-[#0c0c0d] shrink-0 transition-all duration-300">
        {!isPromptRetracted ? (
          <div className={`w-full ${WIDTH_CONFIG[contentWidth].maxW} mx-auto py-6 transition-all duration-300`}>
            {/* Mode Controls, Width Indicator & Retract Button */}
            <div className="controls flex items-center justify-between gap-2 mb-3 overflow-x-auto">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[0.65rem] uppercase text-[rgba(228,228,231,0.5)] shrink-0 mr-1">
                  MODE:
                </span>
                {MODES.map((m) => {
                  const isSelected = selectedMode === m.id;
                  return (
                    <button
                      key={m.id}
                      id={`mode-select-${m.id}`}
                      type="button"
                      onClick={() => setSelectedMode(m.id)}
                      className={`pill-btn ${isSelected ? "active" : ""}`}
                    >
                      {m.label}
                    </button>
                  );
                })}

                {/* Quick Pin Location Action */}
                <button
                  id="prompt-pin-location-btn"
                  type="button"
                  onClick={() => setIsLocationPickerOpen(true)}
                  className={`pill-btn flex items-center gap-1 text-[0.6rem] ${
                    interaction?.location ? "border-[#d4ff33]/50 text-[#d4ff33] bg-[#d4ff33]/10" : "text-[rgba(228,228,231,0.6)] hover:text-[#d4ff33]"
                  }`}
                  title={interaction?.location ? `Pinned: ${interaction.location.name}` : "Pin an eatery or spot to this reflection"}
                >
                  <MapPin className="w-3 h-3 text-[#d4ff33]" />
                  <span className="hidden sm:inline">
                    {interaction?.location ? interaction.location.name.slice(0, 16) + (interaction.location.name.length > 16 ? "..." : "") : "Pin Spot"}
                  </span>
                  <span className="sm:hidden">Pin</span>
                </button>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 font-mono text-[0.55rem] text-[rgba(228,228,231,0.4)] uppercase tracking-wider">
                  <span>WIDTH: {WIDTH_CONFIG[contentWidth].label}</span>
                </div>

                {/* Retract Prompt Bar Button */}
                <button
                  id="retract-prompt-btn"
                  type="button"
                  onClick={() => setIsPromptRetracted(true)}
                  title="Retract prompt bar (Zen reading mode)"
                  className="pill-btn flex items-center gap-1 text-[rgba(228,228,231,0.6)] hover:text-[#d4ff33]"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">RETRACT</span>
                </button>
              </div>
            </div>

            {/* Input Wrapper Form */}
            <form onSubmit={handleSubmit}>
              <div className="input-wrapper relative bg-[#18181b] p-4 border border-[rgba(228,228,231,0.1)] focus-within:border-[#d4ff33] transition-colors">
                <textarea
                  ref={textareaRef}
                  id="journal-input-textarea"
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="CONTINUE REFLECTION... (ENTER TO SUBMIT, SHIFT+ENTER FOR NEWLINE)"
                  className="w-full bg-transparent border-none text-[#e4e4e7] placeholder-[rgba(228,228,231,0.3)] font-sans resize-none outline-none text-[0.9rem] min-h-[60px] max-h-36 pr-14 custom-scroll"
                />

                <button
                  id="send-reflection-btn"
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  aria-label="Send reflection"
                  className="btn-circle w-10 h-10 rounded-full bg-[#d4ff33] hover:bg-[#e2ff66] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border-none absolute right-4 bottom-4 cursor-pointer transition-transform"
                >
                  <ArrowUp className="w-5 h-5 text-[#0c0c0d] stroke-[2.5]" />
                </button>
              </div>
            </form>

            {/* Meta Strip Notice */}
            <div className="meta-strip font-mono text-[0.55rem] text-[rgba(228,228,231,0.4)] uppercase tracking-[0.1em] flex items-center justify-between mt-2.5">
              <span>INTELLECTUAL REFLECTION & BRAINSTORMING ONLY // FIRESTORE ISOLATED</span>
              <span className="hidden sm:inline">ENTER TO SEND • SHIFT+ENTER FOR NEWLINE</span>
            </div>
          </div>
        ) : (
          /* Retracted Prompt Bar Dock */
          <div className={`w-full ${WIDTH_CONFIG[contentWidth].maxW} mx-auto py-3 transition-all duration-300`}>
            <button
              id="expand-prompt-btn"
              type="button"
              onClick={() => {
                setIsPromptRetracted(false);
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              title="Expand prompt bar (or press '/')"
              className="w-full flex items-center justify-between px-4 py-2.5 bg-[#141415] hover:bg-[#18181b] border border-[rgba(228,228,231,0.15)] hover:border-[#d4ff33] transition-colors cursor-pointer group rounded"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="pill-btn active text-[0.55rem] py-0.5 px-2 shrink-0">
                  {MODES.find((m) => m.id === selectedMode)?.label}
                </span>
                <span className="font-mono text-[0.7rem] uppercase tracking-wider text-[rgba(228,228,231,0.6)] group-hover:text-[#e4e4e7] truncate">
                  CONTINUE REFLECTION... (PRESS &apos;/&apos; OR CLICK TO EXPAND)
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[0.6rem] text-[#d4ff33] font-bold shrink-0 ml-2">
                <span>EXPAND</span>
                <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        initialLocation={interaction?.location}
        onSaveLocation={async (loc) => {
          if (onUpdateLocation) {
            await onUpdateLocation(loc);
          }
        }}
      />
    </main>
  );
}


