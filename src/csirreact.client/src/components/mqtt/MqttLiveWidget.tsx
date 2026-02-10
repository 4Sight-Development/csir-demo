"use client";

import React, { useEffect, useRef, useState } from "react";
import useMqtt from "@/hooks/useMqtt";
import { useTheme } from "@/context/ThemeContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Props = {
  brokerUrl?: string;
  topic?: string;
  title?: string;
  demo?: boolean;
  showLatestMessage?: boolean;
  showStatusBadge?: boolean;
  showTitle?: boolean;
  onMetaUpdate?: (meta: {
    connected: boolean;
    latestMessage: string | null;
    subscribedTopic: string;
    brokerUrl: string;
    dataPointCount: number;
    demoMode: boolean;
    lastMessageAt: Date | null;
  }) => void;
};

export default function MqttLiveWidget({
  brokerUrl = "wss://broker.hivemq.com:8884/mqtt",
  topic,
  title = "Live IoT - MQTT Broker Feed",
  demo = false,
  showLatestMessage = true,
  showStatusBadge = true,
  showTitle = true,
  onMetaUpdate,
}: Props) {
  const [demoTopic] = useState(
    () => `csirreact/demo/${Math.random().toString(36).slice(2, 8)}`
  );
  const defaultTopic = "csirreact/feed/live";
  const subscribedTopic = demo ? (topic ?? demoTopic) : (topic ?? defaultTopic);
  const { connected, message, publish } = useMqtt(
    brokerUrl,
    subscribedTopic
  );
  const [data, setData] = useState<{ time: string; value: number }[]>([]);
  const lastValueRef = useRef<number | null>(null);
  const lastMessageAtRef = useRef<Date | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [lastMessageAt, setLastMessageAt] = useState<Date | null>(null);
  const staleThresholdMs = 15000; // freeze chart when no messages within 15s

  const toNumeric = (text: string): number | null => {
    const direct = Number(text);
    if (!Number.isNaN(direct)) return direct;
    const hms = text.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (hms) {
      const h = Number(hms[1]);
      const m = Number(hms[2]);
      const s = Number(hms[3]);
      return h * 3600 + m * 60 + s;
    }
    const num = text.match(/-?\d+(?:\.\d+)?/);
    if (num) return Number(num[0]);
    return text.length; // fallback to message length so chart still moves
  };

  // Capture latest numeric value from messages
  useEffect(() => {
    if (!message) return;
    const v = toNumeric(message);
    if (v == null) return;
    lastValueRef.current = v;
    const now = new Date();
    lastMessageAtRef.current = now;
    setLastMessageAt(now);
  }, [message]);

  // Push a point to the chart every 2 seconds using the latest value
  useEffect(() => {
    const id = setInterval(() => {
      if (lastValueRef.current == null) return;
      const lastAt = lastMessageAtRef.current;
      if (!lastAt) return; // no messages yet
      const isFresh = Date.now() - lastAt.getTime() <= staleThresholdMs;
      if (!isFresh) return; // freeze updates when feed is stale
      const point = {
        time: new Date().toLocaleTimeString(),
        value: lastValueRef.current,
      };
      setData((prev) => [...prev.slice(-30), point]);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // Demo publisher: emits a random number every 1s to the subscribed topic
  useEffect(() => {
    if (!demo || topic) return; // Only run demo when no explicit topic provided
    if (!connected) return;
    const id = setInterval(() => {
      const val = Math.floor(Math.random() * 100).toString();
      publish(subscribedTopic, val);
    }, 1000);
    return () => clearInterval(id);
  }, [demo, topic, connected, publish, subscribedTopic]);

  // Emit metadata updates to parent (optional)
  useEffect(() => {
    onMetaUpdate?.({
      connected,
      latestMessage: message ?? null,
      subscribedTopic,
      brokerUrl,
      dataPointCount: data.length,
      demoMode: !!demo && !topic,
      lastMessageAt,
    });
  }, [connected, message, subscribedTopic, brokerUrl, data.length, demo, topic, lastMessageAt, onMetaUpdate]);

  return (
    <div
      className={`rounded-sm  shadow-default dark:border-strokedark ${
        isDark ? "bg-boxdark" : "bg-white"
      }`}
    >
      {(showTitle || showStatusBadge) && (
        <div className="mb-2 flex items-center justify-between">
          {showTitle && (
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
              {title}
            </h2>
          )}
          {showStatusBadge && (
            <span className={`text-sm ${connected ? "text-green-600" : "text-red-600"}`}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          )}
        </div>
      )}
      {showLatestMessage && (
        <p className={`text-sm mb-4 ${isDark ? "text-white/90" : "text-gray-700"}`}>
          Bits Received: {message ?? "—"}
        </p>
      )}
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer style={{ background: "transparent" }}>
          <LineChart data={data} style={{ background: "transparent" }}>
            <CartesianGrid
              stroke={isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="time"
              stroke={isDark ? "rgba(255,255,255,0.24)" : "#94a3b8"}
              tick={{ fill: isDark ? "#e5e7eb" : "#334155", fontSize: 12 }}
            />
            <YAxis
              stroke={isDark ? "rgba(255,255,255,0.24)" : "#94a3b8"}
              tick={{ fill: isDark ? "#e5e7eb" : "#334155", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#111827" : "#ffffff",
                borderColor: isDark ? "#374151" : "#e5e7eb",
                color: isDark ? "rgba(255,255,255,0.90)" : "#111827",
              }}
              labelStyle={{ color: isDark ? "rgba(255,255,255,0.90)" : "#111827" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              dot={false}
              stroke={isDark ? "#7dd3fc" : "#4f46e5"}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
