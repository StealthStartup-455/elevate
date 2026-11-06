// Turns the part of the URL after /demo or /demo-phone into the app path the
// frame shows: /demo-phone/me/classes -> /me/classes. Always a path on this
// site: segments are decoded, checked and encoded again, so the frame can't be
// pointed at another site or at itself.

export const DEFAULT_APP_PATH = "/";

const FRAME_ROOTS = new Set(["demo", "demo-phone"]);

export function appPath(
  segments: string[] | undefined,
  search?: Record<string, string | string[] | undefined>,
): string {
  const clean: string[] = [];
  for (const raw of segments ?? []) {
    let segment: string;
    try {
      segment = decodeURIComponent(raw);
    } catch {
      return DEFAULT_APP_PATH;
    }
    if (!segment || segment === "." || segment === ".." || /[/\\]/.test(segment)) {
      return DEFAULT_APP_PATH;
    }
    clean.push(encodeURIComponent(segment));
  }
  // A frame inside a frame would shrink forever.
  if (clean.length === 0 || FRAME_ROOTS.has(clean[0].toLowerCase())) return DEFAULT_APP_PATH;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search ?? {})) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, v);
    }
  }
  const qs = query.toString();
  return `/${clean.join("/")}${qs ? `?${qs}` : ""}`;
}
