"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  BookOpen, 
  Trash2, 
  X,
  MapPin
} from "lucide-react";
import { JournalInteraction } from "@/types/journal";
import { User } from "firebase/auth";

interface HistorySidebarProps {
  entries: JournalInteraction[];
  activeEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onNewEntry: () => void;
  onDeleteEntry: (id: string) => void;
  onOpenExplorer?: () => void;
  user: User | null;
  onSignOut: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function HistorySidebar({
  entries,
  activeEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  onOpenExplorer,
  user,
  onSignOut,
  isOpen,
  onClose,
}: HistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const pinnedLocationsCount = entries.filter((e) => Boolean(e.location)).length;

  const filteredEntries = entries.filter((entry) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const titleMatch = entry.title.toLowerCase().includes(query);
    const locationMatch = entry.location ? (
      entry.location.name.toLowerCase().includes(query) ||
      entry.location.formattedAddress.toLowerCase().includes(query) ||
      (entry.location.userNotes && entry.location.userNotes.toLowerCase().includes(query))
    ) : false;
    const contentMatch = entry.messages.some((m) => 
      m.content.toLowerCase().includes(query)
    );
    return titleMatch || locationMatch || contentMatch;
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEntryToDelete(id);
  };

  const executeDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteEntry(id);
    setEntryToDelete(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEntryToDelete(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={onClose}
          className="fixed inset-0 bg-[#0c0c0d]/80 backdrop-blur-sm z-30 lg:hidden transition-opacity"
        />
      )}

      <aside
        id="journal-history-sidebar"
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 flex flex-col bg-gradient-to-b from-[#141415] to-[#0c0c0d] transition-all duration-300 ease-in-out ${
          isOpen
            ? "w-[300px] translate-x-0 border-r-[1.5px] border-[#e4e4e7] opacity-100 shrink-0"
            : "w-0 -translate-x-full lg:translate-x-0 lg:w-0 border-r-0 opacity-0 pointer-events-none overflow-hidden"
        }`}
      >
        <div className="w-[300px] flex flex-col h-full shrink-0">
          {/* Brand Header */}
          <div className="p-8 border-b-[1.5px] border-[#e4e4e7] flex items-start justify-between">
            <div>
              <h1 className="font-syne font-extrabold text-[2rem] tracking-[-0.04em] leading-[0.9] text-[#e4e4e7] uppercase">
                Aether
              </h1>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[rgba(228,228,231,0.5)] mt-2 block">
                Intelligent Reflections
              </span>
            </div>

            <button
              id="close-sidebar-btn"
              onClick={onClose}
              aria-label="Close sidebar"
              title="Close sidebar"
              className="p-1.5 text-[rgba(228,228,231,0.5)] hover:text-[#d4ff33] hover:bg-[#18181b] rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scroll">
          {/* New Reflection & Places Explorer CTA Group */}
          <div className="space-y-2 mb-8">
            <button
              id="new-reflection-btn"
              onClick={() => {
                onNewEntry();
                if (window.innerWidth < 1024) onClose();
              }}
              className="w-full p-3.5 bg-[#d4ff33] hover:bg-[#e2ff66] active:scale-[0.99] text-[#0c0c0d] font-syne font-bold uppercase tracking-wider text-xs border-none cursor-pointer flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4 text-[#0c0c0d] stroke-[3]" />
              <span>New Reflection</span>
            </button>

            {onOpenExplorer && (
              <button
                id="open-places-explorer-btn"
                onClick={() => {
                  onOpenExplorer();
                  if (window.innerWidth < 1024) onClose();
                }}
                className="w-full p-2.5 bg-[#18181b] hover:bg-[#202024] hover:border-[#d4ff33] text-[#e4e4e7] hover:text-[#d4ff33] font-mono uppercase tracking-wider text-[0.65rem] border border-[rgba(228,228,231,0.15)] cursor-pointer flex items-center justify-center gap-2 transition-all"
                title="Open interactive Google Map of all pinned spots"
              >
                <MapPin className="w-3.5 h-3.5 text-[#d4ff33]" />
                <span>Places Map ({pinnedLocationsCount})</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="mb-8">
            <div className="relative">
              <input
                id="search-entries-input"
                type="text"
                placeholder="SEARCH PAST_DATA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-[rgba(228,228,231,0.5)] focus:border-[#d4ff33] py-2 text-[0.8rem] text-[#e4e4e7] placeholder-[rgba(228,228,231,0.3)] font-mono outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-[rgba(228,228,231,0.5)] hover:text-[#d4ff33]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Section Header */}
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[rgba(228,228,231,0.5)] mb-4 block">
            Recent_Logs
          </span>

          {/* Entry Cards List */}
          {filteredEntries.length === 0 ? (
            <div className="p-6 text-center text-[rgba(228,228,231,0.4)] flex flex-col items-center justify-center h-48 border border-[rgba(228,228,231,0.1)]">
              <BookOpen className="w-6 h-6 mb-2 stroke-[1.5] text-[rgba(228,228,231,0.3)]" />
              <p className="text-xs font-syne uppercase text-[#e4e4e7]">No logs found</p>
              <p className="text-[10px] font-mono text-[rgba(228,228,231,0.4)] mt-1">
                {searchQuery ? "TRY ANOTHER QUERY" : "START YOUR FIRST ENTRY"}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isActive = entry.id === activeEntryId;
              const isDeleting = entryToDelete === entry.id;
              const previewMessage = entry.messages[entry.messages.length - 1]?.content || "Empty reflection";

              return (
                <div
                  key={entry.id}
                  id={`entry-item-${entry.id}`}
                  onClick={() => {
                    onSelectEntry(entry.id);
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={`group relative p-6 border mb-4 cursor-pointer transition-all ${
                    isActive
                      ? "border-[#d4ff33] bg-[#141415]"
                      : "border-[rgba(228,228,231,0.1)] hover:border-[#d4ff33] bg-transparent"
                  }`}
                >
                  {isDeleting ? (
                    <div className="flex flex-col gap-2 py-1">
                      <span className="text-red-400 font-mono text-[10px] uppercase">Confirm deletion?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => executeDelete(e, entry.id)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] uppercase cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="px-2.5 py-1 bg-[#18181b] text-[#e4e4e7] hover:bg-[#27272a] font-mono text-[10px] uppercase cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className={`font-syne text-[0.9rem] font-bold mb-1.5 truncate ${
                        isActive ? "text-[#e4e4e7]" : "text-[rgba(228,228,231,0.8)] group-hover:text-[#e4e4e7]"
                      }`}>
                        {entry.title || "Untitled Reflection"}
                      </h3>

                      {entry.location && (
                        <div className="flex items-center gap-1.5 mb-2 font-mono text-[0.6rem] text-[#d4ff33] bg-[#0c0c0d] px-2 py-0.5 border border-[#d4ff33]/30 w-fit max-w-full">
                          <MapPin className="w-2.5 h-2.5 shrink-0 text-[#d4ff33]" />
                          <span className="truncate">{entry.location.name}</span>
                        </div>
                      )}

                      <p className="text-[0.75rem] text-[rgba(228,228,231,0.5)] leading-[1.5] line-clamp-2">
                        {previewMessage}
                      </p>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[rgba(228,228,231,0.06)] font-mono text-[0.55rem] text-[rgba(228,228,231,0.5)] uppercase tracking-[0.1em]">
                        <div className="flex items-center gap-2.5">
                          <span>{entry.messages.length} {entry.messages.length === 1 ? "TURN" : "TURNS"}</span>
                          <span>•</span>
                          <span className={isActive ? "text-[#d4ff33] font-bold" : ""}>
                            {isActive ? "ACTIVE" : formatDate(entry.updatedAt || entry.createdAt)}
                          </span>
                        </div>

                        <button
                          id={`delete-btn-${entry.id}`}
                          onClick={(e) => confirmDelete(e, entry.id)}
                          aria-label="Delete entry"
                          title="Delete entry"
                          className="opacity-0 group-hover:opacity-100 p-1 text-[rgba(228,228,231,0.4)] hover:text-red-400 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t-[1.5px] border-[#e4e4e7] flex items-center gap-3 bg-[#0c0c0d]">
          <div className="w-8 h-8 rounded-full bg-[#d4ff33] overflow-hidden shrink-0 flex items-center justify-center text-[#0c0c0d] font-syne font-bold text-xs">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              user?.displayName ? user.displayName.charAt(0).toUpperCase() : "A"
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <p className="text-[0.7rem] font-semibold text-[#e4e4e7] truncate">
              {user?.displayName || "User"}
            </p>
            <span className="font-mono text-[0.5rem] uppercase tracking-[0.15em] text-[rgba(228,228,231,0.5)] block">
              FIRESTORE SECURED
            </span>
          </div>

          <button
            id="sign-out-btn"
            onClick={onSignOut}
            className="font-mono text-[0.6rem] text-[#d4ff33] hover:underline bg-none border-none cursor-pointer tracking-wider shrink-0 uppercase font-bold"
          >
            LOGOUT
          </button>
        </div>
        </div>
      </aside>
    </>
  );
}


