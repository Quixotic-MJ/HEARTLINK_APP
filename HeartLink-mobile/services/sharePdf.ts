import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

export type ShareResult = "shared" | "unavailable" | "busy";

let busy = false;

/** A safe file name: letters, numbers, dashes and underscores, ending in .pdf. */
export function pdfFileName(name: string): string {
  const base = name.replace(/\.pdf$/i, "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "HeartLink";
  return `${base}.pdf`;
}

/**
 * Makes a PDF from HTML and opens the share sheet for it (every report and summary in the app uses this).
 *
 * expo-print saves the PDF in a folder the share sheet isn't always allowed to read: in Expo Go on Android sharing it
 * failed with "Not allowed to read file under given URL" (Trends' report, 2026-11-12). So the PDF's bytes are written
 * into the app's own cache folder under a readable name, and that copy is shared.
 *
 * Returns "unavailable" when the phone can't share and "busy" while a share sheet is already opening (a double tap).
 * Throws if the PDF can't be made or saved, so the screen can say so.
 */
export async function sharePdf(html: string, fileName: string, dialogTitle: string): Promise<ShareResult> {
  if (busy) return "busy";
  if (!(await Sharing.isAvailableAsync())) return "unavailable";
  busy = true;
  try {
    const { base64 } = await Print.printToFileAsync({ html, base64: true });
    if (!base64) throw new Error("The PDF came back empty");
    const target = `${FileSystem.cacheDirectory}${pdfFileName(fileName)}`;
    await FileSystem.writeAsStringAsync(target, base64, { encoding: FileSystem.EncodingType.Base64 });
    await Sharing.shareAsync(target, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle });
    return "shared";
  } finally {
    // The share sheet takes a moment to appear; a second tap in that time is ignored
    setTimeout(() => {
      busy = false;
    }, 1000);
  }
}
