import { buildPushPayload } from "@block65/webcrypto-web-push";

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

type AdminClient = {
  from: (table: string) => any;
};

export function vapidKeys() {
  return {
    subject: process.env["VAPID_SUBJECT"] || "mailto:contato@thaynails.com.br",
    publicKey: process.env["VAPID_PUBLIC_KEY"],
    privateKey: process.env["VAPID_PRIVATE_KEY"],
  };
}

/** Envia uma notificação para todos os aparelhos cadastrados do dono. */
export async function sendPushToOwner(
  admin: AdminClient,
  ownerId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number; failed: number }> {
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("owner_id", ownerId);

  if (error || !data?.length) return { sent: 0, removed: 0, failed: 0 };

  const vapid = vapidKeys();
  let sent = 0;
  let removed = 0;
  let failed = 0;

  await Promise.all(
    (data as SubscriptionRow[]).map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        expirationTime: null,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };

      try {
        const request = await buildPushPayload(
          {
            data: { ...payload } as Record<string, string>,
            options: { ttl: 3600, urgency: "high" },
          },
          subscription,
          vapid,
        );

        const response = await fetch(row.endpoint, {
          method: request.method,
          headers: request.headers as unknown as Record<string, string>,
          body: request.body as unknown as BodyInit,
        });

        if (response.status === 404 || response.status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", row.id);
          removed += 1;
          return;
        }

        if (!response.ok) {
          console.error(`[push] falha ${response.status}: ${await response.text()}`);
          failed += 1;
          return;
        }

        sent += 1;
      } catch (err) {
        console.error("[push] erro ao enviar", err);
        failed += 1;
      }
    }),
  );

  return { sent, removed, failed };
}

const SP_OFFSET_MS = -3 * 60 * 60 * 1000;

/** Data/hora atual no fuso de São Paulo (como objeto Date "deslocado"). */
export function nowInSaoPaulo(): Date {
  return new Date(Date.now() + SP_OFFSET_MS);
}

export function toLocalDateKey(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Converte "YYYY-MM-DD HH:MM" de São Paulo para ISO UTC. */
export function saoPauloToIso(dateKey: string, time: string): string {
  return new Date(`${dateKey}T${time}:00.000-03:00`).toISOString();
}
