"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { JournalInteraction, JournalMessage, ReflectionMode, LocationPin } from "@/types/journal";
import { HistorySidebar } from "./HistorySidebar";
import { ReflectionEditor } from "./ReflectionEditor";
import { LocationsExplorerModal } from "./maps/LocationsExplorerModal";
import { SaveConfirmationToast, SaveToastData } from "./SaveConfirmationToast";
import { SaveConfirmationModal } from "./SaveConfirmationModal";
import { DailyScheduleSection } from "./DailyScheduleSection";
import { sanitizeForFirestore } from "@/lib/sanitize";
import { createId, createTimestamp } from "@/lib/id";
import { stripHtml } from "@/lib/htmlUtils";

export function DashboardView() {
  const { user, signOut } = useAuth();
  const [entries, setEntries] = useState<JournalInteraction[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [draftEntry, setDraftEntry] = useState<JournalInteraction | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [activeView, setActiveView] = useState<"reflection" | "schedule">("reflection");
  
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [lastError, setLastError] = useState<string | null>(null);

  // Persistence confirmation feedback state
  const [saveToastData, setSaveToastData] = useState<SaveToastData | null>(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  const triggerSaveToast = useCallback((info: {
    entryId: string;
    title: string;
    messageCount: number;
    actionType?: SaveToastData["actionType"];
  }) => {
    if (!user?.uid) return;
    setSaveToastData({
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entryId: info.entryId,
      title: info.title || "Untitled Reflection",
      timestamp: Date.now(),
      messageCount: info.messageCount,
      collectionPath: `/users/${user.uid}/interactions/${info.entryId}`,
      actionType: info.actionType || "entry_saved",
    });
  }, [user]);

  // Keyboard shortcut listener: Cmd/Ctrl + B or Esc to manage sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if (e.key === "Escape" && isSidebarOpen && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  // Keep a ref to the latest retry action if an operation failed
  const retryActionRef = useRef<(() => void) | null>(null);
  const handleSendMessageRef = useRef<((userPrompt: string, mode: ReflectionMode) => Promise<boolean>) | null>(null);

  // 1. Listen to Firestore real-time collection for current user: users/{userId}/interactions
  useEffect(() => {
    if (!user?.uid) return;

    const userInteractionsRef = collection(db, "users", user.uid, "interactions");
    const q = query(userInteractionsRef, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: JournalInteraction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const nowTs = createTimestamp();
          items.push({
            id: docSnap.id,
            userId: user.uid,
            title: data.title || "Untitled Reflection",
            category: data.category || "General",
            mood: data.mood || "Neutral",
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || nowTs),
            updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || nowTs),
            messages: Array.isArray(data.messages) ? data.messages : [],
            summary: data.summary,
            keyTakeaways: data.keyTakeaways,
            actionItems: data.actionItems,
          });
        });

        setEntries(items);
        setSaveStatus("saved");

        // If no active entry is selected or current active entry was deleted, select first available
        if (items.length > 0) {
          setActiveEntryId((prev) => {
            if (!prev || !items.some((e) => e.id === prev)) {
              return items[0].id;
            }
            return prev;
          });
        }
      },
      (err) => {
        console.error("Firestore sync error:", err);
        setSaveStatus("error");
        setLastError("Permission or network error when loading journal entries.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Derive activeEntry cleanly from entries or draft
  const activeEntry: JournalInteraction | null = useMemo(() => {
    if (draftEntry && draftEntry.id === activeEntryId) {
      return draftEntry;
    }
    if (activeEntryId) {
      return entries.find((e) => e.id === activeEntryId) || null;
    }
    return entries[0] || null;
  }, [activeEntryId, entries, draftEntry]);

  // 2. Create a new reflection session
  const handleNewEntry = useCallback(() => {
    if (!user?.uid) return;
    const now = createTimestamp();
    const newId = createId("entry");
    const newInteraction: JournalInteraction = {
      id: newId,
      userId: user.uid,
      title: "New Reflection",
      category: "Personal",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    setDraftEntry(newInteraction);
    setActiveEntryId(newId);
    setActiveView("reflection");
    setLastError(null);
  }, [user]);

  // 3. Delete an entry from Firestore
  const handleDeleteEntry = async (id: string) => {
    if (!user?.uid) return;
    try {
      setSaveStatus("saving");
      const docRef = doc(db, "users", user.uid, "interactions", id);
      await deleteDoc(docRef);
      setSaveStatus("saved");
      if (activeEntryId === id) {
        setDraftEntry(null);
        const remaining = entries.filter((e) => e.id !== id);
        if (remaining.length > 0) {
          setActiveEntryId(remaining[0].id);
        } else {
          setActiveEntryId(null);
        }
      }
    } catch (err: unknown) {
      console.error("Delete error:", err);
      setSaveStatus("error");
      setLastError("Failed to delete journal entry.");
    }
  };

  // 4. Update entry title in Firestore
  const handleUpdateTitle = async (newTitle: string) => {
    if (!user?.uid || !activeEntry) return;
    const now = createTimestamp();
    const updated: JournalInteraction = {
      ...activeEntry,
      title: newTitle,
      updatedAt: now,
    };
    setDraftEntry(updated);

    try {
      setSaveStatus("saving");
      const docRef = doc(db, "users", user.uid, "interactions", updated.id);
      const cleanData = sanitizeForFirestore({
        ...updated,
        updatedAt: serverTimestamp(),
      });
      await setDoc(docRef, cleanData, { merge: true });
      setSaveStatus("saved");
      triggerSaveToast({
        entryId: updated.id,
        title: newTitle,
        messageCount: updated.messages.length,
        actionType: "title_updated",
      });
    } catch (err) {
      console.error("Title update error:", err);
      setSaveStatus("error");
      setLastError("Failed to save title update.");
    }
  };

  // 4b. Update entry location in Firestore
  const handleUpdateLocation = async (location: LocationPin | null) => {
    if (!user?.uid) return;
    const now = createTimestamp();

    // Ensure we have an active container
    let current = activeEntry;
    if (!current) {
      const newId = createId("entry");
      current = {
        id: newId,
        userId: user.uid,
        title: "New Reflection",
        category: "Personal",
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      setActiveEntryId(newId);
    }

    const updated: JournalInteraction = {
      ...current,
      location: location || undefined,
      updatedAt: now,
    };
    setDraftEntry(updated);

    try {
      setSaveStatus("saving");
      const docRef = doc(db, "users", user.uid, "interactions", current.id);
      
      const payloadToSanitize = {
        ...updated,
        location: location || null,
        updatedAt: serverTimestamp(),
      };
      const cleanData = sanitizeForFirestore(payloadToSanitize);
      
      await setDoc(docRef, cleanData, { merge: true });
      setSaveStatus("saved");
      triggerSaveToast({
        entryId: current.id,
        title: updated.title,
        messageCount: updated.messages.length,
        actionType: "location_pinned",
      });
    } catch (err) {
      console.error("Location update error:", err);
      setSaveStatus("error");
      setLastError("Failed to save location to journal entry.");
    }
  };

  // 4c. Explicit Manual Save
  const handleManualSave = async () => {
    if (!user?.uid || !activeEntry) return;
    try {
      setSaveStatus("saving");
      const now = createTimestamp();
      const updated: JournalInteraction = {
        ...activeEntry,
        updatedAt: now,
      };
      const docRef = doc(db, "users", user.uid, "interactions", updated.id);
      const cleanData = sanitizeForFirestore({
        ...updated,
        updatedAt: serverTimestamp(),
      });
      await setDoc(docRef, cleanData, { merge: true });
      setSaveStatus("saved");
      triggerSaveToast({
        entryId: updated.id,
        title: updated.title,
        messageCount: updated.messages.length,
        actionType: "entry_saved",
      });
    } catch (err) {
      console.error("Manual save error:", err);
      setSaveStatus("error");
      setLastError("Failed to save journal entry to Firestore.");
    }
  };

  // 5. Send message turn to Gemini & Save interaction to Firestore
  const handleSendMessage = useCallback(async (userPrompt: string, mode: ReflectionMode): Promise<boolean> => {
    if (!user?.uid) return false;

    setLastError(null);
    setIsLoadingAI(true);
    setSaveStatus("saving");

    const now = createTimestamp();

    // Ensure we have an active interaction container
    let current = activeEntry;
    if (!current) {
      const newId = createId("entry");
      current = {
        id: newId,
        userId: user.uid,
        title: "New Reflection",
        category: "Personal",
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      setActiveEntryId(newId);
    }

    const userMessage: JournalMessage = {
      id: createId("msg_u"),
      role: "user",
      content: userPrompt,
      timestamp: now,
      mode,
    };

    const intermediateMessages = [...current.messages, userMessage];
    const intermediateInteraction: JournalInteraction = {
      ...current,
      messages: intermediateMessages,
      updatedAt: now,
    };

    // Optimistically update UI
    setDraftEntry(intermediateInteraction);

    // Save user message immediately to Firestore (Guaranteed Input-to-Save Completeness)
    const docRef = doc(db, "users", user.uid, "interactions", current.id);
    try {
      const cleanIntermediate = sanitizeForFirestore({
        ...intermediateInteraction,
        updatedAt: serverTimestamp(),
      });
      await setDoc(docRef, cleanIntermediate, { merge: true });
    } catch (dbErr) {
      console.error("Initial write failure:", dbErr);
      setSaveStatus("error");
      setLastError("Could not save your entry to Firestore. Please check your connection.");
      setIsLoadingAI(false);
      
      retryActionRef.current = () => handleSendMessageRef.current?.(userPrompt, mode);
      return false;
    }

    // Call Gemini API Route
    try {
      const plainPrompt = stripHtml(userPrompt) || userPrompt;
      const contextHistory = current.messages.map((m) => ({
        role: m.role,
        content: stripHtml(m.content) || m.content,
      }));

      const isFirstTurn = current.messages.length === 0 || current.title === "New Reflection";

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: plainPrompt,
          mode,
          contextHistory,
          generateTitle: isFirstTurn,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.reply || "I am reflecting on what you shared.";
      const replyTs = createTimestamp();

      const aiMessage: JournalMessage = {
        id: createId("msg_m"),
        role: "model",
        content: aiReply,
        timestamp: replyTs,
      };

      const finalMessages = [...intermediateMessages, aiMessage];
      let finalTitle = current.title;

      // Use generated title from server response if available
      if (data.title && typeof data.title === "string") {
        finalTitle = data.title;
      } else if (isFirstTurn && (current.title === "New Reflection" || !current.title)) {
        // Derivation fallback: clean 4-6 word excerpt
        const cleanSnippet = plainPrompt.split("\n")[0].trim().slice(0, 40);
        finalTitle = cleanSnippet ? (cleanSnippet.length >= 40 ? cleanSnippet + "..." : cleanSnippet) : "Personal Reflection";
      }

      const finalInteraction: JournalInteraction = {
        ...intermediateInteraction,
        title: finalTitle,
        messages: finalMessages,
        updatedAt: replyTs,
      };

      // Persist complete session with AI response to Firestore
      const cleanFinal = sanitizeForFirestore({
        ...finalInteraction,
        updatedAt: serverTimestamp(),
      });
      await setDoc(docRef, cleanFinal, { merge: true });

      setDraftEntry(finalInteraction);
      setSaveStatus("saved");
      setIsLoadingAI(false);
      triggerSaveToast({
        entryId: current.id,
        title: finalTitle,
        messageCount: finalMessages.length,
        actionType: "reflection_generated",
      });
      return true;
    } catch (apiErr: unknown) {
      console.error("Gemini reflection error:", apiErr);
      let msg = "Error generating AI reflection";
      if (apiErr instanceof Error) {
        if (apiErr.name === "AbortError") {
          msg = "Request timed out. Please try again.";
        } else {
          msg = apiErr.message;
        }
      }
      setSaveStatus("error");
      setLastError(msg);
      setIsLoadingAI(false);

      retryActionRef.current = () => handleSendMessageRef.current?.(userPrompt, mode);
      return false;
    }
  }, [user, activeEntry, triggerSaveToast]);

  // Save rich formatted journal entry directly without AI query
  const handleSaveEntryOnly = useCallback(async (content: string): Promise<boolean> => {
    if (!user?.uid) return false;
    setLastError(null);
    setSaveStatus("saving");
    const now = createTimestamp();

    let current = activeEntry;
    if (!current) {
      const newId = createId("entry");
      const plain = stripHtml(content);
      const cleanSnippet = plain.split("\n")[0].trim().slice(0, 40);
      current = {
        id: newId,
        userId: user.uid,
        title: cleanSnippet ? (cleanSnippet.length >= 40 ? cleanSnippet + "..." : cleanSnippet) : "Personal Reflection",
        category: "Personal",
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      setActiveEntryId(newId);
    }

    const userMessage: JournalMessage = {
      id: createId("msg_u"),
      role: "user",
      content,
      timestamp: now,
    };

    const updatedMessages = [...current.messages, userMessage];
    const updatedInteraction: JournalInteraction = {
      ...current,
      messages: updatedMessages,
      updatedAt: now,
    };

    setDraftEntry(updatedInteraction);
    const docRef = doc(db, "users", user.uid, "interactions", current.id);
    try {
      const clean = sanitizeForFirestore({
        ...updatedInteraction,
        updatedAt: serverTimestamp(),
      });
      await setDoc(docRef, clean, { merge: true });
      setSaveStatus("saved");
      triggerSaveToast({
        entryId: current.id,
        title: updatedInteraction.title,
        messageCount: updatedMessages.length,
        actionType: "entry_saved",
      });
      return true;
    } catch (dbErr) {
      console.error("Save entry failure:", dbErr);
      setSaveStatus("error");
      setLastError("Could not save your entry to Firestore.");
      return false;
    }
  }, [user, activeEntry, triggerSaveToast]);

  // Update existing message in Firestore
  const handleUpdateMessage = useCallback(async (messageId: string, updatedContent: string): Promise<void> => {
    if (!user?.uid || !activeEntry) return;
    setSaveStatus("saving");
    const now = createTimestamp();
    const updatedMessages = activeEntry.messages.map((m) =>
      m.id === messageId ? { ...m, content: updatedContent } : m
    );
    const updatedInteraction: JournalInteraction = {
      ...activeEntry,
      messages: updatedMessages,
      updatedAt: now,
    };
    setDraftEntry(updatedInteraction);
    const docRef = doc(db, "users", user.uid, "interactions", activeEntry.id);
    try {
      const clean = sanitizeForFirestore({
        ...updatedInteraction,
        updatedAt: serverTimestamp(),
      });
      await setDoc(docRef, clean, { merge: true });
      setSaveStatus("saved");
      triggerSaveToast({
        entryId: activeEntry.id,
        title: activeEntry.title,
        messageCount: updatedMessages.length,
        actionType: "entry_saved",
      });
    } catch (err) {
      console.error("Update message error:", err);
      setSaveStatus("error");
      setLastError("Failed to update journal entry in Firestore.");
    }
  }, [user, activeEntry, triggerSaveToast]);

  // Delete individual message from Firestore
  const handleDeleteMessage = useCallback(async (messageId: string): Promise<void> => {
    if (!user?.uid || !activeEntry) return;
    setSaveStatus("saving");
    const now = createTimestamp();
    const updatedMessages = activeEntry.messages.filter((m) => m.id !== messageId);
    const updatedInteraction: JournalInteraction = {
      ...activeEntry,
      messages: updatedMessages,
      updatedAt: now,
    };
    setDraftEntry(updatedInteraction);
    const docRef = doc(db, "users", user.uid, "interactions", activeEntry.id);
    try {
      const clean = sanitizeForFirestore({
        ...updatedInteraction,
        updatedAt: serverTimestamp(),
      });
      await setDoc(docRef, clean, { merge: true });
      setSaveStatus("saved");
      triggerSaveToast({
        entryId: activeEntry.id,
        title: activeEntry.title,
        messageCount: updatedMessages.length,
        actionType: "entry_saved",
      });
    } catch (err) {
      console.error("Delete message error:", err);
      setSaveStatus("error");
      setLastError("Failed to delete journal entry from Firestore.");
    }
  }, [user, activeEntry, triggerSaveToast]);

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const handleRetry = () => {
    if (retryActionRef.current) {
      const action = retryActionRef.current;
      retryActionRef.current = null;
      action();
    } else {
      setLastError(null);
    }
  };

  // 6. Create a reflection session pre-populated from Daily Schedule
  const handleNewEntryWithPrompt = useCallback(
    (initialPrompt: string) => {
      if (!user?.uid) return;
      const now = createTimestamp();
      const newId = createId("entry");
      const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const newInteraction: JournalInteraction = {
        id: newId,
        userId: user.uid,
        title: `Schedule Reflection — ${todayStr}`,
        category: "Planning",
        createdAt: now,
        updatedAt: now,
        messages: [],
      };

      setDraftEntry(newInteraction);
      setActiveEntryId(newId);
      setActiveView("reflection");
      setLastError(null);

      // Trigger automatic synthesis turn
      setTimeout(() => {
        handleSendMessage(initialPrompt, "reflect");
      }, 150);
    },
    [user, handleSendMessage]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0c0c0d] text-[#e4e4e7]">
      {/* History Sidebar */}
      <HistorySidebar
        entries={entries}
        activeEntryId={activeEntryId}
        onSelectEntry={(id) => {
          setActiveEntryId(id);
          setActiveView("reflection");
          setLastError(null);
        }}
        onNewEntry={handleNewEntry}
        onDeleteEntry={handleDeleteEntry}
        onOpenExplorer={() => setIsExplorerOpen(true)}
        onOpenSchedule={() => setActiveView("schedule")}
        activeView={activeView}
        user={user}
        onSignOut={signOut}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area: Daily Schedule vs Reflection Editor */}
      {activeView === "schedule" ? (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <DailyScheduleSection
            user={user}
            onSendToReflection={handleNewEntryWithPrompt}
            onClose={() => setActiveView("reflection")}
          />
        </div>
      ) : (
        <ReflectionEditor
          interaction={activeEntry}
          onSendMessage={handleSendMessage}
          onSaveEntryOnly={handleSaveEntryOnly}
          onUpdateMessage={handleUpdateMessage}
          onDeleteMessage={handleDeleteMessage}
          onUpdateTitle={handleUpdateTitle}
          onUpdateLocation={handleUpdateLocation}
          onManualSave={handleManualSave}
          onOpenSaveConfirmation={() => setIsConfirmationModalOpen(true)}
          onOpenSchedule={() => setActiveView("schedule")}
          isLoading={isLoadingAI}
          saveStatus={saveStatus}
          lastError={lastError}
          onRetry={handleRetry}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />
      )}

      {/* Interactive Places Explorer Map Modal */}
      <LocationsExplorerModal
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
        entries={entries}
        onSelectEntry={(id) => {
          setActiveEntryId(id);
          setActiveView("reflection");
          setIsExplorerOpen(false);
        }}
      />

      {/* Toast Notification for Firestore Persistence */}
      <SaveConfirmationToast
        toastData={saveToastData}
        onDismiss={() => setSaveToastData(null)}
        onOpenDetails={() => setIsConfirmationModalOpen(true)}
      />

      {/* Full Confirmation Dialog for Firestore Persistence */}
      <SaveConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        toastData={saveToastData}
        activeEntry={activeEntry}
        userId={user?.uid}
      />
    </div>
  );
}
