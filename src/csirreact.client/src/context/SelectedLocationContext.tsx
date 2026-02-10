"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type SelectedLocation = {
  name: string;
  lat: number;
  lon: number;
};

type SelectedLocationContextValue = {
  selected: SelectedLocation | null;
  setSelected: (loc: SelectedLocation | null) => void;
};

const SelectedLocationContext = createContext<SelectedLocationContextValue | null>(null);

export const SelectedLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selected, setSelected] = useState<SelectedLocation | null>(null);
  const value = useMemo(() => ({ selected, setSelected }), [selected]);
  return <SelectedLocationContext.Provider value={value}>{children}</SelectedLocationContext.Provider>;
};

export function useSelectedLocation() {
  const ctx = useContext(SelectedLocationContext);
  if (!ctx) throw new Error("useSelectedLocation must be used within SelectedLocationProvider");
  return ctx;
}
