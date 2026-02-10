"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type LocationMode = "default" | "nearest";

type LocationContextValue = {
  mode: LocationMode;
  setMode: (mode: LocationMode) => void;
  defaultLat: number;
  defaultLon: number;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Defaults provided by user: Lat -25.75, Long 28.25
  const [mode, setMode] = useState<LocationMode>("default");
  const value = useMemo(
    () => ({ mode, setMode, defaultLat: -25.75, defaultLon: 28.25 }),
    [mode]
  );
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
