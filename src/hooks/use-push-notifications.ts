import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push-config";

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

async function saveSubscription(subscription: PushSubscription) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const json = subscription.toJSON() as { endpoint?: string; keys?: Record<string, string> };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      owner_id: userData.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    console.error("Erro ao salvar o aparelho para notificações", error);
    return false;
  }
  return true;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [needsNewTab, setNeedsNewTab] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    setNeedsNewTab(window.top !== window.self);
    if (!supported) return;

    (async () => {
      if (Notification.permission !== "granted") return;
      const registration = await getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        setIsSubscribed(true);
        await saveSubscription(subscription);
      }
    })();
  }, []);

  const activatePushNotifications = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }

    setIsActivating(true);
    try {
      let permission = Notification.permission;
      if (permission !== "granted") permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setIsSubscribed(false);
        return false;
      }

      const registration = await getRegistration();
      if (!registration) return false;
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        }));

      const saved = await saveSubscription(subscription);
      setIsSubscribed(saved);
      return saved;
    } catch (error) {
      console.error("Erro ao ativar notificações", error);
      return false;
    } finally {
      setIsActivating(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isActivating,
    needsNewTab,
    activatePushNotifications,
  };
}
