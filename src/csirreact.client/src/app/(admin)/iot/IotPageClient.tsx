"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import MqttLiveWidget from "@/components/mqtt/MqttLiveWidget";

export default function IotPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFullscreen = (searchParams.get("fullscreen") || "").toLowerCase() === "true";
  const [meta, setMeta] = React.useState<{
    connected: boolean;
    latestMessage: string | null;
    subscribedTopic: string;
    brokerUrl: string;
    dataPointCount: number;
    demoMode: boolean;
    lastMessageAt: Date | null;
  } | null>(null);

  // Stable callback prevents effect loops in child
  const handleMetaUpdate = React.useCallback((m: {
    connected: boolean;
    latestMessage: string | null;
    subscribedTopic: string;
    brokerUrl: string;
    dataPointCount: number;
    demoMode: boolean;
    lastMessageAt: Date | null;
  }) => {
    setMeta(m);
  }, []);

  const topic = "csirreact/feed/live";
  const brokerUrl = "wss://broker.hivemq.com:8884/mqtt";

  // Derive feed health: treat as stale if no message within threshold
  const staleThresholdMs = 15000; // 15 seconds without messages => stale
  // Tick the component every second so staleness can update even if no new meta arrives
  const [now, setNow] = React.useState<number>(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const isConnected = !!meta?.connected;
  const hasRecentMessage = meta?.lastMessageAt
    ? now - meta.lastMessageAt.getTime() <= staleThresholdMs
    : false;

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Page Heading above labels */}
      <div className="col-span-12">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Live IoT - MQTT Broker Feed
          </h2>
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              if (isFullscreen) {
                params.delete("fullscreen");
              } else {
                params.set("fullscreen", "true");
              }
              const qs = params.toString();
              router.replace(qs ? `${pathname}?${qs}` : pathname);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isFullscreen ? (
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.75 2.25C6.33579 2.25 6 2.58579 6 3V5.25H3C2.58579 5.25 2.25 5.58579 2.25 6C2.25 6.41421 2.58579 6.75 3 6.75H6.75C7.16421 6.75 7.5 6.41421 7.5 6V3C7.5 2.58579 7.16421 2.25 6.75 2.25ZM11.25 2.25C10.8358 2.25 10.5 2.58579 10.5 3V6C10.5 6.41421 10.8358 6.75 11.25 6.75H15C15.4142 6.75 15.75 6.41421 15.75 6C15.75 5.58579 15.4142 5.25 15 5.25H12V3C12 2.58579 11.6642 2.25 11.25 2.25ZM3 11.25C2.58579 11.25 2.25 11.5858 2.25 12C2.25 12.4142 2.58579 12.75 3 12.75H6V15C6 15.4142 6.33579 15.75 6.75 15.75C7.16421 15.75 7.5 15.4142 7.5 15V12C7.5 11.5858 7.16421 11.25 6.75 11.25H3ZM12 11.25C11.5858 11.25 11.25 11.5858 11.25 12V15C11.25 15.4142 11.5858 15.75 12 15.75C12.4142 15.75 12.75 15.4142 12.75 15V12.75H15C15.4142 12.75 15.75 12.4142 15.75 12C15.75 11.5858 15.4142 11.25 15 11.25H12Z"
                  fill="currentColor"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.75 2.25C6.33579 2.25 6 2.58579 6 3V6C6 6.41421 6.33579 6.75 6.75 6.75H9.75C10.1642 6.75 10.5 6.41421 10.5 6C10.5 5.58579 10.1642 5.25 9.75 5.25H7.5V3C7.5 2.58579 7.16421 2.25 6.75 2.25ZM11.25 2.25C10.8358 2.25 10.5 2.58579 10.5 3V5.25H8.25C7.83579 5.25 7.5 5.58579 7.5 6C7.5 6.41421 7.83579 6.75 8.25 6.75H11.25C11.6642 6.75 12 6.41421 12 6V3C12 2.58579 11.6642 2.25 11.25 2.25ZM3 11.25C2.58579 11.25 2.25 11.5858 2.25 12C2.25 12.4142 2.58579 12.75 3 12.75H5.25V15C5.25 15.4142 5.58579 15.75 6 15.75C6.41421 15.75 6.75 15.4142 6.75 15V12.75H9C9.41421 12.75 9.75 12.4142 9.75 12C9.75 11.5858 9.41421 11.25 9 11.25H6.75H3ZM12.75 11.25C12.3358 11.25 12 11.5858 12 12V15C12 15.4142 12.3358 15.75 12.75 15.75C13.1642 15.75 13.5 15.4142 13.5 15V12.75H15.75C16.1642 12.75 16.5 12.4142 16.5 12C16.5 11.5858 16.1642 11.25 15.75 11.25H13.5H12.75Z"
                  fill="currentColor"
                />
              )}
            </svg>
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>
      {/* Static broker/topic info */}
      <div className="col-span-12">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 shadow grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div>
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Broker</div>
            <div className="mt-1 text-sm text-gray-800 dark:text-white/90 break-all">{brokerUrl}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Topic</div>
            <div className="mt-1 text-sm text-gray-800 dark:text-white/90 break-all">{topic}</div>
          </div>
        </div>
      </div>
      {/* Metadata Labels */}
      <div className="col-span-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 shadow">
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Feed Status</div>
            <div className="mt-2">
              {isConnected ? (
                hasRecentMessage ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                    No recent messages
                  </span>
                )
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  Disconnected
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 shadow">
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Subscribed Feed</div>
            <div className="mt-2 text-sm text-gray-800 dark:text-white/90 break-all">
              {meta?.subscribedTopic ?? "—"}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 shadow">
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Broker URL</div>
            <div className="mt-2 text-sm text-gray-800 dark:text-white/90 break-all">
              {meta?.brokerUrl ?? "—"}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 shadow">
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Last Message At</div>
            <div className="mt-2 text-sm text-gray-800 dark:text-white/90">
              {meta?.lastMessageAt ? meta.lastMessageAt.toLocaleTimeString() : "—"}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 shadow sm:col-span-2 lg:col-span-2">
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">BITS RECEIVED</div>
            <div className="mt-2 text-sm text-gray-800 dark:text-white/90 break-words">
              {meta?.latestMessage ?? "—"}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 shadow">
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Data Points</div>
            <div className="mt-2 text-sm text-gray-800 dark:text-white/90">
              {meta?.dataPointCount ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Live Widget */}
      <div className="col-span-12">
        <MqttLiveWidget
          onMetaUpdate={handleMetaUpdate}
          showLatestMessage={false}
          showStatusBadge={false}
          showTitle={false}
          topic={topic}
          demo={false}
          brokerUrl={brokerUrl}
        />
      </div>
    </div>
  );
}