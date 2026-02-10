"use client";

import React, { useEffect, useState } from "react";

export default function WeatherWidgetClient(props: any) {
  const [Comp, setComp] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@daniel-szulc/react-weather-widget")
      .then((m) => {
        if (!mounted) return;
        setComp(() => m.WeatherWidget as React.ComponentType<any>);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err as Error);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-red-300 p-3 text-sm text-red-600">
        Weather widget failed to load. Please refresh or try again later.
      </div>
    );
  }
  if (!Comp) {
    return <div className="p-3 text-sm text-gray-500">Loading weather widget…</div>;
  }
  return <Comp {...props} />;
}
