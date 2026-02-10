"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setAuthorized(false);
      router.replace("/signin");
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (authorized === null) {
    return (
      <div className="p-6 text-theme-sm text-gray-600 dark:text-gray-300">Checking session…</div>
    );
  }
  if (!authorized) {
    // Render nothing while redirecting to signin
    return null;
  }
  return <>{children}</>;
}
