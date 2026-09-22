// Chave pública VAPID (pode ficar no código do navegador por design).
export const VAPID_PUBLIC_KEY =
  "BCwl-DwUMDto46I1aQAadWFJHZaa6KD6ZdDIHKWCL3HgUyoMVzLuMhlj8J9qaxX3xSO03AElElvXev9mpRuK_hg";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}
