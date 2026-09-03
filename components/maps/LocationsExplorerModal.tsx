"use client";

import React, { useState, useMemo } from "react";
import { 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow 
} from "@vis.gl/react-google-maps";
import { 
  MapPin, 
  X, 
  Search, 
  Star, 
  ExternalLink, 
  BookOpen, 
  Utensils, 
  Coffee, 
  Sparkles, 
  Navigation,
  Share2,
  Check,
  Copy
} from "lucide-react";
import { JournalInteraction, LocationPin } from "@/types/journal";
import { useGoogleMaps } from "./GoogleMapsWrapper";

interface LocationsExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalInteraction[];
  onSelectEntry: (entryId: string) => void;
}

export function LocationsExplorerModal({
  isOpen,
  onClose,
  entries,
  onSelectEntry,
}: LocationsExplorerModalProps) {
  const { isKeyConfigured } = useGoogleMaps();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeLocation, setActiveLocation] = useState<{
    location: LocationPin;
    entry: JournalInteraction;
  } | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Extract all entries that have pinned locations
  const locationEntries = useMemo(() => {
    const list: Array<{ location: LocationPin; entry: JournalInteraction }> = [];
    entries.forEach((entry) => {
      if (entry.location) {
        list.push({
          location: entry.location,
          entry,
        });
      }
    });
    return list;
  }, [entries]);

  // Filter locations by search query and category
  const filteredLocations = useMemo(() => {
    return locationEntries.filter(({ location, entry }) => {
      const matchesCategory = selectedCategory === "all" || location.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesCategory;

      const nameMatch = location.name.toLowerCase().includes(query);
      const addressMatch = location.formattedAddress.toLowerCase().includes(query);
      const notesMatch = location.userNotes ? location.userNotes.toLowerCase().includes(query) : false;
      const titleMatch = entry.title.toLowerCase().includes(query);

      return matchesCategory && (nameMatch || addressMatch || notesMatch || titleMatch);
    });
  }, [locationEntries, selectedCategory, searchQuery]);

  // Compute map center (average of coordinates or default to first location or SF)
  const mapCenter = useMemo(() => {
    if (activeLocation) {
      return activeLocation.location.coordinates;
    }
    if (filteredLocations.length > 0) {
      return filteredLocations[0].location.coordinates;
    }
    return { lat: 37.7749, lng: -122.4194 };
  }, [activeLocation, filteredLocations]);

  // Generate complete list of favorite spots to share
  const handleCopyAllRecommendations = async () => {
    const lines = [
      `🌟 MY CURATED EATERIES & PLACES (Via Aether Journal)`,
      `Total Spots: ${filteredLocations.length}`,
      "--------------------------------------------------",
    ];

    filteredLocations.forEach(({ location, entry }, i) => {
      lines.push(`\n${i + 1}. 📍 ${location.name.toUpperCase()} [${(location.category || "EATERY").toUpperCase()}]`);
      if (location.rating) lines.push(`   ⭐ Rating: ${location.rating.toFixed(1)}/5.0`);
      lines.push(`   📌 ${location.formattedAddress}`);
      if (location.userNotes) lines.push(`   💬 Note: "${location.userNotes}"`);
      if (location.googleMapsUrl) lines.push(`   🗺️ Map: ${location.googleMapsUrl}`);
    });

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(lines.join("\n"));
      }
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (e) {
      console.warn("Copy all failed:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0c0c0d]/90 backdrop-blur-md animate-fade-in">
      <div 
        id="locations-explorer-modal"
        className="relative w-full max-w-6xl bg-[#141415] border border-[rgba(228,228,231,0.2)] shadow-2xl flex flex-col h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-[rgba(228,228,231,0.1)] flex items-center justify-between bg-[#0c0c0d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#d4ff33] flex items-center justify-center text-[#0c0c0d]">
              <Utensils className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-syne font-extrabold text-xl text-[#e4e4e7] uppercase tracking-wide">
                Places & Eateries Explorer
              </h2>
              <p className="font-mono text-[0.65rem] text-[rgba(228,228,231,0.5)] uppercase tracking-wider">
                Interactive Google Map of Pinned Gems • {locationEntries.length} Total Locations Logged
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="export-all-spots-btn"
              type="button"
              onClick={handleCopyAllRecommendations}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181b] hover:bg-[#202024] text-[#e4e4e7] hover:text-[#d4ff33] border border-[rgba(228,228,231,0.15)] font-mono text-[0.65rem] uppercase tracking-wider cursor-pointer transition-colors"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-[#d4ff33]" /> : <Copy className="w-3.5 h-3.5 text-[#d4ff33]" />}
              <span>{copiedAll ? "Spots Copied!" : "Export Recommendation List"}</span>
            </button>

            <button
              id="close-explorer-modal-btn"
              onClick={onClose}
              aria-label="Close explorer"
              className="p-2 text-[rgba(228,228,231,0.5)] hover:text-[#d4ff33] hover:bg-[#18181b] rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Strip */}
        <div className="px-6 py-3 bg-[#18181b] border-b border-[rgba(228,228,231,0.1)] flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              id="explorer-search-input"
              type="text"
              placeholder="FILTER BY PLACE, NOTES, OR CITY..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0c0c0d] border border-[rgba(228,228,231,0.15)] focus:border-[#d4ff33] pl-8 pr-3 py-1.5 text-xs text-[#e4e4e7] placeholder-[rgba(228,228,231,0.3)] font-mono outline-none"
            />
            <Search className="w-3.5 h-3.5 text-[rgba(228,228,231,0.4)] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "all", label: "All Spots" },
              { id: "eatery", label: "Eateries" },
              { id: "cafe", label: "Cafes" },
              { id: "bar", label: "Bars" },
              { id: "scenic", label: "Scenic" },
              { id: "landmark", label: "Landmarks" },
            ].map((tab) => {
              const isSelected = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-2.5 py-1 text-[0.6rem] font-mono uppercase tracking-wider border cursor-pointer transition-colors shrink-0 ${
                    isSelected
                      ? "border-[#d4ff33] bg-[#d4ff33] text-[#0c0c0d] font-bold"
                      : "border-[rgba(228,228,231,0.1)] bg-[#0c0c0d] text-[rgba(228,228,231,0.6)] hover:border-[#d4ff33]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Main View: Split Map + Side Directory */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Interactive Map (8 cols) */}
          <div className="lg:col-span-8 relative h-full min-h-[350px] bg-[#0c0c0d] border-r border-[rgba(228,228,231,0.1)]">
            {isKeyConfigured ? (
              <Map
                mapId="DEMO_MAP_ID"
                defaultCenter={mapCenter}
                defaultZoom={12}
                gestureHandling="greedy"
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                className="w-full h-full"
              >
                {filteredLocations.map(({ location, entry }) => (
                  <AdvancedMarker
                    key={location.placeId}
                    position={location.coordinates}
                    title={location.name}
                    onClick={() => setActiveLocation({ location, entry })}
                  >
                    <Pin
                      background={activeLocation?.location.placeId === location.placeId ? "#ffffff" : "#d4ff33"}
                      borderColor="#0c0c0d"
                      glyphColor="#0c0c0d"
                    />
                  </AdvancedMarker>
                ))}

                {activeLocation && (
                  <InfoWindow
                    position={activeLocation.location.coordinates}
                    onCloseClick={() => setActiveLocation(null)}
                  >
                    <div className="p-2 max-w-xs text-[#0c0c0d]">
                      <h4 className="font-syne font-bold text-sm uppercase">
                        {activeLocation.location.name}
                      </h4>
                      <p className="text-[11px] text-gray-700 mt-0.5">
                        {activeLocation.location.formattedAddress}
                      </p>
                      {activeLocation.location.userNotes && (
                        <p className="text-[11px] italic text-gray-900 mt-1 font-sans">
                          &ldquo;{activeLocation.location.userNotes}&rdquo;
                        </p>
                      )}
                      <button
                        onClick={() => {
                          onSelectEntry(activeLocation.entry.id);
                          onClose();
                        }}
                        className="mt-2 text-[10px] font-mono font-bold uppercase text-blue-700 hover:underline block"
                      >
                        Open Reflection Journal &rarr;
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#141415] to-[#0c0c0d]">
                <MapPin className="w-12 h-12 text-[#d4ff33] mb-3" />
                <h3 className="font-syne font-bold text-base text-[#e4e4e7] uppercase mb-1">
                  Google Maps View
                </h3>
                <p className="font-mono text-xs text-[rgba(228,228,231,0.6)] max-w-md mb-4">
                  Add <code className="text-[#d4ff33] bg-[#0c0c0d] px-1 py-0.5">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the live multi-marker map with custom pins and directions.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Pinned Places Directory (4 cols) */}
          <div className="lg:col-span-4 flex flex-col h-full bg-[#141415] overflow-y-auto custom-scroll p-4">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-[rgba(228,228,231,0.5)] mb-3 block">
              SAVED PLACES ({filteredLocations.length})
            </span>

            {filteredLocations.length === 0 ? (
              <div className="p-8 text-center text-[rgba(228,228,231,0.4)] flex flex-col items-center justify-center border border-[rgba(228,228,231,0.1)] my-auto">
                <MapPin className="w-8 h-8 mb-2 stroke-[1.5] text-[rgba(228,228,231,0.3)]" />
                <p className="text-xs font-syne uppercase text-[#e4e4e7]">No pinned places yet</p>
                <p className="text-[10px] font-mono text-[rgba(228,228,231,0.4)] mt-1">
                  Click &apos;PIN LOCATION&apos; inside any reflection to bookmark eateries and gems.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLocations.map(({ location, entry }) => {
                  const isSelected = activeLocation?.location.placeId === location.placeId;
                  return (
                    <div
                      key={location.placeId}
                      onClick={() => setActiveLocation({ location, entry })}
                      className={`p-3.5 border transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#d4ff33] bg-[#18181b]"
                          : "border-[rgba(228,228,231,0.1)] hover:border-[#d4ff33]/60 bg-[#0c0c0d]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-syne font-bold text-xs text-[#e4e4e7] uppercase truncate">
                          {location.name}
                        </h4>
                        <span className="font-mono text-[0.55rem] uppercase px-1.5 py-0.5 bg-[#18181b] text-[#d4ff33] border border-[#d4ff33]/30 shrink-0">
                          {location.category || "EATERY"}
                        </span>
                      </div>

                      <p className="font-mono text-[0.65rem] text-[rgba(228,228,231,0.5)] truncate mb-2">
                        {location.formattedAddress}
                      </p>

                      {location.userNotes && (
                        <p className="text-[0.7rem] text-[#e4e4e7] italic font-sans line-clamp-2 bg-[#141415] p-2 border-l border-[#d4ff33] mb-2">
                          &ldquo;{location.userNotes}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-[rgba(228,228,231,0.06)] font-mono text-[0.55rem]">
                        <span className="text-[rgba(228,228,231,0.4)] truncate max-w-[140px]">
                          LOG: {entry.title}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEntry(entry.id);
                            onClose();
                          }}
                          className="text-[#d4ff33] hover:underline uppercase tracking-wider font-bold"
                        >
                          View Entry &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
