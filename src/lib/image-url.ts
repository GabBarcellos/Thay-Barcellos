/**
 * Transforma URLs públicas do Supabase Storage no endpoint de renderização
 * com resize/qualidade, reduzindo drasticamente o payload e habilitando
 * cache no CDN. URLs não-Supabase (ou já transformadas) passam sem alteração.
 */
const RENDER_MARK = "/storage/v1/render/image/public/";
const OBJECT_MARK = "/storage/v1/object/public/";

export function optimizedImageUrl(
  url: string | null | undefined,
  opts: { width?: number; quality?: number; height?: number } = {}
): string {
  if (!url) return "";
  if (!url.includes(OBJECT_MARK) || url.includes(RENDER_MARK)) return url;

  const { width = 600, quality = 70, height } = opts;
  const rendered = url.replace(OBJECT_MARK, RENDER_MARK);
  const sep = rendered.includes("?") ? "&" : "?";
  const parts = [`width=${width}`, `quality=${quality}`, "resize=contain"];
  if (height) parts.push(`height=${height}`);
  return `${rendered}${sep}${parts.join("&")}`;
}

export function optimizedSrcSet(
  url: string | null | undefined,
  widths: number[] = [400, 600, 900]
): string | undefined {
  if (!url || !url.includes(OBJECT_MARK)) return undefined;
  return widths.map((w) => `${optimizedImageUrl(url, { width: w })} ${w}w`).join(", ");
}
