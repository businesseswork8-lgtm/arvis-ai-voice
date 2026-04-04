import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push requires VAPID authentication
// Using the web-push npm package equivalent for Deno
const VAPID_PUBLIC_KEY = "BGJFVFuxjFQ7RXYFlynwQrV8DiLG3qFuPndCBGy9BosQuysHqNMnerJ48dmgtoH9EKlJedjcpU96CGUpVrcpuXQ";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPrivateKey) {
      return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const in15min = new Date(now.getTime() + 15 * 60 * 1000);
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);

    // Get all push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("sync_key, subscription, endpoint");

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group subscriptions by sync_key
    const subsBySyncKey: Record<string, any[]> = {};
    for (const sub of subscriptions) {
      if (!subsBySyncKey[sub.sync_key]) subsBySyncKey[sub.sync_key] = [];
      subsBySyncKey[sub.sync_key].push(sub.subscription);
    }

    let totalSent = 0;

    for (const [syncKey, subs] of Object.entries(subsBySyncKey)) {
      // Get upcoming items for this sync_key
      const { data: items } = await supabase
        .from("items")
        .select("type, title, datetime")
        .eq("sync_key", syncKey)
        .eq("done", false)
        .eq("confirmed", true)
        .gte("datetime", now.toISOString())
        .lte("datetime", in30min.toISOString());

      if (!items || items.length === 0) continue;

      const notifications: { title: string; body: string; tag: string }[] = [];

      for (const item of items) {
        const dt = new Date(item.datetime);
        const minsAway = Math.round((dt.getTime() - now.getTime()) / 60000);
        const timeStr = minsAway <= 1 ? "now" : `in ${minsAway} minutes`;

        if (item.type === "Reminder") {
          notifications.push({
            title: "⏰ Reminder",
            body: `${item.title} ${timeStr}`,
            tag: `reminder-${item.datetime}`,
          });
        } else if (item.type === "Task") {
          notifications.push({
            title: "📋 Task due",
            body: `${item.title} ${timeStr}`,
            tag: `task-${item.datetime}`,
          });
        } else if (item.type === "Calendar Event") {
          notifications.push({
            title: "📅 Event starting",
            body: `${item.title} ${timeStr}`,
            tag: `event-${item.datetime}`,
          });
        }
      }

      // Send push to all subscriptions for this sync_key
      for (const notification of notifications) {
        for (const sub of subs) {
          try {
            // Use the web push protocol
            const endpoint = sub.endpoint;
            const payload = JSON.stringify(notification);

            // Simple push without encryption for now - just POST to the endpoint
            // Full web push encryption requires complex crypto setup
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                TTL: "86400",
              },
              body: payload,
            });

            if (response.ok || response.status === 201) {
              totalSent++;
            }
          } catch (e) {
            console.error("Failed to send push:", e);
          }
        }
      }
    }

    return new Response(JSON.stringify({ sent: totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-notifications error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
