import type { Metadata } from "next";
import React from "react";
import IotPageClient from "./IotPageClient";

export const metadata: Metadata = {
  title: "IoT Live | CSIRReact",
  description: "Live IoT MQTT feeds and updates",
};

export default function IotPage() {
  return <IotPageClient />;
}
