"use client";

import React, { useState } from "react";
import { 
  Map, 
  AdvancedMarker, 
  Pin 
} from "@vis.gl/react-google-maps";
import { 
  MapPin, 
  Star, 
  Share2, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Utensils, 
  Coffee, 
  Sparkles, 
  Navigation,
  Check,
  Copy
} from "lucide-react";
import { LocationPin } from "@/types/journal";
import { useGoogleMaps } from "./GoogleMapsWrapper";

interface LocationCardProps {
  location: LocationPin;
  reflectionTitle?: string;
  onEdit?: () => void;
  onRemove?: () => void;
  readOnly?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  eatery: <Utensils className="w-3.5 h-3.5" />,
  cafe: <Coffee className="w-3.5 h-3.5" />,
  bar: <Sparkles className="w-3.5 h-3.5" />,
  scenic: <MapPin className="w-3.5 h-3.5" />,
  landmark: <Navigation className="w-3.5 h-3.5" />,
  general: <MapPin className="w-3.5 h-3.5" />,
};

export function LocationCard({
  location,
  reflectionTitle,
  onEdit,
  onRemove,
  readOnly = false,
}: LocationCardProps) {
  const { isKeyConfigured } = useGoogleMaps();
  const [copied, setCopied] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  const category = location.category || "eatery";
  const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.general;

  // Generate share text for friends
  const getShareText = () => {
    const lines = [
      `📍 ${location.name.toUpperCase()}`,
      `🏷️ Category: ${category.toUpperCase()}`,
      location.rating ? `⭐ Rating: ${location.rating.toFixed(1)} / 5.0` : "",
      `📌 Address: ${location.formattedAddress}`,
      location.userNotes ? `\n💬 Personal Recommendation:\n"${location.userNotes}"` : "",
      location.googleMapsUrl ? `\n🗺️ Open in Google Maps:\n${location.googleMapsUrl}` : "",
      reflectionTitle ? `\n📔 Logged in Aether Journal: "${reflectionTitle}"` : "",
    ].filter(Boolean);

    return lines.join("\n");
  };

  const handleCopyShareText = async () => {
    const text = getShareText();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn("Clipboard copy failed:", e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recommendation: ${location.name}`,
          text: getShareText(),
          url: location.googleMapsUrl || window.location.href,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopyShareText();
    }
  };

  return (
    <div 
      id={`location-card-${location.placeId}`}
      className="location-card relative my-4 bg-[#141415] border border-[#d4ff33]/40 rounded-none overflow-hidden transition-all shadow-lg"
    >
      {/* Accent Header Strip */}
      <div className="px-4 py-2.5 bg-[#18181b] border-b border-[rgba(228,228,231,0.1)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-[#d4ff33] text-[#0c0c0d] font-bold rounded-sm">
            {icon}
          </span>
          <span className="font-mono text-[0.65rem] font-bold uppercase tracking-wider text-[#d4ff33]">
            LOCATION PINNED: {category.toUpperCase()}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id="share-location-btn"
            type="button"
            onClick={() => setShowShareCard((prev) => !prev)}
            title="Share this spot with friends"
            className="flex items-center gap-1 px-2.5 py-1 bg-[#0c0c0d] hover:bg-[#202024] text-[#e4e4e7] hover:text-[#d4ff33] border border-[rgba(228,228,231,0.15)] font-mono text-[0.6rem] uppercase tracking-wider cursor-pointer transition-colors"
          >
            <Share2 className="w-3 h-3 text-[#d4ff33]" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {!readOnly && onEdit && (
            <button
              id="edit-location-btn"
              type="button"
              onClick={onEdit}
              title="Edit location notes"
              className="p-1.5 text-[rgba(228,228,231,0.6)] hover:text-[#d4ff33] hover:bg-[#0c0c0d] rounded transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {!readOnly && onRemove && (
            <button
              id="remove-location-btn"
              type="button"
              onClick={onRemove}
              title="Remove location pin"
              className="p-1.5 text-[rgba(228,228,231,0.6)] hover:text-red-400 hover:bg-[#0c0c0d] rounded transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Layout: Grid with Details + Mini Map */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Side: Details & Notes (7 cols) */}
        <div className="md:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <h4 className="font-syne font-extrabold text-base text-[#e4e4e7] uppercase tracking-wide">
                {location.name}
              </h4>
              {location.rating && (
                <span className="flex items-center gap-1 font-mono text-xs text-amber-300 bg-amber-950/40 px-2 py-0.5 border border-amber-800/40 shrink-0">
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                  {location.rating.toFixed(1)}
                </span>
              )}
            </div>

            <p className="font-mono text-[0.7rem] text-[rgba(228,228,231,0.6)] leading-relaxed mb-3">
              {location.formattedAddress}
            </p>

            {/* Food & Ambience Notes */}
            {location.userNotes && (
              <div className="p-3 bg-[#0c0c0d] border-l-2 border-[#d4ff33] mb-3">
                <span className="font-mono text-[0.55rem] uppercase text-[#d4ff33] tracking-wider block mb-1">
                  Food & Vibe Notes:
                </span>
                <p className="font-sans text-xs text-[#e4e4e7] italic leading-relaxed">
                  &ldquo;{location.userNotes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Links & Attributions */}
          <div className="flex items-center justify-between pt-2 border-t border-[rgba(228,228,231,0.08)] mt-2">
            <div className="font-mono text-[0.55rem] text-[rgba(228,228,231,0.4)] uppercase">
              COORDS: {location.coordinates.lat.toFixed(3)}, {location.coordinates.lng.toFixed(3)}
            </div>

            {location.googleMapsUrl && (
              <a
                href={location.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-[0.65rem] text-[#d4ff33] hover:underline uppercase tracking-wider font-semibold"
              >
                <span>Navigate in Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Mini Map (5 cols) */}
        <div className="md:col-span-5 h-36 md:h-full min-h-[140px] border border-[rgba(228,228,231,0.15)] relative overflow-hidden bg-[#0c0c0d]">
          {isKeyConfigured ? (
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={location.coordinates}
              defaultZoom={15}
              gestureHandling="cooperative"
              disableDefaultUI={true}
              zoomControl={true}
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              className="w-full h-full"
            >
              <AdvancedMarker
                position={location.coordinates}
                title={location.name}
              >
                <Pin
                  background="#d4ff33"
                  borderColor="#0c0c0d"
                  glyphColor="#0c0c0d"
                  scale={0.9}
                />
              </AdvancedMarker>
            </Map>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#18181b] to-[#0c0c0d]">
              <MapPin className="w-6 h-6 text-[#d4ff33] mb-1" />
              <span className="font-mono text-[0.6rem] text-[#e4e4e7] uppercase font-bold">
                {location.name}
              </span>
              <span className="font-mono text-[0.55rem] text-[rgba(228,228,231,0.5)]">
                {location.coordinates.lat.toFixed(4)}, {location.coordinates.lng.toFixed(4)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Share Card Modal Overlay */}
      {showShareCard && (
        <div className="p-4 bg-[#0c0c0d] border-t border-[#d4ff33]/30 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[0.65rem] font-bold text-[#d4ff33] uppercase tracking-wider flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              Share Eatery / Place with Friends
            </span>
            <button
              onClick={() => setShowShareCard(false)}
              className="font-mono text-[0.6rem] text-[rgba(228,228,231,0.5)] hover:text-[#e4e4e7] uppercase"
            >
              Close
            </button>
          </div>

          <pre className="p-3 bg-[#18181b] border border-[rgba(228,228,231,0.1)] text-[#e4e4e7] font-mono text-[0.65rem] whitespace-pre-wrap leading-relaxed custom-scroll max-h-32 mb-3">
            {getShareText()}
          </pre>

          <div className="flex items-center gap-2">
            <button
              id="copy-recommendation-btn"
              type="button"
              onClick={handleCopyShareText}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#d4ff33] hover:bg-[#e2ff66] text-[#0c0c0d] font-syne font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Recommendation Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Formatted Recommendation</span>
                </>
              )}
            </button>

            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="py-2 px-4 bg-[#18181b] hover:bg-[#202024] text-[#e4e4e7] font-mono text-xs uppercase tracking-wider border border-[rgba(228,228,231,0.15)] cursor-pointer"
              >
                Send via App
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
