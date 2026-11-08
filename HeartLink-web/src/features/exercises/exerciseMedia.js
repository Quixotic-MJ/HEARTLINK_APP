export function resolveRoutineMediaUrl(value, baseURL = "") {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (!url || url.startsWith("//") || url.includes("\\")) return "";
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      return parsed.username || parsed.password ? "" : url;
    } catch {
      return "";
    }
  }
  if (/^data:(image|video)\//i.test(url) || /^blob:https?:\/\//i.test(url))
    return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return "";
  return `${baseURL.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

export function isRoutineVideo(url) {
  return (
    typeof url === "string" &&
    (/^data:video\//i.test(url) ||
      /\.(mp4|webm|mov|m4v|ogv|ogg)$/i.test(url.split(/[?#]/, 1)[0]))
  );
}
