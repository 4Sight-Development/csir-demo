"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import { SelectedLocationProvider } from "@/context/SelectedLocationContext";
import { useSearchParams } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const searchParams = useSearchParams();
  const isFullscreen = (searchParams.get("fullscreen") || "").toLowerCase() === "true";

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isFullscreen
    ? "ml-0"
    : isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <AuthGuard>
    <SelectedLocationProvider>
    <div className="min-h-screen xl:flex">
      {/* Sidebar and Backdrop */}
      {isFullscreen ? null : <AppSidebar />}
      {isFullscreen ? null : <Backdrop />}
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        {isFullscreen ? null : <AppHeader />}
        {/* Page Content */}
        <div className={`${isFullscreen ? "p-0 max-w-none" : "p-4 md:p-6 mx-auto max-w-(--breakpoint-2xl)"}`}>{children}</div>
      </div>
    </div>
    </SelectedLocationProvider>
    </AuthGuard>
  );
}
