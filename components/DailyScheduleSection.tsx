"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Clock3, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Copy, 
  Check, 
  ArrowUpDown, 
  ListFilter, 
  Save, 
  AlertCircle,
  RotateCcw,
  Tag,
  ArrowUp,
  ArrowDown,
  BookOpen,
  X,
  FileText
} from "lucide-react";
import { 
  DailySchedule, 
  ScheduleItem, 
  ScheduleCategory, 
  ScheduleStatus, 
  SchedulePriority 
} from "@/types/schedule";
import { User } from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sanitizeForFirestore } from "@/lib/sanitize";
import { createId, createTimestamp } from "@/lib/id";
import { ScheduleBlockToast, ScheduleToastData } from "./ScheduleBlockToast";
import { ScheduleBlockConfirmationModal } from "./ScheduleBlockConfirmationModal";

interface DailyScheduleSectionProps {
  user: User | null;
  onSendToReflection?: (scheduleSummary: string) => void;
  onClose?: () => void;
  isEmbedded?: boolean;
}

const CATEGORY_CONFIG: Record<ScheduleCategory, { label: string; color: string; border: string; bg: string }> = {
  focus: { label: "FOCUS", color: "#d4ff33", border: "border-[#d4ff33]/40", bg: "bg-[#d4ff33]/10" },
  meeting: { label: "MEETING", color: "#60a5fa", border: "border-blue-400/40", bg: "bg-blue-400/10" },
  reflection: { label: "REFLECTION", color: "#c084fc", border: "border-purple-400/40", bg: "bg-purple-400/10" },
  wellness: { label: "WELLNESS", color: "#34d399", border: "border-emerald-400/40", bg: "bg-emerald-400/10" },
  admin: { label: "ADMIN", color: "#fbbf24", border: "border-amber-400/40", bg: "bg-amber-400/10" },
  break: { label: "BREAK", color: "#94a3b8", border: "border-slate-400/40", bg: "bg-slate-400/10" },
};

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { label: "Pending", icon: Circle, color: "text-[rgba(228,228,231,0.4)]" },
  in_progress: { label: "In Progress", icon: Clock3, color: "text-amber-400" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-[#d4ff33]" },
  skipped: { label: "Skipped", icon: X, color: "text-slate-500" },
};

const DEFAULT_SCHEDULE_ITEMS: Omit<ScheduleItem, "id">[] = [
  {
    startTime: "08:30",
    endTime: "09:00",
    activity: "Morning Introspection & Intentions",
    category: "reflection",
    status: "completed",
    priority: "high",
    notes: "Review core objectives; ground the mindset before communications open.",
  },
  {
    startTime: "09:00",
    endTime: "11:30",
    activity: "Deep Work: Core Architecture & Strategic Focus",
    category: "focus",
    status: "in_progress",
    priority: "high",
    notes: "Zero notifications. Dedicated focus on high-impact milestone deliverables.",
  },
  {
    startTime: "11:30",
    endTime: "12:15",
    activity: "Team Alignment & Decision Sync",
    category: "meeting",
    status: "pending",
    priority: "medium",
    notes: "Review blockers, approve pending reviews, clarify interface contracts.",
  },
  {
    startTime: "12:15",
    endTime: "13:15",
    activity: "Nutrition & Physical Reset",
    category: "wellness",
    status: "pending",
    priority: "medium",
    notes: "Step away from displays; walk outside.",
  },
  {
    startTime: "13:15",
    endTime: "15:45",
    activity: "Implementation & Complex Problem Solving",
    category: "focus",
    status: "pending",
    priority: "high",
    notes: "Execution sprint without context switching.",
  },
  {
    startTime: "15:45",
    endTime: "16:30",
    activity: "Operational Comms & Administrative Wrap-up",
    category: "admin",
    status: "pending",
    priority: "low",
    notes: "Inbox clearing, documentation updates, issue tracking.",
  },
  {
    startTime: "16:30",
    endTime: "17:15",
    activity: "Evening Synthesis & Tomorrow Preparation",
    category: "reflection",
    status: "pending",
    priority: "medium",
    notes: "Reflect on accomplishments, log lessons in Aether journal, lock in tomorrow's top 3 items.",
  },
];

export function DailyScheduleSection({
  user,
  onSendToReflection,
  onClose,
  isEmbedded = false,
}: DailyScheduleSectionProps) {
  // Current selected date string formatted as YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ScheduleCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | "all">("all");
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);

  // Toast notification and confirmation dialog state for newly added time blocks
  const [scheduleToastData, setScheduleToastData] = useState<ScheduleToastData | null>(null);
  const [confirmationModalBlock, setConfirmationModalBlock] = useState<ScheduleToastData | null>(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [openModalDirectlyOnAdd, setOpenModalDirectlyOnAdd] = useState(false);

  // Firestore path: users/{userId}/schedules/{selectedDate}
  useEffect(() => {
    if (!user?.uid) {
      // Local fallback if unauthenticated (deferred to prevent synchronous setState in effect)
      const timer = setTimeout(() => {
        setSchedule({
          id: selectedDate,
          userId: "local",
          date: selectedDate,
          title: `Daily Schedule — ${selectedDate}`,
          goalOfTheDay: "Execute core strategic priorities with high cognitive clarity.",
          items: DEFAULT_SCHEDULE_ITEMS.map((item, idx) => ({
            ...item,
            id: `item_${idx + 1}`,
          })),
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        });
      }, 0);
      return () => clearTimeout(timer);
    }

    const scheduleDocRef = doc(db, "users", user.uid, "schedules", selectedDate);

    const unsubscribe = onSnapshot(
      scheduleDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSchedule({
            id: docSnap.id,
            userId: user.uid,
            date: selectedDate,
            title: data.title || `Schedule — ${selectedDate}`,
            goalOfTheDay: data.goalOfTheDay || "",
            items: Array.isArray(data.items) ? data.items : [],
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || createTimestamp()),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || createTimestamp()),
          });
        } else {
          // Initialize fresh schedule with defaults for the date
          const initialSchedule: DailySchedule = {
            id: selectedDate,
            userId: user.uid,
            date: selectedDate,
            title: `Schedule — ${selectedDate}`,
            goalOfTheDay: "Maintain clarity, protect deep focus hours, and review progress mindfully.",
            items: DEFAULT_SCHEDULE_ITEMS.map((item, idx) => ({
              ...item,
              id: createId(`slot_${idx}`),
            })),
            createdAt: createTimestamp(),
            updatedAt: createTimestamp(),
          };
          setSchedule(initialSchedule);
          // Persist the initialized schedule to Firestore
          const cleanData = sanitizeForFirestore({
            ...initialSchedule,
            updatedAt: serverTimestamp(),
          });
          setDoc(scheduleDocRef, cleanData, { merge: true }).catch((err) => {
            console.error("Auto-init schedule error:", err);
          });
        }
        setSaveStatus("saved");
      },
      (err) => {
        console.error("Firestore schedule sync error:", err);
        setSaveStatus("error");
      }
    );

    return () => unsubscribe();
  }, [user, selectedDate]);

  // Persist schedule changes to Firestore
  const persistSchedule = useCallback(
    async (updated: DailySchedule) => {
      setSchedule(updated);
      if (!user?.uid) return;

      setSaveStatus("saving");
      try {
        const scheduleDocRef = doc(db, "users", user.uid, "schedules", selectedDate);
        const cleanData = sanitizeForFirestore({
          ...updated,
          updatedAt: serverTimestamp(),
        });
        await setDoc(scheduleDocRef, cleanData, { merge: true });
        setSaveStatus("saved");
      } catch (err) {
        console.error("Save schedule error:", err);
        setSaveStatus("error");
      }
    },
    [user, selectedDate]
  );

  // Date navigation handlers
  const handleDateChange = (deltaDays: number) => {
    const current = new Date(selectedDate + "T12:00:00Z");
    current.setDate(current.getDate() + deltaDays);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const handleJumpToToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  };

  // Add new time block
  const handleAddItem = () => {
    if (!schedule) return;
    const items = schedule.items;
    let nextStart = "09:00";
    let nextEnd = "10:00";

    if (items.length > 0) {
      const last = items[items.length - 1];
      if (last.endTime) {
        nextStart = last.endTime;
        // Add 1 hour by default
        const [h, m] = nextStart.split(":").map(Number);
        const endHour = Math.min(23, (h || 9) + 1);
        nextEnd = `${String(endHour).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
      }
    }

    const newItem: ScheduleItem = {
      id: createId("slot"),
      startTime: nextStart,
      endTime: nextEnd,
      activity: "New Focus Block",
      category: "focus",
      status: "pending",
      priority: "medium",
      notes: "",
    };

    const updated: DailySchedule = {
      ...schedule,
      items: [...items, newItem],
      updatedAt: createTimestamp(),
    };
    persistSchedule(updated);

    // Trigger toast notification and/or confirmation dialog
    const toastPayload: ScheduleToastData = {
      id: createId("toast"),
      itemId: newItem.id,
      activity: newItem.activity,
      startTime: newItem.startTime,
      endTime: newItem.endTime,
      category: newItem.category,
      priority: newItem.priority || "medium",
      date: selectedDate,
      collectionPath: `/users/${user?.uid || "local"}/schedules/${selectedDate}`,
      timestamp: Date.now(),
    };

    setScheduleToastData(toastPayload);

    // If user prefers immediate confirmation dialog
    if (openModalDirectlyOnAdd) {
      setConfirmationModalBlock(toastPayload);
      setIsConfirmationModalOpen(true);
    }
  };

  // Undo newly added item
  const handleUndo = (itemId: string) => {
    if (!schedule) return;
    const filtered = schedule.items.filter((item) => item.id !== itemId);
    const updated: DailySchedule = {
      ...schedule,
      items: filtered,
      updatedAt: createTimestamp(),
    };
    persistSchedule(updated);
    setScheduleToastData(null);
  };

  // Open full confirmation dialog from toast
  const handleOpenToastDetails = (data: ScheduleToastData) => {
    setConfirmationModalBlock(data);
    setIsConfirmationModalOpen(true);
  };

  // Update item from within confirmation modal
  const handleModalUpdateBlock = (itemId: string, updates: { activity?: string; notes?: string }) => {
    handleUpdateItem(itemId, updates);
  };

  // Update specific item field
  const handleUpdateItem = (itemId: string, updates: Partial<ScheduleItem>) => {
    if (!schedule) return;
    const updatedItems = schedule.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, ...updates };
      }
      return item;
    });

    const updated: DailySchedule = {
      ...schedule,
      items: updatedItems,
      updatedAt: createTimestamp(),
    };
    persistSchedule(updated);
  };

  // Cycle status: pending -> in_progress -> completed -> skipped -> pending
  const handleCycleStatus = (itemId: string, currentStatus: ScheduleStatus) => {
    const order: ScheduleStatus[] = ["pending", "in_progress", "completed", "skipped"];
    const nextIdx = (order.indexOf(currentStatus) + 1) % order.length;
    handleUpdateItem(itemId, { status: order[nextIdx] });
  };

  // Delete item
  const handleDeleteItem = (itemId: string) => {
    if (!schedule) return;
    const updatedItems = schedule.items.filter((item) => item.id !== itemId);
    const updated: DailySchedule = {
      ...schedule,
      items: updatedItems,
      updatedAt: createTimestamp(),
    };
    persistSchedule(updated);
  };

  // Move item up / down in sequence
  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (!schedule) return;
    const newItems = [...schedule.items];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    const updated: DailySchedule = {
      ...schedule,
      items: newItems,
      updatedAt: createTimestamp(),
    };
    persistSchedule(updated);
  };

  // Sort items chronologically by startTime
  const handleSortChronologically = () => {
    if (!schedule) return;
    const sorted = [...schedule.items].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });

    const updated: DailySchedule = {
      ...schedule,
      items: sorted,
      updatedAt: createTimestamp(),
    };
    persistSchedule(updated);
  };

  // Apply preset template
  const handleApplyPreset = (type: "deep_work" | "mindful" | "meeting_heavy") => {
    if (!schedule) return;

    let presetItems: Omit<ScheduleItem, "id">[] = [];

    if (type === "deep_work") {
      presetItems = [
        { startTime: "08:00", endTime: "08:30", activity: "Morning Alignment & Prioritization", category: "reflection", status: "pending", priority: "high" },
        { startTime: "08:30", endTime: "12:00", activity: "Deep Work Block I: High-Leverage Build", category: "focus", status: "pending", priority: "high" },
        { startTime: "12:00", endTime: "13:00", activity: "Mindful Lunch & Walk", category: "wellness", status: "pending", priority: "low" },
        { startTime: "13:00", endTime: "16:00", activity: "Deep Work Block II: System Architecture & Tests", category: "focus", status: "pending", priority: "high" },
        { startTime: "16:00", endTime: "17:00", activity: "Async Comms & Status Updates", category: "admin", status: "pending", priority: "medium" },
        { startTime: "17:00", endTime: "17:30", activity: "Daily Review & Reflection Logging", category: "reflection", status: "pending", priority: "high" },
      ];
    } else if (type === "mindful") {
      presetItems = [
        { startTime: "07:30", endTime: "08:30", activity: "Morning Meditation, Journaling & Movement", category: "wellness", status: "pending", priority: "high" },
        { startTime: "08:30", endTime: "10:30", activity: "Single-Tasking Focus: Essential Project", category: "focus", status: "pending", priority: "high" },
        { startTime: "10:30", endTime: "11:00", activity: "Mindful Pause & Hydration", category: "break", status: "pending", priority: "low" },
        { startTime: "11:00", endTime: "12:30", activity: "Creative Exploration & Writing", category: "reflection", status: "pending", priority: "medium" },
        { startTime: "12:30", endTime: "13:30", activity: "Nourishing Lunch & Reading", category: "wellness", status: "pending", priority: "medium" },
        { startTime: "13:30", endTime: "16:00", activity: "Execution & Collaboration Sprint", category: "focus", status: "pending", priority: "medium" },
        { startTime: "16:00", endTime: "17:00", activity: "Evening Decompression & Synthesis", category: "reflection", status: "pending", priority: "high" },
      ];
    } else {
      presetItems = [
        { startTime: "09:00", endTime: "09:30", activity: "Daily Standup & Priorities Check", category: "meeting", status: "pending", priority: "medium" },
        { startTime: "09:30", endTime: "11:00", activity: "Individual Focus & Preparation", category: "focus", status: "pending", priority: "high" },
        { startTime: "11:00", endTime: "12:30", activity: "Stakeholder Review & Roadmap Sync", category: "meeting", status: "pending", priority: "high" },
        { startTime: "12:30", endTime: "13:30", activity: "Lunch Break", category: "break", status: "pending", priority: "low" },
        { startTime: "13:30", endTime: "15:30", activity: "Cross-functional Working Session", category: "meeting", status: "pending", priority: "high" },
        { startTime: "15:30", endTime: "17:00", activity: "Action Item Dispatch & Email Responses", category: "admin", status: "pending", priority: "medium" },
      ];
    }

    const updated: DailySchedule = {
      ...schedule,
      items: presetItems.map((item, idx) => ({
        ...item,
        id: createId(`slot_${idx}`),
      })),
      updatedAt: createTimestamp(),
    };
    persistSchedule(updated);
  };

  // Copy schedule as formatted Markdown table
  const handleCopyMarkdown = () => {
    if (!schedule) return;

    let md = `### Daily Schedule — ${schedule.date}\n`;
    if (schedule.goalOfTheDay) {
      md += `**Primary Focus:** ${schedule.goalOfTheDay}\n\n`;
    }
    md += `| Time Range | Status | Activity | Category | Priority | Notes |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    schedule.items.forEach((item) => {
      const statusIcon = item.status === "completed" ? "[x]" : "[ ]";
      md += `| ${item.startTime} - ${item.endTime} | ${statusIcon} ${item.status} | ${item.activity} | ${item.category} | ${item.priority || "normal"} | ${item.notes || "-"} |\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2500);
  };

  // Send schedule summary to Reflection Journal
  const handleSendToJournal = () => {
    if (!schedule || !onSendToReflection) return;

    const completed = schedule.items.filter((i) => i.status === "completed");
    const pending = schedule.items.filter((i) => i.status === "pending" || i.status === "in_progress");

    const promptText = `Here is my daily schedule for ${schedule.date}:
Focus of the Day: "${schedule.goalOfTheDay || "Unspecified"}"

Completed Items (${completed.length}/${schedule.items.length}):
${completed.map((i) => `- [${i.startTime}-${i.endTime}] ${i.activity} (${i.category})`).join("\n") || "None yet"}

Remaining/In Progress (${pending.length}):
${pending.map((i) => `- [${i.startTime}-${i.endTime}] ${i.activity} (${i.category})`).join("\n") || "None"}

Please provide a cognitive reflection and strategic review of this schedule:
1. Did the time allocation balance deep focus against administrative overhead?
2. What friction points or energy drains should I anticipate or resolve?
3. Synthesize 2 actionable takeaways for maintaining cognitive momentum.`;

    onSendToReflection(promptText);
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!schedule) return [];
    return schedule.items.filter((item) => {
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      return matchesCategory && matchesStatus;
    });
  }, [schedule, categoryFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!schedule || schedule.items.length === 0) {
      return { total: 0, completed: 0, percentage: 0, totalHours: 0 };
    }
    const total = schedule.items.length;
    const completed = schedule.items.filter((i) => i.status === "completed").length;
    const percentage = Math.round((completed / total) * 100);

    // Approximate total scheduled minutes
    let totalMinutes = 0;
    schedule.items.forEach((item) => {
      if (item.startTime && item.endTime) {
        const [h1, m1] = item.startTime.split(":").map(Number);
        const [h2, m2] = item.endTime.split(":").map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          const diff = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
          if (diff > 0) totalMinutes += diff;
        }
      }
    });

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    return { total, completed, percentage, totalHours };
  }, [schedule]);

  // Formatted date string for display
  const displayDate = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className={`flex flex-col h-full w-full bg-[#0c0c0d] text-[#e4e4e7] overflow-hidden ${isEmbedded ? "border-t border-[rgba(228,228,231,0.15)]" : ""}`}>
      {/* Header Bar */}
      <div className="border-b border-[rgba(228,228,231,0.1)] bg-[#141415] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        {/* Title & Date Selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#d4ff33] font-bold">
                OPERATIONAL TIMELINE
              </span>
              <span className="text-[rgba(228,228,231,0.3)]">•</span>
              <span className="font-mono text-[0.65rem] text-[rgba(228,228,231,0.6)] uppercase">
                {stats.completed}/{stats.total} COMPLETED ({stats.percentage}%)
              </span>
            </div>
            <h2 className="font-syne text-xl sm:text-2xl font-bold tracking-tight text-[#e4e4e7]">
              Daily Schedule Table
            </h2>
          </div>

          {/* Date Navigator Controls */}
          <div className="flex items-center gap-1.5 bg-[#18181b] p-1 border border-[rgba(228,228,231,0.15)] rounded">
            <button
              id="schedule-prev-day-btn"
              onClick={() => handleDateChange(-1)}
              title="Previous Day"
              className="p-1.5 text-[rgba(228,228,231,0.6)] hover:text-[#d4ff33] hover:bg-[#202024] rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2">
              <Calendar className="w-3.5 h-3.5 text-[#d4ff33]" />
              <span className="font-mono text-xs font-bold text-[#e4e4e7] min-w-[130px] text-center">
                {displayDate}
              </span>
              <input
                id="schedule-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-[rgba(228,228,231,0.4)] hover:text-[#e4e4e7] cursor-pointer text-xs w-5"
                title="Select Calendar Date"
              />
            </div>

            <button
              id="schedule-next-day-btn"
              onClick={() => handleDateChange(1)}
              title="Next Day"
              className="p-1.5 text-[rgba(228,228,231,0.6)] hover:text-[#d4ff33] hover:bg-[#202024] rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              id="schedule-today-btn"
              onClick={handleJumpToToday}
              className="px-2 py-1 text-[10px] font-mono uppercase bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] rounded transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Persistence status badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#18181b] border border-[rgba(228,228,231,0.1)] rounded font-mono text-[11px]">
            {saveStatus === "saving" && (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-400">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <div className="w-2 h-2 rounded-full bg-[#d4ff33]" />
                <span className="text-[rgba(228,228,231,0.6)]">Synced</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <AlertCircle className="w-3 h-3 text-red-400" />
                <span className="text-red-400">Sync Warning</span>
              </>
            )}
          </div>

          {/* Presets Dropdown */}
          <div className="relative group">
            <button
              id="schedule-presets-btn"
              className="px-3 py-1.5 bg-[#18181b] hover:bg-[#202024] text-[#e4e4e7] hover:text-[#d4ff33] border border-[rgba(228,228,231,0.2)] rounded font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-[#18181b] border border-[rgba(228,228,231,0.2)] rounded shadow-2xl py-1 min-w-[190px] z-50">
              <button
                onClick={() => handleApplyPreset("deep_work")}
                className="px-3 py-2 text-left font-sans text-xs hover:bg-[#27272a] hover:text-[#d4ff33] flex items-center justify-between"
              >
                <span>Deep Work Focus</span>
                <span className="font-mono text-[9px] text-[rgba(228,228,231,0.4)]">6 Blocks</span>
              </button>
              <button
                onClick={() => handleApplyPreset("mindful")}
                className="px-3 py-2 text-left font-sans text-xs hover:bg-[#27272a] hover:text-[#d4ff33] flex items-center justify-between"
              >
                <span>Mindful Balanced</span>
                <span className="font-mono text-[9px] text-[rgba(228,228,231,0.4)]">7 Blocks</span>
              </button>
              <button
                onClick={() => handleApplyPreset("meeting_heavy")}
                className="px-3 py-2 text-left font-sans text-xs hover:bg-[#27272a] hover:text-[#d4ff33] flex items-center justify-between"
              >
                <span>Collaborative Syncs</span>
                <span className="font-mono text-[9px] text-[rgba(228,228,231,0.4)]">6 Blocks</span>
              </button>
            </div>
          </div>

          {/* Sort Chronologically */}
          <button
            id="schedule-sort-btn"
            onClick={handleSortChronologically}
            title="Sort time blocks chronologically"
            className="p-1.5 bg-[#18181b] hover:bg-[#202024] text-[rgba(228,228,231,0.6)] hover:text-[#d4ff33] border border-[rgba(228,228,231,0.2)] rounded transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          {/* Copy Markdown Table */}
          <button
            id="schedule-copy-markdown-btn"
            onClick={handleCopyMarkdown}
            title="Copy schedule as Markdown table"
            className="px-3 py-1.5 bg-[#18181b] hover:bg-[#202024] text-[#e4e4e7] hover:text-[#d4ff33] border border-[rgba(228,228,231,0.2)] rounded font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-[#d4ff33]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMarkdown ? "Copied" : "Markdown"}</span>
          </button>

          {/* Confirm Mode Preference Toggle */}
          <button
            id="schedule-confirm-mode-toggle-btn"
            type="button"
            onClick={() => setOpenModalDirectlyOnAdd((prev) => !prev)}
            title={openModalDirectlyOnAdd ? "Click to use quick Toast notification when adding blocks" : "Click to open full Confirmation Dialog immediately when adding blocks"}
            className="px-2.5 py-1.5 bg-[#18181b] hover:bg-[#202024] text-[rgba(228,228,231,0.7)] hover:text-[#d4ff33] border border-[rgba(228,228,231,0.2)] rounded font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <div className={`w-2 h-2 rounded-full ${openModalDirectlyOnAdd ? "bg-[#d4ff33]" : "bg-[rgba(228,228,231,0.3)]"}`} />
            <span>{openModalDirectlyOnAdd ? "Dialog on Add" : "Toast on Add"}</span>
          </button>

          {/* Send to Reflection Journal */}
          {onSendToReflection && (
            <button
              id="schedule-reflect-btn"
              onClick={handleSendToJournal}
              title="Bridge schedule into Aether Reflection Journal"
              className="px-3 py-1.5 bg-[#202024] hover:bg-[#27272a] text-[#d4ff33] border border-[#d4ff33]/40 rounded font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reflect on Day</span>
            </button>
          )}

          {/* Close button if presented as a modal/panel */}
          {onClose && (
            <button
              id="schedule-close-btn"
              onClick={onClose}
              className="p-1.5 text-[rgba(228,228,231,0.5)] hover:text-white hover:bg-[#202024] rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Daily Goal & Progress Banner */}
      <div className="px-6 py-3 bg-[#111112] border-b border-[rgba(228,228,231,0.08)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Goal of the Day Input */}
        <div className="flex-1 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#d4ff33] font-bold shrink-0">
            DAILY FOCUS //
          </span>
          <input
            id="schedule-daily-goal-input"
            type="text"
            placeholder="What is your primary anchor or mission for today? (e.g., Ship core features without distractions)"
            value={schedule?.goalOfTheDay || ""}
            onChange={(e) => {
              if (!schedule) return;
              const updated = { ...schedule, goalOfTheDay: e.target.value };
              persistSchedule(updated);
            }}
            className="w-full bg-transparent border-b border-[rgba(228,228,231,0.15)] focus:border-[#d4ff33] text-sm text-[#e4e4e7] placeholder-[rgba(228,228,231,0.3)] py-1 outline-none font-sans transition-colors"
          />
        </div>

        {/* Mini Completion Progress Bar */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-32 h-2 bg-[#202024] rounded-full overflow-hidden border border-[rgba(228,228,231,0.1)]">
            <div
              className="h-full bg-[#d4ff33] transition-all duration-300"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <span className="font-mono text-xs text-[#e4e4e7] font-bold">
            {stats.totalHours}h scheduled
          </span>
        </div>
      </div>

      {/* Filter Chips Toolbar */}
      <div className="px-6 py-2 bg-[#0c0c0d] border-b border-[rgba(228,228,231,0.06)] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[10px] text-[rgba(228,228,231,0.4)] uppercase mr-1">
            Category:
          </span>
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
              categoryFilter === "all"
                ? "bg-[#d4ff33] text-[#0c0c0d] font-bold"
                : "bg-[#18181b] text-[rgba(228,228,231,0.6)] hover:text-white"
            }`}
          >
            All ({schedule?.items.length || 0})
          </button>
          {(Object.keys(CATEGORY_CONFIG) as ScheduleCategory[]).map((cat) => {
            const count = schedule?.items.filter((i) => i.category === cat).length || 0;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                  categoryFilter === cat
                    ? "bg-[#d4ff33] text-[#0c0c0d] font-bold"
                    : "bg-[#18181b] text-[rgba(228,228,231,0.6)] hover:text-white"
                }`}
              >
                {CATEGORY_CONFIG[cat].label} ({count})
              </button>
            );
          })}
        </div>

        {/* Add Time Block Primary Button */}
        <button
          id="add-time-block-btn"
          onClick={handleAddItem}
          className="px-3.5 py-1.5 bg-[#d4ff33] hover:bg-[#e2ff66] text-[#0c0c0d] font-syne font-bold text-xs uppercase tracking-wider rounded flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Time Block</span>
        </button>
      </div>

      {/* Main Schedule Table Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scroll">
        {filteredItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[rgba(228,228,231,0.15)] rounded-lg">
            <Clock className="w-8 h-8 text-[rgba(228,228,231,0.3)] mb-3" />
            <h3 className="font-syne text-lg font-bold text-[#e4e4e7] mb-1">
              No Scheduled Time Blocks
            </h3>
            <p className="text-xs text-[rgba(228,228,231,0.5)] max-w-sm mb-4 font-sans">
              Plan your hours with intentional focus blocks. Start from scratch or load a preset routine.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-[#d4ff33] text-[#0c0c0d] font-syne font-bold text-xs uppercase tracking-wider rounded"
              >
                Add First Block
              </button>
              <button
                onClick={() => handleApplyPreset("deep_work")}
                className="px-4 py-2 bg-[#18181b] border border-[rgba(228,228,231,0.2)] text-[#e4e4e7] hover:text-[#d4ff33] font-mono text-xs uppercase rounded"
              >
                Load Deep Work Preset
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-[rgba(228,228,231,0.15)] rounded-lg overflow-hidden bg-[#141415] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[rgba(228,228,231,0.15)] bg-[#18181b] text-[10px] font-mono uppercase tracking-wider text-[rgba(228,228,231,0.5)]">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4 w-36">Time Window</th>
                    <th className="py-3 px-4 w-36">Status</th>
                    <th className="py-3 px-4">Activity & Objective</th>
                    <th className="py-3 px-4 w-36">Category</th>
                    <th className="py-3 px-4 w-28">Priority</th>
                    <th className="py-3 px-4 w-32 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(228,228,231,0.08)]">
                  {filteredItems.map((item, index) => {
                    const statusObj = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusObj.icon;
                    const catObj = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.focus;
                    const isCompleted = item.status === "completed";
                    const isNotesExpanded = expandedNotesId === item.id;

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          id={`schedule-row-${item.id}`}
                          className={`hover:bg-[#18181b]/60 transition-colors group ${
                            isCompleted ? "bg-[#141415]/50" : ""
                          }`}
                        >
                          {/* Sequence index & reorder */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <button
                                onClick={() => handleMoveItem(index, "up")}
                                disabled={index === 0}
                                title="Move up"
                                className="text-[rgba(228,228,231,0.3)] hover:text-[#d4ff33] disabled:opacity-20 disabled:hover:text-[rgba(228,228,231,0.3)] cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <span className="font-mono text-[10px] text-[rgba(228,228,231,0.4)]">
                                {index + 1}
                              </span>
                              <button
                                onClick={() => handleMoveItem(index, "down")}
                                disabled={index === filteredItems.length - 1}
                                title="Move down"
                                className="text-[rgba(228,228,231,0.3)] hover:text-[#d4ff33] disabled:opacity-20 disabled:hover:text-[rgba(228,228,231,0.3)] cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Time Range Inputs */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <input
                                id={`item-start-${item.id}`}
                                type="time"
                                value={item.startTime}
                                onChange={(e) => handleUpdateItem(item.id, { startTime: e.target.value })}
                                className="bg-[#18181b] border border-[rgba(228,228,231,0.15)] focus:border-[#d4ff33] px-1.5 py-1 rounded text-xs text-[#e4e4e7] outline-none cursor-pointer"
                              />
                              <span className="text-[rgba(228,228,231,0.3)]">-</span>
                              <input
                                id={`item-end-${item.id}`}
                                type="time"
                                value={item.endTime}
                                onChange={(e) => handleUpdateItem(item.id, { endTime: e.target.value })}
                                className="bg-[#18181b] border border-[rgba(228,228,231,0.15)] focus:border-[#d4ff33] px-1.5 py-1 rounded text-xs text-[#e4e4e7] outline-none cursor-pointer"
                              />
                            </div>
                          </td>

                          {/* Status Clickable Pill */}
                          <td className="py-3.5 px-4">
                            <button
                              id={`item-status-btn-${item.id}`}
                              onClick={() => handleCycleStatus(item.id, item.status)}
                              title="Click to advance status"
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border border-[rgba(228,228,231,0.15)] hover:border-[#d4ff33] bg-[#18181b] transition-all cursor-pointer font-mono text-[11px] ${statusObj.color}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{statusObj.label}</span>
                            </button>
                          </td>

                          {/* Activity Description */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <input
                                id={`item-activity-input-${item.id}`}
                                type="text"
                                value={item.activity}
                                onChange={(e) => handleUpdateItem(item.id, { activity: e.target.value })}
                                placeholder="Activity description..."
                                className={`w-full bg-transparent border-b border-transparent hover:border-[rgba(228,228,231,0.2)] focus:border-[#d4ff33] outline-none text-sm font-sans py-0.5 transition-colors ${
                                  isCompleted ? "line-through text-[rgba(228,228,231,0.5)]" : "text-[#e4e4e7]"
                                }`}
                              />
                              {/* Subtitle / Notes preview or toggle */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setExpandedNotesId(isNotesExpanded ? null : item.id)}
                                  className="text-[10px] font-mono text-[rgba(228,228,231,0.4)] hover:text-[#d4ff33] flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-2.5 h-2.5" />
                                  <span>{item.notes ? "Edit Notes" : "+ Add Note"}</span>
                                </button>
                                {item.notes && !isNotesExpanded && (
                                  <span className="text-[11px] text-[rgba(228,228,231,0.4)] truncate max-w-xs font-sans">
                                    — {item.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category Selector */}
                          <td className="py-3.5 px-4">
                            <select
                              id={`item-category-${item.id}`}
                              value={item.category}
                              onChange={(e) => handleUpdateItem(item.id, { category: e.target.value as ScheduleCategory })}
                              className={`bg-[#18181b] border ${catObj.border} text-xs font-mono px-2 py-1 rounded outline-none cursor-pointer`}
                              style={{ color: catObj.color }}
                            >
                              <option value="focus">Focus</option>
                              <option value="meeting">Meeting</option>
                              <option value="reflection">Reflection</option>
                              <option value="wellness">Wellness</option>
                              <option value="admin">Admin</option>
                              <option value="break">Break</option>
                            </select>
                          </td>

                          {/* Priority Pill */}
                          <td className="py-3.5 px-4">
                            <select
                              id={`item-priority-${item.id}`}
                              value={item.priority || "medium"}
                              onChange={(e) => handleUpdateItem(item.id, { priority: e.target.value as SchedulePriority })}
                              className="bg-[#18181b] border border-[rgba(228,228,231,0.15)] text-[10px] font-mono uppercase px-2 py-1 rounded text-[#e4e4e7] outline-none cursor-pointer"
                            >
                              <option value="high">High</option>
                              <option value="medium">Normal</option>
                              <option value="low">Low</option>
                            </select>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Quick Complete Toggle */}
                              <button
                                id={`item-toggle-complete-${item.id}`}
                                onClick={() => handleUpdateItem(item.id, { status: isCompleted ? "pending" : "completed" })}
                                title={isCompleted ? "Mark as pending" : "Mark as completed"}
                                className={`p-1.5 rounded transition-colors ${
                                  isCompleted
                                    ? "text-[#d4ff33] hover:bg-[#d4ff33]/10"
                                    : "text-[rgba(228,228,231,0.4)] hover:text-[#d4ff33] hover:bg-[#18181b]"
                                }`}
                              >
                                <Check className="w-4 h-4" />
                              </button>

                              {/* Delete Block */}
                              <button
                                id={`item-delete-btn-${item.id}`}
                                onClick={() => handleDeleteItem(item.id)}
                                title="Delete time block"
                                className="p-1.5 text-[rgba(228,228,231,0.4)] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Notes Row */}
                        {isNotesExpanded && (
                          <tr className="bg-[#111112]">
                            <td colSpan={7} className="px-6 py-3 border-b border-[rgba(228,228,231,0.06)]">
                              <div className="flex items-start gap-3">
                                <span className="font-mono text-[10px] uppercase text-[rgba(228,228,231,0.4)] mt-1.5">
                                  Notes:
                                </span>
                                <textarea
                                  id={`item-notes-textarea-${item.id}`}
                                  value={item.notes || ""}
                                  onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                                  placeholder="Specific goals, meeting links, or prep checklist for this block..."
                                  rows={2}
                                  className="w-full bg-[#18181b] border border-[rgba(228,228,231,0.15)] focus:border-[#d4ff33] rounded p-2 text-xs text-[#e4e4e7] placeholder-[rgba(228,228,231,0.3)] font-sans outline-none resize-y"
                                />
                                <button
                                  onClick={() => setExpandedNotesId(null)}
                                  className="p-1 text-[rgba(228,228,231,0.4)] hover:text-white"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-4 bg-[#18181b] border-t border-[rgba(228,228,231,0.1)] flex items-center justify-between flex-wrap gap-3 font-mono text-xs text-[rgba(228,228,231,0.6)]">
              <div className="flex items-center gap-4">
                <span>Total Items: <strong className="text-[#e4e4e7]">{stats.total}</strong></span>
                <span>•</span>
                <span>Completed: <strong className="text-[#d4ff33]">{stats.completed}</strong></span>
                <span>•</span>
                <span>Pending: <strong className="text-amber-400">{stats.total - stats.completed}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddItem}
                  className="text-xs text-[#d4ff33] hover:underline flex items-center gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Row</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification on New Time Block Added */}
      <ScheduleBlockToast
        toastData={scheduleToastData}
        onDismiss={() => setScheduleToastData(null)}
        onOpenDetails={handleOpenToastDetails}
        onUndo={handleUndo}
        autoDismissMs={5000}
      />

      {/* Confirmation Dialog on New Time Block Added */}
      <ScheduleBlockConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        blockData={confirmationModalBlock}
        userId={user?.uid}
        onUpdateBlock={handleModalUpdateBlock}
      />
    </div>
  );
}
