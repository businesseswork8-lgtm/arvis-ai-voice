import { supabase } from "@/integrations/supabase/client";
import { getSyncKey } from "./storage";

const VAPID_PUBLIC_KEY = "BPl0eMqojJp9WJwG0q3q3hXTMN5RddM9JhJ9xNRbMUGfEfULNu7bjqL3qHVPFNwbF3YP9pOwu3L38VEKy0a1jxQ";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function registerPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Register service worker
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // Subscribe to push
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });
    }

    // Save to Supabase
    const syncKey = getSyncKey();
    const subJson = subscription.toJSON() as Record<string, unknown>;
    await supabase.from("push_subscriptions").upsert(
      [{
        sync_key: syncKey,
        endpoint: subscription.endpoint,
        subscription: subJson as any,
      }],
      { onConflict: "sync_key,endpoint" }
    );
  } catch (e) {
    console.error("Push registration failed:", e);
  }
}
