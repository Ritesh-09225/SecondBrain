"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

interface GoogleMapsContextValue {
  apiKey: string;
  isKeyConfigured: boolean;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  apiKey: "",
  isKeyConfigured: false,
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsWrapperProps {
  children: React.ReactNode;
}

export function GoogleMapsWrapper({ children }: GoogleMapsWrapperProps) {
  const initialKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const [activeKey, setActiveKey] = useState<string>(initialKey);

  useEffect(() => {
    let isMounted = true;
    async function fetchConfig() {
      try {
        const res = await fetch("/api/maps/config", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.apiKey) {
            setActiveKey(data.apiKey);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch maps config from server:", e);
      }
    }

    fetchConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const isKeyConfigured = Boolean(activeKey && activeKey.trim().length > 5);

  const contextValue = useMemo(
    () => ({
      apiKey: activeKey,
      isKeyConfigured,
    }),
    [activeKey, isKeyConfigured]
  );

  return (
    <GoogleMapsContext.Provider value={contextValue}>
      {isKeyConfigured ? (
        <APIProvider apiKey={activeKey} libraries={["places", "marker"]}>
          {children}
        </APIProvider>
      ) : (
        children
      )}
    </GoogleMapsContext.Provider>
  );
}

