"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMapsLibrary, 
  useMap,
  MapMouseEvent 
} from "@vis.gl/react-google-maps";
import { 
  MapPin, 
  Search, 
  X, 
  Star, 
  Navigation, 
  Utensils, 
  Coffee, 
  Sparkles, 
  ExternalLink,
  Info,
  Check
} from "lucide-react";
import { LocationPin } from "@/types/journal";
import { useGoogleMaps } from "./GoogleMapsWrapper";

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLocation: (location: LocationPin) => void;
  initialLocation?: LocationPin | null;
}

const CATEGORIES: Array<{ id: LocationPin["category"]; label: string; icon: React.ReactNode }> = [
  { id: "eatery", label: "Eatery / Food", icon: <Utensils className="w-3.5 h-3.5" /> },
  { id: "cafe", label: "Cafe & Coffee", icon: <Coffee className="w-3.5 h-3.5" /> },
  { id: "bar", label: "Bar & Drinks", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: "scenic", label: "Scenic Spot", icon: <MapPin className="w-3.5 h-3.5" /> },
  { id: "landmark", label: "Landmark", icon: <Navigation className="w-3.5 h-3.5" /> },
  { id: "general", label: "General", icon: <MapPin className="w-3.5 h-3.5" /> },
];

function MapController({ coordinates }: { coordinates?: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map && coordinates) {
      map.panTo(coordinates);
      map.setZoom(15);
    }
  }, [map, coordinates]);
  return null;
}

export function LocationPickerModal({
  isOpen,
  onClose,
  onSaveLocation,
  initialLocation,
}: LocationPickerModalProps) {
  if (!isOpen) return null;

  return (
    <LocationPickerContent
      onClose={onClose}
      onSaveLocation={onSaveLocation}
      initialLocation={initialLocation}
    />
  );
}

function LocationPickerContent({
  onClose,
  onSaveLocation,
  initialLocation,
}: Omit<LocationPickerModalProps, "isOpen">) {
  const { isKeyConfigured } = useGoogleMaps();
  const placesLibrary = useMapsLibrary("places");

  // Selected Location State
  const [selectedPlace, setSelectedPlace] = useState<Partial<LocationPin>>(() => {
    if (initialLocation) return { ...initialLocation };
    return {
      coordinates: { lat: 37.7749, lng: -122.4194 }, // Default San Francisco
      category: "eatery",
      userNotes: "",
    };
  });

  const [searchQuery, setSearchQuery] = useState(initialLocation?.name || "");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    placeId: string;
    name: string;
    formattedAddress: string;
    coordinates: { lat: number; lng: number };
    rating?: number;
    googleMapsUrl?: string;
  }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search Places using modern Google Places API (New)
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !placesLibrary) return;

    setIsSearching(true);
    setErrorMessage(null);

    try {
      // Use modern Place.searchByText with strict field masking
      if (placesLibrary.Place?.searchByText) {
        const { places } = await placesLibrary.Place.searchByText({
          textQuery: searchQuery,
          fields: ["id", "displayName", "formattedAddress", "location", "rating", "googleMapsURI", "types"],
          isOpenNow: false,
          maxResultCount: 6,
        });

        if (places && places.length > 0) {
          const formatted = places.map((p) => {
            let extractedName = searchQuery;
            if (typeof p.displayName === "string") {
              extractedName = p.displayName;
            } else if (p.displayName && typeof p.displayName === "object" && "text" in p.displayName) {
              extractedName = String((p.displayName as { text?: string }).text || searchQuery);
            }

            let lat = 0;
            let lng = 0;
            if (p.location) {
              const loc = p.location as unknown as { lat?: unknown; lng?: unknown };
              if (typeof loc.lat === "function") {
                lat = Number((loc.lat as () => number)());
              } else if (typeof loc.lat === "number") {
                lat = loc.lat;
              }
              if (typeof loc.lng === "function") {
                lng = Number((loc.lng as () => number)());
              } else if (typeof loc.lng === "number") {
                lng = loc.lng;
              }
            }

            return {
              placeId: p.id || `place_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: extractedName,
              formattedAddress: p.formattedAddress || "",
              coordinates: { lat, lng },
              rating: typeof p.rating === "number" ? p.rating : undefined,
              googleMapsUrl: p.googleMapsURI || undefined,
            };
          });

          setSearchResults(formatted);
        } else {
          setSearchResults([]);
          setErrorMessage("No places found matching your search. Try a different query or address.");
        }
      } else {
        // Fallback for custom search
        setErrorMessage("Places API is initializing...");
      }
    } catch (err: unknown) {
      console.warn("Places search error:", err);
      setErrorMessage("Could not fetch place predictions. You can enter details manually below.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, placesLibrary]);

  // Select place from search results
  const handleSelectResult = (result: typeof searchResults[0]) => {
    setSelectedPlace((prev) => ({
      ...prev,
      placeId: result.placeId,
      name: result.name,
      formattedAddress: result.formattedAddress,
      coordinates: result.coordinates,
      rating: result.rating,
      googleMapsUrl: result.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.name + " " + result.formattedAddress)}`,
    }));
  };

  // Browser Geolocation / GPS
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSelectedPlace((prev) => ({
          ...prev,
          name: prev.name || "My Current Location",
          formattedAddress: prev.formattedAddress || `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`,
          coordinates: coords,
          placeId: prev.placeId || `gps_${Date.now()}`,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`,
        }));
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setErrorMessage("Could not get your current location. Please allow location permissions in your browser.");
      }
    );
  };

  // Handle Map Click to Pin Location
  const handleMapClick = (e: MapMouseEvent) => {
    if (e.detail.latLng) {
      const coords = { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng };
      setSelectedPlace((prev) => ({
        ...prev,
        coordinates: coords,
        placeId: prev.placeId || `pin_${Date.now()}`,
        name: prev.name || "Pinned Location",
        formattedAddress: prev.formattedAddress || `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`,
      }));
    }
  };

  // Submit and Save Location
  const handleSave = () => {
    if (!selectedPlace.name?.trim()) {
      setErrorMessage("Please provide a name or select a place for this location.");
      return;
    }

    const pin: LocationPin = {
      placeId: selectedPlace.placeId || `loc_${Date.now()}`,
      name: selectedPlace.name.trim(),
      formattedAddress: selectedPlace.formattedAddress?.trim() || "Address not specified",
      coordinates: selectedPlace.coordinates || { lat: 37.7749, lng: -122.4194 },
      rating: selectedPlace.rating,
      photoUri: selectedPlace.photoUri,
      googleMapsUrl: selectedPlace.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.name)}`,
      userNotes: selectedPlace.userNotes?.trim(),
      category: selectedPlace.category || "eatery",
      createdAt: new Date().toISOString(),
    };

    onSaveLocation(pin);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0c0c0d]/85 backdrop-blur-md animate-fade-in">
      <div 
        id="location-picker-modal"
        className="relative w-full max-w-4xl bg-[#141415] border border-[rgba(228,228,231,0.2)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-[rgba(228,228,231,0.1)] flex items-center justify-between bg-[#0c0c0d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#d4ff33] flex items-center justify-center text-[#0c0c0d]">
              <MapPin className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-syne font-bold text-lg text-[#e4e4e7] uppercase tracking-wide">
                Pin Location to Entry
              </h2>
              <p className="font-mono text-[0.65rem] text-[rgba(228,228,231,0.5)] uppercase tracking-wider">
                Google Maps & Places Platform Integration // Share Eateries & Hidden Gems
              </p>
            </div>
          </div>

          <button
            id="close-location-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-[rgba(228,228,231,0.5)] hover:text-[#d4ff33] hover:bg-[#18181b] rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* API Key Missing Notice */}
        {!isKeyConfigured && (
          <div className="bg-[#18181b] border-b border-[rgba(228,228,231,0.15)] px-6 py-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-[#d4ff33] shrink-0 mt-0.5" />
            <div className="text-[0.7rem] font-mono text-[rgba(228,228,231,0.8)]">
              <span className="text-[#d4ff33] font-bold">PROTOTYPING / MANUAL MODE:</span> Provide your location details manually below, or add <code className="bg-[#0c0c0d] px-1 py-0.5 text-[#d4ff33]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in Settings to unlock live interactive Google Maps & Places autocomplete.
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scroll grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Search, Selection & Notes (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Search Input Box */}
            <div>
              <label className="block font-mono text-[0.65rem] uppercase text-[rgba(228,228,231,0.5)] mb-1.5 tracking-wider">
                Search Eatery / Place Name
              </label>
              <div className="relative flex items-center">
                <input
                  id="place-search-input"
                  type="text"
                  placeholder="e.g. Tartine Bakery, Osteria Francescana..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  className="w-full bg-[#18181b] border border-[rgba(228,228,231,0.2)] focus:border-[#d4ff33] px-3.5 py-2.5 text-xs text-[#e4e4e7] placeholder-[rgba(228,228,231,0.3)] font-sans outline-none pr-20"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  <button
                    id="search-places-btn"
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="p-1.5 bg-[#d4ff33] text-[#0c0c0d] hover:bg-[#e2ff66] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-sm"
                    title="Search place"
                  >
                    <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Current GPS Action */}
            <button
              id="gps-location-btn"
              type="button"
              onClick={handleUseCurrentLocation}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-[#18181b] hover:bg-[#202024] border border-[rgba(228,228,231,0.1)] text-[#e4e4e7] hover:text-[#d4ff33] font-mono text-[0.65rem] uppercase tracking-wider cursor-pointer transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 text-[#d4ff33]" />
              <span>Use My Current GPS Location</span>
            </button>

            {/* Search Results List */}
            {searchResults.length > 0 && (
              <div className="border border-[rgba(228,228,231,0.15)] bg-[#0c0c0d] p-2 max-h-40 overflow-y-auto custom-scroll">
                <span className="font-mono text-[0.6rem] uppercase tracking-wider text-[rgba(228,228,231,0.4)] px-2 block mb-1">
                  Predictions ({searchResults.length})
                </span>
                {searchResults.map((res) => (
                  <button
                    key={res.placeId}
                    type="button"
                    onClick={() => handleSelectResult(res)}
                    className="w-full text-left p-2 hover:bg-[#18181b] border-b border-[rgba(228,228,231,0.06)] last:border-0 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-syne text-xs font-bold text-[#e4e4e7] group-hover:text-[#d4ff33] truncate">
                        {res.name}
                      </span>
                      {res.rating && (
                        <span className="flex items-center gap-1 font-mono text-[0.65rem] text-amber-300 shrink-0 ml-2">
                          <Star className="w-3 h-3 fill-amber-300" />
                          {res.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[0.6rem] text-[rgba(228,228,231,0.5)] truncate block mt-0.5">
                      {res.formattedAddress}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Error or Warning Message */}
            {errorMessage && (
              <div className="p-2.5 bg-red-950/40 border border-red-800/50 text-red-300 font-mono text-[0.65rem]">
                {errorMessage}
              </div>
            )}

            {/* Place Details Form */}
            <div className="space-y-3 pt-2 border-t border-[rgba(228,228,231,0.1)]">
              <div>
                <label className="block font-mono text-[0.65rem] uppercase text-[rgba(228,228,231,0.5)] mb-1">
                  Place Name *
                </label>
                <input
                  id="place-name-input"
                  type="text"
                  value={selectedPlace.name || ""}
                  onChange={(e) => setSelectedPlace((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Osteria Francescana"
                  className="w-full bg-[#18181b] border border-[rgba(228,228,231,0.15)] focus:border-[#d4ff33] px-3 py-2 text-xs text-[#e4e4e7] font-sans outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[0.65rem] uppercase text-[rgba(228,228,231,0.5)] mb-1">
                  Address / Neighborhood
                </label>
                <input
                  id="place-address-input"
                  type="text"
                  value={selectedPlace.formattedAddress || ""}
                  onChange={(e) => setSelectedPlace((prev) => ({ ...prev, formattedAddress: e.target.value }))}
                  placeholder="e.g. Via Stella, 22, 41121 Modena MO, Italy"
                  className="w-full bg-[#18181b] border border-[rgba(228,228,231,0.15)] focus:border-[#d4ff33] px-3 py-2 text-xs text-[#e4e4e7] font-sans outline-none"
                />
              </div>

              {/* Category Pills */}
              <div>
                <label className="block font-mono text-[0.65rem] uppercase text-[rgba(228,228,231,0.5)] mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedPlace.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedPlace((prev) => ({ ...prev, category: cat.id }))}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 text-[0.6rem] font-mono uppercase tracking-wider border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-[#d4ff33] bg-[#d4ff33] text-[#0c0c0d] font-bold"
                            : "border-[rgba(228,228,231,0.1)] bg-[#18181b] text-[rgba(228,228,231,0.7)] hover:border-[#d4ff33]"
                        }`}
                      >
                        {cat.icon}
                        <span className="truncate">{cat.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Food & Vibe Personal Notes */}
              <div>
                <label className="block font-mono text-[0.65rem] uppercase text-[rgba(228,228,231,0.5)] mb-1">
                  Food & Ambience Notes (For Friends / Memories)
                </label>
                <textarea
                  id="place-notes-textarea"
                  rows={3}
                  value={selectedPlace.userNotes || ""}
                  onChange={(e) => setSelectedPlace((prev) => ({ ...prev, userNotes: e.target.value }))}
                  placeholder="e.g. Incredible 5-course tasting menu. Must try the Five Ages of Parmigiano Reggiano! Best to book 3 months ahead."
                  className="w-full bg-[#18181b] border border-[rgba(228,228,231,0.15)] focus:border-[#d4ff33] p-2.5 text-xs text-[#e4e4e7] placeholder-[rgba(228,228,231,0.3)] font-sans outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Map Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-[320px]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[0.65rem] uppercase text-[rgba(228,228,231,0.5)] tracking-wider">
                Interactive Map Pin (Click map to adjust position)
              </span>

              {selectedPlace.googleMapsUrl && (
                <a
                  href={selectedPlace.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-[0.6rem] text-[#d4ff33] hover:underline uppercase tracking-wider"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Google Map Container */}
            <div className="relative flex-1 w-full min-h-[300px] border border-[rgba(228,228,231,0.2)] bg-[#0c0c0d] overflow-hidden">
              {isKeyConfigured ? (
                <Map
                  mapId="DEMO_MAP_ID"
                  defaultCenter={selectedPlace.coordinates || { lat: 37.7749, lng: -122.4194 }}
                  defaultZoom={14}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  onClick={handleMapClick}
                  internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                  className="w-full h-full min-h-[300px]"
                >
                  <MapController coordinates={selectedPlace.coordinates} />
                  {selectedPlace.coordinates && (
                    <AdvancedMarker
                      position={selectedPlace.coordinates}
                      title={selectedPlace.name || "Pinned Location"}
                    >
                      <Pin
                        background="#d4ff33"
                        borderColor="#0c0c0d"
                        glyphColor="#0c0c0d"
                      />
                    </AdvancedMarker>
                  )}
                </Map>
              ) : (
                /* Fallback Graphic when API key is not present */
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#141415] to-[#0c0c0d]">
                  <div className="w-14 h-14 rounded-full bg-[#18181b] border border-[#d4ff33]/40 flex items-center justify-center mb-3">
                    <MapPin className="w-7 h-7 text-[#d4ff33]" />
                  </div>
                  <h4 className="font-syne font-bold text-sm text-[#e4e4e7] uppercase mb-1">
                    {selectedPlace.name || "Location Selected"}
                  </h4>
                  <p className="font-mono text-xs text-[rgba(228,228,231,0.6)] max-w-sm mb-3">
                    {selectedPlace.formattedAddress || "Coordinates and place details will be saved to your reflection entry."}
                  </p>
                  <span className="font-mono text-[0.65rem] text-[#d4ff33] uppercase bg-[#18181b] px-3 py-1 border border-[#d4ff33]/30">
                    LAT: {selectedPlace.coordinates?.lat.toFixed(4)} • LNG: {selectedPlace.coordinates?.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            {/* Coordinate readout */}
            <div className="flex items-center justify-between mt-2 font-mono text-[0.6rem] text-[rgba(228,228,231,0.4)] uppercase">
              <span>LAT: {selectedPlace.coordinates?.lat.toFixed(5)}</span>
              <span>LNG: {selectedPlace.coordinates?.lng.toFixed(5)}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-[rgba(228,228,231,0.1)] bg-[#0c0c0d] flex items-center justify-end gap-3">
          <button
            id="cancel-location-modal-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#18181b] hover:bg-[#202024] text-[#e4e4e7] font-mono text-xs uppercase tracking-wider cursor-pointer border border-[rgba(228,228,231,0.1)]"
          >
            Cancel
          </button>

          <button
            id="save-location-pin-btn"
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-[#d4ff33] hover:bg-[#e2ff66] text-[#0c0c0d] font-syne font-bold text-xs uppercase tracking-wider cursor-pointer border-none shadow-md active:scale-98 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Pin Location to Entry</span>
          </button>
        </div>
      </div>
    </div>
  );
}
