import { useEffect, useRef, useState } from "react";
import mqtt, { MqttClient } from "mqtt";

export type UseMqttResult = {
  connected: boolean;
  message: string | null;
  publish: (t: string, payload: string | Uint8Array) => void;
  subscribed: boolean;
};

export default function useMqtt(
  brokerUrl: string,
  topic: string
): UseMqttResult {
  const clientRef = useRef<MqttClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    // Guard against SSR: only run in the browser
    if (typeof window === "undefined") return;

    const client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 2000,
    });
    clientRef.current = client;

    const handleConnect = () => {
      setConnected(true);
      client.subscribe(topic, (err: any, granted: any) => {
        setSubscribed(!err && !!granted && granted.length > 0);
      });
    };

    const handleMessage = (t: string, payload: any) => {
      if (t === topic) {
        const text =
          typeof payload === "string"
            ? payload
            : new TextDecoder().decode(payload as Uint8Array);
        setMessage(text);
      }
    };

    const handleClose = () => {
      setConnected(false);
      setSubscribed(false);
    };

    client.on("connect", handleConnect);
    client.on("message", handleMessage);
    client.on("close", handleClose);

    return () => {
      client.off("connect", handleConnect);
      client.off("message", handleMessage);
      client.off("close", handleClose);
      client.end(true);
    };
  }, [brokerUrl, topic]);

  const publish = (t: string, payload: string | Uint8Array) => {
    const client = clientRef.current;
    if (!client) return;
    // mqtt.js in browser accepts string or Uint8Array; cast for TS
    client.publish(t, payload as any);
  };

  return { connected, message, publish, subscribed };
}
