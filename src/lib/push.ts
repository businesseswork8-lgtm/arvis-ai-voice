import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BM3MW6q_AgtETbBZNtIOtiBaBliOJcdyLFvzkv3NB6aCE9h6tkXBFAondxd4-SaULDlZdUa_x6PB6y21EcuBmpY";

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
    // Only register for signed-in users
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

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

    // Save to Supabase (sync_key column stores the authenticated user id)
    const subJson = subscription.toJSON() as Record<string, unknown>;
    await supabase.from("push_subscriptions").upsert(
      [{
        sync_key: userId,
        endpoint: subscription.endpoint,
        subscription: subJson as any,
      }],
      { onConflict: "sync_key,endpoint" }
    );
  } catch (e) {
    console.error("Push registration failed:", e);
  }
}
